import json
from pathlib import Path
from shapely.geometry import Polygon,LineString,mapping
from shapely.ops import unary_union,polygonize
p=Path('audit-input/osm-response.json')
groups={'forest':[],'park':[]}
for el in json.loads(p.read_text())['elements']:
 tags=el.get('tags',{})
 forest=tags.get('natural') in ('wood','scrub') or tags.get('landuse')=='forest'
 if not (forest or tags.get('landuse') in ('grass','meadow') or tags.get('leisure') in ('park','garden')):continue
 try:
  if el['type']=='way':
   pts=el.get('geometry',[])
   if len(pts)<4 or pts[0]!=pts[-1]:continue
   g=Polygon([(p['lon'],p['lat']) for p in pts])
  elif el['type']=='relation':
   def lines(roles):return [LineString([(p['lon'],p['lat']) for p in m['geometry']]) for m in el.get('members',[]) if m.get('role') in roles and len(m.get('geometry',[]))>=2]
   outer=lines(('outer',''));inner=lines(('inner',))
   if not outer:continue
   g=unary_union(list(polygonize(unary_union(outer))))
   if inner:g=g.difference(unary_union(list(polygonize(unary_union(inner)))))
  else:continue
  if not g.is_valid:g=g.buffer(0)
  if not g.is_empty:groups['forest' if forest else 'park'].append({'type':'Feature','geometry':mapping(g),'properties':{}})
 except (ValueError,KeyError,TypeError):continue
for name,features in groups.items():
 assert features
 Path('app/dist/qa-'+name+'.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features}))
