#!/usr/bin/env python3
"""Produce actual 2.5D building-occlusion masks and (optional) offline OSM road samples.

Data source: project GeoJSON buildings (approximate heights), lights.json, security.json.
Run: python scripts/precompute-night-occlusion.py
     python scripts/precompute-night-occlusion.py --fetch-osm
Requires: pip install shapely>=2 pyproj>=3
The output predicts unobstructed direct rays, NOT illuminance or measured brightness.
"""
from __future__ import annotations
import argparse, datetime as dt, json, math, pathlib, urllib.parse, urllib.request
from shapely.geometry import shape, Point, LineString, Polygon, mapping
from shapely.ops import transform
from shapely.strtree import STRtree
from pyproj import Transformer

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'public/data/sangdo1-night'
BUILDINGS = ROOT / 'public/buildings'
MAX_RADIUS = 40
SAMPLES_PER_RING = 72
METRIC = Transformer.from_crs(4326, 5186, always_xy=True)
GEO = Transformer.from_crs(5186, 4326, always_xy=True)

def save_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def load_lights():
    street=json.loads((DATA/'lights.json').read_text(encoding='utf-8'))
    security=json.loads((DATA/'security.json').read_text(encoding='utf-8'))
    lights=[]
    for group, typ in ((street,'street'),(security,'security')):
        for src in group:
            lat,lon=src.get('lat'),src.get('lon')
            if not isinstance(lat,(int,float)) or not isinstance(lon,(int,float)):
                continue
            x,y=METRIC.transform(lon,lat)
            lights.append(dict(lon=lon,lat=lat,x=x,y=y,kind=typ,
                mounting_height=6 if typ=='street' else 4,
                approximate_position=typ=='street',id=str(src.get('id') or src.get('jibun') or '')))
    return lights


def load_buildings(lights):
    minx=min(l['x'] for l in lights)-50; maxx=max(l['x'] for l in lights)+50
    miny=min(l['y'] for l in lights)-50; maxy=max(l['y'] for l in lights)+50
    props=[]; shapes=[]
    total=0; questionable=0
    for path in sorted(BUILDINGS.glob('*.geojson')):
        geo=json.loads(path.read_text(encoding='utf-8'))
        for f in geo.get('features',[]):
            geom=f.get('geometry')
            if not geom or geom.get('type') not in ('Polygon','MultiPolygon'): continue
            p=f.get('properties',{})
            h=p.get('h',0)
            if not isinstance(h,(int,float)) or not math.isfinite(h) or h<=0: continue
            try:
                # Cheap bbox filter in WGS84 before precise projection.
                outline=shape(geom)
                a,b,c,d=outline.bounds
                lowX,lowY=METRIC.transform(a,b);hiX,hiY=METRIC.transform(c,d)
                if max(lowX,hiX)<minx or min(lowX,hiX)>maxx or max(lowY,hiY)<miny or min(lowY,hiY)>maxy: continue
                item=transform(METRIC.transform,outline)
                if not item.is_valid:item=item.buffer(0)
                if item.is_empty:continue
                shapes.append(item);props.append(float(h));total+=1
                if float(h)<=3:questionable+=1
            except Exception:continue
    return shapes,props,dict(count=total,height_lte_3m=questionable)


def intervals_on_ray(geometry, line):
    """Linear ranges inside a footprint (metres along ray)."""
    if geometry.is_empty:return []
    out=[]
    if geometry.geom_type=='LineString':
        if geometry.length>1e-7:
            d0=line.project(Point(geometry.coords[0]));d1=line.project(Point(geometry.coords[-1]));out.append((min(d0,d1),max(d0,d1)))
    elif geometry.geom_type in ('MultiLineString','GeometryCollection'):
        for q in geometry.geoms:out.extend(intervals_on_ray(q,line))
    return out


