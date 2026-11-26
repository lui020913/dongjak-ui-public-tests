"""Strict display-only candidate review of 18 prioritized links.
Use existing native transportation lines as corroboration, not legal road width.
Require unchanged endpoints, exact local free space and official surface support.
No production edits or building removals.
"""
import json,hashlib,pathlib,sys
from collections import Counter
from shapely.geometry import LineString,Point
from shapely.ops import transform,unary_union,linemerge,substring
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,TO_M,metric,feature,grade_flag
from dongjak_residual_pinned_basemap_crosscheck import source_geometries
from sangdo1_road_corridor_preview import SHIFT,MIN_RADIUS,MARGIN,MAX_RADIUS
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
def main(triage,residual,assets,out):
    out.mkdir(parents=True,exist_ok=True)
    t=read(triage/'summary.json');assert t['link_priorities']['cross_source_road_conflict_priority']==18
    selected={f['properties']['edge_index'] for f in read(triage/'residual-link-priorities.geojson')['features'] if f['properties']['status']=='cross_source_road_conflict_priority'}
    assert len(selected)==18
    graph=(PUBLIC/'data/safety/walk/dongjak_walk_graph.json').read_bytes()
    assert hashlib.sha256(graph).hexdigest()==t['source_graph_sha256']
    edges=json.loads(graph)['edges'];orig={i:transform(TO_M,LineString(edges[i][6])) for i in selected}
    scope=unary_union([g.buffer(SHIFT+MAX_RADIUS+MARGIN+2) for g in orig.values()])
    boundary=metric(read(PUBLIC/'data/dongjak_sig_reference.geojson')['features'][0]['geometry'])
    buildings=[]
    for sh in read(PUBLIC/'buildings/manifest.json')['sheets']:
        for k in ('file','supplement'):
            raw=(PUBLIC/sh[k].lstrip('/')).read_bytes()
            h=read(residual/'summary.json')['source_hashes'].get(sh[k])
            if h:assert hashlib.sha256(raw).hexdigest()==h
            for f in json.loads(raw)['features']:
                g=metric(f['geometry'])
                if not g.is_empty and g.intersects(scope):buildings.append(g)
    bt=STRtree(buildings)
    official=[];op=[]
    for f in read(PUBLIC/'data/dongjak_roadwidth_estimated_202610.geojson')['features']:
        g=metric(f['geometry'])
        if not g.is_empty and g.intersects(scope):official.append(g);op.append(f.get('properties',{}))
    ot=STRtree(official)
    _,_,native,np,metadata=source_geometries(assets,out)
    nt=STRtree(native);rows=[];candidates=[];centers=[];counts=Counter()
    for i,g in sorted(orig.items()):
        a,b=Point(g.coords[0]),Point(g.coords[-1])
        region=g.buffer(SHIFT+MAX_RADIUS+MARGIN+1)
        obs=unary_union([buildings[int(k)] for k in bt.query(region,predicate='intersects')])
        hits=[int(k) for k in ot.query(region,predicate='intersects') if not grade_flag(op[int(k)])]
        known=unary_union([official[k] for k in hits])
        near=[int(k) for k in nt.query(g.buffer(SHIFT),predicate='intersects') if not np[int(k)]['grade']]
        options=[];why='no_exact_native_candidate'
        if min(a.distance(obs),b.distance(obs))<MIN_RADIUS+MARGIN and not obs.is_empty:why='endpoint_obstructed'
        elif known.is_empty:why='no_official_surface'
        else:
            for k in near:
                l=native[k]
                if max(a.distance(l),b.distance(l))>.25:continue
                part=substring(l,l.project(a),l.project(b))
                if part.geom_type!='LineString' or part.length<.1:continue
                c=LineString([a.coords[0],*part.coords,b.coords[0]])
                if not c.is_simple or c.hausdorff_distance(g)>SHIFT+.001 or c.length>g.length*1.3+1:continue
                radius=MIN_RADIUS
                surf=c.buffer(radius,quad_segs=8)
                if surf.intersection(obs).area>1e-6 or (not obs.is_empty and c.distance(obs)<radius+MARGIN):continue
                if surf.difference(boundary).area>.01:continue
                if surf.difference(known).area>.01:continue
                options.append((c.hausdorff_distance(g),c,surf,k))
            if options:
                _,c,surf,k=min(options,key=lambda x:x[0]);why='review_candidate'
                candidates.append(feature(surf,{'edge_index':i,'native_id':np[k]['native_id'],'display_only':True}))
                centers.append(feature(c,{'edge_index':i,'display_only':True}))
        counts[why]+=1
        rows.append({'edge_index':i,'status':why,'length_m':round(g.length,3),'building_overlap_m':round(g.intersection(obs).length,3),'official_center_coverage':round(g.intersection(known).length/g.length,4) if g.length else 0,'native_ground_fragments':len(near),'review_only':True})
    assert len(rows)==18
    write(out/'priority-review.json',rows)
    write(out/'candidate-surfaces.geojson',{'type':'FeatureCollection','features':candidates})
    write(out/'candidate-centers.geojson',{'type':'FeatureCollection','features':centers})
    result={'reviewed':18,'candidates':len(candidates),'reasons':dict(counts),'graph_unchanged':True,'production_changes':False,'strict_guards':['unchanged endpoints','zero retained building overlap','official road surface coverage','native geometry correspondence','boundary and clearance']}
    write(out/'summary.json',result);print('PRIORITY_ROAD_REVIEW_RESULT',json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:5]))
