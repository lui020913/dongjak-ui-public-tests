"""Compare the actual OpenFreeMap vector basemap with independent local GIS.
Produces evidence and reversible alignment experiments, not production edits.
"""
import json, math, pathlib, sys, urllib.request, urllib.parse, gzip
from collections import Counter, defaultdict
from pyproj import Transformer
from shapely.geometry import shape, Point, LineString, box
from shapely.ops import transform, unary_union
from shapely.affinity import translate
from shapely.strtree import STRtree
from shapely.prepared import prep
from mapbox_vector_tile import decode
from dongjak_road_building_audit import PUBLIC, TO_M, metric, feature, fc

STYLE="https://tiles.openfreemap.org/styles/bright"
MERC=20037508.342789244
M_TO_LOCAL=Transformer.from_crs(3857,5186,always_xy=True).transform
GROUND_CLASSES={"motorway","trunk","primary","secondary","tertiary","minor","service","track","path","street","pedestrian","residential","living_street","road","unclassified"}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Dongjak spatial validation"}),timeout=30) as response:
        data=response.read()
    return gzip.decompress(data) if data[:2]==b'\x1f\x8b' else data

def tilexy(lon,lat,z):
    n=2**z
    return int((lon+180)/360*n),int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n)

def geometry_local(g,x,y,z,extent):
    span=2*MERC/2**z
    # MVT y-down tile coordinates. Transform all vertices into metric CRS.
    def project(a,b,c=None):
        return M_TO_LOCAL(-MERC+(x+a/extent)*span,MERC-(y+b/extent)*span)
    # Scalar-only callable is compatible with Shapely transform fallback.
    return transform(project,shape(g))

def eligible(p):
    if str(p.get("class","")).lower() not in GROUND_CLASSES:return False
    if p.get("brunnel") not in (None,"","no"):return False
    return not any(str(p.get(k,"")).lower() not in ("","0","no","false","none") for k in ("bridge","tunnel","layer","level","covered"))

def road_lines(g):
    if g.geom_type=="LineString":return [g]
    if g.geom_type=="MultiLineString":return list(g.geoms)
    return []