def reach_polygon(light,tree,buildings,heights):
    x,y=light['x'],light['y'];height=light['mounting_height']
    source=Point(x,y)
    candidates=tree.query(source.buffer(MAX_RADIUS+0.5))
    own=[int(i) for i in candidates if buildings[int(i)].covers(source)]
    uncertain=bool(own)
    ring=[];cuts=0
    for i in range(SAMPLES_PER_RING):
        a=i*2*math.pi/SAMPLES_PER_RING
        dx,dy=math.cos(a),math.sin(a)
        ray=LineString(((x,y),(x+MAX_RADIUS*dx,y+MAX_RADIUS*dy)))
        end=MAX_RADIUS
        for j in candidates:
            j=int(j)
            if j in own:continue # inaccurate coordinate inside a building: do not treat the host roof as a reliable blocker
            g=buildings[j]
            if not g.intersects(ray):continue
            for enter,leave in intervals_on_ray(ray.intersection(g),ray):
                if leave<0.1:continue
                # z(t) = height * (1 - t/R), street/pedestrian surface at z=0.
                # A block begins at the footprint entry, or later when the beam drops below the roof.
                roof=heights[j]
                block=max(enter,MAX_RADIUS*(1-roof/height))
                if block<=leave+1e-7:
                    end=min(end,max(0,block));cuts+=1
        ring.append((x+dx*end,y+dy*end))
    polygon=Polygon(ring)
    if not polygon.is_valid:polygon=polygon.buffer(0)
    if polygon.is_empty:polygon=source.buffer(0.25)
    return polygon,uncertain,cuts


def overpass_query(lights):
    """Build a metres-independent WGS84 bounding-box query for existing light extent."""
    minlat=min(l['lat'] for l in lights)-0.0007
    minlon=min(l['lon'] for l in lights)-0.0009
    maxlat=max(l['lat'] for l in lights)+0.0007
    maxlon=max(l['lon'] for l in lights)+0.0009
    bbox=','.join(str(round(q,6)) for q in (minlat,minlon,maxlat,maxlon))
    return f'[out:json][timeout:90];way["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|footway|path|steps)$"]({bbox});out geom tags;'


def check_overpass_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError('Overpass response must be an object with elements')
    roads=[q for q in payload.get('elements',[]) if q.get('type')=='way' and len(q.get('geometry',[]))>=2]
    if not 30<=len(roads)<=12000:
        raise ValueError('Unexpected OSM road count: '+str(len(roads)))
    return roads


def parse_roads_file(payload):
    """Accept native Overpass JSON or GeoJSON exported from Overpass Turbo.

    Return the exact normalized `way` geometry objects expected by
    precompute_road_samples; reject misleading or malformed inputs.
    """
    if isinstance(payload, dict) and payload.get('type') == 'FeatureCollection':
        features = payload.get('features')
        if not isinstance(features, list):
            raise ValueError('GeoJSON FeatureCollection is missing features')
        roads = []
        for idx, feature in enumerate(features):
            if not isinstance(feature, dict):
                continue
            geometry = feature.get('geometry') or {}
            geom_type = geometry.get('type')
            if geom_type not in ('LineString', 'MultiLineString'):
                continue
            properties = feature.get('properties') or {}
            if not isinstance(properties, dict):
                continue
            tags = properties.get('tags') if isinstance(properties.get('tags'), dict) else properties
            highway = tags.get('highway')
            if not isinstance(highway, str) or not highway.strip():
                continue
            coordinates = geometry.get('coordinates') or []
            rings = [coordinates] if geom_type == 'LineString' else coordinates
            original_id = feature.get('id') or properties.get('@id') or properties.get('id') or f'geojson-{idx}'
            for part_idx, ring in enumerate(rings):
                try:
                    points = [{'lon':float(xy[0]), 'lat':float(xy[1])} for xy in ring]
                    if len(points)<2 or any(not (-180<=p['lon']<=180 and -90<=p['lat']<=90) for p in points):
                        continue
                except (IndexError,TypeError,ValueError):
                    continue
                roads.append({'type':'way','id':str(original_id)+(':'+str(part_idx) if geom_type == 'MultiLineString' else ''),
                              'tags':{'highway':highway, **{k:v for k,v in tags.items() if isinstance(v,(str,int,float,bool))}},
                              'geometry':points})
        if len(roads)<1:
            raise ValueError('GeoJSON contains no valid highway LineString/MultiLineString features')
        return roads

    if isinstance(payload, dict) and isinstance(payload.get('elements'),list):
        elements=payload['elements']
    elif isinstance(payload,list):
        elements=payload
    else:
        raise ValueError('Unsupported roads file. Use raw Overpass JSON or highway GeoJSON FeatureCollection')

    result=[]
    for road in elements:
        if not isinstance(road,dict) or road.get('type')!='way':
            continue
        geometry=road.get('geometry')
        if not isinstance(geometry,list) or len(geometry)<2:
            continue
        try:
            if not all(isinstance(p,dict) and
                       isinstance(p.get('lat'),(int,float)) and isinstance(p.get('lon'),(int,float))
                       and -90<=p['lat']<=90 and -180<=p['lon']<=180 for p in geometry):
                continue
        except (ValueError,TypeError):
            continue
        tags=road.get('tags') or {}
        if not isinstance(tags,dict) or not isinstance(tags.get('highway'),str):
            continue
        result.append(road)
    if not result:
        raise ValueError('Overpass JSON has no valid highway ways with full geometry. Query must use out geom tags;')
    return result


