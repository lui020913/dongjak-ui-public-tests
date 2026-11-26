"""Audit building-source disagreements for remaining road links.
Overlap and duplicate evidence is diagnostic only; never remove a footprint.
"""
import json,pathlib,sys,hashlib
from collections import Counter,defaultdict
from shapely.geometry import shape
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,metric,feature
def read(p):return json.loads(p.read_text())
def main(evidence,out):
    out.mkdir(parents=True,exist_ok=True)
    summary=read(evidence/'summary.json')
    rows=read(evidence/'source-evidence.json')
    assert len(rows)==419
    affected=defaultdict(set)
    for row in rows:
        for rec in row['blocking_buildings']:
            affected[(rec['file'],rec['row'])].add(row['edge_index'])
    assert len(affected)==summary['unique_blocking_building_records']==688
    records=[];geoms=[];lookup={}
    for sheet in read(PUBLIC/'buildings/manifest.json')['sheets']:
        for key in ('file','supplement'):
            rel=sheet[key];raw=(PUBLIC/rel.lstrip('/')).read_bytes()
            assert hashlib.sha256(raw).hexdigest()==summary['source_hashes'][rel],rel
            for i,f in enumerate(json.loads(raw)['features']):
                g=metric(f['geometry'])
                if g.is_empty or g.area<.01:continue
                j=len(records);lookup[(rel,i)]=j
                p=f.get('properties',{})
                records.append({'file':rel,'row':i,'source':'base' if key=='file' else 'supplement','source_geometry_valid':shape(f['geometry']).is_valid,'height_m':p.get('h'),'named':bool(any(p.get(k) for k in ('name','name:ko','building_name','amenity')))})
                geoms.append(g)
    tree=STRtree(geoms);result=[];features=[];counts=Counter();links=defaultdict(set)
    for key,edges in sorted(affected.items()):
        idx=lookup[key];g=geoms[idx];record=records[idx]
        matches=[]
        for q in tree.query(g,predicate='intersects'):
            q=int(q)
            if idx==q:continue
            other=geoms[q];overlap=g.intersection(other).area
            if overlap<.01:continue
            own=overlap/g.area;peer=overlap/other.area;iou=overlap/(g.area+other.area-overlap)
            if max(own,peer)<.05:continue
            matches.append({**records[q],'iou':round(iou,5),'own_coverage':round(own,5),'peer_coverage':round(peer,5),'cross_source':record['source']!=records[q]['source']})
        matches.sort(key=lambda x:(-x['iou'],-max(x['own_coverage'],x['peer_coverage'])))
        duplicate=any(m['iou']>=.95 for m in matches)
        cross_conflict=any(m['cross_source'] and min(m['own_coverage'],m['peer_coverage'])>=.05 and m['iou']<.95 for m in matches)
        cross_rule=any(m['cross_source'] and (m['own_coverage'] if record['source']=='supplement' else m['peer_coverage'])>=.05 for m in matches)
        if duplicate:category='near_duplicate_footprint'
        elif cross_conflict or cross_rule:category='base_supplement_overlap_review'
        elif not record['source_geometry_valid']:category='invalid_original_geometry_review'
        elif len(edges)>=4:category='shared_obstacle_review'
        else:category='single_source_no_duplicate_evidence'
        counts[category]+=1;links[category].update(edges)
        row={**record,'category':category,'area_m2':round(g.area,2),'affected_links':sorted(edges),'candidate_duplicate':duplicate,'cross_source_overlap_review':cross_rule,'matches':matches}
        result.append(row)
        features.append(feature(g,{'source_file':key[0],'source_row':key[1],'category':category,'affected_count':len(edges),'area_m2':row['area_m2']}))
    assert len(result)==688
    (out/'building-source-records.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
    (out/'building-source-review.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
    report={'reviewed_blockers':len(result),'categories':dict(counts),'affected_link_counts_nonexclusive':{k:len(v) for k,v in links.items()},'duplicate_only_does_not_clear_union':True,'geometry_unchanged':True,'limitations':['Near-identical footprints do not by themselves free any road corridor; removing only a duplicate leaves the other obstacle.','Cross-source overlap is a review flag, not proof that either building is invalid.','No road or building changes made.']}
    (out/'summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print('BUILDING_SOURCE_CONSISTENCY_RESULT',json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
