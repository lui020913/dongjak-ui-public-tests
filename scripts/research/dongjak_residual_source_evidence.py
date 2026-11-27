"""Produce a source-evidence inventory for every remaining link, not speculative edits."""
import csv, hashlib, json, pathlib, sys
from collections import Counter,defaultdict
from shapely.geometry import LineString,Point,shape
from shapely.ops import transform,unary_union
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,TO_M,metric,feature,grade_flag
from sangdo1_road_corridor_preview import SHIFT,MIN_RADIUS,MARGIN

def read(p):return json.loads(p.read_text())
def fs(p):return read(p)['features']
def main(base,out):
    out.mkdir(parents=True,exist_ok=True)
    report=read(base/'summary.json')
    assert report['candidate_links']==7852 and report['unresolved_links']==419
    raw=(PUBLIC/'data/safety/walk/dongjak_walk_graph.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest()==report['graph_sha256']
    edges=json.loads(raw)['edges']
    accepted={f['properties']['edge_index'] for f in fs(base/'candidate-centers.geojson')}
    unresolved=fs(base/'unresolved-links.geojson')
    pending={f['properties']['edge_index'] for f in unresolved}
    assert len(accepted)==7852 and len(pending)==419 and not accepted&pending
    incident=defaultdict(list)
    for i,e in enumerate(edges):
        for node in e[1:3]:incident[node].append(i)
    moved={f['properties']['node_id'] for f in fs(base/'moved-nodes.geojson')}
    scope=metric(fs(base/'boundary.geojson')[0]['geometry'])
    regions={i:transform(TO_M,LineString(edges[i][6])) for i in pending}
    coverage=unary_union([g.buffer(8) for g in regions.values()])
    buildings=[];meta=[];hashes={}
    for sheet in read(PUBLIC/'buildings/manifest.json')['sheets']:
        for kind in ('file','supplement'):
            p=PUBLIC/sheet[kind].lstrip('/')
            data=p.read_bytes();hashes[sheet[kind]]=hashlib.sha256(data).hexdigest()
            for j,f in enumerate(json.loads(data)['features']):
                g=metric(f['geometry'])
                if g.is_empty or g.area<.01 or not g.intersects(coverage):continue
                attrs=f.get('properties',{})
                buildings.append(g);meta.append({'file':sheet[kind],'row':j,'grade_flag':grade_flag(attrs),'named':any(attrs.get(k) for k in ('name','name:ko','building_name','amenity'))})
    bt=STRtree(buildings)
    roadfile=PUBLIC/'data/dongjak_roadwidth_estimated_202610.geojson'
    roadraw=roadfile.read_bytes();hashes[str(roadfile.relative_to(PUBLIC))]=hashlib.sha256(roadraw).hexdigest()
    roads=[];roadmeta=[]
    for j,f in enumerate(json.loads(roadraw)['features']):
        g=metric(f['geometry'])
        if g.is_empty or not g.intersects(coverage):continue
        roads.append(g);roadmeta.append({'row':j,'road_id':str(f.get('properties',{}).get('RW_SN',j)),'grade_flag':grade_flag(f.get('properties',{}))})
    rt=STRtree(roads)
    rows=[];display=[];counts=Counter();blockers=Counter()
    for f in sorted(unresolved,key=lambda f:f['properties']['edge_index']):
        i=f['properties']['edge_index'];g=regions[i];e=edges[i]
        hits=[int(k) for k in bt.query(g.buffer(8),predicate='intersects')]
        rh=[int(k) for k in rt.query(g.buffer(8),predicate='intersects')]
        obs=unary_union([buildings[k] for k in hits]);known=unary_union([roads[k] for k in rh])
        blocking=[k for k in hits if g.distance(buildings[k])<MIN_RADIUS+MARGIN]
        endpoints=[Point(g.coords[0]),Point(g.coords[-1])]
        blocked=[str(node) for node,p in zip(e[1:3],endpoints) if not obs.is_empty and p.distance(obs)<MIN_RADIUS+MARGIN]
        protected=sorted({v for n in e[1:3] for v in incident[n] if v not in pending or edges[v][5]!=0 or edges[v][4]!='1111'})
        has_grade=any(meta[k]['grade_flag'] for k in blocking) or any(roadmeta[k]['grade_flag'] for k in rh)
        overlap=g.intersection(obs).length if not obs.is_empty else 0
        known_ratio=known.intersection(g).length/g.length if g.length and not known.is_empty else 0
        polygon_overlap=known.intersection(obs).intersection(g.buffer(SHIFT)).area if not known.is_empty and not obs.is_empty else 0
        if not scope.covers(g.buffer(8)) or any(n in moved for n in e[1:3]):category='boundary_or_previously_moved_node'
        elif has_grade:category='explicit_grade_metadata_review'
        elif blocked and protected:category='protected_node_incident_review'
        elif polygon_overlap>.01 and known_ratio>=.5:category='road_polygon_building_conflict'
        elif blocked:category='blocked_node_source_review'
        elif overlap>.01:category='centerline_building_conflict'
        else:category='clearance_or_path_geometry_review'
        counts[category]+=1
        for k in blocking:blockers[(meta[k]['file'],meta[k]['row'])]+=1
        row={'edge_index':i,'reason':f['properties'].get('reason'),'category':category,'length_m':round(g.length,2),'centerline_inside_building_m':round(overlap,3),'official_polygon_coverage_ratio':round(known_ratio,4),'road_building_overlap_m2_in_corridor':round(polygon_overlap,3),'blocked_nodes':blocked,'protected_incident_edges':protected,'blocking_buildings':[meta[k] for k in blocking],'nearby_road_polygons':[roadmeta[k] for k in rh],'grade_metadata_flag':has_grade,'review_only':True}
        rows.append(row);display.append(feature(g,{'edge_index':i,'category':category,'reason':row['reason'],'length_m':row['length_m']}))
    assert len(rows)==419 and sum(counts.values())==419
    (out/'source-evidence.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
    (out/'unresolved-source-categories.geojson').write_text(json.dumps({'type':'FeatureCollection','features':display},ensure_ascii=False,separators=(',',':')))
    with (out/'source-evidence.csv').open('w',encoding='utf-8-sig',newline='') as fh:
        fields=list(rows[0]);w=csv.DictWriter(fh,fieldnames=fields);w.writeheader()
        for row in rows:w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,list) else v for k,v in row.items()})
    summary={'reviewed_links':len(rows),'categories':dict(counts),'unique_blocking_building_records':len(blockers),'shared_blockers':sum(v>1 for v in blockers.values()),'top_shared_blockers':[{'file':k[0],'row':k[1],'affected_links':v} for k,v in blockers.most_common(20)],'source_hashes':hashes,'graph_sha256':report['graph_sha256'],'no_geometry_or_evaluation_changes':True,'limitations':['Road polygon coverage and overlap are geometric evidence, not proof of a surveyed road or permission to remove buildings.','Grade and vertical separation must be verified independently.']}
    (out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print('RESIDUAL_SOURCE_EVIDENCE_RESULT',json.dumps({k:v for k,v in summary.items() if k!='source_hashes'},ensure_ascii=False))
if __name__=='__main__':main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
