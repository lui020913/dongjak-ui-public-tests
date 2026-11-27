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
# Cross-check whole completed complexes using mapped OSM residential polygons.
# Keep only closed named ways with a unique K-apt identity. Never use a hull
# or buffer as a substitute for a site boundary, or infer closure of roads.
site_boundaries={};osm_state='unavailable'
query='[out:json][timeout:90];(way["landuse"="residential"]["name"](37.47,126.89,37.54,127.01);way["place"="neighbourhood"]["name"](37.47,126.89,37.54,127.01);way["building"="apartments"]["name"](37.47,126.89,37.54,127.01););out geom;'
for endpoint in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
    try:
        req=urllib.request.Request(endpoint,data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'Dongjak safety map read-only apartment review'})
        with urllib.request.urlopen(req,timeout=115) as response:osm=json.load(response)
        if not isinstance(osm.get('elements'),list) or osm.get('remark'):raise ValueError('Incomplete OSM response')
        osm_state='retrieved';break
    except Exception as e:print('OSM_SITE_SOURCE_ERROR '+type(e).__name__,flush=True)
def complex_name(n):
    n=norm(n)
    for suffix in ('아파트','공동주택'):
        if n.endswith(suffix):n=n[:-len(suffix)]
    return n
if osm_state=='retrieved':
    names=collections.defaultdict(list)
    for i,site in enumerate(sites):names[complex_name(site['name'])].append(i)
    for el in osm['elements']:
        tags=el.get('tags',{})
        if tags.get('landuse')!='residential' and tags.get('place')!='neighbourhood':continue
        key=complex_name(tags.get('name:ko') or tags.get('name'))
        ids=names.get(key,[])
        if len(ids)!=1 or len(key)<4:continue
        i=ids[0];coords=[(p['lon'],p['lat']) for p in el.get('geometry',[])]
        if len(coords)<4 or coords[0]!=coords[-1]:continue
        g=make_valid(transform(project,Polygon(coords)))
        if g.is_empty or not district.covers(g) or g.area<150 or g.area>250000:continue
        # Require location corroboration if parcel/name match exists. Otherwise
        # spatial matches remain tentative and do not authorize a display edit.
        exact=site_ids[i]
        inside={int(j) for j in tree.query(g,predicate='intersects') if g.covers(cur[int(j)].representative_point())}
        if exact and not (inside&exact):continue
        if i in site_boundaries:continue
        site_boundaries[i]=(g,el['id'],bool(exact&inside))
        for j in inside:
            site_ids[i].add(j);site_by_current[j].add(i)
        site_match_methods[i]['osm_site_footprints']=len(inside)
        print('OSM_APARTMENT_SITE '+json.dumps({'name':sites[i]['name'],'osm_way':el['id'],'area_m2':round(g.area),'official_location_corroborated':bool(exact&inside),'current_footprints':len(inside)},ensure_ascii=False),flush=True)
