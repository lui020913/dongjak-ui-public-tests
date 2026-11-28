"""District-wide POI identity audit: compare official ARS, actual vector tile POIs
and live official/general facility APIs. No source records are changed."""
import json, math, pathlib, sys, re, unicodedata, hashlib, urllib.request, urllib.parse, gzip
from collections import Counter,defaultdict
from pyproj import Transformer
from shapely.geometry import shape, Point
from shapely.ops import transform
from shapely.strtree import STRtree
from mapbox_vector_tile import decode
ROOT=pathlib.Path(__file__).resolve().parents[2]
PUBLIC=ROOT/'app/public'
T=Transformer.from_crs(4326,5186,always_xy=True).transform
M=Transformer.from_crs(3857,5186,always_xy=True).transform
STYLE='https://tiles.openfreemap.org/styles/bright'
PROD='https://dongjak-walk-safety-preview.pages.dev'
WORDS=['아파트','래미안','힐스테이트','자이','푸르지오','아이파크','롯데캐슬','센트럴','더샵','포스코','주공']
RESIDENTIAL={'apartments','apartment','residential','housing','housing_estate'}
def norm(s):return re.sub(r'[\s·.,()（）\[\]\-]','',unicodedata.normalize('NFKC',str(s or ''))).lower()
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Dongjak POI data validation'}),timeout=35) as r:b=r.read()
    return gzip.decompress(b) if b[:2]==b'\x1f\x8b' else b
def classify(p):
    c=str(p.get('class','')).lower();s=str(p.get('subclass','')).lower()
    if c=='bus' or s in ('bus_stop','bus_station'):return 'bus'
    if c=='rail' or s in ('subway','station','halt','tram_stop'):return 'rail'
    if c in RESIDENTIAL or s in RESIDENTIAL or p.get('building') in RESIDENTIAL:return 'residential'
    return s or c or 'unknown'
def name(p):return str(p.get('name:ko') or p.get('name:nonlatin') or p.get('name') or '').strip()
def local_geometry(f,t,extent):
    span=2*20037508.342789244/2**t['z']
    return transform(lambda a,b,c=None:M(-20037508.342789244+(t['x']+a/extent)*span,20037508.342789244-(t['y']+b/extent)*span),shape(f['geometry']))
def tile_rows(native,boundary):
    assert hashlib.sha256(get(STYLE)).hexdigest()==native['style_sha256']
    assert hashlib.sha256(get(native['tilejson_url'])).hexdigest()==native['tilejson_sha256']
    rows={};tile_counts=[]
    for t in native['audited_tiles']:
        raw=get(t['url']);assert hashlib.sha256(raw).hexdigest()==t['sha256']
        d=decode(raw,default_options={'y_coord_down':True})
        layer=d.get('poi',{});count=0
        for f in layer.get('features',[]):
            p=f.get('properties',{});n=name(p)
            g=local_geometry(f,t,layer['extent'])
            if g.geom_type!='Point' or not boundary.covers(g):continue
            key=(f.get('id'),round(g.x,1),round(g.y,1),n,classify(p))
            rows[key]={'id':str(f.get('id')),'name':n,'class':p.get('class'),'subclass':p.get('subclass'),'kind':classify(p),'x':g.x,'y':g.y}
            count+=1
        tile_counts.append(count)
    return list(rows.values()),tile_counts
def nearby_pairs(rows,meters,condition):
    pts=[Point(r['x'],r['y']) for r in rows];idx=STRtree(pts);pairs=[]
    for i,p in enumerate(pts):
        for j in idx.query(p.buffer(meters),predicate='intersects'):
            j=int(j)
            if j<=i:continue
            d=p.distance(pts[j])
            if d<=meters and condition(rows[i],rows[j]):pairs.append({'a':rows[i],'b':rows[j],'distance_m':round(d,2)})
    return pairs
