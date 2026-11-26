"""Cross-source triage for residual links and green building candidates.
OSM is corroborating evidence, not demolition/grade or cadastral proof.
Never changes application assets, route edges, scores or building geometries.
"""
import hashlib,json,pathlib,sys,time
from collections import Counter,defaultdict
from urllib.request import Request,urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError,URLError
from shapely import make_valid
from shapely.geometry import shape,Polygon,LineString
from shapely.ops import transform,unary_union,polygonize
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,TO_M,metric,polygonal,feature
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
def fetch(out):
    elements={};metadata=[]
    for south,north in ((37.47,37.50),(37.50,37.53)):
      for west,east in ((126.89,126.945),(126.945,127.00)):
        bbox=f'{south},{west},{north},{east}'
        query=f'[out:json][timeout:90];(wr["building"]({bbox});way["highway"]({bbox}););out geom;'
        for attempt in range(3):
          try:
            req=Request('https://overpass-api.de/api/interpreter',data=urlencode({'data':query}).encode(),headers={'User-Agent':'DongjakSafetyMap/source-review/1.0','Accept':'application/json'})
            with urlopen(req,timeout=120) as r:d=json.load(r)
            if d.get('remark') or not isinstance(d.get('elements'),list):raise RuntimeError('Incomplete OSM response')
            break
          except (HTTPError,URLError,TimeoutError,RuntimeError):
            if attempt==2:raise
            time.sleep(15*(attempt+1))
        for e in d['elements']:elements[(e['type'],e['id'])]=e
        metadata.append({'bbox':bbox,'timestamp':d.get('osm3s',{}).get('timestamp_osm_base'),'count':len(d['elements'])})
        print('OSM_SOURCE_TILE',bbox,len(d['elements']),flush=True)
        time.sleep(3)
    result={'elements':list(elements.values()),'metadata':metadata}
    write(out/'osm-source-response.json',result);return result
def coords(el):return [(p['lon'],p['lat']) for p in el.get('geometry',[])]
def building(el):
    if el['type']=='way':
        p=coords(el)
        if len(p)<4 or p[0]!=p[-1]:return None
        g=Polygon(p)
    else:
        def lines(roles):return [LineString(coords(m)) for m in el.get('members',[]) if m.get('role','') in roles and len(coords(m))>=2]
        outer=lines(('outer',''));inner=lines(('inner',))
        if not outer:return None
        g=unary_union(list(polygonize(unary_union(outer))))
        if inner:g=g.difference(unary_union(list(polygonize(unary_union(inner)))))
    return polygonal(make_valid(transform(TO_M,g)))
def grade(tags):
    return any(str(tags.get(k,'')).lower() not in ('','no','0','false','none') for k in ('bridge','tunnel','layer','level','covered','location'))
