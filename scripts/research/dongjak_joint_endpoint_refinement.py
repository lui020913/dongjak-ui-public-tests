"""Joint endpoint correction on top of the frozen successful baseline.
Every incident graph edge must be eligible and repaired atomically.
No production assets, routing, or PRI are modified.
"""
import json, math, pathlib, sys, shutil, hashlib
from dongjak_corridor_gap_recovery import solve
from sangdo1_corridor_refinement import refine_surface
from collections import Counter, defaultdict
from shapely.geometry import Point, LineString, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from sangdo1_road_corridor_preview import reconstruct, SHIFT, MIN_RADIUS, MARGIN, write
from dongjak_road_building_audit import PUBLIC, TO_M, metric, feature

def read(path):return json.loads(path.read_text())
def components(edges, ids):
    adj=defaultdict(set)
    for i in ids:
        a,b=edges[i][1:3];adj[a].add(b);adj[b].add(a)
    seen=set();sizes=[]
    for a in adj:
        if a in seen:continue
        stack=[a];seen.add(a);n=0
        while stack:
            u=stack.pop();n+=1
            for v in adj[u]-seen:seen.add(v);stack.append(v)
        sizes.append(n)
    return sorted(sizes,reverse=True)

def main(base,out):
    out.mkdir(parents=True,exist_ok=True)
    summary=read(base/"summary.json")
    gp=PUBLIC/"data/safety/walk/dongjak_walk_graph.json";raw=gp.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==summary["graph_sha256"]
    edges= json.loads(raw)["edges"]
    lines={i:transform(TO_M,LineString(e[6])) for i,e in enumerate(edges) if len(e)>=7 and len(e[6])>=2}
    incident=defaultdict(list)
    for i,e in enumerate(edges):
        incident[e[1]].append((i,0));incident[e[2]].append((i,-1))
    scope=metric(read(base/"boundary.geojson")["features"][0]["geometry"])
    buildings=[]
    for sheet in read(PUBLIC/"buildings/manifest.json")["sheets"]:
        for kind in ("file","supplement"):
            for f in read(PUBLIC/sheet[kind].lstrip("/"))["features"]:
                g=metric(f["geometry"])
                if not g.is_empty and g.area>=.01 and g.intersects(scope):buildings.append(g)
    # Expanded district source coverage is audited before local acceptance.
    bt=STRtree(buildings)
    official=[metric(f["geometry"]) for f in read(base/"official-roads.geojson")["features"]]
    rt=STRtree(official)
    old_centers=read(base/"candidate-centers.geojson")["features"]
    old_surfaces=read(base/"candidate-surfaces.geojson")["features"]
    old_smooth=read(base/"smoothed-surfaces.geojson")["features"]
    prior_nodes=read(base/"moved-nodes.geojson")["features"]
    protected_nodes={f['properties']['node_id'] for f in prior_nodes}
    success={f["properties"]["edge_index"] for f in old_centers}
    failures={f["properties"]["edge_index"]:f for f in read(base/"unresolved-links.geojson")["features"]}
    baseline={f["properties"]["edge_index"] for f in read(base/"original-links.geojson")["features"]}
    assert success|set(failures)==baseline and not success&set(failures)
    context={}
    def ctx(i):
        if i not in context:
            region=lines[i].buffer(8)
            context[i]=(unary_union([buildings[int(k)] for k in bt.query(region,predicate="intersects")]),unary_union([official[int(k)] for k in rt.query(region,predicate="intersects")]))
        return context[i]
    def point(i,end):return Point(lines[i].coords[end])
    blocked=set()
    for i,f in failures.items():
        if f["properties"]["reason"]!="endpoint_obstructed":continue
        obs,_=ctx(i)
        for end,node in ((0,edges[i][1]),(-1,edges[i][2])):
            if not obs.is_empty and point(i,end).distance(obs)<MIN_RADIUS+MARGIN:blocked.add(node)
    reasons=Counter(); movable={};anchors={}
    for node in sorted(blocked):
        refs=incident[node]
        if node in protected_nodes or any(i not in failures or i not in lines or edges[i][5]!=0 or edges[i][4]!="1111" or any(n in protected_nodes for n in edges[i][1:3]) for i,_ in refs):
            reasons["protected_incident_link"]+=1;continue
        if any(not scope.covers(lines[i].buffer(8)) for i,_ in refs):
            reasons["boundary_guard"]+=1;continue
        anchor=point(*refs[0])
        if any(anchor.distance(point(i,end))>.1 for i,end in refs):
            reasons["inconsistent_source_endpoint"]+=1;continue
        if not all(failures[i]["properties"]["reason"] in ("endpoint_obstructed","no_clear_cross_section","no_continuous_corridor","self_intersecting") for i,_ in refs):
            reasons["other_failure"]+=1;continue
        obs=unary_union([ctx(i)[0] for i,_ in refs])
        opts=[]
        for ix in range(-12,13):
            for iy in range(-12,13):
                p=Point(anchor.x+ix*.25,anchor.y+iy*.25)
                if math.hypot(ix,iy)*.25>SHIFT or (not obs.is_empty and p.distance(obs)<MIN_RADIUS+MARGIN):continue
                if any(p.distance(point(i,end))>SHIFT for i,end in refs):continue
                opts.append(p)
        opts.sort(key=lambda p:(p.distance(anchor),-p.distance(obs) if not obs.is_empty else 0))
        if not opts:reasons["no_free_node_position"]+=1;continue
        anchors[node]=anchor
        # Keep near and diverse clearance alternatives, not only clustered nearest positions.
        choices=[]
        for p in opts:
            if all(p.distance(q)>=.45 for q in choices):choices.append(p)
            if len(choices)>=10:break
        movable[node]=choices
    # Shared endpoints form small atomic groups. Larger groups remain for review.
    groups=[];remaining=set(movable)
    while remaining:
        seed=min(remaining);group={seed};stack=[seed];remaining.remove(seed)
        while stack:
            node=stack.pop()
            for i,_ in incident[node]:
                for v in edges[i][1:3]:
                    if v in remaining:remaining.remove(v);group.add(v);stack.append(v)
        groups.append(sorted(group))
    new_centers=[];new_surfaces=[];new_smooth=[];moved_nodes=[];recovered=set()
    for group in groups:
        if len(group)>3:reasons["multi_node_group_review"]+=len(group);continue
        affected=sorted({i for node in group for i,_ in incident[node]})
        if any(v in blocked and v not in group for i in affected for v in edges[i][1:3]):
            reasons["adjacent_protected_node"]+=len(group);continue
        from itertools import product
        choices=list(product(*(movable[n] for n in group)))
        choices.sort(key=lambda ps:sum(p.distance(anchors[n]) for n,p in zip(group,ps)))
        accepted=None
        cache={}
        for ps in choices[:96]:
            changes=dict(zip(group,ps));trial=[]
            for i in affected:
                line=lines[i];obs,known=ctx(i);u,v=edges[i][1:3]
                a=changes.get(u,point(i,0));b=changes.get(v,point(i,-1))
                key=(i,a.x,a.y,b.x,b.y)
                if key not in cache:
                    result,reason=reconstruct(line,obs,known,(a,b))
                    if result is None:result,reason=solve(line,obs,known,(a,b))
                    cache[key]=(result,reason)
                result,reason=cache[key]
                if result is None:break
                c,s,lo,hi=result
                # Actual exported geometry must pass zero-overlap and connectivity checks.
                cs=feature(c,{});ss=feature(s,{})
                exported=transform(TO_M,shape(cs["geometry"]));surface=metric(ss["geometry"])
                if (not obs.is_empty and surface.intersection(obs).area>.01) or not surface.buffer(.001).covers(exported):break
                if not surface.buffer(.001).covers(a) or not surface.buffer(.001).covers(b):break
                if Point(exported.coords[0]).distance(a)>.001 or Point(exported.coords[-1]).distance(b)>.001:break
                props={k:v for k,v in failures[i]["properties"].items() if k!="reason"}
                props.update({"joint_node_correction":True,"min_display_width_m":round(lo,2),"max_display_width_m":round(hi,2),"shift_m":round(c.hausdorff_distance(line),3)})
                trial.append((i,feature(c,props),feature(s,props),feature(refine_surface(s,c,obs),props)))
            if len(trial)==len(affected):
                accepted=(changes,trial);break
        if accepted is None:reasons["no_atomic_solution"]+=len(group);continue
        changes,trial=accepted
        for node,p in changes.items():
            moved_nodes.append(feature(p,{"node_id":node,"shift_m":round(p.distance(anchors[node]),3),"incident_count":len(incident[node])}))
        for i,c,s,sm in trial:
            assert i not in success and i not in recovered
            recovered.add(i);new_centers.append(c);new_surfaces.append(s);new_smooth.append(sm)
    all_centers=old_centers+new_centers;all_surfaces=old_surfaces+new_surfaces
    # Frozen baseline features are byte-equivalent as parsed GeoJSON objects.
    assert all_centers[:len(old_centers)]==old_centers and all_surfaces[:len(old_surfaces)]==old_surfaces
    remaining_fail=[f for i,f in failures.items() if i not in recovered]
    for name,features in (("candidate-centers",all_centers),("candidate-surfaces",all_surfaces),("unresolved-links",remaining_fail),("joint-node-centers",new_centers),("joint-node-surfaces",new_surfaces),("moved-nodes",prior_nodes+moved_nodes),("smoothed-surfaces",old_smooth+new_smooth)):
        write(out,name,features)
    for name in ("original-links","buildings","official-roads","boundary"):
        shutil.copyfile(base/(name+".geojson"),out/(name+".geojson"))
    final=success|recovered
    report={**summary,"baseline_success":len(success),"joint_recovered":len(recovered),"candidate_links":len(final),"unresolved_links":len(remaining_fail),"original_links":len(baseline),"moved_nodes":len(moved_nodes),"blocked_nodes":len(blocked),"eligible_nodes":len(movable),"reasons":dict(reasons),"recovered_length_m":round(sum(lines[i].length for i in recovered),2),"baseline_component_sizes":components(edges,success),"updated_component_sizes":components(edges,final),"original_component_sizes":components(edges,baseline),"baseline_unchanged":True,"graph_sha256":summary["graph_sha256"],"limitations":["Graph component counts reflect source node IDs, not proof of actual road connectivity","All incident links checked before moving a node","No measured positions; display-only candidate; no production edits","At most three blocked nodes jointly explored, 96 position combinations per group; preserve prior moved nodes"]}
    (out/"summary.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print("JOINT_REFINEMENT_RESULT",json.dumps(report,ensure_ascii=False))
if __name__=="__main__":main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