print('OSM_SITE_BOUNDARY_STATUS '+json.dumps({'status':osm_state,'matched_sites':len(site_boundaries)}),flush=True)
plans=json.loads((ROOT/'app/public/data/redevelopment/confirmed-projects-202609.geojson').read_text())
planned=unary_union([metric(f) for f in plans['features']])
manifest=json.loads((ROOT/'app/public/buildings/manifest.json').read_text())
counts=collections.Counter();changes=[];site_conflicts=[];legacy_by_current=collections.defaultdict(list);conflicts_by_site=collections.defaultdict(set);legacy_rows=[];site_gap_rows=[];source_counts={};source_hashes={}
for sheet in manifest['sheets']:
    for k in ['file','supplement']:
        if not sheet.get(k):continue
        source_bytes=(ROOT/'app/public'/sheet[k].lstrip('/')).read_bytes()
        raw=json.loads(source_bytes)
        source_key=(sheet['sheet'],k)
        source_counts[source_key]=len(raw['features']);source_hashes[source_key]=hashlib.sha256(source_bytes).hexdigest()
        for index,f in enumerate(raw['features']):
            p=f.get('properties') or {}
            if not isinstance(p.get('x'),(int,float)) or not isinstance(p.get('y'),(int,float)) or not boundary.covers(Point(p['x'],p['y'])):continue
            try:g=metric(f)
            except Exception:continue
            if g.is_empty or g.area<20:continue
            counts['legacy_display_candidates']+=1
            legacy_rows.append((sheet['sheet'],k,index,f,g))
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
                for i,(site_g,osm_id,confirmed) in site_boundaries.items():
                    if site_g.covers(g) and sites[i]['approved']>='2020-01-01':
                        site_gap_rows.append({'type':'Feature','geometry':f['geometry'],'properties':{'sheet':sheet['sheet'],'kind':k,'row':index,'site':sites[i]['name'],'approved':sites[i]['approved'],'coverage':round(coverage,4),'osm_way':osm_id,'official_location_corroborated':confirmed,'decision':'review_only'}})
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
# Generate conservative actual display edits only when an existing tall
# footprint is independently confirmed by the current reference, and a small
# low-rise footprint is entirely inside it. Keep adjacent/partial structures.
legacy_geoms=[row[4] for row in legacy_rows];legacy_tree=STRtree(legacy_geoms)
edits={};decisions=[]
for j,indices in site_by_current.items():
    if len(indices)!=1:continue
    i=next(iter(indices));site=sites[i]
    if not (site_match_methods[i]['exact_parcel'] or site_match_methods[i]['exact_name_in_dong']):continue
    if planned.covers(cur[j].representative_point()):continue
    try:floors=int(props[j].get('gro_flo_co') or 0)
    except (TypeError,ValueError):continue
    if floors<5 or cur[j].area<100:continue
    current_g=cur[j]
    nearby=[int(n) for n in legacy_tree.query(current_g,predicate='intersects')]
    retained=[]
    for n in nearby:
        row=legacy_rows[n];g=row[4];h=float(row[3]['properties'].get('h') or 0)
        overlap=g.intersection(current_g).area
        if h>=15 and overlap/g.area>=.85 and overlap/current_g.area>=.85:
            retained.append(n)
    if len(retained)!=1:continue
    owner=retained[0];owner_g=legacy_geoms[owner]
    for n in nearby:
        if n==owner:continue
        sheet,kind,row,f,g=legacy_rows[n];h=float(f['properties'].get('h') or 0)
        if not (0<h<=9 and g.area>=20 and current_g.area/g.area>=3):continue
        if g.intersection(current_g).area/g.area<.98 or g.intersection(owner_g).area/g.area<.98:continue
        if any(int(k)!=j and g.intersection(cur[int(k)]).area/g.area>=.25 for k in tree.query(g,predicate='intersects')):continue
        key=(sheet,kind,row)
        if key in edits:continue
        owner_row=legacy_rows[owner]
        edit={'sheet':sheet,'kind':'base' if kind=='file' else 'supplement','row':row,'original':f['geometry'],'original_height':h,'source_count':source_counts[(sheet,kind)],'source_sha256':source_hashes[(sheet,kind)],'site':site['name'],'approved':site['approved'],'reason':'contained obsolete low-rise display footprint with corroborated retained high-rise footprint','retained':{'sheet':owner_row[0],'kind':'base' if owner_row[1]=='file' else 'supplement','row':owner_row[2]}}
        edits[key]=edit
        decisions.append({'type':'Feature','geometry':f['geometry'],'properties':{k:v for k,v in edit.items() if k!='original'}})
        print('VERIFIED_DISPLAY_EDIT '+json.dumps(edit,ensure_ascii=False,separators=(',',':')),flush=True)
(OUT/'verified-apartment-display-edits.json').write_text(json.dumps({'schema':1,'edits':list(edits.values())},ensure_ascii=False,separators=(',',':')))
(OUT/'apartment-site-gap-review.geojson').write_text(json.dumps({'type':'FeatureCollection','features':site_gap_rows},ensure_ascii=False,separators=(',',':')))
counts['verified_display_edits']=len(edits);counts['completed_site_gap_candidates']=len(site_gap_rows)
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
