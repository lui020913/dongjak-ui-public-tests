"""Read-only compare legacy Dongjak data against a January 2026 MOIS-derived
public footprint service. Never interpret absence alone as demolition."""
import json, urllib.request, urllib.parse, collections, hashlib, re
from pathlib import Path
from html.parser import HTMLParser
from datetime import date
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
def norm(value):return re.sub(r'[^0-9a-z가-힣]','',str(value or '').lower())
# Official K-apt monthly disclosure registry, not a handpicked apartment list.
REGISTRY='https://www.k-apt.go.kr/cmmn/introMmentPop.do?bjdCode=11&searchOccuDate=202611'
DONG={name:str(101+i) for i,name in enumerate(['노량진동','상도동','상도1동','본동','흑석동','동작동','사당동','대방동','신대방동'])}
class TableRows(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.rows=[];self.row=None;self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=='tr':self.row=[]
        elif tag in ('td','th') and self.row is not None:self.cell=[]
    def handle_data(self,data):
        if self.cell is not None:self.cell.append(data)
    def handle_endtag(self,tag):
        if tag in ('td','th') and self.cell is not None and self.row is not None:
            self.row.append(' '.join(''.join(self.cell).split()));self.cell=None
        elif tag=='tr' and self.row is not None:
            self.rows.append(self.row);self.row=None
req=urllib.request.Request(REGISTRY,headers={'User-Agent':'Mozilla/5.0 Dongjak public apartment audit'})
with urllib.request.urlopen(req,timeout=90) as response:
    raw=response.read();encoding=response.headers.get_content_charset() or 'utf-8'
try:html=raw.decode(encoding)
except UnicodeDecodeError:html=raw.decode('cp949')
parser=TableRows();parser.feed(html)
sites=[]
for row in parser.rows:
    address=next((v for v in row if re.search(r'서울(?:특별시)?\s+동작구\s+',v)),None)
    approved=next((v for v in row if re.fullmatch(r'\d{4}-\d{2}-\d{2}',v)),None)
    if not address or not approved:continue
    address_match=re.search(r'동작구\s+(\S+)\s+(산?\s*\d+(?:-\d+)?)',address)
    if not address_match:continue
    dong,lot=address_match.groups()
    if dong not in DONG or approved>'2026-11-27':continue
    ai=row.index(approved)
    if ai<3:continue
    name=row[ai-3]
    if not name:continue
    sites.append({'name':name,'approved':approved,'address':address,'dong':dong,'lot':lot.replace(' ',''),'expected_dongs':row[ai-2],'households':row[ai-1]})
sites=list({(v['name'],v['address']):v for v in sites}.values())
if len(sites)<60:raise RuntimeError('K-apt Dongjak registry incomplete: '+str(len(sites)))
print('ALL_APARTMENT_REGISTRY '+json.dumps({'source':REGISTRY,'total':len(sites),'approved_2020_or_later':sum(v['approved']>='2020-01-01' for v in sites)},ensure_ascii=False),flush=True)
def lot_key(value):
    m=re.fullmatch(r'(산)?0*(\d+)(?:-0*(\d+))?',str(value or '').strip().replace(' ',''))
    if not m:return None
    return (bool(m[1]),int(m[2]),int(m[3] or 0))
by_lot=collections.defaultdict(set);by_name=collections.defaultdict(set)
for j,p in enumerate(props):
    code=str(p.get('emd_cd') or '').zfill(3)
    lot=lot_key(p.get('lot_number'))
    if lot:by_lot[(code,lot)].add(j)
    for k in ('building_name','buld_nm_dc'):
        n=norm(p.get(k))
        if len(n)>=5:by_name[n].add(j)
site_ids={};site_by_current=collections.defaultdict(set);site_match_methods={}
for i,site in enumerate(sites):
    parcel=by_lot.get((DONG[site['dong']],lot_key(site['lot'])),set())
    name=norm(site['name'])
    named=set(by_name.get(name,set()))
    if name.endswith('아파트'):named|=by_name.get(name[:-3],set())
    else:named|=by_name.get(name+'아파트',set())
    named={j for j in named if str(props[j].get('emd_cd') or '').zfill(3)==DONG[site['dong']]}
    # No radius-based matches and no short/ambiguous substring matches.
    selected=set(parcel)|named
    site_ids[i]=selected
    site_match_methods[i]={'exact_parcel':len(parcel),'exact_name_in_dong':len(named)}
    for j in selected:site_by_current[j].add(i)
plans=json.loads((ROOT/'app/public/data/redevelopment/confirmed-projects-202609.geojson').read_text())
planned=unary_union([metric(f) for f in plans['features']])
manifest=json.loads((ROOT/'app/public/buildings/manifest.json').read_text())
counts=collections.Counter();changes=[];site_conflicts=[];legacy_by_current=collections.defaultdict(list);conflicts_by_site=collections.defaultdict(set)
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
            in_plan=planned.covers(g.representative_point())
            if in_plan:counts['planned_area_legacy']+=1
            matches=[]
            for j0 in tree.query(g,predicate='intersects'):
                j=int(j0);a=g.intersection(cur[j]).area
                if a>=1:
                    matches.append((a,j))
                    if j in site_by_current:legacy_by_current[j].append(g)
            matched=unary_union([cur[j] for a,j in matches]) if matches else None
            coverage=g.intersection(matched).area/g.area if matched is not None else 0
            if coverage<.25 and not in_plan:
                counts['low_current_coverage']+=1
                changes.append({'type':'Feature','geometry':f['geometry'],'properties':{'sheet':sheet['sheet'],'kind':k,'row':index,'x':p['x'],'y':p['y'],'coverage':round(coverage,4),'area_m2':round(g.area,2),'decision':'review_only'}})
            for a,j in matches:
                if j not in site_by_current or a/g.area<.60 or cur[j].area/g.area<2:continue
                for i in sorted(site_by_current[j]):
                    site=sites[i];key=(sheet['sheet'],k,index)
                    if key in conflicts_by_site[i]:continue
                    conflicts_by_site[i].add(key)
                    site_conflicts.append({'type':'Feature','geometry':f['geometry'],'properties':{'sheet':sheet['sheet'],'kind':k,'row':index,'coverage':round(a/g.area,4),'area_m2':round(g.area,2),'current_area_m2':round(cur[j].area,2),'decision':'review_only','site':site['name'],'address':site['address'],'approved':site['approved'],'inside_planned_area':in_plan,'ambiguous_site_match':len(site_by_current[j])>1}})
            if matches and not in_plan:
                a,j=max(matches)
                if a/g.area>=.6 and cur[j].area/g.area>=2:
                    counts['large_current_over_legacy']+=1
                    changes.append({'type':'Feature','geometry':f['geometry'],'properties':{'sheet':sheet['sheet'],'kind':k,'row':index,'coverage':round(a/g.area,4),'area_m2':round(g.area,2),'current_area_m2':round(cur[j].area,2),'decision':'review_only'}})
# Only derived comparisons, official registry metadata and existing app
# geometry are output; do not export the reference building polygons.
reports=[]
for i,site in enumerate(sites):
    matched=site_ids[i]
    low=0;missing=0;ambiguous=0;planned_overlap=0
    for j in matched:
        g=cur[j]
        if g.area<20:continue
        old=legacy_by_current.get(j,[])
        coverage=g.intersection(unary_union(old)).area/g.area if old else 0
        if coverage<.25:low+=1
        if not old:missing+=1
        if len(site_by_current[j])>1:ambiguous+=1
        if planned.covers(g.representative_point()):planned_overlap+=1
    report=site|site_match_methods[i]|{'current_footprint_matches':len(matched),'low_legacy_coverage':low,'no_legacy_overlap':missing,'legacy_conflict_candidates':len(conflicts_by_site[i]),'ambiguous_footprint_matches':ambiguous,'planned_area_overlap':planned_overlap,'decision':'review_only'}
    reports.append(report)
    if site['approved']>='2020-01-01' or report['legacy_conflict_candidates'] or not matched:print('APARTMENT_SITE '+json.dumps(report,ensure_ascii=False),flush=True)
counts['current_footprints']=len(cur);counts['official_apartment_sites']=len(sites);counts['matched_apartment_sites']=sum(bool(v) for v in site_ids.values());counts['new_apartment_sites']=sum(v['approved']>='2020-01-01' for v in sites);counts['new_apartment_sites_unmatched']=sum(v['approved']>='2020-01-01' and not v['current_footprint_matches'] for v in reports);counts['apartment_legacy_overlap_candidates']=len({(f['properties']['sheet'],f['properties']['kind'],f['properties']['row']) for f in site_conflicts})
(OUT/'all-apartment-site-review.json').write_text(json.dumps({'source':REGISTRY,'sites':reports},ensure_ascii=False,indent=2))
for name,features in [('current-vs-legacy-review.geojson',changes),('all-apartment-legacy-overlap-review.geojson',site_conflicts)]:
    (OUT/name).write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
print('CURRENT_BUILDING_COMPARISON '+json.dumps(dict(counts),ensure_ascii=False),flush=True)
