"""Additional bounded road recovery and surface smoothing, isolated review only.
Keep all accepted centerlines and graph endpoints unchanged. Boundary-crossing
links use full district obstacles rather than an arbitrary pilot buffer.
"""
import json, pathlib, sys, math, shutil, hashlib
from collections import Counter
from shapely.geometry import shape, LineString, Point, box
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from shapely import make_valid
from dongjak_road_building_audit import PUBLIC, TO_M, metric, feature, polygonal
import sangdo1_road_corridor_preview as corridor
from sangdo1_joint_corridor_preview import components
def read(p):return json.loads(p.read_text())
def features(p):return read(p)["features"]
def local_union(tree,geoms,g):
    return unary_union([geoms[int(i)] for i in tree.query(g,predicate="intersects")])
def refine_surface(g,center,obs):
    # Smooth only small lobes caused by piecewise constant buffer widths.
    # The 0.44m core retains essentially all of the 0.9m minimum display width.
    core=center.buffer(.44,quad_segs=8)
    for radius in (.3,.2,.1):
        proposed=polygonal(make_valid(g.buffer(radius,quad_segs=8).buffer(-radius,quad_segs=8).buffer(-radius,quad_segs=8).buffer(radius,quad_segs=8).union(core)))
        proposed=proposed.simplify(.045,preserve_topology=True)
        if proposed.geom_type!="Polygon" or not proposed.is_valid or len(proposed.interiors)!=len(g.interiors):continue
        if abs(proposed.area-g.area)>g.area*.05 or proposed.hausdorff_distance(g)>.35:continue
        if not proposed.buffer(.002).covers(core):continue
        if not obs.is_empty and (proposed.intersection(obs).area>1e-6 or proposed.distance(obs)<.04):continue
        exported=metric(feature(proposed,{})["geometry"])
        if exported.geom_type!="Polygon" or not exported.buffer(.002).covers(core):continue
        if not obs.is_empty and exported.intersection(obs).area>1e-6:continue
        if proposed.length<g.length-.02:return proposed
    return g
def regression():
    c=LineString([(0,0),(20,0)])
    g=c.buffer(1).union(box(8,0,9,1.15))
    p=refine_surface(g,c,box(8,1.25,9,3))
    assert p.geom_type=="Polygon" and p.buffer(.002).covers(c.buffer(.44,quad_segs=8))
    assert p.intersection(box(8,1.25,9,3)).area==0
    assert p.hausdorff_distance(g)<=.35
    print("REFINEMENT_REGRESSION_OK")
