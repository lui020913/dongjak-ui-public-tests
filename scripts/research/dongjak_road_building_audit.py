"""District-wide source geometry audit; never edit the authoritative inputs.
Candidate differences are for map display review only, not cadastral correction.
"""
import csv, hashlib, json, pathlib, sys
from collections import Counter, defaultdict
from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, Point
from shapely.ops import transform, unary_union
from shapely.affinity import translate
from shapely.prepared import prep
from shapely.strtree import STRtree

ROOT = pathlib.Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "app/public"
TO_M = Transformer.from_crs(4326, 5186, always_xy=True).transform
TO_WGS = Transformer.from_crs(5186, 4326, always_xy=True).transform

def polygonal(g):
    if g.geom_type in ("Polygon", "MultiPolygon"):
        return g
    if hasattr(g, "geoms"):
        return unary_union([polygonal(p) for p in g.geoms])
    return Polygon()

def metric(g):
    return polygonal(make_valid(transform(TO_M, shape(g))))

def grade_flag(p):
    # Unknown grade is not evidence of at-grade construction.
    return any(str(p.get(k, "")).strip().lower() not in ("", "0", "no", "false", "none")
               for k in ("bridge", "tunnel", "covered", "layer", "level", "location"))

def clip_candidate(building, roads):
    if not roads:
        return building, Polygon()
    overlap = polygonal(building.intersection(unary_union(roads)))
    if overlap.is_empty or overlap.area < 0.01:
        return building, overlap
    return polygonal(make_valid(building.difference(overlap))), overlap

def fc(features):
    return {"type": "FeatureCollection", "features": features}

def feature(g, p):
    return {"type": "Feature", "geometry": mapping(transform(TO_WGS, g)), "properties": p}

