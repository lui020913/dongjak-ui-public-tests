"""Repair serialization-only road polygon defects without expanding the road.
All results are review candidates, never automatic production changes.
"""
import hashlib,json,pathlib,sys
from shapely import make_valid
from shapely.geometry import shape,mapping,box
from shapely.ops import transform,unary_union
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,TO_M,TO_WGS,metric,polygonal
def read(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':')))
def main(assets,out):
    out.mkdir(parents=True,exist_ok=True)
    m=read(assets/'manifest.json')
    q=m['quarantine'];raw=(assets/q['file']).read_bytes()
    assert sha(raw)==q['sha256'] and len(raw)==q['bytes']
    records=json.loads(raw);assert len(records)==q['count']==9
    original_graph=(PUBLIC/'data/safety/walk/dongjak_walk_graph.json').read_bytes()
    assert sha(original_graph)==m['graph_sha256']
    boundary=metric(read(PUBLIC/'data/dongjak_sig_reference.geojson')['features'][0]['geometry'])
    originals=[metric(r['feature']['geometry']) for r in records]
    scope=unary_union([g.buffer(5) for g in originals if not g.is_empty])
    buildings=[]
    for sheet in read(PUBLIC/'buildings/manifest.json')['sheets']:
        for key in ('file','supplement'):
            for f in read(PUBLIC/sheet[key].lstrip('/'))['features']:
                g=metric(f['geometry'])
                if not g.is_empty and g.intersects(scope):buildings.append(g)
    tree=STRtree(buildings)
    sites={'sangdo_elementary':transform(TO_M,box(126.9338,37.5004,126.9384,37.5042)),'nodeul_sayuksin':transform(TO_M,box(126.9457,37.5101,126.9520,37.5144))}
    rows=[];accepted=[]
    for r,original in zip(records,originals):
        f=r['feature'];g=shape(f['geometry'])
        fixed=polygonal(make_valid(g))
        if fixed.is_empty or not fixed.is_valid:
            fixed=polygonal(make_valid(transform(TO_WGS,original)))
        repaired={**f,'geometry':mapping(fixed)}
        projected=metric(repaired['geometry'])
        delta=original.symmetric_difference(projected).area
        extra=projected.difference(original).area
        obs=unary_union([buildings[int(i)] for i in tree.query(projected,predicate='intersects')])
        overlap=projected.intersection(obs).area
        outside=projected.difference(boundary).area
        tolerance=max(.01,original.area*.0001)
        ok=(not fixed.is_empty and fixed.is_valid and not projected.is_empty and projected.is_valid and delta<=tolerance and extra<=.01 and overlap<=.01 and outside<=.01)
        row={'row':r['row'],'reason':r['reason'],'status':'candidate' if ok else 'retained_quarantine','area_m2':round(projected.area,6),'symmetric_difference_m2':round(delta,6),'added_area_m2':round(extra,6),'building_overlap_m2':round(overlap,6),'outside_boundary_m2':round(outside,6),'sites':[k for k,w in sites.items() if projected.intersects(w)]}
        rows.append(row)
        if ok:accepted.append({'row':r['row'],'feature':repaired})
    write(out/'repaired-surfaces.json',accepted)
    write(out/'repaired-surfaces.geojson',{'type':'FeatureCollection','features':[a['feature'] for a in accepted]})
    result={'reviewed':len(records),'accepted':len(accepted),'remaining_quarantine':len(records)-len(accepted),'records':rows,'graph_unchanged':True,'production_changes':False}
    write(out/'summary.json',result)
    print('QUARANTINED_SURFACE_REPAIR_RESULT',json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:3]))
