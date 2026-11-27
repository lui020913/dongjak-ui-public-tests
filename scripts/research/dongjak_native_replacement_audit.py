"""Audit native road replacement coverage and protect cross-boundary and grade-separated links.
Only review; missing native coverage is never treated as safe to hide.
"""
import json,pathlib,sys,urllib.parse
from collections import Counter
from shapely.geometry import shape,box,Point
from shapely.ops import unary_union
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,metric,feature
from dongjak_native_vector_audit import STYLE,get,tilexy,decode,geometry_local,road_lines,eligible
def read(p):return json.loads(p.read_text())
def main(hybrid,out):
    out.mkdir(parents=True,exist_ok=True)
    report=read(hybrid/'hybrid-summary.json')
    assert report['counts']['reviewed_accepted']==7852 and report['counts']['baseline_accepted']==4202
    surfaces=[metric(f['geometry']) for f in read(hybrid/'hybrid-road-surfaces.geojson')['features']]
    tree=STRtree(surfaces)
    boundary_geo=shape(read(PUBLIC/'data/dongjak_sig_reference.geojson')['features'][0]['geometry'])
    boundary=metric(boundary_geo.__geo_interface__)
    style=json.loads(get(STYLE))
    names={l['source'] for l in style['layers'] if l.get('source-layer')=='transportation' and l.get('type')=='line'}
    assert len(names)==1
    src=style['sources'][next(iter(names))]
    tjurl=urllib.parse.urljoin(STYLE,src['url']) if src.get('url') else STYLE
    tj=json.loads(get(tjurl)) if src.get('url') else src
    template=urllib.parse.urljoin(tjurl,tj['tiles'][0])
    z=min(14,int(tj.get('maxzoom',14)))
    x0,y0=tilexy(boundary_geo.bounds[0],boundary_geo.bounds[3],z)
    x1,y1=tilexy(boundary_geo.bounds[2],boundary_geo.bounds[1],z)
    counts=Counter();lengths=Counter();records=[];seen=set()
    for x in range(x0,x1+1):
      for y in range(y0,y1+1):
        yy=2**z-1-y if tj.get('scheme')=='tms' else y
        tile=decode(get(template.replace('{z}',str(z)).replace('{x}',str(x)).replace('{y}',str(yy))),default_options={'y_coord_down':True})
        layer=tile.get('transportation',{})
        for f in layer.get('features',[]):
          p=f.get('properties',{});fid=f.get('id')
          for line in road_lines(geometry_local(f['geometry'],x,y,z,layer['extent'])):
            if line.length<.1 or not line.intersects(boundary):continue
            key=line.normalize().wkb
            if (key,str(fid)) in seen:continue
            seen.add((key,str(fid)))
            inside=line.intersection(boundary)
            if inside.length<.1:continue
            cov=0.;near=0.
            if not eligible(p):category='protected_grade_or_class'
            elif not boundary.covers(line):category='protected_boundary_crossing'
            else:
              hits=tree.query(line.buffer(3),predicate='intersects')
              union=unary_union([surfaces[int(k)] for k in hits])
              if not union.is_empty:
                cov=line.intersection(union).length/line.length
                near=line.intersection(union.buffer(3)).length/line.length
              if cov>=.995:category='covered_native_line'
              elif near>=.995:category='near_candidate_requires_correspondence'
              else:category='uncovered_native_line'
            counts[category]+=1;lengths[category]+=inside.length
            records.append(feature(line,{'tile':f'{z}/{x}/{y}','native_id':str(fid),'class':p.get('class',''),'brunnel':str(p.get('brunnel','')),'category':category,'coverage_ratio':round(cov,5),'within_3m_ratio':round(near,5)}))
    assert records and sum(counts.values())==len(records)
    (out/'native-replacement-audit.geojson').write_text(json.dumps({'type':'FeatureCollection','features':records},ensure_ascii=False,separators=(',',':')))
    result={'tile_zoom':z,'native_line_fragments':len(records),'counts':dict(counts),'length_m':{k:round(v,2) for k,v in lengths.items()},'blanket_hide_allowed':False,'source_graph_sha256':report['source_graph_sha256'],'limitations':['Native fragments may repeat across tile boundaries; counts are not street counts.','Geometry coverage is a necessary condition, not proof of grade or route correspondence.','Protected boundary and grade/class features and uncovered or uncertain roads remain visible. No production edits.']}
    (out/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print('NATIVE_REPLACEMENT_AUDIT_RESULT',json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