def audit(out):
    out.mkdir(parents=True, exist_ok=True)
    road_path = PUBLIC / "data/dongjak_roadwidth_estimated_202610.geojson"
    road_features = json.loads(road_path.read_text())["features"]
    roads, attrs = [], []
    for f in road_features:
        g = metric(f["geometry"])
        if not g.is_empty:
            roads.append(g)
            attrs.append(f.get("properties") or {})
    if not roads:
        raise ValueError("No polygonal road surfaces")
    tree = STRtree(roads)
    manifest = json.loads((PUBLIC / "buildings/manifest.json").read_text())
    rows, overlap_features, candidates, sources = [], [], [], []
    boundary = prep(shape(json.loads((PUBLIC/"data/dongjak_sig_reference.geojson").read_text())["features"][0]["geometry"]))
    groups = defaultdict(Counter)
    shifts = [(dx,dy) for dx in (-2,-1,0,1,2) for dy in (-2,-1,0,1,2)]
    shift_scores = defaultdict(Counter)
    road_stats = defaultdict(Counter)
    # A translation experiment is diagnostic only; never translate source shapes automatically.
    for sheet in manifest["sheets"]:
        for kind in ("file", "supplement"):
            path = PUBLIC / sheet[kind].lstrip("/")
            raw = path.read_bytes()
            data = json.loads(raw)["features"]
            sources.append({"file": sheet[kind], "sha256": hashlib.sha256(raw).hexdigest(), "count":len(data)})
            for i, f in enumerate(data):
                props = f.get("properties") or {}
                x,y=props.get("x"),props.get("y")
                scoped=isinstance(x,(int,float)) and isinstance(y,(int,float)) and boundary.covers(Point(x,y))
                group=groups[kind] if scoped else None
                if group is not None:
                    group["input_in_local_boundary"]+=1
                g = metric(f["geometry"])
                if g.is_empty or g.area <= 0:
                    continue
                hits = [int(k) for k in tree.query(g, predicate="intersects")]
                if group is not None:
                    group["valid_polygons"]+=1
                    # Include nearby non-overlapping buildings to penalize new overlaps.
                    near=[int(k) for k in tree.query(g.buffer(3),predicate="intersects")]
                    if near:
                        road_union=unary_union([roads[k] for k in near])
                        for dx,dy in shifts:
                            area=translate(g,xoff=dx,yoff=dy).intersection(road_union).area
                            shift_scores[kind][f"{dx},{dy}"]+=area
                        group["near_road_sample"]+=1
                if not hits:
                    continue
                corrected, overlap = clip_candidate(g, [roads[k] for k in hits])
                if overlap.area < 0.01:
                    continue
                properties = f.get("properties") or {}
                flagged = grade_flag(properties) or any(grade_flag(attrs[k]) for k in hits)
                named = any(properties.get(k) for k in ("name", "name:ko", "building_name", "amenity"))
                ratio = overlap.area / g.area
                row = {"sheet":sheet["sheet"], "source":kind, "row":i,
                       "building_m2":round(g.area,3), "overlap_m2":round(overlap.area,3),
                       "overlap_ratio":round(ratio,6), "grade_flag":flagged,
                       "named_or_amenity":bool(named), "road_ids":";".join(str(attrs[k].get("RW_SN",k)) for k in hits),
                       "candidate_empty":corrected.is_empty, "review_required":True}
                row["within_local_boundary"]=scoped
                if group is not None:
                    group["overlap_count"]+=1
                    group["overlap_m2"]+=overlap.area
                    group["full_overlap_count"]+=int(corrected.is_empty)
                    bucket="under_1pct" if ratio<.01 else "1_to_5pct" if ratio<.05 else "5_to_20pct" if ratio<.2 else "20_to_50pct" if ratio<.5 else "50_to_99pct" if ratio<.99 else "99_to_100pct"
                    group[bucket]+=1
                    for k in hits:
                        area=g.intersection(roads[k]).area
                        if area>=.01:
                            key=str(attrs[k].get("RW_SN",k))
                            road_stats[key]["buildings"]+=1
                            road_stats[key]["intersection_m2"]+=area
                rows.append(row)
                overlap_features.append(feature(overlap,row))
                # Preserve named/grade-flagged features and total-overlap cases for human review.
                # No candidate is applied automatically.
                if not flagged and not named and not corrected.is_empty:
                    remaining = corrected.intersection(unary_union([roads[k] for k in hits])).area
                    if remaining > 0.01:
                        raise ValueError(f"Residual overlap: {sheet['sheet']} {kind} {i}: {remaining}")
                    candidates.append(feature(corrected,row))
    fields = ["sheet","source","row","building_m2","overlap_m2","overlap_ratio","grade_flag","named_or_amenity","road_ids","candidate_empty","review_required","within_local_boundary"]
    with (out/"overlap.csv").open("w",newline="",encoding="utf-8-sig") as fh:
        writer=csv.DictWriter(fh,fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    for name,features in (("intersection",overlap_features),("candidate-difference",candidates)):
        (out/f"{name}.geojson").write_text(json.dumps(fc(features),ensure_ascii=False,separators=(",",":")))
    summary={"road_polygon_count":len(roads),"input_sources":sources,"overlap_count":len(rows),
             "overlap_m2":round(sum(r["overlap_m2"] for r in rows),3),
             "candidate_count":len(candidates),"full_overlap_count":sum(r["candidate_empty"] for r in rows),
             "explicit_grade_flags":sum(r["grade_flag"] for r in rows),
             "limitations":["No verified grade data for untagged roads","Road polygons may be dated or incomplete","Vector basemap road and building geometry is not included","No production geometry changed"]}
    diagnostics={"boundary":"local SIG reference, approximate; same centroid criterion as app, not live boundary guarantee",
                 "groups":{k:dict(v) for k,v in groups.items()},
                 "translation_diagnostic_m2":{k:{shift:round(area,2) for shift,area in v.items()} for k,v in shift_scores.items()},
                 "top_road_ids_by_intersection":[{"road_id":k,**dict(v)} for k,v in sorted(road_stats.items(),key=lambda x:x[1]["intersection_m2"],reverse=True)[:30]],
                 "caution":"Overlap reduction alone cannot prove a translation or distinguish road errors. Original geometries unchanged."}
    (out/"alignment-diagnostics.json").write_text(json.dumps(diagnostics,ensure_ascii=False,indent=2))
    print("ALIGNMENT_DIAGNOSTICS",json.dumps(diagnostics,ensure_ascii=False))
    (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print(json.dumps(summary,ensure_ascii=False))

if __name__ == "__main__":
    audit(pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "road-building-review"))
