"""Read-only compare legacy Dongjak data against a January 2026 MOIS-derived
public footprint service. Never interpret absence alone as demolition."""
import json, urllib.request, urllib.parse, collections, hashlib, re
from pathlib import Path
from shapely.geometry import shape, Point, Polygon, mapping
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from shapely import make_valid
from pyproj import Transformer

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'audit-redevelopment-output'
OUT.mkdir(exist_ok=True)
ITEM='b2c7a37bac8d4e40a85435b3f3d96d05'
def get(url,params=None):
    if params:url+='?'+urllib.parse.urlencode(params)
    req=urllib.request.Request(url,headers={'User-Agent':'Dongjak safety map public geometry research/1.0'})
    with urllib.request.urlopen(req,timeout=90) as r: data=json.load(r)
    if 'error' in data:raise RuntimeError(str(data['error']))
    return data
meta=get('https://www.arcgis.com/sharing/rest/content/items/'+ITEM,{'f':'json'})
print('CURRENT_SOURCE '+json.dumps({k:meta.get(k) for k in ['id','title','type','url','access','modified','accessInformation','licenseInfo','description']},ensure_ascii=False),flush=True)
if meta.get('access')!='public' or not meta.get('url'):raise RuntimeError('No public geometry service')
url=meta['url'].rstrip('/')
if not url.startswith('https://'):raise RuntimeError('Not an HTTPS service')
svc=get(url,{'f':'json'})
print('CURRENT_SERVICE '+json.dumps({k:svc.get(k) for k in ['name','capabilities','layers','maxRecordCount','type','fields']},ensure_ascii=False),flush=True)
candidates=[url+'/'+str(x['id']) for x in svc.get('layers',[])] or [url]
project=Transformer.from_crs(4326,5186,always_xy=True).transform
unproject=Transformer.from_crs(5186,4326,always_xy=True).transform
boundary=shape(json.loads((ROOT/'app/public/data/dongjak_sig_reference.geojson').read_text())['features'][0]['geometry'])
district=transform(project,boundary)
current=[];source_layer=None
for layer in candidates:
    lm=get(layer,{'f':'json'})
    print('CURRENT_LAYER '+json.dumps({k:lm.get(k) for k in ['name','geometryType','fields','capabilities','maxRecordCount','objectIdField']},ensure_ascii=False),flush=True)
    if lm.get('geometryType')!='esriGeometryPolygon' or 'Query' not in lm.get('capabilities',''):continue
    fields={f['name'].upper():f['name'] for f in lm.get('fields',[])}
    sig=fields.get('SIG_CD')
    if not sig:continue
    where=sig+" = '11590'"
    ids=get(layer+'/query',{'f':'json','where':where,'returnIdsOnly':'true'}).get('objectIds',[])
    if not ids:continue
    print('CURRENT_DISTRICT_IDS '+str(len(ids)),flush=True)
    if len(ids)>150000:raise RuntimeError('unexpected district count')
    fetched=[]
    for i in range(0,len(ids),350):
        batch=ids[i:i+350]
        d=get(layer+'/query',{'f':'geojson','objectIds':','.join(map(str,batch)),'outFields':'*','outSR':'4326','returnGeometry':'true'})
        if len(d.get('features',[]))!=len(batch):raise RuntimeError('Incomplete geometry query')
        fetched.extend(d['features'])
    current=fetched;source_layer=layer;break
if not current:raise RuntimeError('Public source lacks queryable district footprint geometry')
(OUT/'current-building-source.json').write_text(json.dumps({'item':meta,'layer':source_layer,'count':len(current)},ensure_ascii=False))
def metric(f):return make_valid(transform(project,shape(f['geometry'])))
cur=[];props=[]
for f in current:
    if not f.get('geometry'):continue
    try:g=metric(f)
    except Exception:continue
    if g.is_empty or g.area<4 or not g.intersects(district):continue
    cur.append(g);props.append(f.get('properties') or {})
tree=STRtree(cur)
def norm(value):return re.sub(r'\s+','',str(value or ''))
def clavenue_address(p):
    return (norm(p.get('street_name'))=='성대로' and re.match(r'^164(?:$|[-동])',norm(p.get('house_number'))) is not None) or any('클라베뉴' in norm(v) or '클라벤뉴' in norm(v) for v in p.values())
