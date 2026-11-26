"""Hybrid display candidate: preserve existing clean surfaces and add reviewed corridors.
Never replace routing geometry or remove buildings. Retain fallback roads not in walk graph.
"""
import json,pathlib,sys
from collections import Counter
from shapely.ops import unary_union
from shapely.geometry import box
from shapely import make_valid
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,metric,polygonal,feature
def read(p):return json.loads(p.read_text())
def fs(p):return read(p)['features']
def write(p,items):p.write_text(json.dumps({'type':'FeatureCollection','features':items},ensure_ascii=False,separators=(',',':')))
def main(base,preview,out):
    out.mkdir(parents=True,exist_ok=True)
    summary=read(base/'summary.json')
    assert summary['candidate_links']==7852 and summary['unresolved_links']==419
    boundary=metric(fs(base/'boundary.geojson')[0]['geometry'])
    buildings=[]
    for sheet in read(PUBLIC/'buildings/manifest.json')['sheets']:
        for kind in ('file','supplement'):
            for f in fs(PUBLIC/sheet[kind].lstrip('/')):
                g=metric(f['geometry'])
                if not g.is_empty and g.area>=.01 and g.intersects(boundary.buffer(10)):buildings.append(g)
    tree=STRtree(buildings)
    candidates=[];counts=Counter();area=Counter()
    def accept(f,kind):
        g=metric(f['geometry'])
        if g.is_empty:return
        g=polygonal(make_valid(g.intersection(boundary)))
        if g.is_empty:return
        obs=unary_union([buildings[int(k)] for k in tree.query(g,predicate='intersects')])
        overlap=g.intersection(obs).area
        if kind=='reviewed':
            # Do not trim a reviewed corridor: reject if actual exported surface conflicts.
            if overlap>.01:counts['reviewed_residual_rejected']+=1;return
        else:
            if overlap>.001:
                before=g.area;g=polygonal(make_valid(g.difference(obs)))
                area['baseline_overlap_removed_m2']+=before-g.area
                counts['baseline_clipped']+=1
        if g.is_empty:counts[kind+'_empty']+=1;return
        f2=feature(g,{'kind':kind,'edge_index':f.get('properties',{}).get('edge_index',-1)})
        exported=metric(f2['geometry'])
        hits=[buildings[int(k)] for k in tree.query(exported,predicate='intersects')]
        if any(exported.intersection(h).area>.01 for h in hits):
            counts[kind+'_export_rejected']+=1;return
        candidates.append(f2);counts[kind+'_accepted']+=1;area[kind+'_area_m2']+=exported.area
    for f in fs(preview/'road-display.geojson'):accept(f,'baseline')
    for f in fs(base/'candidate-surfaces.geojson'):accept(f,'reviewed')
    assert counts['reviewed_accepted']+counts['reviewed_residual_rejected']+counts['reviewed_export_rejected']+counts['reviewed_empty']==7852
    assert counts['baseline_accepted']>0
    write(out/'hybrid-road-surfaces.geojson',candidates)
    result={'reviewed_source_count':7852,'unresolved_source_count':419,'counts':dict(counts),'area_m2':{k:round(v,2) for k,v in area.items()},'source_graph_sha256':summary['graph_sha256'],'baseline_and_reviewed_surfaces_preserved_as_separate_features':True,'no_source_geometry_changes':True,'warning':'Display candidate only; overlapping polygons may share area; area totals are not unique road area. Native road replacement requires a separate boundary/grade/style QA.'}
    (out/'hybrid-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print('HYBRID_ROAD_DISPLAY_RESULT',json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:4]))
