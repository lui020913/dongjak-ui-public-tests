"""Independent street-link corroboration and live style inventory, no edits."""
import json, csv, pathlib, sys, math, urllib.request
from collections import Counter
from shapely.geometry import shape, LineString, Point
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC, TO_M, metric, feature, fc

def main(out):
    out.mkdir(parents=True,exist_ok=True)
    graph=json.loads((PUBLIC/"data/safety/walk/dongjak_walk_graph.json").read_text())
    lines=[]; ids=[]
    for e in graph["edges"]:
        # Restrict to unflagged outdoor vehicle-permitted links. Excluded links
        # may include indoor paths, crosswalks, bridges or tunnels; no inference
        # that a path line is a surveyed road centerline.
        if e[5] != 0 or e[4] != "1111" or len(e[6])<2:
            continue
        line=transform(TO_M,LineString(e[6]))
        if not line.is_empty and line.length>0:
            lines.append(line); ids.append(str(e[0]))
    index=STRtree(lines)
    road_features=json.loads((PUBLIC/"data/dongjak_roadwidth_estimated_202610.geojson").read_text())["features"]
    road_shapes=[metric(f["geometry"]) for f in road_features]
    roads=STRtree(road_shapes)
    manifest=json.loads((PUBLIC/"buildings/manifest.json").read_text())
    summary=Counter(); evidence=[]
    for sheet in manifest["sheets"]:
        for kind in ("file","supplement"):
            data=json.loads((PUBLIC/sheet[kind].lstrip("/")).read_text())["features"]
            for i,f in enumerate(data):
                b=metric(f["geometry"])
                if b.is_empty or b.area<=0:
                    continue
                hits=roads.query(b,predicate="intersects")
                if not len(hits):
                    continue
                overlap=b.intersection(unary_union([road_shapes[int(k)] for k in hits]))
                if overlap.area<0.01:
                    continue
                summary["polygon_overlap"]+=1
                # Require both independent datasets to enter the building's
                # interior, not merely graze a shared boundary.
                interior=b.buffer(-0.5)
                corroborated=interior.intersection(overlap)
                if corroborated.is_empty:
                    summary["edge_only"]+=1
                    continue
                matches=[]
                for k in index.query(corroborated,predicate="intersects"):
                    k=int(k)
                    length=lines[k].intersection(corroborated).length
                    if length>=1:
                        matches.append((ids[k],round(length,2)))
                if matches:
                    summary["independent_link_intersection"]+=1
                    evidence.append(feature(overlap,{"sheet":sheet["sheet"],"source":kind,"row":i,
                        "overlap_m2":round(overlap.area,3),"building_m2":round(b.area,3),
                        "link_ids":";".join(k for k,_ in matches),"link_length_m":round(sum(v for _,v in matches),2),
                        "decision":"review_required_not_verified_geometry"}))
                else:
                    summary["no_independent_link_inside"]+=1
    result={"unflagged_vehicle_links":len(lines),"counts":dict(summary),
            "limitations":["Walking links are not surveyed road centerlines","Not all road surfaces have a matching unflagged link","Does not prove which geometry is incorrect"]}
    (out/"independent-link-evidence.geojson").write_text(json.dumps(fc(evidence),ensure_ascii=False))
    (out/"independent-link-summary.json").write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print("INDEPENDENT_LINK_DIAGNOSTICS",json.dumps(result))
    # Preserve exact live style widths and filters rather than guessing a
    # uniform width. Provider network failure does not invalidate GIS results.
    url="https://tiles.openfreemap.org/styles/bright"
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Dongjak GIS review"}),timeout=20) as response:
            style=json.load(response)
        layers=[{"id":l["id"],"type":l["type"],"filter":l.get("filter"),"minzoom":l.get("minzoom"),
                 "paint":{k:v for k,v in l.get("paint",{}).items() if k in ("line-width","line-gap-width","line-offset","line-color","fill-color")}}
                for l in style["layers"] if l.get("source-layer")=="transportation" and l.get("type") in ("line","fill")]
        result={"style_url":url,"transport_layers":layers,"status":"ok" if layers else "no_matching_layers",
                "note":"Style widths are screen pixels and do not establish actual road widths."}
    except Exception as exc:
        result={"style_url":url,"status":"unavailable","error":str(exc)}
    (out/"live-road-style.json").write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print("LIVE_ROAD_STYLE",json.dumps({"status":result["status"],"layer_count":len(result.get("transport_layers",[]))}))

if __name__=="__main__":
    main(pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "road-link-review"))
