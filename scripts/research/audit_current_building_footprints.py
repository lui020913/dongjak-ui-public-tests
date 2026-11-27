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
# District official address list corroborates the current road address.
# K-apt may retain a pre-completion parcel. Use exact road + house number,
# never a radius, and record the match independently of OSM availability.
ROAD_ADDRESS_OVERRIDES={
    '이수푸르지오더프레티움':('동작대로39길','39','https://www.dongjak.go.kr/portal/bbs/B0001407/view.do?menuNo=201713&nttId=10728481&viewType=BODY'),
}
by_road=collections.defaultdict(set)
for j,p in enumerate(props):
    if p.get('street_name') and p.get('house_number'):
        by_road[(norm(p['street_name']),str(p['house_number']).strip())].add(j)
site_ids={};site_by_current=collections.defaultdict(set);site_match_methods={}
for i,site in enumerate(sites):
    parcel=by_lot.get((DONG[site['dong']],lot_key(site['lot'])),set())
    name=norm(site['name'])
    named=set(by_name.get(name,set()))
    if name.endswith('아파트'):named|=by_name.get(name[:-3],set())
    else:named|=by_name.get(name+'아파트',set())
    named={j for j in named if str(props[j].get('emd_cd') or '').zfill(3)==DONG[site['dong']]}
    # No radius-based matches and no short/ambiguous substring matches.
    address_override=ROAD_ADDRESS_OVERRIDES.get(name)
    road=set(by_road.get((norm(address_override[0]),address_override[1]),set())) if address_override else set()
    selected=set(parcel)|named|road
    if address_override:print('VERIFIED_ROAD_ADDRESS '+json.dumps({'site':site['name'],'road':address_override[0]+' '+address_override[1],'source':address_override[2],'matches':len(road)},ensure_ascii=False),flush=True)
    site_ids[i]=selected
    site_match_methods[i]={'exact_parcel':len(parcel),'exact_name_in_dong':len(named),'official_road_address_matches':len(road)}
    for j in selected:site_by_current[j].add(i)
# Cross-check whole completed complexes using mapped OSM residential polygons.
# Keep only closed named ways with a unique K-apt identity. Never use a hull
# or buffer as a substitute for a site boundary, or infer closure of roads.
site_boundaries={};osm_state='unavailable'
# Request only site polygons; building-level data are already available.
# Small independent queries keep a failed endpoint from discarding all results.
osm={'elements':[]};successful_boxes=0
for south,north in [(37.47,37.505),(37.505,37.54)]:
    bbox=f'{south},126.89,{north},127.01'
    query=f'[out:json][timeout:35];way["landuse"="residential"]["name"]({bbox});out geom;'
    for endpoint in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter']:
        try:
            req=urllib.request.Request(endpoint+'?'+urllib.parse.urlencode({'data':query}),headers={'User-Agent':'Dongjak safety map read-only apartment review'})
            with urllib.request.urlopen(req,timeout=48) as response:part=json.load(response)
            if not isinstance(part.get('elements'),list) or part.get('remark'):raise ValueError('Incomplete OSM response')
            osm['elements'].extend(part['elements']);successful_boxes+=1;break
        except Exception as e:print('OSM_SITE_SOURCE_ERROR '+json.dumps({'bbox':bbox,'endpoint':endpoint,'error':type(e).__name__}),flush=True)
osm_state='retrieved' if successful_boxes==2 else 'partial' if successful_boxes else 'unavailable'
# Exact IDs observed in successful run 45952872901; re-fetch live geometry
# from the OSM API if Overpass discovery is incomplete. No cached outline
# is treated as current without a fresh response.
KNOWN_RESIDENTIAL_WAYS=[284585430,284585436,284984041,293810275,305837437,305837440,305888840,324689860,419527850,419534346,466301342,466304714,466306128,466306129,466307799,467307119,467478052,467542289,467893058,468580439,469340177,469406269,471977079,471986368,586227273,610392229,619486999,876638788,888807585,888807586,888809615,961832077,1030895320,1030895324,1252016292,1384270177,1452649878]
if osm_state!='retrieved':
    seen={e.get('id') for e in osm['elements']}
    for way_id in KNOWN_RESIDENTIAL_WAYS:
        if way_id in seen:continue
        try:
            d=get('https://api.openstreetmap.org/api/0.6/way/'+str(way_id)+'/full.json')
            nodes={e['id']:{'lat':e['lat'],'lon':e['lon']} for e in d['elements'] if e.get('type')=='node'}
            way=next(e for e in d['elements'] if e.get('type')=='way' and e.get('id')==way_id)
            if not all(n in nodes for n in way['nodes']):continue
            way['geometry']=[nodes[n] for n in way['nodes']]
            osm['elements'].append(way);seen.add(way_id)
        except Exception as e:print('OSM_KNOWN_WAY_ERROR '+str(way_id)+' '+type(e).__name__,flush=True)
    if osm['elements']:osm_state='partial'
