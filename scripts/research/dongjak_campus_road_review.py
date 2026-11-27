"""Site-specific review of the Chung-Ang University surroundings.
Compare baseline and corrected exported road geometry; no production edits.
"""
import json,pathlib,sys,hashlib
from collections import Counter
from shapely.geometry import box,shape,LineString
from shapely.ops import transform,unary_union
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,TO_M,metric,feature
def read(p):return json.loads(p.read_text())
def fs(p):return read(p)['features']
# Review window, not a cadastral campus boundary.
BBOX=[126.952,37.4995,126.9615,37.508]
def main(base,out):
    out.mkdir(parents=True,exist_ok=True)
    report=read(base/'summary.json')
    assert report['candidate_links']==7852 and report['unresolved_links']==419
    graph=(PUBLIC/'data/safety/walk/dongjak_walk_graph.json').read_bytes()
    assert hashlib.sha256(graph).hexdigest()==report['graph_sha256']
    roi=transform(TO_M,box(*BBOX))
    centers={f['properties']['edge_index']:f for f in fs(base/'candidate-centers.geojson')}
    surfaces={f['properties']['edge_index']:f for f in fs(base/'candidate-surfaces.geojson')}
    unresolved={f['properties']['edge_index']:f for f in fs(base/'unresolved-links.geojson')}
    buildings=[]
    for sheet in read(PUBLIC/'buildings/manifest.json')['sheets']:
        if not box(*sheet['bbox']).intersects(box(*BBOX)):continue
        for kind in ('file','supplement'):
            for f in fs(PUBLIC/sheet[kind].lstrip('/')):
                g=metric(f['geometry'])
                if not g.is_empty and g.area>=.01 and g.intersects(roi.buffer(20)):buildings.append(g)
    tree=STRtree(buildings)
    rows=[];old=[];new=[];pending=[];counts=Counter()
    for f in fs(base/'original-links.geojson'):
        i=f['properties']['edge_index'];g=transform(TO_M,shape(f['geometry']))
        if not g.intersects(roi):continue
        obs=unary_union([buildings[int(k)] for k in tree.query(g.buffer(8),predicate='intersects')])
        before=g.intersection(obs).length if not obs.is_empty else 0.
        row={'edge_index':i,'original_centerline_overlap_m':round(before,3)}
        old.append(feature(g,{**row,'status':'original'}))
        if i in centers:
            c=transform(TO_M,shape(centers[i]['geometry']));s=metric(surfaces[i]['geometry'])
            # Check the actual exported surface against the expanded footprint context.
            obs2=unary_union([buildings[int(k)] for k in tree.query(s,predicate='intersects')])
            area=s.intersection(obs2).area if not obs2.is_empty else 0.
            corrected=c.intersection(obs2).length if not obs2.is_empty else 0.
            status='accepted_clear' if area<=.01 and corrected<=.001 else 'residual_export_conflict'
            row.update({'status':status,'corrected_overlap_m2':round(area,5),'corrected_centerline_overlap_m':round(corrected,5)})
            new.append(feature(s,row))
        else:
            assert i in unresolved
            status='unresolved'
            row.update({'status':status,'reason':unresolved[i]['properties'].get('reason')})
            pending.append(feature(g,row))
        rows.append(row);counts[status]+=1
    assert rows and len(rows)==sum(counts.values())
    for name,features in [('campus-original-links',old),('campus-corrected-surfaces',new),('campus-unresolved-links',pending)]:
        (out/(name+'.geojson')).write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
    summary={'review_window_wgs84':BBOX,'not_cadastral_boundary':True,'road_links':len(rows),'counts':dict(counts),'original_links_with_building_overlap':sum(r['original_centerline_overlap_m']>.001 for r in rows),'reviewed_building_records':len(buildings),'graph_sha256':report['graph_sha256'],'source_review_count':report['candidate_links'],'no_production_changes':True}
    (out/'campus-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    (out/'campus-link-audit.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
    print('CAMPUS_REVIEW_RESULT',json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
