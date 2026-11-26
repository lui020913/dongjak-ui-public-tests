"""Recover interior corridor gaps with a bounded free-space search.
Existing successful candidates and original source assets are immutable.
Do not bypass a blocked endpoint or move a shared network node.
"""
import hashlib, heapq, json, math, pathlib, shutil, sys
from collections import Counter, defaultdict
from shapely.geometry import LineString, Point, box, shape
from shapely.ops import transform, unary_union
from shapely.prepared import prep
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC, TO_M, metric, feature
from sangdo1_road_corridor_preview import write, SHIFT, MIN_RADIUS, MARGIN, MAX_RADIUS
from sangdo1_joint_corridor_preview import components
from sangdo1_corridor_refinement import refine_surface

CELL=.35
CLEAR=MIN_RADIUS+MARGIN
def solve(original,obstacles,known):
    if original.length<.1:return None,"short"
    start,end=Point(original.coords[0]),Point(original.coords[-1])
    if not obstacles.is_empty and min(start.distance(obstacles),end.distance(obstacles))<CLEAR:
        return None,"endpoint_obstructed"
    allowed=original.buffer(SHIFT)
    if not known.is_empty and known.intersection(original).length>=.5*original.length:
        allowed=allowed.intersection(known.buffer(1).union(original.buffer(.55)))
    free=allowed if obstacles.is_empty else allowed.difference(obstacles.buffer(CLEAR+.002))
    if not free.buffer(.001).covers(start) or not free.buffer(.001).covers(end):return None,"endpoint_guard"
    safe=prep(free)
    # Enumerate along the narrow source corridor rather than its entire bbox.
    grid=set()
    n=max(1,math.ceil(original.length/(CELL*2)))
    if n>2500:return None,"oversize"
    r=math.ceil((SHIFT+CELL)/CELL)
    for k in range(n+1):
        p=original.interpolate(k/n,normalized=True)
        x,y=round(p.x/CELL),round(p.y/CELL)
        for a in range(x-r,x+r+1):
            for b in range(y-r,y+r+1):grid.add((a,b))
    coords={key:(key[0]*CELL,key[1]*CELL) for key in grid if safe.covers(Point(key[0]*CELL,key[1]*CELL))}
    S="start";T="end";coords[S]=start.coords[0];coords[T]=end.coords[0]
    def near(p):
        x,y=round(p[0]/CELL),round(p[1]/CELL)
        return [(i,j) for i in range(x-3,x+4) for j in range(y-3,y+4) if (i,j) in coords and math.dist(coords[(i,j)],p)<=1.1]
    start_near=near(coords[S]);end_near=set(near(coords[T]))
    def neighbors(u):
        if u==S:return start_near+([T] if original.length<2 else [])
        if u==T:return []
        x,y=u
        return [(x+a,y+b) for a in (-1,0,1) for b in (-1,0,1) if (a or b) and (x+a,y+b) in coords]+([T] if u in end_near else [])
    distances={S:0};parents={};queue=[(math.dist(coords[S],coords[T]),0,0,S)];counter=0
    while queue:
        _,cost,_,u=heapq.heappop(queue)
        if cost>distances[u]+1e-8:continue
        if u==T:break
        for v in neighbors(u):
            seg=LineString([coords[u],coords[v]])
            if seg.length<1e-8 or not safe.covers(seg):continue
            offset=seg.interpolate(.5,normalized=True).distance(original)
            nc=cost+seg.length*(1+.18*offset*offset)
            if nc>=distances.get(v,math.inf):continue
            distances[v]=nc;parents[v]=u;counter+=1
            heapq.heappush(queue,(nc+math.dist(coords[v],coords[T]),nc,counter,v))
    if T not in parents:return None,"no_free_path"
    path=[coords[T]];u=T
    while u!=S:u=parents[u];path.append(coords[u])
    path.reverse()
    # Simplify only where the direct segment stays within the same free space.
    simplified=[path[0]];i=0
    while i<len(path)-1:
        j=min(len(path)-1,i+14)
        while j>i+1 and not safe.covers(LineString([path[i],path[j]])):j-=1
        simplified.append(path[j]);i=j
    center=LineString(simplified)
    if not center.is_simple or center.hausdorff_distance(original)>SHIFT+.001 or center.length>original.length*1.3+1:return None,"path_guard"
    # Preserve the variable-width envelope; the minimum 0.9m is a display
    # constraint, not a surveyed road width. Width preferences come from known polygons.
    widths=[];pieces=[]
    for a,b in zip(simplified,simplified[1:]):
        seg=LineString([a,b]);mid=seg.interpolate(.5,normalized=True)
        hint=mid.distance(known.boundary) if not known.is_empty and known.covers(mid) else 1.5
        w=min(MAX_RADIUS,max(MIN_RADIUS,hint),seg.distance(obstacles)-MARGIN if not obstacles.is_empty else MAX_RADIUS)
        if w<MIN_RADIUS:return None,"clearance_guard"
        widths.append(w);pieces.append(seg.buffer(w,quad_segs=8))
    surface=unary_union(pieces)
    if surface.geom_type!="Polygon" or not surface.covers(center) or surface.intersection(obstacles).area>1e-6:return None,"surface_guard"
    return (center,surface,2*min(widths),2*max(widths)),"recovered"

