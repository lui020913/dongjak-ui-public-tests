"""Cross-source triage for residual links and green building candidates.
Pinned native tiles provide map-display corroboration only; not demolition or cadastral proof.
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
from dongjak_native_vector_audit import get,STYLE,geometry_local,road_lines,eligible,decode
def source_geometries(assets,out):
    manifest=read(assets/'manifest.json')
    raw=(assets/manifest['native']['file']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==manifest['native']['sha256']
    native=json.loads(raw)
    assert hashlib.sha256(get(STYLE)).hexdigest()==native['style_sha256']
    assert hashlib.sha256(get(native['tilejson_url'])).hexdigest()==native['tilejson_sha256']
    scope=metric(read(PUBLIC/'data/dongjak_sig_reference.geojson')['features'][0]['geometry']).buffer(50)
    bs=[];bm=[];rs=[];rm=[];meta=[]
    for t in native['audited_tiles']:
        raw=get(t['url'])
        assert len(raw)==t['bytes'] and hashlib.sha256(raw).hexdigest()==t['sha256'],'native tile changed'
        d=decode(raw,default_options={'y_coord_down':True})
        for key in ('building','transportation'):
            layer=d.get(key,{})
            for f in layer.get('features',[]):
                p=f.get('properties',{})
                g=geometry_local(f['geometry'],t['x'],t['y'],t['z'],layer['extent'])
                if g.is_empty or not g.intersects(scope):continue
                base={'native_id':str(f.get('id')),'tile':f"{t['z']}/{t['x']}/{t['y']}"}
                if key=='building':
                    g=polygonal(make_valid(g))
                    if not g.is_empty and g.area>.01:bs.append(g);bm.append({**base,'building':p.get('class'),'name':p.get('name')})
                else:
                    for l in road_lines(g):
                        if l.length>.1:rs.append(l);rm.append({**base,'highway':p.get('class'),'grade':not eligible(p)})
        meta.append({'z':t['z'],'x':t['x'],'y':t['y'],'sha256':t['sha256']})
    assert bs and rs and len(meta)==len(native['audited_tiles'])
    print('PINNED_NATIVE_SOURCE_OK',len(bs),len(rs),len(meta),flush=True)
    return bs,bm,rs,rm,meta
def main(residual,green,assets,out):
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
    osmb,bm,osmr,rm,metadata=source_geometries(assets,out)
    bt=STRtree(osmb);rt=STRtree(osmr);records=[];features=[];counts=Counter();gc=Counter()
    for key,g in gis.items():
        if g.is_empty or g.area<=0:continue
        bh=[]
        for i in bt.query(g,predicate='intersects'):
            i=int(i);a=g.intersection(osmb[i]).area
            if a>.01:bh.append({**bm[i],'gis_coverage':round(a/g.area,4),'native_coverage':round(a/osmb[i].area,4)})
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
        else:category='no_native_building_match_insufficient_evidence'
        counts[category]+=1
        if key in green_refs:gc[category]+=1
        record={'file':key[0],'row':key[1],'category':category,'green_review':green_refs.get(key),'blocking_links':sorted(refs.get(key,())),'native_building_matches':bh,'native_road_crossings':rh}
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
        else:status='insufficient_source_evidence'
        linkcounts[status]+=1
        linkrows.append(feature(l,{'edge_index':i,'source_category':r['category'],'status':status,'native_ground_coverage':round(cov,4)}))
    assert sum(linkcounts.values())==419
    write(out/'building-evidence.json',records)
    write(out/'building-evidence.geojson',{'type':'FeatureCollection','features':features})
    write(out/'residual-link-priorities.geojson',{'type':'FeatureCollection','features':linkrows})
    result={'building_records_reviewed':len(records),'green_candidates_reviewed':sum(gc.values()),'residual_links_reviewed':len(rows),'building_categories':dict(counts),'green_categories':dict(gc),'link_priorities':dict(linkcounts),'source_tiles':metadata,'source_graph_sha256':hashlib.sha256(graph).hexdigest(),'production_changes':False,'limitations':['This uses exact previously audited OpenFreeMap vector tiles, not fresh Overpass or independent cadastral evidence.','Missing native tile building is not evidence of demolition. No automatic removal or relocation.','Road overlap requires grade and source-date verification.']}
    write(out/'summary.json',result);print('PINNED_BASEMAP_TRIAGE_RESULT',json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:5]))