def complex_name(n):
    n=norm(n)
    for suffix in ('아파트','공동주택'):
        if n.endswith(suffix):n=n[:-len(suffix)]
    return n
if osm_state in ('retrieved','partial'):
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
# Official project polygons acquired by the already successful SeoulPlan
# download job. Only explicitly corroborated completed project identities,
# never generic development districts or a guessed circle.
official_file=OUT/'seoulplan-202609-dongjak-review.geojson'
official_aliases={
    '11000UQ120PS202407010590':('흑석자이','흑석3구역'),
    '11000UQ120PS202602240054':('힐스테이트장승배기역','힐스테이트 장승배기역(5차공급)'),
    '11000UQ120PS202505310986':('보라매자이 더 포레스트','신대방동 724'),
    '11000UQ120PS202407010447':('스타팰리스 이수','사당동 1008-1 일원'),
    '11000UQ120PS202407010459':('골드타워신대방청년주택','신대방동 351-5'),
}
official_matches=0
if official_file.exists():
    official=json.loads(official_file.read_text())
    for f in official['features']:
        p=f['properties'];alias=official_aliases.get(p.get('PRESENT_SN'))
        if not alias or p.get('SIGNGU_SE')!='11590' or p.get('DGM_NM')!=alias[1]:continue
        ids=[i for i,site in enumerate(sites) if norm(site['name'])==norm(alias[0])]
        if len(ids)!=1:continue
        i=ids[0];g=metric(f)
        if g.is_empty or not district.covers(g):continue
        inside={int(j) for j in tree.query(g,predicate='intersects') if g.covers(cur[int(j)].representative_point())}
        # Even when the registry uses the post-completion lot number, the
        # independently identified official site polygon provides location.
        site_boundaries[i]=(g,'seoulplan:'+p['PRESENT_SN'],True)
        for j in inside:
            site_ids[i].add(j);site_by_current[j].add(i)
        site_match_methods[i]['official_site_footprints']=len(inside);official_matches+=1
        print('OFFICIAL_COMPLETED_SITE '+json.dumps({'site':sites[i]['name'],'project':p['DGM_NM'],'id':p['PRESENT_SN'],'matched_footprints':len(inside)},ensure_ascii=False),flush=True)
print('OFFICIAL_COMPLETED_SITE_STATUS '+str(official_matches),flush=True)
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
                        site_gap_rows.append({'type':'Feature','geometry':f['geometry'],'properties':{'sheet':sheet['sheet'],'kind':k,'row':index,'site':sites[i]['name'],'approved':sites[i]['approved'],'coverage':round(coverage,4),'boundary_reference':osm_id,'official_location_corroborated':confirmed,'decision':'review_only'}})
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
    if not (site_match_methods[i]['exact_parcel'] or site_match_methods[i]['exact_name_in_dong'] or site_match_methods[i].get('official_road_address_matches') or site_match_methods[i].get('official_site_footprints')):continue
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
        if kind not in ('file','supplement') or not (0<h<=9 and g.area>=20 and current_g.area/g.area>=3):continue
        if g.intersection(current_g).area/g.area<.98 or g.intersection(owner_g).area/g.area<.98:continue
        if any(int(k)!=j and g.intersection(cur[int(k)]).area/g.area>=.25 for k in tree.query(g,predicate='intersects')):continue
        key=(sheet,kind,row)
        if key in edits:continue
        owner_row=legacy_rows[owner]
        edit={'sheet':sheet,'kind':'base' if kind=='file' else 'supplement','row':row,'original':f['geometry'],'original_height':h,'source_count':source_counts[(sheet,kind)],'source_sha256':source_hashes[(sheet,kind)],'site':site['name'],'approved':site['approved'],'reason':'contained obsolete low-rise display footprint with corroborated retained high-rise footprint','retained':{'sheet':owner_row[0],'kind':'base' if owner_row[1]=='file' else 'supplement','row':owner_row[2]}}
        edits[key]=edit
        decisions.append({'type':'Feature','geometry':f['geometry'],'properties':{k:v for k,v in edit.items() if k!='original'}})
        print('VERIFIED_DISPLAY_EDIT '+json.dumps(edit,ensure_ascii=False,separators=(',',':')),flush=True)