def main(residual,green,out):
    out.mkdir(parents=True,exist_ok=True)
    rows=read(residual/'source-evidence.json');assert len(rows)==419
    gsummary=read(green/'summary.json')
    assert gsummary['scope'].startswith('Dongjak-gu')
    graph=(PUBLIC/'data/safety/walk/dongjak_walk_graph.json').read_bytes()
    assert hashlib.sha256(graph).hexdigest()==read(residual/'summary.json')['graph_sha256']
    edges=json.loads(graph)['edges']
    refs=defaultdict(set)
    for r in rows:
        for b in r['blocking_buildings']:refs[(b['file'],b['row'])].add(r['edge_index'])
    # Include all green review records, not merely two screenshot neighborhoods.
    manifest=read(PUBLIC/'buildings/manifest.json')
    sheets={s['sheet']:s for s in manifest['sheets']}
    green_refs={}
    for f in read(green/'review.geojson')['features']:
        p=f['properties'];key=(sheets[p['sheet']]['file' if p['source']=='base' else 'supplement'],p['row'])
        green_refs[key]=p['classification']
    target=set(refs)|set(green_refs)
    wanted=defaultdict(set)
    for file,i in target:wanted[file].add(i)
    gis={}
    for file,indices in wanted.items():
        raw=(PUBLIC/file.lstrip('/')).read_bytes()
        expected=read(residual/'summary.json')['source_hashes'].get(file)
        if expected:assert hashlib.sha256(raw).hexdigest()==expected
        fs=json.loads(raw)['features']
        for i in indices:gis[(file,i)]=metric(fs[i]['geometry'])
    assert len(gis)==len(target)
    payload=fetch(out)
    osmb=[];bm=[];osmr=[];rm=[]
    for e in payload['elements']:
        t=e.get('tags',{})
        if t.get('building') not in (None,'no','demolished','razed'):
            g=building(e)
            if g is not None and not g.is_empty and g.area>.01:
                osmb.append(g);bm.append({'osm_type':e['type'],'osm_id':e['id'],'building':t.get('building'),'name':t.get('name'),'grade':grade(t)})
        if e['type']=='way' and t.get('highway') and len(coords(e))>=2:
            l=transform(TO_M,LineString(coords(e)))
            if not l.is_empty and l.length>.1:osmr.append(l);rm.append({'osm_id':e['id'],'highway':t['highway'],'grade':grade(t)})
    assert osmb and osmr
    bt=STRtree(osmb);rt=STRtree(osmr);records=[];features=[];counts=Counter();gc=Counter()
    for key,g in gis.items():
        if g.is_empty or g.area<=0:continue
        bh=[]
        for i in bt.query(g,predicate='intersects'):
            i=int(i);a=g.intersection(osmb[i]).area
            if a>.01:bh.append({**bm[i],'gis_coverage':round(a/g.area,4),'osm_coverage':round(a/osmb[i].area,4)})
        bh.sort(key=lambda x:-x['gis_coverage'])
        matched=any(x['gis_coverage']>=.7 and x['osm_coverage']>=.5 for x in bh)
        rh=[]
        for i in rt.query(g.buffer(.1),predicate='intersects'):
            i=int(i);length=g.intersection(osmr[i]).length
            if length>.2:rh.append({**rm[i],'inside_m':round(length,3)})
        ground=any(not x['grade'] for x in rh)
        elevated=any(x['grade'] for x in rh)
        if matched:category='corroborated_building_protect'
        elif elevated:category='vertical_separation_review'
        elif ground:category='ground_road_conflict_review'
        elif bh:category='partial_building_match_review'
        else:category='no_osm_building_match_insufficient_evidence'
        counts[category]+=1
        if key in green_refs:gc[category]+=1
        record={'file':key[0],'row':key[1],'category':category,'green_review':green_refs.get(key),'blocking_links':sorted(refs.get(key,())),'osm_building_matches':bh,'osm_road_crossings':rh}
        records.append(record);features.append(feature(g,{k:v for k,v in record.items() if k not in ('blocking_links','osm_building_matches','osm_road_crossings')}))
    linkcounts=Counter();linkrows=[]
    bykey={(r['file'],r['row']):r for r in records}
    for r in rows:
        i=r['edge_index'];l=transform(TO_M,LineString(edges[i][6]))
        hits=[int(k) for k in rt.query(l.buffer(1.5),predicate='intersects')]
        ground=unary_union([osmr[k].buffer(1.5) for k in hits if not rm[k]['grade']])
        cov=l.intersection(ground).length/l.length if l.length else 0
        cs=Counter(bykey[(b['file'],b['row'])]['category'] for b in r['blocking_buildings'] if (b['file'],b['row']) in bykey)
        if cs['corroborated_building_protect']:status='protect_building_review_road_alignment'
        elif cs['vertical_separation_review']:status='verify_grade'
        elif cov>=.9 and cs['ground_road_conflict_review']:status='cross_source_road_conflict_priority'
        else:status='insufficient_independent_evidence'
        linkcounts[status]+=1
        linkrows.append(feature(l,{'edge_index':i,'source_category':r['category'],'status':status,'osm_ground_coverage':round(cov,4)}))
    assert sum(linkcounts.values())==419
    write(out/'building-evidence.json',records)
    write(out/'building-evidence.geojson',{'type':'FeatureCollection','features':features})
    write(out/'residual-link-priorities.geojson',{'type':'FeatureCollection','features':linkrows})
    result={'building_records_reviewed':len(records),'green_candidates_reviewed':sum(gc.values()),'residual_links_reviewed':len(rows),'building_categories':dict(counts),'green_categories':dict(gc),'link_priorities':dict(linkcounts),'source_tiles':payload['metadata'],'source_graph_sha256':hashlib.sha256(graph).hexdigest(),'production_changes':False,'limitations':['OSM and OpenFreeMap share data lineage; corroboration is not independent cadastral proof.','Missing OSM building is not evidence of demolition. No automatic removal or relocation.','Road overlap requires grade and source-date verification.']}
    write(out/'summary.json',result);print('CROSS_SOURCE_TRIAGE_RESULT',json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:4]))