def load_osm_roads(lights, endpoints=None, timeout=45):
    query=overpass_query(lights)
    # kumi.systems now advertises the private.coffee endpoint. Other hosts may be overloaded.
    hosts=endpoints or (
        'https://overpass.private.coffee/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://overpass-api.de/api/interpreter',
    )
    errors=[]
    for host in hosts:
        print('Requesting OSM roadways from:',host,flush=True)
        form=urllib.parse.urlencode({'data':query}).encode('utf-8')
        req=urllib.request.Request(host,data=form,headers={
            'User-Agent':'DongjakPedestrianResearch/1.0 (educational GIS)',
            'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',
            'Accept':'application/json',
        },method='POST')
        try:
            with urllib.request.urlopen(req,timeout=timeout) as response:
                payload=json.loads(response.read())
            roads=check_overpass_payload(payload)
            cache=DATA/'osm-roads-overpass.json'
            save_json(cache,payload)
            print('Saved OSM roadway response:',cache,'(',len(roads),'ways )',flush=True)
            return roads
        except Exception as ex:
            print('OSM endpoint failed:',str(ex),flush=True)
            errors.append(f'{host}: {ex}')
    cache=DATA/'osm-roads-overpass.json'
    if cache.is_file():
        try:
            print('All OSM endpoints unavailable. Attempting cached OSM roads:',cache,flush=True)
            return check_overpass_payload(json.loads(cache.read_text(encoding='utf-8')))
        except Exception as ex:
            errors.append('Local cache invalid: '+str(ex))
    raise RuntimeError('OSM download failed. You can export Overpass JSON from overpass-turbo.eu and run --roads-file. Errors: '+'; '.join(errors))