# Completed-site display cleanup: use the exact official polygon or a
# corroborated OSM site boundary, not a buffer around an apartment name.
# A current building can be represented by multiple retained pieces; measure
# actual coverage rather than demanding one geometrically identical polygon.
# For supplemental candidates require the same confirmed site, retained tower coverage,
# interior, size, unnamed and current separation checks as base candidates.
gap_decisions=collections.Counter()
for i,(site_g,ref,confirmed) in site_boundaries.items():
    site=sites[i]
    if not confirmed:continue
    # A neighboring future-plan boundary must not exclude an entire completed
    # complex. Exclude only the individual footprints that intersect it.
    inside={int(j) for j in tree.query(site_g,predicate='intersects') if site_g.covers(cur[int(j)].representative_point())}
    # MOIS floor attributes are incomplete for some completed complexes
    # (Clavenue, Isu Prugio and Jangseungbaegi). Corroborate height using the
    # existing app's independently sourced high-rise footprint and require
    # unique, one-to-one geometric ownership. Never infer heights from area.
    expected=int(str(site['expected_dongs']).replace(',',''))
    candidates=[j for j in inside if cur[j].area>=100 and not planned.covers(cur[j].representative_point())]
    owners={};tower_candidates=0;retained_towers=0
    for j in candidates:
        high=int(props[j].get('gro_flo_co') or 0)>=5
        nearby=[int(n) for n in legacy_tree.query(cur[j],predicate='intersects') if float(legacy_rows[int(n)][3]['properties'].get('h') or 0)>=12]
        strong=[]
        for n in nearby:
            g=legacy_geoms[n];a=g.intersection(cur[j]).area
            if a/g.area>=.65 and a/cur[j].area>=.65:strong.append((a,n))
        if high or strong:tower_candidates+=1
        if strong:
            _,n=max(strong)
            owners.setdefault(n,[]).append(j)
        elif high and nearby and cur[j].intersection(unary_union([legacy_geoms[n] for n in nearby])).area/cur[j].area>=.65:
            # Multiple retained shapes are allowed only with no reused owner.
            for n in nearby:owners.setdefault(n,[]).append(j)
    # Count distinct matched current footprints, not repeated pieces of one
    # apartment block. Reject any ambiguous owner shared across footprints.
    ambiguous={j for js in owners.values() if len(js)>1 for j in js}
    retained={js[0] for js in owners.values() if len(js)==1}-ambiguous
    retained_towers=len(retained)
    print('COMPLETED_SITE_GATE '+json.dumps({'site':site['name'],'boundary':ref,'site_area_m2':round(site_g.area),'planned_overlap_m2':round(site_g.intersection(planned).area),'expected':expected,'current_towers':tower_candidates,'current_floor_distribution':dict(collections.Counter(str(props[j].get('gro_flo_co')) for j in inside))},ensure_ascii=False),flush=True)
    print('COMPLETED_SITE_RETAINED_TOWERS '+json.dumps({'site':site['name'],'expected':expected,'current':tower_candidates,'retained':retained_towers,'boundary':ref,'height_corroboration':'independent matched legacy high-rise geometry'},ensure_ascii=False),flush=True)
    if retained_towers<max(1,expected*.7):continue
    interior=site_g.buffer(-3)
    if interior.is_empty:continue
    for n0 in legacy_tree.query(interior,predicate='intersects'):
        n=int(n0);sheet,kind,row,f,g=legacy_rows[n]
        if kind not in ('file','supplement') or not interior.covers(g) or not 20<=g.area<=300:continue
        h=float(f['properties'].get('h') or 0)
        if not 0<h<=9 or planned.intersects(g):continue
        if any(g.distance(cur[int(j)])<2 for j in tree.query(g.buffer(2),predicate='intersects')):continue
        # Preserve a base footprint independently represented by a supplement.
        if kind=='file' and any(legacy_rows[int(k)][1]=='supplement' and legacy_geoms[int(k)].distance(g)<2 for k in legacy_tree.query(g.buffer(2),predicate='intersects')):continue
        # Do not suppress named or otherwise independently identified assets.
        if any(f['properties'].get(k) for k in ('name','name:ko','building_name','buildingName')):continue
        key=(sheet,kind,row)
        if key in edits:continue
        edit={'sheet':sheet,'kind':'base' if kind=='file' else 'supplement','row':row,'original':f['geometry'],'original_height':h,'source_count':source_counts[(sheet,kind)],'source_sha256':source_hashes[(sheet,kind)],'site':site['name'],'approved':site['approved'],'reason':'completed-site low-rise display remnant inside independently corroborated boundary, no nearby current footprint, retained high-rise coverage verified; display only','boundary_reference':ref,'retained_towers':retained_towers,'expected_towers':expected}
        edits[key]=edit;gap_decisions[site['name']]+=1
        print('VERIFIED_DISPLAY_EDIT '+json.dumps(edit,ensure_ascii=False,separators=(',',':')),flush=True)