def main(base,out):
    out.mkdir(parents=True,exist_ok=True)
    report=read(base/"summary.json")
    raw=(PUBLIC/"data/safety/walk/dongjak_walk_graph.json").read_bytes()
    assert hashlib.sha256(raw).hexdigest()==report["graph_sha256"]
    edges=json.loads(raw)["edges"]
    centers=features(base/"candidate-centers.geojson")
    surfaces=features(base/"candidate-surfaces.geojson")
    failed=features(base/"unresolved-links.geojson")
    moved={f["properties"]["node_id"] for f in features(base/"moved-nodes.geojson")}
    old_ids={f["properties"]["edge_index"] for f in centers}
    original_ids={f["properties"]["edge_index"] for f in features(base/"original-links.geojson")}
    fail_ids={f["properties"]["edge_index"] for f in failed}
    assert old_ids|fail_ids==original_ids and not old_ids&fail_ids
    # Cover every full pilot link including its external continuation, not just
    # the original 15m pilot boundary. No assumed missing buildings at borders.
    all_lines={i:transform(TO_M,LineString(edges[i][6])) for i in original_ids}
    coverage=unary_union([g.buffer(10) for g in all_lines.values()])
    buildings=[]
    for sheet in read(PUBLIC/"buildings/manifest.json")["sheets"]:
        for kind in ("file","supplement"):
            for f in features(PUBLIC/sheet[kind].lstrip("/")):
                g=metric(f["geometry"])
                if not g.is_empty and g.area>=.01 and g.intersects(coverage):buildings.append(g)
    bt=STRtree(buildings)
    roads=[]
    for f in features(PUBLIC/"data/dongjak_roadwidth_estimated_202610.geojson"):
        g=metric(f["geometry"])
        if not g.is_empty and g.intersects(coverage):roads.append(g)
    rt=STRtree(roads)
    district=metric(features(PUBLIC/"data/dongjak_sig_reference.geojson")[0]["geometry"])
    added_c=[];added_s=[];still=[];counts=Counter()
    # More granular search, same maximum lateral shift, width and clearance.
    corridor.STEP=.9
    corridor.OFFSETS=[0]+[v*.25 for i in range(1,13) for v in (-i,i)]
    for f in failed:
        props=f["properties"];i=props["edge_index"];line=all_lines[i]
        why=props["reason"]
        if why not in ("no_clear_cross_section","no_continuous_corridor","self_intersecting","boundary_crossing_review"):
            still.append(f);counts["protected_"+why]+=1;continue
        if any(n in moved for n in edges[i][1:3]) or not district.covers(line.buffer(8)):
            still.append(f);counts["district_or_node_guard"]+=1;continue
        region=line.buffer(8)
        obs=local_union(bt,buildings,region);known=local_union(rt,roads,region)
        result,reason=corridor.reconstruct(line,obs,known)
        if result is None:
            still.append(f);counts["unresolved_"+reason]+=1;continue
        c,s,lo,hi=result
        sf=feature(s,{});exported=metric(sf["geometry"])
        if exported.geom_type!="Polygon" or exported.intersection(obs).area>1e-6 or not exported.buffer(.002).covers(c):
            still.append(f);counts["export_guard"]+=1;continue
        props={k:v for k,v in props.items() if k!="reason"}
        props.update({"refined_recovery":True,"min_display_width_m":round(lo,2),"max_display_width_m":round(hi,2),"shift_m":round(c.hausdorff_distance(line),3)})
        added_c.append(feature(c,props));added_s.append(feature(s,props));counts["recovered_"+why]+=1
    all_c=centers+added_c;all_s=surfaces+added_s
    assert all_c[:len(centers)]==centers and all_s[:len(surfaces)]==surfaces
    by_id={f["properties"]["edge_index"]:transform(TO_M,shape(f["geometry"])) for f in all_c}
    polished=[];changed=0;before_perim=after_perim=0;conflict_count=0
    for f in all_s:
        i=f["properties"]["edge_index"];g=metric(f["geometry"]);c=by_id[i]
        obs=local_union(bt,buildings,g.buffer(.5))
        # If expanded context finds an earlier missed obstacle, preserve the
        # original review data and flag it, never mark it ready for release.
        if g.intersection(obs).area>1e-6:
            conflict_count+=1;p=g
        else:p=refine_surface(g,c,obs)
        before_perim+=g.length;after_perim+=p.length
        if not p.equals(g):changed+=1;polished.append(feature(p,{**f["properties"],"surface_refined":True}))
        else:polished.append(f)
    final=set(by_id)
    assert old_ids<=final and final|{f["properties"]["edge_index"] for f in still}==original_ids
    for name,items in (("candidate-centers",all_c),("candidate-surfaces",all_s),("smoothed-surfaces",polished),("unresolved-links",still),("refined-recovery-centers",added_c),("refined-recovery-surfaces",added_s)):
        corridor.write(out,name,items)
    for name in ("original-links","buildings","official-roads","boundary","moved-nodes"):
        shutil.copyfile(base/(name+".geojson"),out/(name+".geojson"))
    summary={**report,"previous_candidate_links":len(old_ids),"candidate_links":len(final),"unresolved_links":len(still),"additional_recovered":len(added_c),"additional_recovered_length_m":round(sum(all_lines[f["properties"]["edge_index"]].length for f in added_c),2),"refinement_counts":dict(counts),"smoothed_surfaces":changed,"perimeter_before_m":round(before_perim,2),"perimeter_after_m":round(after_perim,2),"expanded_context_conflicts":conflict_count,"updated_component_sizes":components(edges,final),"baseline_centerlines_unchanged":True,"limitations":["Experimental display surfaces, not surveyed geometry","No routing/PRI or production data changes","Unknown grade remains unresolved","Only pilot links evaluated; district expansion needs separate verification"]}
    (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print("CORRIDOR_REFINEMENT_RESULT",json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":
    if "--test" in sys.argv:regression()
    else:main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
