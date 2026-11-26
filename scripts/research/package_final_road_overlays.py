"""Package exact reviewed overlays for the isolated comparison; no production writes."""
import hashlib,json,pathlib,sys,shutil
from dongjak_road_building_audit import PUBLIC
def read(p):return json.loads(p.read_text())
def features(p):return read(p)["features"]
def save(p,fs):p.write_text(json.dumps({"type":"FeatureCollection","features":fs},ensure_ascii=False,separators=(",",":")))
def row(f,status):
    return {**f,"properties":{**f.get("properties",{}),"review_status":status}}
def main(review,alignment,out):
    s=read(review/"summary.json");a=read(alignment/"summary.json")
    assert s["candidate_links"]==a["accepted_road_count"]==7852
    assert s["unresolved_links"]==419 and s["graph_sha256"]==a["source_graph_sha256"]
    for rel,digest in a["source_sha256"].items():assert hashlib.sha256((PUBLIC/rel).read_bytes()).hexdigest()==digest
    audit=read(alignment/"alignment-audit.json")
    pairs={
      "pri-scoped":("제도적 사각지대 / PRI","data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson"),
      "shared-road":("보차혼용도로","data/sangdo1-analysis-view/bocha-mixed-roads.geojson"),
      "speed":("제한속도","data/road-speed/sangdo1_speed_links.geojson"),
      "slope":("상도1동 경사도","data/sangdo1-analysis-view/slope.geojson"),
      "district-slope":("동작구 경사도","data/safety/slope/dongjak_walk_links_slope_visual.geojson"),
      "district-walk":("동작구 보행도로","data/safety/walk/dongjak_walk_links.geojson")
    }
    manifest=[]
    def pair(name,label,old,new,kind="line"):
        for side,fs in (("original",old),("corrected",new)):save(out/f"overlay-{name}-{side}.geojson",fs)
        manifest.append({"id":name,"label":label,"type":kind,"original":len(old),"corrected":len(new),"aligned":sum(f["properties"].get("review_status")=="aligned" for f in new)})
    for name,(label,rel) in pairs.items():
        old,new=features(PUBLIC/rel),features(alignment/(name+".geojson"))
        rows=audit[name]["rows"];assert len(old)==len(new)==len(rows)
        for i,(o,n,z) in enumerate(zip(old,new,rows)):
            assert z["row"]==i and o.get("properties")==n.get("properties")
            if z["status"]!="aligned":assert o["geometry"]==n["geometry"]
        pair(name,label,[row(f,z["status"]) for f,z in zip(old,rows)],[row(f,z["status"]) for f,z in zip(new,rows)])
    rel="data/pri/lighting_segments.json"
    old=read(PUBLIC/rel)["segments"];new=read(alignment/"pri-lighting.json")["segments"]
    rows=audit["pri-lighting"]["rows"];assert len(old)==len(new)==len(rows)
    def lighting(f,z):
        assert f["id"]==z["id"]
        return {"type":"Feature","geometry":{"type":"LineString","coordinates":[[x,y] for y,x in f["pts"]]},"properties":{"id":f["id"],"review_status":z["status"]}}
    for o,n,z in zip(old,new,rows):
        assert {k:v for k,v in o.items() if k!="pts"}=={k:v for k,v in n.items() if k!="pts"}
        if z["status"]!="aligned":assert o["pts"]==n["pts"]
    pair("lighting","PRI 조명",[lighting(f,z) for f,z in zip(old,rows) if len(f["pts"])>=2],[lighting(f,z) for f,z in zip(new,rows) if len(f["pts"])>=2])
    width=features(PUBLIC/"data/sangdo1-analysis-view/roadwidth.geojson")
    corrected=features(alignment/"width-display-candidates.geojson")
    pair("width","도로폭 (보정 후보만)",[row(f,"original") for f in width],[row(f,"aligned") for f in corrected],"fill")
    night=features(alignment/"night-sample-display-index.geojson")
    source=read(PUBLIC/"data/sangdo1-night/occlusion-road-samples.json")["lines"]
    night_old=[]
    for f in night:
        p=f["properties"];samples=source[p["way_row"]]["samples"];coords=[[samples[i]["lon"],samples[i]["lat"]] for i in (p["sample_start"],p["sample_end"])]
        night_old.append({"type":"Feature","geometry":{"type":"LineString","coordinates":coords},"properties":{**p,"review_status":"aligned"}})
    pair("night","야간 시야 (매칭 표본)",night_old,[row(f,"aligned") for f in night])
    (out/"overlay-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False))
    print("FINAL_OVERLAY_PACKAGE_OK",json.dumps(manifest,ensure_ascii=False))
if __name__=="__main__":main(*map(pathlib.Path,sys.argv[1:4]))
