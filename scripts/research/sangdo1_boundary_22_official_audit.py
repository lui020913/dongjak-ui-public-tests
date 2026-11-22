#!/usr/bin/env python3
"""Validate the 22 clipped Sangdo1 boundary roads against the exact official
2026-09-20 elementary catchment SHP. Research-only and read-only:
never manufacture a middle-school school-zone, or change PRI risk scores.
"""
from __future__ import annotations
import csv
import hashlib
import importlib.util
import json
import math
from pathlib import Path
from shapely.geometry import shape
from shapely.ops import transform, unary_union
from pyproj import Transformer

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/"app/public/data/protection-zone"
SOURCE=ROOT/"scripts/research/sangdo1_official_school_catchment_overlay.py"
spec=importlib.util.spec_from_file_location("sangdo1_official",SOURCE)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def main():
    reader,src,sha=mod.read_raw_shapes()
    to_proj=Transformer.from_crs("EPSG:4326",src,always_xy=True)
    geo=json.loads((DATA/"sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson").read_text(encoding="utf8"))
    boundary=transform(to_proj.transform,shape(json.loads((DATA/"boundary_reference.geojson").read_text(encoding="utf8"))["features"][0]["geometry"]))
    with (DATA/"sangdo1_policy_gap_2factor_adminscope_300m_20261122.csv").open(encoding="utf8",newline="") as f:
        raw=list(csv.DictReader(f))
    clipped={f["properties"]["segment_id"]:f for f in geo["features"] if f["properties"].get("boundary_scope")=="crossing"}
    rows=[r for r in raw if r["boundary_scope"]=="crossing"]
    assert len(rows)==len(clipped)==22
    assert len({r["segment_id"] for r in rows})==22
    geoms={}
    for rec in reader.iterShapeRecords():
        if not getattr(rec.shape,"bbox",None):continue
        box=rec.shape.bbox
        if box[2]<boundary.bounds[0] or box[0]>boundary.bounds[2] or box[3]<boundary.bounds[1] or box[1]>boundary.bounds[3]:continue
        poly=shape(rec.shape.__geo_interface__)
        if not poly.is_valid:poly=poly.buffer(0)
        if poly.is_empty or not poly.intersects(boundary):continue
        if poly.intersection(boundary).area<1:continue
        label=mod.normalize_label(rec.record.as_dict())
        geoms.setdefault(label,[]).append(poly)
    assert len(geoms)==8, f"Official catchment count changed {list(geoms)}"
    school_prefix={"서울강남초등학교":"서울강남초","서울상현초등학교":"서울상현초"}
    prepared={name:unary_union(polys) for name,polys in geoms.items()}
    union=unary_union(list(prepared.values()))
    report=[]
    for row in rows:
        seg=clipped[row["segment_id"]]
        line=transform(to_proj.transform,shape(seg["geometry"]))
        assert line.length>0
        intersect_m=line.intersection(union).length
        overlaps=[]
        for name,geom in prepared.items():
            metres=line.intersection(geom).length
            if metres>0.001:
                overlaps.append({"catchment":name,"metres":round(metres,4),"percent":round(100*metres/line.length,3)})
        overlaps.sort(key=lambda x:-x["metres"])
        child=row["child_nearest_facility"]
        possible_school=school_prefix.get(child)
        school_match=[x for x in overlaps if possible_school and possible_school in x["catchment"]]
        is_protected=row["child_status"]=="protected_300m"
        base=float(row["child_distance_base_score"]) if row["child_distance_base_score"] else None
        child_score=float(row["child_new_score"]) if row["child_new_score"] else None
        # The live model uses school factor only for an identical primary school.
        # Legal registered polygon protection overrides it to risk 0.
        invariant=(not possible_school or (is_protected and base==0.0 and child_score==0.0))
        report.append({
            "segment_id":row["segment_id"],"road_name":row["road_name"],
            "clipped_length_m":round(line.length,4),
            "official_catchment_covered_pct":round(100*intersect_m/line.length,3),
            "official_catchments":overlaps,
            "nearest_child_facility":child or None,
            "same_elementary_school_overlap_pct":round(sum(x["metres"] for x in school_match)/line.length*100,3) if possible_school else None,
            "original_child_score":child_score,
            "original_combined_score":float(row["combined_new_score"]) if row["combined_new_score"] else None,
            "registered_polygon_protected":is_protected,
            "risk_score_invariant_for_any_school_overlap":invariant,
        })
    stats={"official_sha256":sha,"official_source_date":"2026-09-20","boundary_crossing_count":len(report),
     "nearest_matching_elementary":sum(x["nearest_child_facility"] in school_prefix for x in report),
     "already_protected_matching_elementary":sum(x["nearest_child_facility"] in school_prefix and x["registered_polygon_protected"] for x in report),
     "score_invariant_count":sum(x["risk_score_invariant_for_any_school_overlap"] for x in report),
     "new_risk_score_needed_count":sum(not x["risk_score_invariant_for_any_school_overlap"] for x in report),
     "note":"Current model evaluates same elementary school catchment only; registered protection polygon has risk 0. Exact official SHP may refine explanatory overlap, not necessarily change scores.",
     "rows":report}
    committed_path=DATA/"sangdo1_22_clipped_official_catchment_audit_20261122.json"
    if committed_path.exists():
        committed=json.loads(committed_path.read_text(encoding="utf8"))
        assert committed["schema"]=="sangdo1_22_boundary_exact_school_catchment_audit_v1"
        assert committed["source_original_sha256"]==sha
        assert committed["road_segment_count"]==22 and committed["score_change_required"]==0
        assert committed["rows"]==report, "Committed official overlap evidence changed; reject unverified values"
        print("COMMITTED_BOUNDARY_AUDIT_VERIFIED",len(report),sha)
    output=ROOT/"research-results"
    output.mkdir(exist_ok=True)
    (output/"sangdo1_22_official_school_catchment_audit.json").write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding="utf8")
    print("EXACT_22_BOUNDARY_AUDIT",json.dumps({k:v for k,v in stats.items() if k!="rows"},ensure_ascii=False))
    print("EXACT_22_BOUNDARY_ROWS",json.dumps(report,ensure_ascii=False,separators=(",",":")))
    # No implementation claim if any active score can change: require manual review.
    assert stats["new_risk_score_needed_count"]==0, "Some scores need official school overlay recomputation"
if __name__=="__main__":main()