def main(assets,out):
    out.mkdir(parents=True,exist_ok=True)
    manifest=read(assets/'manifest.json');raw=(assets/manifest['native']['file']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==manifest['native']['sha256'];native=json.loads(raw)
    bgeo=shape(read(PUBLIC/'data/dongjak_sig_reference.geojson')['features'][0]['geometry'])
    boundary=transform(T,bgeo)
    official=[]
    for s in read(PUBLIC/'data/transport/seoul-bus-stops.json')['stops']:
        x,y=T(s['lng'],s['lat'])
        if boundary.covers(Point(x,y)):official.append({**s,'x':x,'y':y,'kind':'bus','source':'official'})
    assert len(official)>400
    rows,tile_counts=tile_rows(native,boundary)
    assert rows
    # Reproduce existing broad apartment name rule, excluding nothing by type.
    apartment_hits=[r for r in rows if any(w in r['name'] for w in WORDS)]
    conflicts=[r for r in apartment_hits if r['kind'] not in RESIDENTIAL and r['kind']!='unknown']
    transit=[r for r in rows if r['kind']=='bus']
    official_by_name=defaultdict(list)
    for r in official:official_by_name[norm(r['name'])].append(r)
    distinct=nearby_pairs(official,35,lambda a,b:norm(a['name'])==norm(b['name']) and a['arsId']!=b['arsId'])
    matches=[]
    for r in transit:
        for a in official_by_name[norm(r['name'])]:
            d=math.hypot(r['x']-a['x'],r['y']-a['y'])
            if d<=60:matches.append({'native':r,'official':a,'distance_m':round(d,2),'outside_16m_fallback_radius':d>16})
    native_dups=nearby_pairs([r for r in rows if r['name']],20,lambda a,b:norm(a['name'])==norm(b['name']) and a['kind']==b['kind'])
    # Official facility API is queried by the district's actual bounding box,
    # paginated; failures are separately recorded, never treated as empty.
    bbox=','.join(str(x) for x in bgeo.bounds)
    categories=['약국','동물약국','편의점','음식점','휴게음식점','카페','병원','의원','학교','유치원','어린이집','도서관','공원']
    api=[];coverage={}
    for c in categories:
        count=0
        try:
            for page in range(10):
                q=urllib.parse.urlencode({'bbox':bbox,'category':c,'limit':1200,'offset':page*1200})
                data=json.loads(get(PROD+'/api/seoul-facilities?'+q))
                if not data.get('ok') or not isinstance(data.get('places'),list):raise ValueError('invalid API response')
                for a in data['places']:
                    x,y=T(float(a['lng']),float(a['lat']))
                    if boundary.covers(Point(x,y)):api.append({'id':str(a.get('id')),'name':a.get('name'),'kind':a.get('category',c),'x':x,'y':y,'source':'official-facility'})
                    count+=1
                if not data.get('hasMore'):break
            coverage[c]={'rows':count,'complete':not data.get('hasMore')}
        except Exception as e:coverage[c]={'rows':count,'complete':False,'error':str(e)[:180]}
    native_by_name=defaultdict(list)
    for r in rows:native_by_name[norm(r['name'])].append(r)
    cross=[]
    for a in api:
        for r in native_by_name[norm(a['name'])]:
            if not norm(a['name']):continue
            d=math.hypot(a['x']-r['x'],a['y']-r['y'])
            if d<=30:cross.append({'official':a,'native':r,'distance_m':round(d,2)})
    summary={'official_ars':len(official),'unique_ars':len({r['arsId'] for r in official}),'official_same_name_distinct_ars_pairs_under_35m':len(distinct),'native_poi':len(rows),'native_tiles':len(tile_counts),'native_classes':dict(Counter(r['kind'] for r in rows)),'apartment_keyword_poi':len(apartment_hits),'apartment_keyword_nonresidential':len(conflicts),'apartment_conflict_types':dict(Counter(r['kind'] for r in conflicts)),'native_bus':len(transit),'native_official_same_name_pairs_under_60m':len(matches),'same_name_pairs_outside_16m':sum(r['outside_16m_fallback_radius'] for r in matches),'native_same_type_same_name_near_pairs':len(native_dups),'official_facility_api_coverage':coverage,'official_facility_in_district_rows':len(api),'official_native_name_location_matches':len(cross),'limitations':['Pair counts are candidates, not confirmed duplicate places. Different ARS are protected.','Native zoom 14 tile quantization and repeated IDs require review. API categories may have no data or fail.','No live OSM general feed or pixel-level click verification in this audit.']}
    for key,data in [('summary',summary),('apartment-conflicts',conflicts),('official-distinct-ars',distinct),('native-official-bus-pairs',matches),('native-near-pairs',native_dups),('official-native-facility-pairs',cross),('all-native-poi',rows)]:write(out/(key+'.json'),data)
    print('DISTRICT_POI_IDENTITY_RESULT',json.dumps(summary,ensure_ascii=False),flush=True)
    print('APARTMENT_CONFLICT_EXAMPLES',json.dumps(conflicts[:30],ensure_ascii=False),flush=True)
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:3]))
