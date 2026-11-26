"""Display-only road-boundary correction candidates; no building edits.
A correction must keep every intersecting known building footprint, retain
road connectivity and preserve independently corroborated road corridors.
No automatic production application.
"""
import json, pathlib, sys, hashlib
from collections import Counter
from shapely.geometry import Point, LineString, Polygon, box
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from shapely.prepared import prep
from dongjak_road_building_audit import PUBLIC, TO_M, metric, feature, fc, polygonal, grade_flag
from shapely import make_valid

def parts(g):
    return len(g.geoms) if g.geom_type=="MultiPolygon" else int(not g.is_empty)

def propose(road, footprints, protected_lines):
    if not footprints:return None,"no_overlap"
    obstacle=unary_union(footprints)
    overlap=road.intersection(obstacle)
    if overlap.area<.01:return None,"no_overlap"
    if overlap.area>road.area*.05:return None,"large_road_change"
    # Preserve a 0.75m corridor around every independently supplied unflagged
    # vehicle-permitted link. This is a conservative review guard, not a surveyed width.
    if any(overlap.intersection(line.buffer(.75)).area>.01 for line in protected_lines):
        return None,"independent_corridor_conflict"
    corrected=polygonal(make_valid(road.difference(obstacle)))
    if corrected.is_empty or parts(corrected)!=parts(road):return None,"road_topology_changed"
    if len(getattr(corrected,"interiors",[]))>len(getattr(road,"interiors",[])):
        return None,"new_hole"
    if corrected.geom_type=="MultiPolygon" or road.geom_type=="MultiPolygon":
        return None,"multipart_review"
    if corrected.intersection(obstacle).area>.01:return None,"residual_overlap"
    if corrected.hausdorff_distance(road)>2:return None,"boundary_change_over_2m"
    return corrected,"review_candidate"

