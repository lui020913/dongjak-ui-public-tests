"""Standalone visual comparison, never alter authoritative GIS or routing."""
import json, math, pathlib, sys, urllib.parse, shutil
from collections import Counter
from shapely import make_valid
from shapely.geometry import shape, Point, Polygon, MultiPolygon
from shapely.ops import unary_union, transform
from shapely.strtree import STRtree
from shapely.prepared import prep
from dongjak_road_building_audit import PUBLIC, metric, polygonal, feature, fc, TO_M, TO_WGS
from dongjak_native_vector_audit import STYLE, get, tilexy, geometry_local, eligible, road_lines, decode

ROOT=pathlib.Path(__file__).resolve().parents[2]
WIDTHS={"motorway":9,"trunk":8,"primary":7,"secondary":6,"tertiary":5,"minor":3.6,"service":3,"track":2.2,"path":1.5,"pedestrian":2.5}
def area_parts(g):
    return len(g.geoms) if g.geom_type=="MultiPolygon" else int(not g.is_empty)
def write(path,items):
    path.write_text(json.dumps(fc(items),ensure_ascii=False,separators=(",",":")))
def clean_surface(g,buildings,tree):
    ids=tree.query(g,predicate="intersects")
    if not len(ids):return g,0.0
    obstacles=unary_union([buildings[int(i)] for i in ids])
    result=polygonal(make_valid(g.difference(obstacles)))
    if result.intersection(obstacles).area>.01:raise ValueError("Residual building overlap")
    return result,max(0,g.area-result.area)

def main(out):
    out.mkdir(parents=True,exist_ok=True)
    boundary_geo=shape(json.loads((PUBLIC/"data/dongjak_sig_reference.geojson").read_text())["features"][0]["geometry"])
    boundary=metric(boundary_geo.__geo_interface__); scope=prep(boundary_geo)
    manifest=json.loads((PUBLIC/"buildings/manifest.json").read_text())
    footprints=[]; building_files=[]
    for sheet in manifest["sheets"]:
        items=[]
        for kind in ("file","supplement"):
            for f in json.loads((PUBLIC/sheet[kind].lstrip("/")).read_text())["features"]:
                p=f.get("properties",{}); x,y=p.get("x"),p.get("y")
                if not isinstance(x,(int,float)) or not isinstance(y,(int,float)) or not scope.covers(Point(x,y)):continue
                g=metric(f["geometry"])
                if g.is_empty or g.area<20:continue
                # Keep original metric footprint; use same geometry for 2D and 3D.
                h=p.get("h",3)
                try:h=max(3,min(300,float(h)))
                except (ValueError,TypeError):h=3
                footprints.append(g);items.append(feature(g,{"h":h}))
        if items:
            file=f"buildings-{sheet['sheet']}.geojson";write(out/file,items)
            building_files.append({"file":file,"bbox":sheet["bbox"],"count":len(items)})
    if not footprints:raise ValueError("No district building footprints")
    tree=STRtree(footprints)
    official=[]
    for f in json.loads((PUBLIC/"data/dongjak_roadwidth_estimated_202610.geojson").read_text())["features"]:
        g=polygonal(metric(f["geometry"]).intersection(boundary))
        if not g.is_empty and g.area>.01:official.append(g)
    if not official:raise ValueError("No official road polygons")
    # Original official road geometry is used only as the experimental display input.
    official_union=unary_union(official);raw_roads=[];display=[];conflicts=[];stats=Counter()
    def add(g,kind):
        if g.is_empty or g.area<.02:return
        props={"kind":kind}
        raw_roads.append(feature(g,props))
        corrected,loss=clean_surface(g,footprints,tree)
        stats[kind+"_input"]+=1
        if loss>.01:
            stats[kind+"_conflict_count"]+=1;stats[kind+"_overlap_m2"]+=loss
            conflict=polygonal(g.difference(corrected))
            if not conflict.is_empty:conflicts.append(feature(conflict,props))
        if corrected.is_empty:
            stats[kind+"_fully_blocked"]+=1;return
        if area_parts(corrected)>area_parts(g):stats[kind+"_fragmented"]+=1
        # Reprojecting can add numerical slivers: test the actual exported geometry.
        item=feature(corrected,props)
        check=metric(item["geometry"])
        if any(check.intersection(footprints[int(i)]).area>.01 for i in tree.query(check,predicate="intersects")):
            raise ValueError("Export residual overlap")
        display.append(item)
    for g in official:add(g,"official")
    style=json.loads(get(STYLE))
    names={l["source"] for l in style["layers"] if l.get("source-layer")=="transportation" and l.get("type")=="line"}
    if len(names)!=1:raise ValueError("Ambiguous vector source")
    src=style["sources"][next(iter(names))]
    tj_url=urllib.parse.urljoin(STYLE,src.get("url","")) if src.get("url") else STYLE
    tj=json.loads(get(tj_url)) if src.get("url") else src
    template=urllib.parse.urljoin(tj_url,tj["tiles"][0]);z=min(14,int(tj.get("maxzoom",14)))
    minx,miny,maxx,maxy=boundary_geo.bounds;x0,y0=tilexy(minx,maxy,z);x1,y1=tilexy(maxx,miny,z)
    fallback=[]
    for x in range(x0,x1+1):
        for y in range(y0,y1+1):
            yy=2**z-1-y if tj.get("scheme")=="tms" else y
            tile=decode(get(template.replace("{z}",str(z)).replace("{x}",str(x)).replace("{y}",str(yy))),default_options={"y_coord_down":True})
            layer=tile.get("transportation",{})
            for f in layer.get("features",[]):
                p=f.get("properties",{})
                if not eligible(p):continue
                g=geometry_local(f["geometry"],x,y,z,layer["extent"])
                for line in road_lines(g):
                    if not line.intersects(boundary):continue
                    # Avoid doubling the official area. Fallback is a display-width estimate, not a measured road.
                    width=WIDTHS.get(str(p.get("class")),3.2)
                    surface=polygonal(make_valid(line.buffer(width/2,cap_style=1).intersection(boundary).difference(official_union)))
                    if not surface.is_empty and surface.area>.15:fallback.append(surface)
    if not fallback:raise ValueError("No supplemental vector road surfaces")
    for g in fallback:add(g,"estimated")
    write(out/"road-original.geojson",raw_roads);write(out/"road-display.geojson",display);write(out/"conflicts.geojson",conflicts)
    write(out/"boundary.geojson",[feature(boundary,{})])
    summary={"preview":True,"building_count":len(footprints),"building_files":building_files,"road_input_count":len(raw_roads),"road_display_count":len(display),"conflict_count":len(conflicts),"stats":dict(stats),"source":"Seoul road surfaces + OpenFreeMap estimated fallback","source_commit":__import__("os").environ.get("GITHUB_SHA","local"),"warning":"Visual experiment only; geometry is not field-verified. Routing and production unchanged."}
    (out/"manifest.json").write_text(json.dumps(summary,ensure_ascii=False))
    shutil.copy(ROOT/"scripts/research/road-surface-preview.html",out/"index.html")
    print("ROAD_SURFACE_PREVIEW",json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":main(pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "road-preview-dist"))
