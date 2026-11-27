"""Isolated display geometry crosswalk. Never write to app/public.
Match to ORIGINAL graph geometry, then use its accepted corrected centerline.
Retain every original property, score, ID, sample and unresolved geometry.
"""
import copy, hashlib, json, math, pathlib, sys
from collections import Counter, defaultdict
from shapely.geometry import LineString, Point, shape, box
from shapely.ops import transform, substring
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC, TO_M, TO_WGS, metric, feature
from sangdo1_road_corridor_preview import write

def read(p): return json.loads(p.read_text())
def line(g): return transform(TO_M,shape(g))
def sample(g):
    return [g.interpolate(i/max(1,math.ceil(g.length/1.0)),normalized=True) for i in range(max(1,math.ceil(g.length/1.0))+1)]
def match_segment(g,old,new):
    if g.length<.1 or old.length<.1 or new.length<.1:return None
    pts=sample(g); ds=[old.project(p) for p in pts]
    errors=[p.distance(old) for p in pts]
    if max(errors)>1.5 or sum(errors)/len(errors)>.75:return None
    span=abs(ds[-1]-ds[0])
    if span<g.length*.9 or span>g.length*1.10:return None
    direction=1 if ds[-1]>ds[0] else -1
    if any((b-a)*direction<-.05 for a,b in zip(ds,ds[1:])):return None
    result=substring(new,ds[0]/old.length,ds[-1]/old.length,normalized=True)
    if result.geom_type!="LineString" or not result.is_simple:return None
    if not .75*g.length<=result.length<=1.25*g.length:return None
    if result.hausdorff_distance(g)>4.5:return None
    return result,sum(errors)/len(errors)
class Crosswalk:
    def __init__(self,original,corrected,ids):
        self.original=original;self.corrected=corrected
        self.keys=list(original);self.tree=STRtree([original[i] for i in self.keys])
        self.ids=defaultdict(list)
        for i,v in ids.items():self.ids[str(v)].append(i)
    def align(self,g,link_id=None,scope=None):
        if g.geom_type!="LineString" or g.is_empty:return g,"unsupported_geometry",None
        candidates=self.ids.get(str(link_id),[]) if link_id is not None else []
        if not candidates:candidates=[self.keys[int(k)] for k in self.tree.query(g.buffer(1.5))]
        # Search unresolved original links too: an adjacent successful link must
        # not steal an unmatched road. Require a unique compatible original.
        matches=[]
        for i in candidates:
            old=self.original[i]
            found=match_segment(g,old,self.corrected.get(i,old))
            if found is not None:matches.append((i,*found))
        if len(matches)!=1:return g,"ambiguous" if matches else "no_unique_match",None
        i,result,error=matches[0]
        if i not in self.corrected:return g,"unresolved_road",i
        if scope is not None and not scope.buffer(.002).covers(result):return g,"boundary_guard",i
        return result,"aligned",i

def update_geo(src,dst,cross,scope=None,exact_id=False):
    data=read(src);out=copy.deepcopy(data);counts=Counter();audit=[]
    for i,(f,o) in enumerate(zip(data["features"],out["features"])):
        geom=f["geometry"]
        g=line(geom)
        result,status,edge=cross.align(g,f.get("properties",{}).get("link_id") if exact_id else None,scope)
        if status=="aligned":o["geometry"]=feature(result,{})["geometry"]
        assert f.get("properties")==o.get("properties") and f.get("id")==o.get("id")
        counts[status]+=1
        audit.append({"row":i,"status":status,"edge_index":edge})
    dst.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":")))
    return {"counts":dict(counts),"rows":audit,"properties_unchanged":True}
def update_pri(src,dst,cross,scope):
    data=read(src);out=copy.deepcopy(data);counts=Counter();audit=[]
    for s,o in zip(data["segments"],out["segments"]):
        g=transform(TO_M,LineString([(p[1],p[0]) for p in s["pts"]])) if len(s.get("pts",[]))>=2 else Point()
        result,status,edge=cross.align(g,scope=scope)
        if status=="aligned":
            o["pts"]=[[y,x] for x,y in transform(TO_WGS,result).coords]
        assert {k:v for k,v in s.items() if k!="pts"}=={k:v for k,v in o.items() if k!="pts"}
        counts[status]+=1;audit.append({"id":s["id"],"status":status,"edge_index":edge})
    assert {k:v for k,v in data.items() if k!="segments"}=={k:v for k,v in out.items() if k!="segments"}
    dst.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":")))
    return {"counts":dict(counts),"rows":audit,"properties_unchanged":True}