def main(out):
    out.mkdir(parents=True,exist_ok=True)
    boundary=prep(__import__("shapely").geometry.shape(json.loads((PUBLIC/"data/dongjak_sig_reference.geojson").read_text())["features"][0]["geometry"]))
    manifest=json.loads((PUBLIC/"buildings/manifest.json").read_text())
    buildings=[]; refs=[]
    for sheet in manifest["sheets"]:
        for kind in ("file","supplement"):
            for i,f in enumerate(json.loads((PUBLIC/sheet[kind].lstrip("/")).read_text())["features"]):
                p=f.get("properties",{});x,y=p.get("x"),p.get("y")
                if not isinstance(x,(int,float)) or not isinstance(y,(int,float)) or not boundary.covers(Point(x,y)):continue
                g=metric(f["geometry"])
                if not g.is_empty and g.area>=20:
                    buildings.append(g);refs.append((sheet["sheet"],kind,i))
    tree=STRtree(buildings)
    graph=json.loads((PUBLIC/"data/safety/walk/dongjak_walk_graph.json").read_text())
    lines=[transform(TO_M,LineString(e[6])) for e in graph["edges"] if e[5]==0 and e[4]=="1111" and len(e[6])>=2]
    line_tree=STRtree(lines)
    path=PUBLIC/"data/dongjak_roadwidth_estimated_202610.geojson"
    raw=path.read_bytes();digest=hashlib.sha256(raw).hexdigest()
    proposals=[];before=[];removed=[];context=[];stats=Counter()
    for i,f in enumerate(json.loads(raw)["features"]):
        p=f.get("properties",{});road=metric(f["geometry"])
        if road.is_empty or road.area<=0:continue
        indices=[int(k) for k in tree.query(road,predicate="intersects") if road.intersection(buildings[int(k)]).area>=.01]
        if not indices:continue
        if grade_flag(p):stats["grade_flag"]+=1;continue
        local=[lines[int(k)] for k in line_tree.query(road.buffer(1),predicate="intersects")]
        # Require independent reference; unknown road locations remain unchanged.
        if not any(road.intersection(l).length>=3 for l in local):
            stats["no_independent_reference"]+=1;continue
        candidate,reason=propose(road,[buildings[k] for k in indices],local)
        stats[reason]+=1
        if candidate is None:continue
        props={**p,"source_row":i,"source_sha256":digest,"removed_area_m2":round(road.area-candidate.area,3),
               "building_refs":[refs[k] for k in indices],"review_required":True}
        proposals.append(feature(candidate,props));before.append(feature(road,props))
        removed.append(feature(polygonal(road.difference(candidate)),props))
        for k in indices:context.append(feature(buildings[k],{"road_row":i,"building_ref":refs[k]}))
    for name,features in (("road-before",before),("road-after-candidates",proposals),("road-removed-overlap",removed),("building-context",context)):
        (out/f"{name}.geojson").write_text(json.dumps(fc(features),ensure_ascii=False,separators=(",",":")))
    summary={"review_candidates":len(proposals),"rejections":dict(stats),"source_sha256":digest,
             "removed_road_area_m2":round(sum(f["properties"]["removed_area_m2"] for f in proposals),3),
             "limitations":["Display geometry only, not authoritative road correction","Existing base-map centerlines and style widths unchanged",
                            "Preserves buildings >=20 m2 only in diagnostic local boundary","Unverified bridges and unknown source positional error remain",
                            "All proposals require visual review before application"]}
    (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    # Offline side-by-side plan preview, projected to each road's own bbox.
    from shapely.geometry import shape
    import html
    def svg(road,bs,cut=None):
        minx,miny,maxx,maxy=road.union(unary_union(bs)).bounds
        dx=max(maxx-minx,1e-8);dy=max(maxy-miny,1e-8);scale=min(340/dx,190/dy)
        def path(g):
            def ring(r):
                return "M"+" L".join(f"{12+(x-minx)*scale:.2f},{202-(y-miny)*scale:.2f}" for x,y in r.coords)+" Z"
            if g.geom_type=="Polygon":return ring(g.exterior)+"".join(ring(r) for r in g.interiors)
            if hasattr(g,"geoms"):return "".join(path(p) for p in g.geoms)
            return ""
        paths=[f'<path d="{path(road)}" fill="#ffffff" stroke="#94a3a0" stroke-width="0.7" fill-rule="evenodd"/>']
        paths.extend(f'<path d="{path(b)}" fill="#D2DCDB" stroke="#859994" stroke-width="0.7" fill-rule="evenodd"/>' for b in bs)
        if cut is not None:paths.append(f'<path d="{path(cut)}" fill="#e16c50" fill-opacity=".8" fill-rule="evenodd"/>')
        return '<svg viewBox="0 0 364 214" xmlns="http://www.w3.org/2000/svg" style="background:#e1e4dc;width:100%">'+"".join(paths)+"</svg>"
    panels=[]
    for b,a,c in zip(before,proposals,removed):
        bs=[shape(f["geometry"]) for f in context if f["properties"]["road_row"]==a["properties"]["source_row"]]
        panels.append(f'<article><h3>Road {html.escape(str(a["properties"].get("RW_SN",a["properties"]["source_row"])))} · {a["properties"]["removed_area_m2"]} m²</h3><div class="pair"><section>Before{svg(shape(b["geometry"]),bs,shape(c["geometry"]))}</section><section>Candidate{svg(shape(a["geometry"]),bs)}</section></div></article>')
    (out/"review.html").write_text('<!doctype html><meta charset="utf-8"><title>Dongjak geometry review</title><style>body{font:16px system-ui;background:#f4f6f5;color:#26352f;max-width:900px;margin:auto;padding:20px}article{background:white;padding:16px;margin:16px 0;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}svg{display:block;margin-top:8px}</style><h1>Road boundary correction candidates</h1><p>Orange: overlap. Gray: preserved building. White: road. Review only; no production edit.</p>'+"".join(panels),encoding="utf-8")
    print("ROAD_BOUNDARY_CANDIDATES",json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":
    main(pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "road-boundary-review"))