# District-wide residual audit: no hand-selected apartment names.
# Include previously committed display exclusions in the comparison, but
# only when the underlying tile hash, row and geometry still match.
active_edits={}
active_text=(ROOT/'app/src/completed-apartment-display-edits.mjs').read_text()
active_payload=json.loads(active_text[active_text.index('{'):active_text.rindex('}')+1])
for edit in active_payload['edits']:
    k='file' if edit['kind']=='base' else 'supplement'
    source=(edit['sheet'],k)
    if source_counts.get(source)!=edit['source_count'] or source_hashes.get(source)!=edit['source_sha256']:
        continue
    active_edits[(edit['sheet'],k,edit['row'])]=edit
remaining=[]
reviewed_sites=0
unmatched_sites=[]
for i,site in enumerate(sites):
    reviewed_sites+=1
    bound=site_boundaries.get(i)
    indices=site_ids.get(i,set())
    if not indices:
        unmatched_sites.append(site['name'])
        continue
    # Without a confirmed site polygon inspect only geometries actually
    # intersecting the independently identified current footprint records.
    scope=bound[0] if bound and bound[2] else unary_union([cur[j] for j in indices])
    found=[]
    for n0 in legacy_tree.query(scope,predicate='intersects'):
        n=int(n0);sheet,kind,row,f,g=legacy_rows[n]
        existing=active_edits.get((sheet,kind,row))
        if (sheet,kind,row) in edits or (existing and existing['original']==f['geometry']) or g.area<20 or g.intersection(scope).area/g.area<.7:continue
        h=float(f['properties'].get('h') or 0)
        nearby=[int(j) for j in tree.query(g,predicate='intersects')]
        overlaps=sorted([(round(g.intersection(cur[j]).area/g.area,4),round(g.intersection(cur[j]).area/cur[j].area,4),j) for j in nearby],reverse=True)
        coverage=g.intersection(unary_union([cur[j] for j in nearby])).area/g.area if nearby else 0
        # Strong geometrical owner or legacy remnant outside current footprint.
        if any(a>=.85 and b>=.85 for a,b,j in overlaps):continue
        owners=[]
        for a,b,j in overlaps:
            if a<.1:continue
            for k0 in legacy_tree.query(cur[j],predicate='intersects'):
                k=int(k0)
                if k==n:continue
                owner=legacy_geoms[k];intersection=owner.intersection(cur[j]).area
                if intersection/owner.area>=.85 and intersection/cur[j].area>=.85:
                    owner_row=legacy_rows[k];owners.append({'sheet':owner_row[0],'kind':owner_row[1],'row':owner_row[2],'height':owner_row[3]['properties'].get('h'),'current_index':j})
        record={'site':site['name'],'sheet':sheet,'kind':kind,'row':row,'height':h,'area_m2':round(g.area,2),'current_coverage':round(coverage,4),'overlaps':overlaps[:8],'strong_owners':owners,'source_count':source_counts[(sheet,kind)],'source_sha256':source_hashes[(sheet,kind)],'original':f['geometry'],'site_boundary':bound[1] if bound and bound[2] else None}
        found.append(record)
    remaining.extend(found)
    print('REPORTED_SITE_REMAINING '+json.dumps({'site':site['name'],'rows':len(found),'base':sum(x['kind']=='file' for x in found),'supplement':sum(x['kind']=='supplement' for x in found),'with_strong_owner':sum(bool(x['strong_owners']) for x in found)},ensure_ascii=False),flush=True)
