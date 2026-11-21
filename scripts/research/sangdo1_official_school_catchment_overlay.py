#!/usr/bin/env python3
"""Clip official 2026-09-20 Korean elementary catchments to Sangdo1, then intersect
with 25m road geometries and existing provisional policy scores.

Not a legal school-zone or actual student-route evaluation. No student personal data.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import math
from collections import defaultdict
from pathlib import Path
import zipfile

import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import LineString, shape, mapping
from shapely.ops import transform, unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[2]
SHP_ZIP = ROOT / "school_catchment_20260920_official.zip"
OUT = ROOT / "app/public/data/protection-zone"
OFFICIAL_SHA256 = "66b7650d5eef3b900061083b3d8f5c8f6dcb8eb00b891e6b03132f08fdca2911"
AS_OF = "2026-09-20"
EXPECTED_FROM_2025 = {"강남초", "상현초", "은로초", "봉현초"}
ALLOWED_FIELD_COUNT = 30

def load_json(p: Path):
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def save_json(p: Path, value):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, separators=(",", ":"))

def round_m(x):
    return round(float(x), 2)

def read_raw_shapes():
    if not SHP_ZIP.exists():
        raise FileNotFoundError(f"No verified official file: {SHP_ZIP}")
    raw = SHP_ZIP.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != OFFICIAL_SHA256:
        raise RuntimeError(f"Downloaded official ZIP changed; refuse automatic overwrite: {digest}")
    z = zipfile.ZipFile(io.BytesIO(raw))
    members = {Path(n).suffix.lower(): n for n in z.namelist() if "/" not in n and Path(n).suffix.lower() in {".shp",".shx",".dbf",".prj",".cpg"}}
    if not all(k in members for k in [".shp", ".shx", ".dbf", ".prj"]):
        raise ValueError("Incomplete official shapefile components")
    prj=z.read(members[".prj"]).decode("utf-8", errors="replace")
    src=CRS.from_wkt(prj)
    cpg=z.read(members[".cpg"]).decode("ascii",errors="replace").strip() if ".cpg" in members else "cp949"
    if cpg.upper() in ("UTF-8", "UTF8", "65001"):
        encoding="utf-8"
    elif cpg.upper() in ("EUC-KR", "CP949", "949"):
        encoding="cp949"
    else:
        encoding="cp949"
    reader=shapefile.Reader(
        shp=io.BytesIO(z.read(members[".shp"])),
        shx=io.BytesIO(z.read(members[".shx"])),
        dbf=io.BytesIO(z.read(members[".dbf"])),
        encoding=encoding, encodingErrors="replace"
    )
    print("OFFICIAL_SHP_INFO",json.dumps({
        "record_count":len(reader),"fields":reader.fields[1:][:ALLOWED_FIELD_COUNT],
        "prj_crs":src.to_string(),"dbf_encoding":encoding,
        "archive_bytes":len(raw),"sha256":digest
    },ensure_ascii=False))
    return reader,src,digest

def normalize_label(props:dict) -> str:
    strval=[str(v).strip() for v in props.values() if v is not None and str(v).strip()]
    preferred=[v for v in strval if "통학구역" in v and len(v)<100]
    if preferred:return sorted(preferred,key=len)[0]
    preferred=[v for v in strval if ("초등학교" in v or "초" in v) and len(v)<100]
    if preferred:return sorted(preferred,key=len)[0]
    return next((v for v in strval if any(k in v for k in ["강남","상현","은로","봉현"])), strval[0] if strval else "미상 학구")

def from_2025_name(label:str):
    return sorted([k for k in EXPECTED_FROM_2025 if k in label])

def main():
    reader,src,digest=read_raw_shapes()
    to_proj=Transformer.from_crs("EPSG:4326",src,always_xy=True)
    to_wgs=Transformer.from_crs(src,"EPSG:4326",always_xy=True)

    boundary_g=shape(load_json(OUT/"boundary_reference.geojson")["features"][0]["geometry"])
    boundary=transform(to_proj.transform,boundary_g)
    if not boundary.is_valid: boundary=make_valid(boundary)
    xmin,ymin,xmax,ymax=boundary.bounds
    margin=600.0 # source projection in metres
    bounds_ext=(xmin-margin,ymin-margin,xmax+margin,ymax+margin)
    candidates=[]
    n_bbox=0
    for srec in reader.iterShapeRecords():
        sh=srec.shape
        if not getattr(sh,"bbox",None):continue
        bb=sh.bbox
        if bb[2]<bounds_ext[0] or bb[0]>bounds_ext[2] or bb[3]<bounds_ext[1] or bb[1]>bounds_ext[3]:
            continue
        n_bbox+=1
        geom=shape(sh.__geo_interface__)
        if not geom.is_valid:geom=make_valid(geom)
        if geom.is_empty:continue
        if not geom.intersects(boundary):continue
        area=geom.intersection(boundary).area
        if area<1.0:continue
        props=srec.record.as_dict()
        lbl=normalize_label(props)
        code_cols={k:v for k,v in props.items() if isinstance(v,(str,int,float)) and v is not None and (len(str(v))<150)}
        candidates.append({"label":lbl,"geom":geom,"intersection_m2":area,"properties":code_cols})
    print("CATCHMENT_CANDIDATES",json.dumps({
        "count_intersecting":len(candidates),"bbox_candidates":n_bbox,
        "school_zone_names":[{"name":x["label"],"intersection_m2":round_m(x["intersection_m2"]),
         "attributes":x["properties"]} for x in candidates]
    },ensure_ascii=False))
    if not candidates or len(candidates)>30:
        raise RuntimeError("Official SHP spatial filtering unexpected; no output written")

    # Keep all actual catchments intersecting Sangdo1, even if name not in 2025 XLSX.
    geoms=[x["geom"] for x in candidates]
    names=[x["label"] for x in candidates]
    clipped=[]
    for i,c in enumerate(candidates):
        geom=c["geom"].intersection(boundary)
        if geom.is_empty: continue
        # For visual display, simplify only the exported shape, never the measured geometry.
        simplified=geom.simplify(1.5,preserve_topology=True)
        clipped.append({"type":"Feature","properties":{
            "catchment_id":i+1,"catchment_name":c["label"],
            "name_match_2025":from_2025_name(c["label"]),
            "overlap_sangdo1_m2":round_m(c["intersection_m2"]),
            "source_asof":AS_OF,
            "source":"한국교육시설안전원 초등학교통학구역 SHP",
            "polygon_simplified_m":1.5,
            "not_student_route":True,
        },"geometry":mapping(transform(to_wgs.transform,simplified))})
    official_geo={
        "type":"FeatureCollection",
        "metadata":{
            "schema":"sangdo1_catchment_polygons_20260920_official_v1",
            "original_source_sha256":digest,"as_of":AS_OF,
            "coordinate_source":src.to_string(),"output_crs":"EPSG:4326",
            "boundary":"상도1동 기존 프로젝트 참고경계 (법적 경계 아님)",
            "site":"https://schoolzone.emac.kr/publicData/publicDataList.do",
            "download_attachment":"nttId=2966;atchFileId=FILE_000000100002996;fileSn=0",
            "name_classification":"원본 SHP 학구명; 2025 통학구역표와 시점 차이 존재",
            "not_legal_school_zone":True,"not_route":True
        },"features":clipped
    }

    raw_segments=load_json(ROOT/"app/public/data/pri/lighting_segments.json")["segments"]
    scores=load_json(OUT/"policy_coverage_25m_preview.json")
    score_by_id={v["id"]:v for v in scores["segments"]}
    union_geom=unary_union(geoms)
    coverage_m=0.0;total_road_m=0.0;null_geom=0;uncovered_m=0.0;multiple_match=0
    school_stats=defaultdict(lambda:{"road_m":0.0,"segment_count":0,"score_wsum":0.0,"score_length":0.0})
    roads=[]
    for segment in raw_segments:
        sid=str(segment["id"])
        pts=segment.get("pts",[])
        if len(pts)<2:
            null_geom+=1
            roads.append({"segment_id":sid,"road_name":segment.get("name",""),"road_length_m":0,
                "catchment_covered_m":None,"catchment_covered_pct":None,"assignments":[],
                "classification":"no_line_geometry","reference_policy_score":None})
            continue
        line=LineString([to_proj.transform(float(p[1]),float(p[0])) for p in pts])
        if line.length<0.01:
            null_geom+=1
            roads.append({"segment_id":sid,"road_name":segment.get("name",""),"road_length_m":0,
                "catchment_covered_m":None,"catchment_covered_pct":None,"assignments":[],
                "classification":"no_line_geometry","reference_policy_score":None})
            continue
        L=line.length
        anyL=line.intersection(union_geom).length
        if anyL>L+0.5:raise ValueError(f"Invalid intersection length {sid}: {anyL}>{L}")
        coverage_m+=anyL;total_road_m+=L;uncovered_m+=L-anyL
        assigns=[]
        score=score_by_id.get(sid,{}).get("score")
        for i,g in enumerate(geoms):
            overlap=line.intersection(g).length
            if overlap<0.05:continue
            assigns.append({"school_catchment":names[i],"road_m":round_m(overlap),
                "pct_of_road":round(overlap/L*100,1)})
            school_stats[names[i]]["road_m"]+=overlap
            school_stats[names[i]]["segment_count"]+=1
            if isinstance(score,(int,float)):
                school_stats[names[i]]["score_wsum"]+=overlap*score
                school_stats[names[i]]["score_length"]+=overlap
        assigns.sort(key=lambda x:-x["road_m"])
        if len(assigns)>1:multiple_match+=1
        classify="outside_catchment" if not assigns else ("multiple_or_shared" if len(assigns)>1 else "single_catchment")
        roads.append({"segment_id":sid,"road_name":segment.get("name",""),
            "road_length_m":round_m(L),"catchment_covered_m":round_m(anyL),
            "catchment_covered_pct":round(anyL/L*100,1),
            "assignments":assigns,"classification":classify,
            "reference_policy_score":score,
            "warning":"학교 학구=법적 어린이보호구역/실제 통학경로 아님"})

    meta={
        "schema":"sangdo1_catchment_road_overlay_20260920_v1","source_date":AS_OF,
        "source_zip_sha256":digest,"boundary":"reference_sangdo1_polygon",
        "geometry_method":"exact projected line∩official catchment polygon; metres",
        "roads_total":len(raw_segments),"roads_geometry_valid":len(raw_segments)-null_geom,
        "roads_null":null_geom,"road_geometry_m":round_m(total_road_m),
        "catchment_covered_road_m":round_m(coverage_m),
        "outside_catchment_road_m":round_m(uncovered_m),
        "multiple_match_road_segments":multiple_match,
        "catchment_count":len(candidates),
        "catchment_school_names":[x["label"] for x in candidates],
        "school_breakdown":[{"catchment_name":name,
                "road_length_m":round_m(stat["road_m"]),
                "road_segments":stat["segment_count"],
                "reference_policy_score_mean":round(stat["score_wsum"]/stat["score_length"],1) if stat["score_length"] else None
            } for name,stat in sorted(school_stats.items())],
        "score_mean_label":"기존 19시설 접근성 기반 잠정 지수의 중첩연장 가중평균. 통학구역 자체의 위험점수는 아님",
        "school_assignment_not_student_route":True,
        "main_entrance_not_required":True,
        "official_protection_zones_source":"separate police polygons, not catchment data",
        "caution":"원본 학교별 통학구역은 통학로·법정 어린이보호구역이 아니며, 한 구간에 여러 학구가 교차할 수 있음"
    }
    csvpath=OUT/"sangdo1_road_catchment_overlay_20260920.csv"
    with csvpath.open("w",encoding="utf-8-sig",newline="") as file:
        fieldnames=["segment_id","road_name","road_length_m","catchment_covered_m","catchment_covered_pct","classification",
                    "catchment_names","reference_policy_score"]
        w=csv.DictWriter(file,fieldnames=fieldnames)
        w.writeheader()
        for x in roads:
            row={k:x.get(k) for k in fieldnames if k!="catchment_names"}
            row["catchment_names"]=";".join(y["school_catchment"] for y in x["assignments"])
            w.writerow(row)
    save_json(OUT/"sangdo1_school_catchment_polygons_20260920.geojson",official_geo)
    save_json(OUT/"sangdo1_road_catchment_overlay_20260920.json",{"meta":meta,"segments":roads})
    save_json(OUT/"sangdo1_school_catchment_analysis_20260920_summary.json",meta)
    print("OFFICIAL_SPATIAL_OVERLAY_RESULT",json.dumps(meta,ensure_ascii=False))
    print("OFFICIAL_SPATIAL_OUTPUTS",json.dumps([
        {"name":p.name,"bytes":p.stat().st_size} for p in [
            OUT/"sangdo1_school_catchment_polygons_20260920.geojson",
            OUT/"sangdo1_road_catchment_overlay_20260920.csv",
            OUT/"sangdo1_road_catchment_overlay_20260920.json",
            OUT/"sangdo1_school_catchment_analysis_20260920_summary.json"
        ]
    ],ensure_ascii=False))

if __name__=="__main__":
    main()