def regression():
    g=LineString([(0,0),(12,0)])
    obs=box(4,-.3,8,1.5)
    result,why=solve(g,obs,box(-1,-3,13,3))
    assert why=="recovered",why
    c,s,lo,hi=result
    assert c.coords[0]==g.coords[0] and c.coords[-1]==g.coords[-1]
    assert s.intersection(obs).area<1e-6 and lo>=.9
    assert solve(g,box(-1,-1,1,1),box(-1,-3,13,3))[1]=="endpoint_obstructed"
    assert solve(g,box(4,-5,8,5),box(-1,-3,13,3))[0] is None
    print("GAP_RECOVERY_REGRESSION_OK")

def read(p):return json.loads(p.read_text())
def fs(p):return read(p)["features"]
def union_hits(tree,geoms,g):return unary_union([geoms[int(k)] for k in tree.query(g,predicate="intersects")])
def main(base,out):
    out.mkdir(parents=True,exist_ok=True)
    report=read(base/"summary.json")
    raw=(PUBLIC/"data/safety/walk/dongjak_walk_graph.json").read_bytes()
    assert hashlib.sha256(raw).hexdigest()==report["graph_sha256"]
    edges=json.loads(raw)["edges"]
    centers=fs(base/"candidate-centers.geojson");surfaces=fs(base/"candidate-surfaces.geojson")
    smooth=fs(base/"smoothed-surfaces.geojson");failed=fs(base/"unresolved-links.geojson")
    accepted={f["properties"]["edge_index"] for f in centers}
    moved={f["properties"]["node_id"] for f in fs(base/"moved-nodes.geojson")}
    lines={f["properties"]["edge_index"]:transform(TO_M,LineString(edges[f["properties"]["edge_index"]][6])) for f in failed}
    coverage=unary_union([g.buffer(10) for g in lines.values()])
    buildings=[]
    for sheet in read(PUBLIC/"buildings/manifest.json")["sheets"]:
        for kind in ("file","supplement"):
            for f in fs(PUBLIC/sheet[kind].lstrip("/")):
                g=metric(f["geometry"])
                if not g.is_empty and g.area>=.01 and g.intersects(coverage):buildings.append(g)
    bt=STRtree(buildings)
    roads=[metric(f["geometry"]) for f in fs(PUBLIC/"data/dongjak_roadwidth_estimated_202610.geojson")]
    rt=STRtree(roads)
    district=metric(fs(PUBLIC/"data/dongjak_sig_reference.geojson")[0]["geometry"])
    nc=[];ns=[];nsm=[];remaining=[];counts=Counter();node_diagnostics=defaultdict(set)
    for f in failed:
        p=f["properties"];i=p["edge_index"];g=lines[i]
        if p["reason"]=="endpoint_obstructed":
            obs=union_hits(bt,buildings,g.buffer(8))
            for node,coord in zip(edges[i][1:3],(g.coords[0],g.coords[-1])):
                if not obs.is_empty and Point(coord).distance(obs)<CLEAR:node_diagnostics[node].add(i)
            counts["protected_endpoint"]+=1;remaining.append(f);continue
        if any(n in moved for n in edges[i][1:3]) or not district.covers(g.buffer(8)):
            counts["district_or_node_guard"]+=1;remaining.append(f);continue
        obs=union_hits(bt,buildings,g.buffer(8));known=union_hits(rt,roads,g.buffer(8))
        solved,why=solve(g,obs,known)
        if solved is None:
            counts[why]+=1;remaining.append(f);continue
        c,s,lo,hi=solved
        props={k:v for k,v in p.items() if k!="reason"}
        props.update({"gap_recovery":True,"min_display_width_m":round(lo,2),"max_display_width_m":round(hi,2),"shift_m":round(c.hausdorff_distance(g),3)})
        sf=feature(s,props);cf=feature(c,props)
        ex=metric(sf["geometry"]);ec=transform(TO_M,shape(cf["geometry"]))
        if ex.geom_type!="Polygon" or ex.intersection(obs).area>1e-6 or not ex.buffer(.002).covers(ec):
            counts["export_guard"]+=1;remaining.append(f);continue
        nc.append(cf);ns.append(sf);nsm.append(feature(refine_surface(s,c,obs),props));counts["recovered"]+=1
    # Audit node incidents, including nonvehicle/special links, for future
    # atomic correction. Do not edit a shared node on a partial network.
    incident=defaultdict(list)
    for i,e in enumerate(edges):
        for n in e[1:3]:
            if n in node_diagnostics:incident[n].append(i)
    nodes=[{"node_id":n,"blocked_edge_indices":sorted(v),"incident_edges":incident[n],"accepted_incident_edges":[i for i in incident[n] if i in accepted],"protected_incident_edges":[i for i in incident[n] if edges[i][5]!=0 or edges[i][4]!="1111"]} for n,v in node_diagnostics.items()]
    recovered={f["properties"]["edge_index"] for f in nc}
    assert not accepted&recovered
    final=accepted|recovered
    assert len(final)+len(remaining)==report["original_links"]
    for name,items in (("candidate-centers",centers+nc),("candidate-surfaces",surfaces+ns),("smoothed-surfaces",smooth+nsm),("unresolved-links",remaining),("gap-recovery-centers",nc),("gap-recovery-surfaces",ns)):
        write(out,name,items)
    for name in ("original-links","buildings","official-roads","boundary","moved-nodes"):
        shutil.copyfile(base/(name+".geojson"),out/(name+".geojson"))
    (out/"blocked-node-audit.json").write_text(json.dumps(nodes,ensure_ascii=False))
    summary={**report,"previous_candidate_links":len(accepted),"candidate_links":len(final),"unresolved_links":len(remaining),"gap_recovered":len(recovered),"gap_recovery_counts":dict(counts),"blocked_node_count":len(nodes),"blocked_nodes_with_accepted_incident":sum(bool(n["accepted_incident_edges"]) for n in nodes),"blocked_nodes_with_protected_incident":sum(bool(n["protected_incident_edges"]) for n in nodes),"updated_component_sizes":components(edges,final),"baseline_centerlines_unchanged":True,"limitations":["Bounded free-space display experiment; not surveyed geometry","No moving shared nodes or editing the source graph","No production or PRI evidence changes"]}
    (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print("GAP_RECOVERY_RESULT",json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":
    if "--test" in sys.argv:regression()
    else:main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