def regression():
    old=LineString([(0,0),(20,0)]);new=LineString([(0,0),(10,1),(20,0)])
    c=Crosswalk({0:old},{0:new},{0:"1"})
    g=LineString([(5,0),(15,0)])
    out,status,_=c.align(g)
    assert status=="aligned" and out.distance(Point(10,1))<.001
    assert c.align(g,scope=box(0,-1,20,.2))[1]=="boundary_guard"
    assert Crosswalk({0:old,1:old},{0:new},{0:"1",1:"2"}).align(g)[1]=="ambiguous"
    assert Crosswalk({0:old},{},{0:"1"}).align(g)[1]=="unresolved_road"
    assert c.align(LineString([(10,-5),(10,5)]))[1]=="no_unique_match"
    print("LAYER_ALIGNMENT_REGRESSION_OK")
def main(base,out,crosswalk_class=Crosswalk):
    out.mkdir(parents=True,exist_ok=True)
    report=read(base/"summary.json")
    raw=(PUBLIC/"data/safety/walk/dongjak_walk_graph.json").read_bytes()
    assert hashlib.sha256(raw).hexdigest()==report["graph_sha256"]
    edges=json.loads(raw)["edges"]
    original={i:transform(TO_M,LineString(e[6])) for i,e in enumerate(edges) if len(e)>=7 and len(e[6])>=2}
    corrected={f["properties"]["edge_index"]:line(f["geometry"]) for f in read(base/"candidate-centers.geojson")["features"]}
    ids={i:edges[i][0] for i in original}
    cross=crosswalk_class(original,corrected,ids)
    pilot=metric(read(PUBLIC/"data/protection-zone/boundary_reference.geojson")["features"][0]["geometry"])
    layers={
      "pri-scoped":"data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson",
      "shared-road":"data/sangdo1-analysis-view/bocha-mixed-roads.geojson",
      "speed":"data/road-speed/sangdo1_speed_links.geojson",
      "slope":"data/sangdo1-analysis-view/slope.geojson",
      "district-slope":"data/safety/slope/dongjak_walk_links_slope_visual.geojson",
      "district-walk":"data/safety/walk/dongjak_walk_links.geojson"
    }
    results={};hashes={}
    for name,rel in layers.items():
        src=PUBLIC/rel;hashes[rel]=hashlib.sha256(src.read_bytes()).hexdigest()
        results[name]=update_geo(src,out/(name+".geojson"),cross,pilot if name in ("pri-scoped","shared-road","speed","slope") else None,name in ("slope","district-slope","district-walk"))
    rel="data/pri/lighting_segments.json";src=PUBLIC/rel;hashes[rel]=hashlib.sha256(src.read_bytes()).hexdigest()
    results["pri-lighting"]=update_pri(src,out/"pri-lighting.json",cross,None)
    # Width is an independent polygon survey. Build only an optional display
    # overlay from uniquely attributable source road polygons; do not claim
    # estimated corridor width is measured width or overwrite original polygons.
    rel="data/sangdo1-analysis-view/roadwidth.geojson";src=PUBLIC/rel
    hashes[rel]=hashlib.sha256(src.read_bytes()).hexdigest()
    width=read(src);polys=[metric(f["geometry"]) for f in width["features"]];tree=STRtree(polys)
    surfaces={f["properties"]["edge_index"]:metric(f["geometry"]) for f in read(base/"smoothed-surfaces.geojson")["features"]}
    width_out=[];counts=Counter()
    for i,g in corrected.items():
        if not original[i].intersects(pilot):continue
        if not pilot.buffer(.002).covers(surfaces[i]):counts["boundary_guard"]+=1;continue
        hits=[int(k) for k in tree.query(original[i],predicate="intersects") if polys[int(k)].intersection(original[i]).length>=.98*original[i].length]
        if len(hits)!=1:counts["no_unique_width_polygon"]+=1;continue
        j=hits[0];width_out.append(feature(surfaces[i],{"source_width_properties":width["features"][j]["properties"],"edge_index":i,"source_width_row":j,"display_only":True}));counts["aligned"]+=1
    write(out,"width-display-candidates",width_out)
    results["road-width"]={"counts":dict(counts),"original_polygons_preserved":True}
    for rel,h in hashes.items():assert hashlib.sha256((PUBLIC/rel).read_bytes()).hexdigest()==h
    summary={"source_graph_sha256":report["graph_sha256"],"accepted_road_count":len(corrected),"layers":{k:{a:b for a,b in v.items() if a!="rows"} for k,v in results.items()},"source_sha256":hashes,"unmodified_evidence":["night occlusion samples and light reach; require display-only runtime transformation, never move sensor evidence","all PRI score patches, accident/CCTV/crosswalk points","original walking graph and route calculations"],"limitations":["single-link matching only; multi-link or ambiguous features retained untouched","visual alignment is not independent survey validation","not a deployable release"]}
    (out/"alignment-audit.json").write_text(json.dumps(results,ensure_ascii=False,separators=(",",":")))
    (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print("ROAD_LAYER_ALIGNMENT_RESULT",json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":
    if "--test" in sys.argv:regression()
    else:main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