clavenue_ids={i for i,p in enumerate(props) if clavenue_address(p)}
print('CLAVENUE_ADDRESS_MATCH '+json.dumps({'count':len(clavenue_ids),'address':'서울 동작구 성대로 164','source':'https://www.k-apt.go.kr/bid/bidDetail.do?bidNum=20260929103602281','properties':[props[i] for i in sorted(clavenue_ids)]},ensure_ascii=False),flush=True)
plans=json.loads((ROOT/'app/public/data/redevelopment/confirmed-projects-202609.geojson').read_text())
planned=unary_union([metric(f) for f in plans['features']])
manifest=json.loads((ROOT/'app/public/buildings/manifest.json').read_text())
counts=collections.Counter();changes=[];clavenue=[];site_conflicts=[]
for sheet in manifest['sheets']:
    for k in ['file','supplement']:
        if not sheet.get(k):continue
        raw=json.loads((ROOT/'app/public'/sheet[k].lstrip('/')).read_text())
        for index,f in enumerate(raw['features']):
            p=f.get('properties') or {}
            if not isinstance(p.get('x'),(int,float)) or not isinstance(p.get('y'),(int,float)) or not boundary.covers(Point(p['x'],p['y'])):continue
            try:g=metric(f)
            except Exception:continue
            if g.is_empty or g.area<20:continue
            counts['legacy_display_candidates']+=1
            if planned.covers(g.representative_point()):counts['planned_area_legacy']+=1;continue
            matches=[]
            for j0 in tree.query(g,predicate='intersects'):
                j=int(j0);a=g.intersection(cur[j]).area
                if a>=1:matches.append((a,j))
            matched=unary_union([cur[j] for a,j in matches]) if matches else None
            coverage=g.intersection(matched).area/g.area if matched is not None else 0
            if coverage<.25:
                counts['low_current_coverage']+=1
                changes.append({'type':'Feature','geometry':f['geometry'],'properties':{'sheet':sheet['sheet'],'kind':k,'row':index,'x':p['x'],'y':p['y'],'coverage':round(coverage,4),'area_m2':round(g.area,2),'decision':'review_only'}})
            for a,j in matches:
                if j in clavenue_ids and a/g.area>=.60 and cur[j].area/g.area>=2:
                    site_conflicts.append({'type':'Feature','geometry':f['geometry'],'properties':{'sheet':sheet['sheet'],'kind':k,'row':index,'coverage':round(a/g.area,4),'area_m2':round(g.area,2),'current_area_m2':round(cur[j].area,2),'decision':'review_only','verified_site':'상도 푸르지오 클라베뉴','address':'성대로 164'}})
            if matches:
                a,j=max(matches)
                if a/g.area>=.6 and cur[j].area/g.area>=2:
                    counts['large_current_over_legacy']+=1
                    changes.append({'type':'Feature','geometry':f['geometry'],'properties':{'sheet':sheet['sheet'],'kind':k,'row':index,'coverage':round(a/g.area,4),'area_m2':round(g.area,2),'current_area_m2':round(cur[j].area,2),'current_properties':props[j],'decision':'review_only'}})
# The current service permits online analysis, not unrestricted offline export.
# Only existing app geometry and aggregate comparison statistics are written.
counts['current_footprints']=len(cur);counts['clavenue_address_matches']=len(clavenue_ids);counts['clavenue_legacy_overlap_candidates']=len({(f['properties']['sheet'],f['properties']['kind'],f['properties']['row']) for f in site_conflicts})
for name,features in [('current-vs-legacy-review.geojson',changes),('clavenue-legacy-overlap-review.geojson',site_conflicts)]:
    (OUT/name).write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
print('CURRENT_BUILDING_COMPARISON '+json.dumps(dict(counts),ensure_ascii=False),flush=True)
for f in site_conflicts:
    print('CLAVENUE_LEGACY_OVERLAP '+json.dumps(f['properties'],ensure_ascii=False),flush=True)
