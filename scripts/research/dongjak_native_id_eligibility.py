"""Conservative native feature-ID replacement eligibility for high-zoom display only.
An ID must be safe in every fetched tile fragment, including fragments outside Dongjak.
No source geometry, route, building, or evaluation edits.
"""
import json,pathlib,sys,urllib.parse,hashlib
from collections import Counter,defaultdict
from shapely.geometry import shape
from shapely.ops import unary_union
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,metric
from dongjak_native_vector_audit import STYLE,get,tilexy,decode,geometry_local,road_lines,eligible
def read(p):return json.loads(p.read_text())
def main(hybrid,out):
    out.mkdir(parents=True,exist_ok=True)
    report=read(hybrid/'hybrid-summary.json')
    surfaces=[metric(f['geometry']) for f in read(hybrid/'hybrid-road-surfaces.geojson')['features']]
    tree=STRtree(surfaces)
    boundary_geo=shape(read(PUBLIC/'data/dongjak_sig_reference.geojson')['features'][0]['geometry'])
    boundary=metric(boundary_geo.__geo_interface__)
    style_raw=get(STYLE);style=json.loads(style_raw)
    names={l['source'] for l in style['layers'] if l.get('source-layer')=='transportation' and l.get('type')=='line'}
    assert len(names)==1
    name=next(iter(names));src=style['sources'][name]
    tjurl=urllib.parse.urljoin(STYLE,src['url']) if src.get('url') else STYLE
    tj=json.loads(get(tjurl)) if src.get('url') else src
    template=urllib.parse.urljoin(tjurl,tj['tiles'][0])
    z=min(14,int(tj.get('maxzoom',14)))
    assert z==14
    # Include adjacent tiles to catch ID reuse and boundary fragments.
    x0,y0=tilexy(boundary_geo.bounds[0],boundary_geo.bounds[3],z)
    x1,y1=tilexy(boundary_geo.bounds[2],boundary_geo.bounds[1],z)
    groups=defaultdict(list);counts=Counter()
    for x in range(x0-1,x1+2):
      for y in range(y0-1,y1+2):
        yy=2**z-1-y if tj.get('scheme')=='tms' else y
        tile=decode(get(template.replace('{z}',str(z)).replace('{x}',str(x)).replace('{y}',str(yy))),default_options={'y_coord_down':True})
        layer=tile.get('transportation',{})
        for f in layer.get('features',[]):
          fid=f.get('id')
          g=geometry_local(f['geometry'],x,y,z,layer['extent'])
          inside=g.intersects(boundary)
          if not isinstance(fid,int) or isinstance(fid,bool) or not 0<fid<=9007199254740991:
            if inside:counts['missing_or_unsafe_id']+=1
            continue
          p=f.get('properties',{})
          if not inside:groups[fid].append(('outside',False));continue
          if not eligible(p):groups[fid].append(('grade_or_class',True));continue
          lines=road_lines(g)
          if not lines or any(l.length<.1 or not boundary.covers(l.buffer(.05)) for l in lines):
            groups[fid].append(('boundary_or_geometry',True));continue
          covered=True
          for l in lines:
            hits=tree.query(l.buffer(.05),predicate='intersects')
            area=unary_union([surfaces[int(k)] for k in hits])
            # Full line containment; not a percentage or nearby-only match.
            if area.is_empty or not area.covers(l):covered=False;break
          groups[fid].append(('covered' if covered else 'uncovered',True))
    allowed=[];blocked=Counter()
    for fid,items in groups.items():
        if not any(inside for _,inside in items):continue
        reasons={why for why,_ in items}
        if reasons=={'covered'}:allowed.append(fid)
        else:
            for reason in reasons-{'covered'}:blocked[reason]+=1
    allowed.sort()
    layers=[{'id':l['id'],'type':l['type'],'filter':l.get('filter'),'minzoom':l.get('minzoom'),'maxzoom':l.get('maxzoom')} for l in style['layers'] if l.get('source')==name and l.get('source-layer')=='transportation']
    result={'source_graph_sha256':report['source_graph_sha256'],'style_sha256':hashlib.sha256(style_raw).hexdigest(),'source_name':name,'tile_zoom':z,'eligible_native_ids':allowed,'eligible_id_count':len(allowed),'excluded_id_reasons_nonexclusive':dict(blocked),'feature_counts':dict(counts),'style_transport_layers':layers,'minimum_display_zoom':16,'operational_enabled':False,'limitations':['Native IDs may change with vector tileset updates or be reused beyond the inspected tiles. Require runtime source/version and district guards.','Only complete coverage accepted; no proof of surveyed road alignment.','Never hide grade-separated, unmatched, outside-district or ID-less roads.']}
    (out/'native-id-eligibility.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
    print('NATIVE_ID_ELIGIBILITY_RESULT',json.dumps({k:v for k,v in result.items() if k not in ('eligible_native_ids','style_transport_layers')},ensure_ascii=False))
if __name__=='__main__':main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