def precompute_road_samples(roads, lights, visibility_shapes):
    light_xys=[(l['x'],l['y']) for l in lights]
    visible_tree=STRtree(visibility_shapes)
    # Scope is the convex hull of light observations with 15m margin, not administrative Sangdo1 boundary.
    from shapely.geometry import MultiPoint
    scope=MultiPoint(light_xys).convex_hull.buffer(15)
    output=[];sample_count=0
    for road in roads:
        g=road.get('geometry',[])
        points=[]
        for a,b in zip(g,g[1:]):
            x0,y0=METRIC.transform(a['lon'],a['lat']);x1,y1=METRIC.transform(b['lon'],b['lat'])
            distance=math.hypot(x1-x0,y1-y0)
            if not .05<distance<1500:continue
            steps=max(1,math.ceil(distance/5))
            for k in range(steps):
                t=k/steps;points.append((x0+(x1-x0)*t,y0+(y1-y0)*t))
        if g:points.append(METRIC.transform(g[-1]['lon'],g[-1]['lat']))
        if len(points)<2:continue
        annotated=[]
        for x,y in points:
            pp=Point(x,y)
            near=min(math.hypot(x-lx,y-ly) for lx,ly in light_xys)
            clear=math.inf
            for idx in visible_tree.query(pp):
                i=int(idx)
                if visibility_shapes[i].covers(pp):
                    clear=min(clear,math.hypot(x-light_xys[i][0],y-light_xys[i][1]))
            lon,lat=GEO.transform(x,y)
            annotated.append(dict(lat=round(lat,7),lon=round(lon,7),x=round(x,2),y=round(y,2),
                                  d=round(near,2),dClear=round(clear,2) if math.isfinite(clear) else None,
                                  inScope=bool(scope.covers(pp))))
        sample_count+=len(annotated)
        output.append(dict(id=road.get('id'),tags=road.get('tags') or {},samples=annotated))
    return output,sample_count


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--fetch-osm', action='store_true', help='Fetch current OSM road lines and precompute sample coverage on this PC')
    ap.add_argument('--roads-file',help='Use downloaded raw Overpass JSON OR highway GeoJSON instead of network requests')
    ap.add_argument('--roads-only',action='store_true',help='Reuse existing 419-light reach GeoJSON (avoids recalculating building rays)')
    ap.add_argument('--osm-endpoint',action='append',help='Use specified Overpass interpreter URL (repeat for fallbacks)')
    ap.add_argument('--osm-timeout',type=int,default=45,help='Timeout per Overpass endpoint, seconds (default 45)')
    ap.add_argument('--write-overpass-query',action='store_true',help='Save the Overpass QL query for manual download at overpass-turbo.eu, then exit')
    args=ap.parse_args()
    lights=load_lights()
    if args.write_overpass_query:
        path=ROOT/'sangdo1-roads-overpass.ql'
        path.write_text(overpass_query(lights)+'\n',encoding='utf-8')
        print('Saved query:',path)
        print('In https://overpass-turbo.eu/ paste the query, Run, Export > raw data > download JSON.')
        print('Then run: py scripts\\precompute-night-occlusion.py --roads-only --roads-file PATH_TO_JSON_OR_GEOJSON')
        return
    reach_path=DATA/'occlusion-light-reach.geojson'
    if args.roads_only:
        if not reach_path.is_file():
            raise FileNotFoundError(f'No existing light reach file: {reach_path}. Run without --roads-only once.')
        reach=json.loads(reach_path.read_text(encoding='utf-8'))
        if (reach.get('type')!='FeatureCollection' or reach.get('metadata',{}).get('model')!='planar-2.5d-direct-ray-v1'
                or reach.get('metadata',{}).get('radiusMaxM')!=MAX_RADIUS
                or len(reach.get('features',[]))!=len(lights)
                or any((f.get('properties') or {}).get('idx')!=i for i,f in enumerate(reach['features']))):
            raise ValueError('Cached light reach mask is absent, stale or incompatible. Run without --roads-only.')
        visible=[]
        for feature in reach['features']:
            geom=feature.get('geometry')
            if not geom or geom.get('type') not in ('Polygon','MultiPolygon'):
                raise ValueError('Cached light reach contains an unsupported geometry')
            visible.append(transform(METRIC.transform, shape(geom)))
        meta=reach['metadata']
        print('Reusing',len(visible),'existing light visibility polygons; no building recalculation.',flush=True)
    else:
        buildings,heights,building_info=load_buildings(lights)
        if len(buildings)<100:raise RuntimeError('Building polygons not found; do not generate unverifiable lighting coverage')
        print('Read',len(lights),'lights and',len(buildings),'local buildings.')
        tree=STRtree(buildings);visible=[];features=[];ambiguous=0
        for i,light in enumerate(lights):
            polygon,uncertain,cuts=reach_polygon(light,tree,buildings,heights)
            visible.append(polygon);ambiguous+=int(uncertain)
            g=transform(GEO.transform,polygon)
            features.append({'type':'Feature','id':i,'properties':{'idx':i,'kind':light['kind'],
              'positionUncertain':uncertain or light['approximate_position'],'insideBuilding':uncertain,
              'mountingHeightAssumedM':light['mounting_height'],'hasBlockage':cuts>0},'geometry':mapping(g)})
        meta={'model':'planar-2.5d-direct-ray-v1','radiusMaxM':MAX_RADIUS,'rayStepDegrees':360/SAMPLES_PER_RING,
              'buildingCount':len(buildings),'buildingHeightRule':'floors times 3m estimated; not field-measured',
              'terrain':'not considered','lightHeightStreetM':6,'lightHeightSecurityM':4,
              'streetlightLocationsAreParcelCentroids':True,'sourceInsideBuildingCount':ambiguous,
              'scope':'lighting observation hull, not verified administrative boundary',
              'generatedUtc':dt.datetime.now(dt.timezone.utc).isoformat()}
        save_json(reach_path,{'type':'FeatureCollection','metadata':meta,'features':features})
        print('Wrote light visibility polygons, uncertain source footprints:',ambiguous)
    roads=None
    if args.roads_file:
        filepath=pathlib.Path(args.roads_file)
        if not filepath.is_file():
            raise FileNotFoundError(f'Road data file not found: {filepath}')
        payload=json.loads(filepath.read_text(encoding='utf-8-sig'))
        roads=parse_roads_file(payload)
        print('Loaded',len(roads),'road ways from local file:',filepath,flush=True)
    elif args.fetch_osm:
        roads=load_osm_roads(lights, endpoints=args.osm_endpoint,timeout=args.osm_timeout)
    if roads is not None:
        lines,samples=precompute_road_samples(roads,lights,visible)
        if not lines or samples<100:raise RuntimeError('Too few road samples; output was not replaced')
        save_json(DATA/'occlusion-road-samples.json',{'metadata':{**meta,'source':'OpenStreetMap Overpass (ODbL)',
          'roadWays':len(lines),'sampleCount':samples,'sampleSpacingM':5},'lines':lines})
        print('Wrote offline road samples:',len(lines),'ways',samples,'samples')
    else:print('Road sample precomputation skipped: run --fetch-osm on a PC with Internet, or --roads-file.')

if __name__=='__main__':main()