def main(out):
    out.mkdir(parents=True,exist_ok=True)
    style=json.loads(get(STYLE))
    # Only use a source referenced by the actual transportation layers.
    names=sorted({l["source"] for l in style["layers"] if l.get("source-layer")=="transportation" and l.get("type")=="line"})
    if len(names)!=1:raise ValueError("Ambiguous transportation vector source: "+str(names))
    source=style["sources"][names[0]]
    if source.get("url"):
        tilejson_url=urllib.parse.urljoin(STYLE,source["url"])
        tilejson=json.loads(get(tilejson_url))
    else:
        tilejson_url=STYLE;tilejson=source
    template=urllib.parse.urljoin(tilejson_url,tilejson["tiles"][0])
    z=min(14,int(tilejson.get("maxzoom",14)))
    boundary_geo=shape(json.loads((PUBLIC/"data/dongjak_sig_reference.geojson").read_text())["features"][0]["geometry"])
    scope=prep(boundary_geo)
    boundary=metric(boundary_geo.__geo_interface__)
    scope_m=boundary.buffer(40)
    minx,miny,maxx,maxy=boundary_geo.bounds
    x0,y0=tilexy(minx,maxy,z);x1,y1=tilexy(maxx,miny,z)
    lines=[];line_props=[];tile_log=[]
    native=[]
    for x in range(x0,x1+1):
        for y in range(y0,y1+1):
            yy=2**z-1-y if tilejson.get("scheme")=="tms" else y
            url=template.replace("{z}",str(z)).replace("{x}",str(x)).replace("{y}",str(yy))
            data=decode(get(url),default_options={"y_coord_down":True})
            road_layer=data.get("transportation",{})
            tile_log.append({"z":z,"x":x,"y":y,"transport_features":len(road_layer.get("features",[]))})
            for f in road_layer.get("features",[]):
                p=f.get("properties",{})
                if not eligible(p):continue
                g=geometry_local(f["geometry"],x,y,z,road_layer["extent"])
                for l in road_lines(g):
                    if l.length>0 and l.intersects(scope_m):
                        lines.append(l);line_props.append({"class":p.get("class"),"subclass":p.get("subclass"),"id":str(f.get("id",""))})
            building=data.get("building",{})
            for f in building.get("features",[]):
                g=geometry_local(f["geometry"],x,y,z,building["extent"])
                if g.geom_type in ("Polygon","MultiPolygon") and g.is_valid and g.area>0 and g.intersects(scope_m):
                    native.append(g)
    if not lines or not native:raise ValueError("Missing live road or building vector geometries")
    line_tree=STRtree(lines)
    official=[metric(f["geometry"]) for f in json.loads((PUBLIC/"data/dongjak_roadwidth_estimated_202610.geojson").read_text())["features"]]
    official_tree=STRtree(official)
    counts=defaultdict(Counter);shift_scores=defaultdict(Counter);records=[]
    def inspect(g,kind,meta):
        c=counts[kind];c["valid"]+=1
        inner=g.buffer(-0.5)
        if inner.is_empty:return
        # Near but not overlapping features are included in translation scoring.
        near=line_tree.query(g.buffer(4),predicate="intersects")
        if not len(near):return
        c["near_native_road"]+=1
        local=unary_union([lines[int(i)] for i in near])
        if local.is_empty:return
        for dx,dy in ((0,0),(-1,-1),(1,1),(-1,0),(0,-1)):
            moved=translate(inner,xoff=dx,yoff=dy)
            shift_scores[kind][f"{dx},{dy}"]+=moved.intersection(local).length
        crossing=inner.intersection(local)
        if crossing.length<1:return
        c["native_centerline_inside"]+=1
        hits=official_tree.query(g,predicate="intersects")
        area=g.intersection(unary_union([official[int(i)] for i in hits])).area if len(hits) else 0
        if area>=.01:c["also_official_surface_overlap"]+=1
        if kind!="native_fragment":
            records.append(feature(g,{**meta,"source_kind":kind,"centerline_inside_m":round(crossing.length,2),"official_overlap_m2":round(area,2),"building_m2":round(g.area,2)}))
    manifest=json.loads((PUBLIC/"buildings/manifest.json").read_text())
    for sheet in manifest["sheets"]:
        for kind in ("file","supplement"):
            for i,f in enumerate(json.loads((PUBLIC/sheet[kind].lstrip("/")).read_text())["features"]):
                p=f.get("properties",{});x,y=p.get("x"),p.get("y")
                if not isinstance(x,(int,float)) or not isinstance(y,(int,float)) or not scope.covers(Point(x,y)):continue
                g=metric(f["geometry"])
                if not g.is_empty and g.area>0:inspect(g,kind,{"sheet":sheet["sheet"],"row":i})
    for i,g in enumerate(native):
        if boundary.covers(g.representative_point()):inspect(g,"native_fragment",{"fragment":i})
    summary={"style":STYLE,"source_name":names[0],"tile_zoom":z,"tiles":tile_log,"road_line_fragments":len(lines),
             "native_building_fragments":len(native),"counts":{k:dict(v) for k,v in counts.items()},
             "centerline_translation_diagnostic_m":{k:{a:round(b,2) for a,b in v.items()} for k,v in shift_scores.items()},
             "limitations":["Vector tiles at native source zoom contain quantized/simplified, clipped features","Native fragments may duplicate a building across tiles","Road class filters are conservative, not proof of road grade","Centerline length is not rendered road width","No geometry is changed"]}
    (out/"native-vector-summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    (out/"native-crossing-buildings.geojson").write_text(json.dumps(fc(records),ensure_ascii=False))
    (out/"native-road-lines.geojson").write_text(json.dumps(fc([feature(l,p) for l,p in zip(lines,line_props)]),ensure_ascii=False))
    print("NATIVE_VECTOR_DIAGNOSTICS",json.dumps(summary,ensure_ascii=False))

if __name__=="__main__":
    main(pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "native-vector-review"))