print('DISTRICT_RESIDUAL_SCOPE '+json.dumps({'registered_sites':len(sites),'reviewed_sites':reviewed_sites,'unmatched_sites':unmatched_sites,'active_display_exclusions':len(active_edits),'remaining_rows':len(remaining)},ensure_ascii=False),flush=True)
for record in remaining:print('REPORTED_SITE_ROW '+json.dumps(record,ensure_ascii=False,separators=(',',':')),flush=True)
(OUT/'reported-site-remaining-overlaps.json').write_text(json.dumps(remaining,ensure_ascii=False,separators=(',',':')))
print('COMPLETED_SITE_DISPLAY_CLEANUP '+json.dumps(dict(gap_decisions),ensure_ascii=False),flush=True)
combined_edits=dict(active_edits)
combined_edits.update(edits)
(OUT/'verified-apartment-display-edits.json').write_text(json.dumps({'schema':1,'edits':list(combined_edits.values())},ensure_ascii=False,separators=(',',':')))
print('DISTRICT_NEW_DISPLAY_EDITS '+json.dumps({'previous_active':len(active_edits),'new':len(set(edits)-set(active_edits)),'combined':len(combined_edits)},ensure_ascii=False),flush=True)
(OUT/'apartment-site-gap-review.geojson').write_text(json.dumps({'type':'FeatureCollection','features':site_gap_rows},ensure_ascii=False,separators=(',',':')))
counts['official_completed_boundary_matches']=official_matches;counts['verified_display_edits']=len(edits);counts['completed_site_gap_candidates']=len(site_gap_rows)
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
# Reconcile the actual district pedestrian geometry with the corroborated
# retained buildings. A crossing of the interior is a conflict to classify,
# not proof of closure (arcades, entrances, underground and elevated links).
# Keep original link IDs and PRI/routing data immutable until independently
# verified. Export only existing app geometry and derived measurements.
walk_path=ROOT/'app/public/data/safety/walk/dongjak_walk_links.geojson'
walk=json.loads(walk_path.read_text())
road_conflicts=[];road_counts=collections.Counter()
for f in walk['features']:
    p=f.get('properties') or {}
    raw_flags=p.get('flags',{})
    if isinstance(raw_flags,dict):flags={str(k).lower() for k,v in raw_flags.items() if v}
    elif isinstance(raw_flags,list):flags={str(v).lower() for v in raw_flags}
    else:flags=set(re.split(r'[,;| ]+',str(raw_flags).lower()))
    for k in ('bridge','tunnel','indoor','metro','footbridge'):
        if p.get(k) is True or str(p.get(k)).lower() in ('1','yes','true'):flags.add(k)
    if flags&{'bridge','tunnel','indoor','metro','footbridge'}:continue
    if f.get('geometry',{}).get('type') not in ('LineString','MultiLineString'):continue
    try:line=transform(project,shape(f['geometry']))
    except Exception:continue
    if line.is_empty or line.length<4:continue
    for n0 in legacy_tree.query(line,predicate='intersects'):
        n=int(n0);sheet,kind,row,b,g=legacy_rows[n]
        if float(b['properties'].get('h') or 0)<12 or (sheet,kind,row) in edits:continue
        # Ignore facades and near-edge cartographic misalignment.
        interior=g.buffer(-1.5)
        if interior.is_empty:continue
        overlap=line.intersection(interior).length
        if overlap<4:continue
        corroborated=False
        for j0 in tree.query(g,predicate='intersects'):
            j=int(j0);a=g.intersection(cur[j]).area
            if a/g.area>=.65 and a/cur[j].area>=.65 and cur[j].buffer(-1.5).intersection(line).length>=4:
                corroborated=True;break
        if not corroborated:continue
        site_names=[sites[i]['name'] for i,(site_g,ref,ok) in site_boundaries.items() if ok and site_g.covers(g.representative_point())]
        if not site_names:continue
        road_counts['apartment_ground_link_conflicts']+=1
        road_conflicts.append({'type':'Feature','geometry':f['geometry'],'properties':{'link_properties':p,'site_names':site_names,'sheet':sheet,'kind':kind,'row':row,'building_interior_crossing_m':round(overlap,2),'decision':'verify_ground_passage_before_display_or_routing_edit'}})
