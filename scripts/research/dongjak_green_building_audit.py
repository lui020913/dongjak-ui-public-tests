#!/usr/bin/env python3
"""District-wide building/greenery audit. Reports only; never edits map assets."""
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from collections import Counter
from shapely import make_valid
from shapely.geometry import shape, mapping, Polygon, LineString, Point
from shapely.ops import transform, unary_union, polygonize
from shapely.strtree import STRtree
from pyproj import Transformer

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/"app/public"
OUT=ROOT/"audit-output/green-building"
OUT.mkdir(parents=True,exist_ok=True)
PROJ=Transformer.from_crs("EPSG:4326","EPSG:5186",always_xy=True)
def read(p): return json.loads(p.read_text(encoding="utf-8"))
def write(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding="utf-8")
def geom(f): return make_valid(transform(PROJ.transform,shape(f["geometry"])))
def line(points): return LineString([(p["lon"],p["lat"]) for p in points])
def polygon_parts(g):
    if g.geom_type=="Polygon": return [g]
    if hasattr(g,"geoms"): return [p for part in g.geoms for p in polygon_parts(part)]
    return []
def vegetation(boundary):
    # OSM is a comparison source, not cadastral or proof of demolition.
    # Request the entire district plus margin, including relation member geometry.
    query='[out:json][timeout:90];(nwr["natural"~"^(wood|scrub)$"](37.47,126.89,37.53,127.00);nwr["landuse"~"^(forest|grass|meadow)$"](37.47,126.89,37.53,127.00);nwr["leisure"~"^(park|garden)$"](37.47,126.89,37.53,127.00););out geom;'
    request=Request("https://overpass-api.de/api/interpreter",data=urlencode({"data":query}).encode(),headers={"User-Agent":"DongjakSafetyMap-GreenBuildingResearch/1.0","Accept":"application/json"})
    with urlopen(request,timeout=115) as r: payload=json.load(r)
    if payload.get("remark"): raise RuntimeError(payload["remark"])
    write(OUT/"osm-response.json",payload)
    forest=[];green=[]
    for el in payload.get("elements",[]):
        tags=el.get("tags",{})
        is_forest=tags.get("natural") in ("wood","scrub") or tags.get("landuse")=="forest"
        is_green=is_forest or tags.get("landuse") in ("grass","meadow") or tags.get("leisure") in ("park","garden")
        if not is_green: continue
        try:
            if el["type"]=="way":
                pts=el.get("geometry",[])
                if len(pts)<4 or pts[0]!=pts[-1]: continue
                g=Polygon([(p["lon"],p["lat"]) for p in pts])
            elif el["type"]=="relation" and tags.get("type")=="multipolygon":
                members=el.get("members",[])
                outer=[line(m["geometry"]) for m in members if m.get("role") in ("outer","") and len(m.get("geometry",[]))>=2]
                inner=[line(m["geometry"]) for m in members if m.get("role")=="inner" and len(m.get("geometry",[]))>=2]
                if not outer: continue
                g=unary_union(list(polygonize(unary_union(outer))))
                if inner: g=g.difference(unary_union(list(polygonize(unary_union(inner)))))
            else: continue
            g=make_valid(transform(PROJ.transform,g)).intersection(boundary)
            parts=polygon_parts(g)
            green.extend(parts)
            if is_forest: forest.extend(parts)
        except (ValueError,KeyError,TypeError): continue
    if not green or not forest: raise RuntimeError("No usable green/forest polygons; no conclusions possible")
    return unary_union(green),unary_union(forest),payload.get("osm3s",{})

def run():
    boundary=unary_union([geom(f) for f in read(DATA/"data/dongjak_sig_reference.geojson")["features"]])
    green,forest,metadata=vegetation(boundary)
    # The app's district-wide walking road network, not evidence of every access road.
    roads=[geom(f) for f in read(DATA/"data/safety/walk/dongjak_walk_links.geojson")["features"] if f.get("geometry")]
    roads=[g for g in roads if not g.is_empty and g.geom_type in ("LineString","MultiLineString")]
    if not roads: raise RuntimeError("Road evidence missing")
    tree=STRtree(roads)
    manifest=read(DATA/"buildings/manifest.json")
    stats=[];review=[];totals=Counter()
    for sheet in manifest["sheets"]:
        for kind,key in (("base","file"),("supplement","supplement")):
            rows=read(DATA/sheet[key].lstrip("/"))["features"]
            c=Counter({"input":len(rows)})
            for i,f in enumerate(rows):
                if not f.get("geometry"): c["invalid"]+=1;continue
                g=geom(f)
                if g.is_empty or g.area<=0: c["invalid"]+=1;continue
                if not boundary.covers(g.representative_point()): continue
                c["in_district"]+=1
                if not green.intersects(g): continue
                ratio=g.intersection(green).area/g.area
                forest_ratio=g.intersection(forest).area/g.area
                if ratio<=0:continue
                c["green_overlap"]+=1
                p=f.get("properties",{})
                named=any(isinstance(p.get(k),str) and p[k].strip() for k in ("name","name:ko","building_name","buildingName"))
                road_distance=g.distance(roads[tree.nearest(g)])
                # Conservative review criteria only. No unverified building is deleted.
                floors=p.get("floors")
                if floors is None and isinstance(p.get("h"),(int,float)) and p["h"]>0: floors=p["h"]/3
                if forest_ratio>=.95 and g.area<=100 and floors==1 and not named and road_distance>15:
                    category="forest_interior_review"
                elif ratio>=.95: category="green_full_overlap_review"
                else: category="partial_overlap_keep"
                c[category]+=1
                if category!="partial_overlap_keep":
                    review.append({"type":"Feature","geometry":f["geometry"],"properties":{"sheet":sheet["sheet"],"source":kind,"row":i,"area_m2":round(g.area,2),"green_ratio":round(ratio,4),"forest_ratio":round(forest_ratio,4),"road_distance_m":round(road_distance,2),"floors":floors,"named":named,"classification":category,"demolition_confirmed":False}})
            stats.append({"sheet":sheet["sheet"],"source":kind,**dict(c)})
            totals.update(c)
    summary={"scope":"Dongjak-gu reference boundary; all eight base and supplement sheets","source":"OSM Overpass (comparison only)","osm_metadata":metadata,"green_m2":round(green.area),"forest_m2":round(forest.area),"road_count":len(roads),"totals":dict(totals),"sheets":stats,"limitations":["Map source date may differ from live OpenFreeMap tiles.","OSM and road network completeness are not guaranteed.","No parcel-level demolition confirmation. No automatic removal."]}
    write(OUT/"summary.json",summary)
    write(OUT/"review.geojson",{"type":"FeatureCollection","features":review})
    print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=="__main__": run()
