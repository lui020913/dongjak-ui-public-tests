"""Independent second-pass native road correspondence, display-only.
Every native ID fragment must pass. No production or source data changes.
"""
import hashlib,json,pathlib,sys,math
from collections import Counter,defaultdict
from shapely.geometry import shape,Point,LineString,box
from shapely.ops import transform,unary_union
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,TO_M,metric,feature
from dongjak_native_vector_audit import get,STYLE,geometry_local,road_lines,eligible,decode
def read(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def union_near(g,tree,geoms,r=0):
    return unary_union([geoms[int(i)] for i in tree.query(g.buffer(r) if r else g,predicate='intersects')])
def correspondence(line,old,corrected,surface):
    # Strong original-line corroboration, corrected endpoints and continuous
    # surface. A parallel road or unsupported gap is never treated as replaced.
    if line.length<.1 or old.is_empty or corrected.is_empty or surface.is_empty:return 'no_candidate'
    if not old.buffer(1.25).covers(line):return 'original_not_matched'
    if not corrected.buffer(4.25).covers(line):return 'corrected_not_matched'
    endpoints=[Point(line.coords[0]),Point(line.coords[-1])]
    if any(p.distance(surface)>.25 for p in endpoints):return 'endpoint_not_covered'
    # A single connected polygon component must connect both endpoints.
    parts=[surface] if surface.geom_type=='Polygon' else [g for g in getattr(surface,'geoms',[]) if g.geom_type=='Polygon']
    if not any(all(p.distance(g)<=.25 for p in endpoints) and g.buffer(4.25).covers(line) for g in parts):return 'disconnected_surface'
    return 'correspondence_candidate'
def main(assets,base,residual,green,out):
    out.mkdir(parents=True,exist_ok=True)
    m=read(assets/'manifest.json');n=read(assets/m['native']['file'])
    assert sha((assets/m['native']['file']).read_bytes())==m['native']['sha256']
    assert sha(get(STYLE))==n['style_sha256'] and sha(get(n['tilejson_url']))==n['tilejson_sha256']
    graphraw=(PUBLIC/'data/safety/walk/dongjak_walk_graph.json').read_bytes()
    assert sha(graphraw)==m['graph_sha256']
    edges=json.loads(graphraw)['edges'];summary=read(base/'summary.json')
    assert summary['graph_sha256']==m['graph_sha256'] and summary['unresolved_links']==419
    boundary=metric(read(PUBLIC/'data/dongjak_sig_reference.geojson')['features'][0]['geometry'])
    old=[];corrected=[];surfaces=[];surface_rows=[];ids=[]
    centers={f['properties']['edge_index']:transform(TO_M,shape(f['geometry'])) for f in read(base/'candidate-centers.geojson')['features']}
    for tile in m['tiles']:
        raw=(assets/tile['file']).read_bytes()
        assert len(raw)==tile['bytes'] and sha(raw)==tile['sha256']
        fs=json.loads(raw)['features'];assert len(fs)==tile['count']
        for f in fs:
            g=metric(f['geometry']);surface_rows.append(g)
            p=f['properties'];i=p.get('edge_index')
            if p.get('kind')!='reviewed' or i not in centers:continue
            assert i not in ids
            ids.append(i);old.append(transform(TO_M,LineString(edges[i][6])));corrected.append(centers[i]);surfaces.append(g)
    assert len(surface_rows)==m['surface_count']
    surface_tree=STRtree(surface_rows);old_tree=STRtree(old)
    buildings=[];bmeta=[]
    for sheet in read(PUBLIC/'buildings/manifest.json')['sheets']:
        for kind,key in [('base','file'),('supplement','supplement')]:
            for row,f in enumerate(read(PUBLIC/sheet[key].lstrip('/'))['features']):
                g=metric(f['geometry'])
                if g.is_empty or g.area<.01 or not g.intersects(boundary.buffer(10)):continue
                buildings.append(g);bmeta.append((sheet['sheet'],kind,row))
    bt=STRtree(buildings)
    official=[metric(f['geometry']) for f in read(PUBLIC/'data/dongjak_roadwidth_estimated_202610.geojson')['features']]
    ot=STRtree(official)
    windows={k:transform(TO_M,box(*b)) for k,b in {'sangdo_elementary':[126.9338,37.5004,126.9384,37.5042],'nodeul_sayuksin':[126.9457,37.5101,126.9520,37.5144]}.items()}
    grouped=defaultdict(list);rows=[];native_buildings=[];existing=set(n['eligible_native_ids'])
    counts=Counter();site=defaultdict(Counter)
    for t in n['audited_tiles']:
        raw=get(t['url']);assert len(raw)==t['bytes'] and sha(raw)==t['sha256'],'native tiles changed'
        data=decode(raw,default_options={'y_coord_down':True})
        layer=data.get('transportation',{})
        for f in layer.get('features',[]):
            fid=f.get('id');p=f.get('properties',{})
            g=geometry_local(f['geometry'],t['x'],t['y'],t['z'],layer['extent'])
            valid_id=isinstance(fid,int) and not isinstance(fid,bool) and 0<fid<=9007199254740991
            for l in road_lines(g):
                if not l.intersects(boundary):
                    if valid_id:grouped[fid].append('outside')
                    continue
                if not valid_id:why='invalid_id'
                elif not eligible(p) or not boundary.covers(l.buffer(.05)):why='protected'
                else:
                    exact=union_near(l,surface_tree,surface_rows,.05)
                    if exact.covers(l):why='exact_covered'
                    else:
                        ii=[int(i) for i in old_tree.query(l.buffer(1.25),predicate='intersects')]
                        # Use only graph edges substantially following this fragment.
                        ii=[i for i in ii if old[i].intersection(l.buffer(1.25)).length>=min(2,old[i].length*.5)]
                        a=unary_union([old[i] for i in ii]);c=unary_union([corrected[i] for i in ii]);s=unary_union([surfaces[i] for i in ii])
                        why=correspondence(l,a,c,s)
                        if why=='correspondence_candidate':
                            # Require independent surveyed road polygon support.
                            o=union_near(l,ot,official,1.25)
                            if o.is_empty or l.intersection(o.buffer(.5)).length/l.length<.5:why='official_support_missing'
                            else:
                                obs=union_near(l,bt,buildings,1)
                                if l.intersection(obs).length<.2:why='no_actual_building_conflict'
                if valid_id:grouped[fid].append(why)
                if l.length<.1:continue
                obs=union_near(l,bt,buildings,.1)
                overlap=l.intersection(obs).length
                counts[why]+=1
                for k,w in windows.items():
                    if l.intersects(w):site[k][why]+=1
                if overlap>.2 or any(l.intersects(w) for w in windows.values()):
                    rows.append(feature(l,{'native_id':str(fid),'reason':why,'existing_eligible':fid in existing,'gis_overlap_m':round(overlap,3)}))
        bl=data.get('building',{})
        for f in bl.get('features',[]):
            g=geometry_local(f['geometry'],t['x'],t['y'],t['z'],bl['extent'])
            if g.geom_type not in ('Polygon','MultiPolygon') or not g.is_valid or not g.intersects(boundary):continue
            relevant=[k for k,w in windows.items() if g.intersects(w)]
            if not relevant:continue
            overlap=g.intersection(union_near(g,surface_tree,surface_rows)).area
            if overlap>.1:native_buildings.append(feature(g,{'native_id':str(f.get('id')),'sites':','.join(relevant),'verified_road_overlap_m2':round(overlap,3)}))
    allowed={'exact_covered','correspondence_candidate'}
    proposed=sorted(fid for fid,reasons in grouped.items() if fid not in existing and 'correspondence_candidate' in reasons and set(reasons)<=allowed)
    # Report the original unresolved graph rows at each reported site.
    pending=read(residual/'source-evidence.json')
    pending_site=defaultdict(Counter)
    for r in pending:
        l=transform(TO_M,LineString(edges[r['edge_index']][6]))
        for k,w in windows.items():
            if l.intersects(w):pending_site[k][r['category']]+=1
    green_site=defaultdict(Counter);green_rows=[]
    for f in read(green/'review.geojson')['features']:
        g=metric(f['geometry'])
        for k,w in windows.items():
            if not g.intersects(w):continue
            p=f['properties'];green_site[k][p['classification']]+=1
            green_rows.append({**f,'properties':{**p,'site':k}})
    for name,fs in [('native-road-correspondence',rows),('native-building-road-conflicts',native_buildings),('green-site-candidates',green_rows)]:
        (out/(name+'.geojson')).write_text(json.dumps({'type':'FeatureCollection','features':fs},ensure_ascii=False,separators=(',',':')))
    result={'existing_native_ids':len(existing),'additional_review_candidates':len(proposed),'candidate_ids':proposed,'fragment_reasons':dict(counts),'site_fragment_reasons':{k:dict(v) for k,v in site.items()},'site_unresolved_graph_links':{k:dict(v) for k,v in pending_site.items()},'site_green_candidates':{k:dict(v) for k,v in green_site.items()},'site_native_buildings_over_verified_road':len(native_buildings),'source_graph_sha256':m['graph_sha256'],'production_changes':False,'limitations':['Candidate correspondence requires independent visual and grade review before replacing a native road.','Green overlap is not demolition evidence.','Site windows are approximate around user-reported stops.']}
    (out/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print('NATIVE_CORRESPONDENCE_RESULT',json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:6]))
