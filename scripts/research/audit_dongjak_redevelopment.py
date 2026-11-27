"""Read-only full district audit. A geometric conflict is not demolition evidence."""
import json, os, sys, hashlib, collections, urllib.request, urllib.parse
from pathlib import Path
from shapely.geometry import shape, mapping, Polygon
from shapely.ops import transform
from shapely.strtree import STRtree
from shapely import make_valid
from pyproj import Transformer

root=Path(__file__).resolve().parents[2]
out=root/'audit-redevelopment-output'
out.mkdir(exist_ok=True)
project=Transformer.from_crs(4326,5186,always_xy=True).transform
unproject=Transformer.from_crs(5186,4326,always_xy=True).transform
def geom(f):
    g=make_valid(transform(project,shape(f['geometry'])))
    if g.geom_type not in ('Polygon','MultiPolygon'):
        from shapely.ops import unary_union
        g=unary_union([v for v in getattr(g,'geoms',[]) if v.geom_type in ('Polygon','MultiPolygon')])
    return g
def read(p):return json.loads(p.read_text())
boundary=geom(read(root/'app/public/data/dongjak_sig_reference.geojson')['features'][0])
manifest=read(root/'app/public/buildings/manifest.json')
rows=[];counts=collections.Counter();checksums={}
for tile in manifest['sheets']:
    for key in ('file','supplement'):
        if not tile.get(key):continue
        path=root/'app/public'/tile[key].lstrip('/')
        raw=path.read_bytes();checksums[tile[key]]=hashlib.sha256(raw).hexdigest()
        data=json.loads(raw);counts['input']+=len(data['features'])
        for idx,f in enumerate(data['features']):
            p=f.get('properties') or {}
            if not isinstance(p.get('x'),(int,float)) or not isinstance(p.get('y'),(int,float)):continue
            from shapely.geometry import Point
            if not boundary.covers(transform(project,Point(p['x'],p['y']))):continue
            try:g=geom(f)
            except Exception:counts['invalid']+=1;continue
            if g.is_empty or g.area<4:continue
            rows.append({'sheet':tile['sheet'],'kind':'base' if key=='file' else 'supplement','row':idx,'path':tile[key],'p':p,'g':g})
            counts['district']+=1
            counts['district_'+rows[-1]['kind']]+=1
gs=[r['g'] for r in rows];tree=STRtree(gs)
def ident(r):
    return {k:r[k] for k in ('sheet','kind','row','path')}|{'properties':r['p'],'area_m2':round(r['g'].area,2)}
def save(name,features):
    (out/name).write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
def feature(g,p):
    return {'type':'Feature','geometry':mapping(transform(unproject,g)),'properties':p}
pairs=[];clusters=collections.Counter()
for i,g in enumerate(gs):
    for j0 in tree.query(g,predicate='intersects'):
        j=int(j0)
        if j<=i:continue
        h=gs[j];a=g.intersection(h).area
        if a<1:continue
        small,large=sorted((i,j),key=lambda k:gs[k].area)
        coverage=a/gs[small].area;ratio=gs[large].area/gs[small].area;iou=a/(g.area+h.area-a)
        if coverage<.2:continue
        category=('near_duplicate' if iou>=.90 else 'large_over_small' if ratio>=2 and coverage>=.60 else 'partial_overlap')
        counts[category]+=1
        clusters[category]+=1
        pairs.append(feature(g.intersection(h),{'category':category,'overlap_m2':round(a,2),'small_coverage':round(coverage,4),'iou':round(iou,4),'area_ratio':round(ratio,2),'small':ident(rows[small]),'large':ident(rows[large]),'decision':'review_only'}))
save('existing-building-overlaps.geojson',pairs)
# Query all district OSM construction areas and current mapped apartment buildings.
# OSM is corroborating evidence only. Never infer a demolition from absence.
osm_features=[];osm_status='unavailable';osm_errors=[]
query='[out:json][timeout:100];(way["building"="apartments"](37.47,126.89,37.54,127.01);relation["building"="apartments"](37.47,126.89,37.54,127.01);way["landuse"="construction"](37.47,126.89,37.54,127.01);relation["landuse"="construction"](37.47,126.89,37.54,127.01););out geom;'
for endpoint in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
    try:
        req=urllib.request.Request(endpoint,data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'Dongjak-safety-map read-only geometry audit/1.0'})
        with urllib.request.urlopen(req,timeout=125) as resp: osm=json.load(resp)
        if not isinstance(osm.get('elements'),list) or osm.get('remark'):raise ValueError('incomplete response')
        osm_status='retrieved';break
    except Exception as e:osm_errors.append(type(e).__name__)
if osm_status=='retrieved':
    for el in osm['elements']:
        # Closed ways only; don't treat unassembled multipolygon members as
        # complete construction boundaries. Retain relations for later review.
        if el['type']!='way':counts['osm_relations_unassembled']+=1;continue
        coords=[(p['lon'],p['lat']) for p in el.get('geometry',[])]
        if len(coords)<4 or coords[0]!=coords[-1]:continue
        try:g=make_valid(transform(project,Polygon(coords)))
        except Exception:continue
        if g.is_empty or g.area<20 or not g.intersects(boundary):continue
        tags=el.get('tags',{});category='construction' if tags.get('landuse')=='construction' else 'apartments'
        counts['osm_'+category]+=1
        refs=[]
        for i0 in tree.query(g,predicate='intersects'):
            i=int(i0);b=gs[i];a=b.intersection(g).area;cover=a/b.area
            if cover<.6:continue
            if category=='apartments' and (g.area/b.area<2 or a/(b.area+g.area-a)>.85):continue
            refs.append(ident(rows[i])|{'coverage':round(cover,4)})
            counts['osm_'+category+'_candidates']+=1
        osm_features.append(feature(g,{'category':category,'osm_id':el['id'],'tags':tags,'candidate_count':len(refs),'candidates':refs,'decision':'review_only'}))
save('current-osm-corroboration.geojson',osm_features)
# Official statuses identify priority areas, not exact boundaries. No circular
# radius deletion, no whole-zone wipe, no routing changes based on overlap.
status={'source':'https://assembly.dongjak.go.kr/viewer/minutes.do?mem_sch=09110&uid=20274',
        'additional_source':'https://cleanup.seoul.go.kr/cleanup/bsnssttus/lscrMainIndx.do?cpage=1&pageSize=2000',
        'priority_started':['흑석9','흑석11','노량진2','노량진6','노량진8','동작1'],
        'priority_demolition_review':['노량진4','노량진5','노량진7','사당동 인정아파트'],
        'boundary_source':'https://data.seoul.go.kr/dataList/OA-22712/F/1/datasetView.do',
        'note':'Official status is not individual building demolition or road closure evidence. No deletion without actual geometry/current corroboration.'}
summary={'counts':dict(counts),'osm_status':osm_status,'osm_errors':osm_errors,'official_priority':status,'source_sha256':checksums}
(out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print('DISTRICT_REDEVELOPMENT_AUDIT '+json.dumps(summary,ensure_ascii=False))
for item in sorted(pairs,key=lambda f:f['properties']['overlap_m2'],reverse=True)[:25]:
    p=item['properties'];print('OVERLAP_CANDIDATE '+json.dumps(p,ensure_ascii=False))
for item in sorted(osm_features,key=lambda f:f['properties']['candidate_count'],reverse=True)[:20]:
    p=item['properties'];print('OSM_CORROBORATION '+json.dumps({k:v for k,v in p.items() if k!='candidates'},ensure_ascii=False))
