"""Sangdo1 experimental display corridors. Never change the routing graph.
Fixed link endpoints, constrained lateral search, continuous variable-width
surface. Unknown/blocked links remain visibly unresolved, not fabricated roads.
"""
import json, math, pathlib, sys, hashlib
from collections import Counter
from shapely.geometry import Point, LineString, shape, Polygon
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from shapely.prepared import prep
from dongjak_road_building_audit import PUBLIC, TO_M, TO_WGS, metric, feature, fc, polygonal

STEP=1.5
SHIFT=3.0
MIN_RADIUS=.45
MARGIN=.08
MAX_RADIUS=4.0
OFFSETS=[0,-.5,.5,-1,1,-1.5,1.5,-2,2,-2.5,2.5,-3,3]
def write(out,name,features):
    (out/(name+".geojson")).write_text(json.dumps(fc(features),ensure_ascii=False,separators=(",",":")))

def reconstruct(line, obstacles, known, endpoints=None):
    # No link movement beyond the local source corridor. Preserve both endpoints.
    if line.length<.1:return None,"short_link"
    allowed=line.buffer(SHIFT+.01)
    if not known.is_empty and known.intersection(line).length>=line.length*.5:
        allowed=allowed.intersection(known.buffer(1.0).union(line.buffer(.55)))
    def clearance(g):
        return g.distance(obstacles) if not obstacles.is_empty else 1e6
    def radius(g):
        # Known road polygon constrains the preferred width where available.
        middle=g.interpolate(.5,normalized=True) if g.geom_type=="LineString" else g
        hint=middle.distance(known.boundary) if not known.is_empty and known.covers(middle) else 1.5
        return min(MAX_RADIUS,max(MIN_RADIUS,hint),clearance(g)-MARGIN)
    a,b=endpoints if endpoints is not None else (Point(line.coords[0]),Point(line.coords[-1]))
    if a.distance(Point(line.coords[0]))>SHIFT+.001 or b.distance(Point(line.coords[-1]))>SHIFT+.001:return None,"endpoint_shift_exceeds_limit"
    if min(clearance(a),clearance(b))<MIN_RADIUS+MARGIN:return None,"endpoint_obstructed"
    n=max(1,math.ceil(line.length/STEP))
    # Preserve every original vertex as a sample, so bends are not short-cut.
    ds=sorted(set([line.length*i/n for i in range(n+1)]+[line.project(Point(c)) for c in line.coords]))
    if len(ds)>1500:return None,"oversize_link"
    def options(i,d):
        p=line.interpolate(d)
        if i==0:return [(a,0.0)]
        if i==len(ds)-1:return [(b,0.0)]
        q=line.interpolate(max(0,d-.4));r=line.interpolate(min(line.length,d+.4))
        dx,dy=r.x-q.x,r.y-q.y;norm=math.hypot(dx,dy)
        if norm<1e-8:return [(p,0.0)]
        result=[]
        for off in OFFSETS:
            x=Point(p.x-dy/norm*off,p.y+dx/norm*off)
            if allowed.covers(x) and clearance(x)>=MIN_RADIUS+MARGIN:result.append((x,off))
        return result
    layers=[options(i,d) for i,d in enumerate(ds)]
    if any(not a for a in layers):return None,"no_clear_cross_section"
    scores={0:(0,None,None)}; history=[scores]
    for i in range(1,len(layers)):
        nxt={}
        for j,(p,off) in enumerate(layers[i]):
            for k,(cost,_,_) in scores.items():
                q,prev_off=layers[i-1][k]
                seg=LineString([q,p])
                if seg.length<1e-6 or abs(off-prev_off)>max(1.0,(ds[i]-ds[i-1])*1.6):continue
                if not allowed.covers(seg):continue
                w=radius(seg)
                if w<MIN_RADIUS:continue
                # Penalize moving the centerline and abrupt lateral changes.
                value=cost+seg.length*(.13*off*off+.5/(w+.1))+.5*(off-prev_off)**2
                if j not in nxt or value<nxt[j][0]:nxt[j]=(value,k,w)
        if not nxt:return None,"no_continuous_corridor"
        history.append(nxt);scores=nxt
    j=min(scores,key=lambda k:scores[k][0]);points=[];widths=[]
    for i in range(len(layers)-1,-1,-1):
        points.append(layers[i][j][0]);_,prev,w=history[i][j]
        if w is not None:widths.append(w)
        j=prev
    points.reverse();widths.reverse()
    center=LineString(points)
    if not center.is_simple:return None,"self_intersecting"
    if center.hausdorff_distance(line)>SHIFT+.01:return None,"excess_shift"
    if center.length>line.length*1.3+1:return None,"excess_detour"
    if center.coords[0]!=a.coords[0] or center.coords[-1]!=b.coords[0]:raise ValueError("Changed endpoint")
    pieces=[LineString([points[i],points[i+1]]).buffer(w,quad_segs=6) for i,w in enumerate(widths)]
    surface=polygonal(unary_union(pieces))
    if surface.geom_type!="Polygon" or not surface.covers(center):return None,"disconnected_surface"
    if not obstacles.is_empty and surface.intersection(obstacles).area>1e-6:raise ValueError("Unexpected collision")
    return (center,surface,min(widths)*2,max(widths)*2),"candidate"