(OUT/'apartment-road-interior-conflicts.geojson').write_text(json.dumps({'type':'FeatureCollection','features':road_conflicts},ensure_ascii=False,separators=(',',':')))
# Compare the six exact ground-link conflicts with current mapped roads.
# Lack of an OSM road is not a closure determination. Keep graph/PRI stable.
from shapely.geometry import LineString
from concurrent.futures import ThreadPoolExecutor
def corroborate_road(conflict):
    p=conflict['properties'];link=p['link_properties'];line=transform(project,shape(conflict['geometry']))
    idx=next((i for i,v in enumerate(legacy_rows) if v[0]==p['sheet'] and v[1]==p['kind'] and v[2]==p['row']),None)
    if idx is None:return None
    g=legacy_geoms[idx];local=line.intersection(g.buffer(20))
    if local.is_empty:return None
    w,s,e,north=transform(unproject,local.buffer(10)).bounds
    query=f'[out:json][timeout:20];way["highway"]({s},{w},{north},{e});out geom;'
    response=None
    for endpoint in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter']:
        try:
            req=urllib.request.Request(endpoint+'?'+urllib.parse.urlencode({'data':query}),headers={'User-Agent':'Dongjak safety map road conflict audit'})
            with urllib.request.urlopen(req,timeout=30) as resp:response=json.load(resp)
            if not isinstance(response.get('elements'),list) or response.get('remark'):response=None;continue
            break
        except Exception:response=None
    if response is None:
        # Standard OSM map endpoint returns the original node/way records
        # for a tiny bbox, independently of Overpass availability.
        try:
            raw=get('https://api.openstreetmap.org/api/0.6/map.json',{'bbox':f'{w},{s},{e},{north}'})
            nodes={v['id']:{'lat':v['lat'],'lon':v['lon']} for v in raw['elements'] if v.get('type')=='node'}
            ways=[]
            for way in raw['elements']:
                if way.get('type')!='way' or not way.get('tags',{}).get('highway'):continue
                if not all(n in nodes for n in way.get('nodes',[])):continue
                ways.append(way|{'geometry':[nodes[n] for n in way['nodes']]})
            response={'elements':ways}
        except Exception:response=None
    nearby=[]
    for way in (response or {}).get('elements',[]):
        coords=[(v['lon'],v['lat']) for v in way.get('geometry',[])]
        if len(coords)<2:continue
        mapped=transform(project,LineString(coords));tags=way.get('tags',{})
        if mapped.distance(local)>12:continue
        nearby.append({'id':way['id'],'highway':tags.get('highway'),'name':tags.get('name'),'layer':tags.get('layer'),'bridge':tags.get('bridge'),'tunnel':tags.get('tunnel'),'covered':tags.get('covered'),'access':tags.get('access'),'inside_building_m':round(mapped.intersection(g.buffer(-1.5)).length,2),'distance_to_official_link_m':round(mapped.distance(local),2),'geometry':{'type':'LineString','coordinates':coords}})
    return {'link_id':link.get('link_id'),'site_names':p['site_names'],'source_status':'retrieved' if response is not None else 'unavailable','link_geometry':conflict['geometry'],'building_original':legacy_rows[idx][3]['geometry'],'nearby_mapped_ways':nearby}
with ThreadPoolExecutor(max_workers=3) as pool:
    road_evidence=[v for v in pool.map(corroborate_road,road_conflicts) if v]
for evidence in road_evidence:print('APARTMENT_ROAD_EVIDENCE '+json.dumps(evidence,ensure_ascii=False,separators=(',',':')),flush=True)
(OUT/'apartment-road-evidence.json').write_text(json.dumps(road_evidence,ensure_ascii=False,separators=(',',':')))
print('APARTMENT_ROAD_CONFLICTS '+json.dumps(dict(road_counts),ensure_ascii=False),flush=True)
for f in sorted(road_conflicts,key=lambda f:f['properties']['building_interior_crossing_m'],reverse=True)[:30]:
    print('APARTMENT_ROAD_CONFLICT '+json.dumps(f['properties'],ensure_ascii=False),flush=True)
print('CURRENT_BUILDING_COMPARISON '+json.dumps(dict(counts),ensure_ascii=False),flush=True)
