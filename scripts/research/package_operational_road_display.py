"""Prepare bounded display-only assets for the operational app integration.
Uses pinned review artifacts, never overwrites authoritative app/public data.
"""
import hashlib,json,pathlib,sys,math
from collections import Counter
from shapely.geometry import shape
def read(p):return json.loads(p.read_text())
def digest(raw):return hashlib.sha256(raw).hexdigest()
def save(path,obj):
    raw=json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode()
    path.write_bytes(raw)
    return {'file':path.name,'sha256':digest(raw),'bytes':len(raw)}
def fc(fs):return {'type':'FeatureCollection','features':fs}
def bbox_union(boxes):return [min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)]
def main(hybrid,review,alignment,native,out):
    out.mkdir(parents=True,exist_ok=True)
    h=read(hybrid/'hybrid-summary.json');r=read(review/'summary.json');a=read(alignment/'summary.json');n=read(native/'native-id-eligibility.json')
    assert h['counts']['baseline_accepted']==4202 and h['counts']['reviewed_accepted']==r['candidate_links']==a['accepted_road_count']==7852
    assert r['unresolved_links']==419 and n['eligible_id_count']==259
    assert h['source_graph_sha256']==r['graph_sha256']==a['source_graph_sha256']==n['source_graph_sha256']
    data=read(hybrid/'hybrid-road-surfaces.geojson')['features']
    assert len(data)==12054
    # Assign every whole polygon to exactly one spatial bucket. Preserve all
    # original vertices/properties and publish actual bounds, including any
    # feature extending beyond its bucket, so viewport lookup cannot lose it.
    step=.005
    groups={};bounds={}
    for i,f in enumerate(data):
        g=shape(f['geometry']);assert not g.is_empty and g.is_valid
        p=g.representative_point()
        key=(math.floor(p.x/step),math.floor(p.y/step))
        groups.setdefault(key,[]).append((i,f));bounds[i]=g.bounds
    tiles=[];recovered={}
    limit=2*1024*1024
    def flush(key,part,rows):
        features=[f for _,f in rows]
        name=f'road-{key[0]}-{key[1]}-{part}.geojson'
        meta=save(out/name,fc(features))
        assert meta['bytes']<limit,(name,meta['bytes'])
        tiles.append({**meta,'bbox':bbox_union([bounds[i] for i,_ in rows]),'count':len(rows)})
        for (i,original),f in zip(rows,read(out/name)['features']):
            assert original==f and i not in recovered
            recovered[i]=f
    for key,rows in sorted(groups.items()):
        batch=[];size=42;part=0
        for i,f in rows:
            nbytes=len(json.dumps(f,ensure_ascii=False,separators=(',',':')).encode())+1
            assert nbytes<limit-128
            if batch and size+nbytes>=limit-128:
                flush(key,part,batch);batch=[];size=42;part+=1
            batch.append((i,f));size+=nbytes
        if batch:flush(key,part,batch)
    assert [recovered[i] for i in range(len(data))]==data
    # Only the display geometry of ordinary source-backed line layers is
    # eligible for static substitution; original properties and original order
    # are already checked by the reviewed alignment. Width and night require
    # their own runtime adapters; do not replace measured evidence.
    from dongjak_road_building_audit import PUBLIC
    pairs={'pri-scoped':'data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson','shared-road':'data/sangdo1-analysis-view/bocha-mixed-roads.geojson','speed':'data/road-speed/sangdo1_speed_links.geojson','slope':'data/sangdo1-analysis-view/slope.geojson','district-slope':'data/safety/slope/dongjak_walk_links_slope_visual.geojson','district-walk':'data/safety/walk/dongjak_walk_links.geojson'}
    overlays=[]
    for k,rel in pairs.items():
        raw=(PUBLIC/rel).read_bytes()
        assert digest(raw)==a['source_sha256'][rel]
        old=json.loads(raw)['features'];new=read(alignment/(k+'.geojson'))['features']
        assert len(old)==len(new)
        changed=[]
        for i,(o,f) in enumerate(zip(old,new)):
            assert o.get('properties')==f.get('properties')
            if o['geometry']!=f['geometry']:changed.append({'row':i,'geometry':f['geometry']})
        meta=save(out/f'overlay-{k}-geometry.json',{'original_sha256':digest(raw),'original_count':len(old),'changes':changed})
        overlays.append({**meta,'id':k,'original_path':'/'+rel,'original_count':len(old),'changed_count':len(changed)})
    native_meta=save(out/'native-id-eligibility.json',n)
    manifest={'schema':1,'operational_enabled':False,'graph_sha256':r['graph_sha256'],'surface_count':len(data),'counts':h['counts'],'tiles':tiles,'overlays':overlays,'native':native_meta,'remaining':419,'minzoom':16,'deferred_adapters':['width','night','pri-lighting'],'limitations':['Display geometry only. Never replace graph or PRI values.','Native source version and app browser QA required before activation.']}
    save(out/'manifest.json',manifest)
    print('OPERATIONAL_DISPLAY_ASSETS_RESULT',json.dumps({'surface_count':len(data),'tiles':len(tiles),'max_tile_bytes':max(t['bytes'] for t in tiles),'total_tile_bytes':sum(t['bytes'] for t in tiles),'overlays':{o['id']:o['changed_count'] for o in overlays},'native_ids':259,'operational_enabled':False}))
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:6]))