def regression():
    from shapely.geometry import box
    line=LineString([(0,0),(12,0)])
    original=box(-1,-3,13,3)
    result,reason=reconstruct(line,box(5,-.2,7,1.5),original)
    assert reason=="candidate",reason
    c,s,lo,hi=result
    assert c.coords[0]==line.coords[0] and c.coords[-1]==line.coords[-1]
    assert s.intersection(box(5,-.2,7,1.5)).area<1e-6
    assert s.covers(c) and lo>=.9
    assert reconstruct(line,box(-1,-1,1,1),original)[1]=="endpoint_obstructed"
    assert reconstruct(line,box(5,-5,7,5),original)[0] is None
    print("CORRIDOR_REGRESSION_OK")

def main(out):
    out.mkdir(parents=True,exist_ok=True)
    boundary_file=PUBLIC/"data/protection-zone/boundary_reference.geojson"
    bf=json.loads(boundary_file.read_text())["features"][0]
    assert bf["properties"]["emdnm"]=="상도1동"
    boundary=metric(bf["geometry"]);scope=boundary.buffer(15)
    manifest=json.loads((PUBLIC/"buildings/manifest.json").read_text())
    buildings=[];bfeatures=[]
    for sheet in manifest["sheets"]:
        for kind in ("file","supplement"):
            for f in json.loads((PUBLIC/sheet[kind].lstrip("/")).read_text())["features"]:
                g=metric(f["geometry"])
                if g.is_empty or g.area<.01 or not g.intersects(scope):continue
                buildings.append(g)
                if g.area>=20:
                    p=f.get("properties",{})
                    bfeatures.append(feature(g,{"sheet":sheet["sheet"],"source":kind}))
    tree=STRtree(buildings)
    official=[]
    for f in json.loads((PUBLIC/"data/dongjak_roadwidth_estimated_202610.geojson").read_text())["features"]:
        g=metric(f["geometry"])
        if not g.is_empty and g.intersects(scope):official.append(g)
    road_tree=STRtree(official)
    graph_path=PUBLIC/"data/safety/walk/dongjak_walk_graph.json"
    raw=graph_path.read_bytes();graph=json.loads(raw)
    baseline=[];centers=[];surfaces=[];unresolved=[];counts=Counter();total=Counter()
    for i,e in enumerate(graph["edges"]):
        if len(e)<7 or len(e[6])<2:continue
        line=transform(TO_M,LineString(e[6]))
        if line.length<.1 or not line.intersects(boundary):continue
        if e[5]!=0 or e[4]!="1111":
            counts["excluded_special_or_nonvehicle"]+=1;continue
        # Analyze the whole original link, including endpoints just outside the boundary.
        props={"edge_index":i,"link_id":str(e[0]),"source":"Seoul walking network","review_required":True}
        baseline.append(feature(line,props));total["input_length_m"]+=line.length
        region=line.buffer(8)
        local=unary_union([buildings[int(k)] for k in tree.query(region,predicate="intersects")])
        known=unary_union([official[int(k)] for k in road_tree.query(region,predicate="intersects")])
        if not local.is_empty and line.intersects(local):counts["original_center_collision"]+=1
        if not scope.covers(line):
            result,reason=None,"boundary_crossing_review"
        else:result,reason=reconstruct(line,local,known)
        counts[reason]+=1
        if result is None:
            unresolved.append(feature(line,{**props,"reason":reason}));total["unresolved_length_m"]+=line.length;continue
        c,s,wmin,wmax=result
        cc=transform(TO_M,shape(feature(c,{})["geometry"]));ss=metric(feature(s,{})["geometry"])
        if not local.is_empty and ss.intersection(local).area>.01:raise ValueError("Export overlap")
        if cc.hausdorff_distance(c)>.001:raise ValueError("Export coordinate drift")
        p={**props,"min_display_width_m":round(wmin,2),"max_display_width_m":round(wmax,2),"shift_m":round(c.hausdorff_distance(line),3)}
        centers.append(feature(c,p));surfaces.append(feature(s,p))
        total["candidate_original_length_m"]+=line.length
        total["candidate_surface_m2"]+=s.area
        if p["shift_m"]>.1:counts["shifted_candidate"]+=1
    assert baseline and surfaces,"No actual preview data"
    for name,items in (("original-links",baseline),("candidate-centers",centers),("candidate-surfaces",surfaces),("unresolved-links",unresolved),("buildings",bfeatures),("official-roads",[feature(g,{}) for g in official]),("boundary",[feature(boundary,{})])):
        write(out,name,items)
    summary={"scope":"상도1동","boundary_source":bf["properties"],"graph_sha256":hashlib.sha256(raw).hexdigest(),"building_obstacles":len(buildings),"display_buildings":len(bfeatures),"original_links":len(baseline),"candidate_links":len(centers),"unresolved_links":len(unresolved),"counts":dict(counts),"totals":{k:round(v,2) for k,v in total.items()},"constraints":{"maximum_center_shift_m":SHIFT,"minimum_display_width_m":MIN_RADIUS*2,"building_clearance_m":MARGIN,"fixed_endpoints":True},"limitations":["Display widths are estimates, not measured road widths","Unresolved links are not drawn as reconstructed road surfaces","Source walking graph and actual routing remain untouched","Only unflagged vehicle-permitted links included; bridges, paths and other facilities not replaced","Boundary crossing links outside 15m scope excluded"]}
    (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print("SANGDO_CORRIDOR_RESULT",json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":
    if "--test" in sys.argv:regression()
    else:main(pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "sangdo-corridor-review"))
