"""Generate reversible building DISPLAY footprint trims supported by two road sources.
Original GIS files, graph, PRI, heights and feature IDs remain untouched.
Only trim the part of a building within an official road polygon AND near
a verified native ground road centerline. Retain public/named/grade features,
large overlap conflicts, and any footprint corroborated by native buildings.
"""
import hashlib,json,pathlib,sys
from collections import Counter
from shapely import make_valid
from shapely.geometry import shape,box
from shapely.ops import transform,unary_union
from shapely.strtree import STRtree
from dongjak_road_building_audit import PUBLIC,TO_M,TO_WGS,metric,polygonal,grade_flag
from dongjak_residual_pinned_basemap_crosscheck import source_geometries
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
def protected(p):
    return grade_flag(p) or any(p.get(k) for k in ('name','name:ko','building_name','buildingName','amenity','office','healthcare','emergency','public_service','shop','tourism')) or str(p.get('building','')).lower() in ('school','university','hospital','civic','public','government','church','chapel','temple','mosque','train_station','transportation','fire_station','library','kindergarten')
def main(assets,out):
    out.mkdir(parents=True,exist_ok=True)
    native,bm,lines,lm,meta=source_geometries(assets,out)
    bt=STRtree(native);ground=[l for l,m in zip(lines,lm) if not m['grade']];lt=STRtree(ground)
    roadpath=PUBLIC/'data/dongjak_roadwidth_estimated_202610.geojson'
    roads=[metric(f['geometry']) for f in read(roadpath)['features'] if not grade_flag(f.get('properties',{}))]
    roads=[g for g in roads if not g.is_empty];rt=STRtree(roads)
    sites={'sangdo_elementary':transform(TO_M,box(126.9338,37.5004,126.9384,37.5042)),'nodeul_sayuksin':transform(TO_M,box(126.9457,37.5101,126.9520,37.5144))}
    counts=Counter();site_counts=Counter();sheets={};rows=[]
    for sheet in read(PUBLIC/'buildings/manifest.json')['sheets']:
        for kind,key in (('base','file'),('supplement','supplement')):
            path=PUBLIC/sheet[key].lstrip('/');raw=path.read_bytes();data=json.loads(raw)['features'];edits=[]
            for i,f in enumerate(data):
                g=metric(f['geometry'])
                if g.is_empty or g.area<20:continue
                hits=rt.query(g,predicate='intersects')
                if not len(hits):continue
                overlap=polygonal(g.intersection(unary_union([roads[int(k)] for k in hits])))
                if overlap.area<.25:continue
                counts['official_overlap']+=1
                if protected(f.get('properties',{})):counts['protected']+=1;continue
                if any(g.intersection(native[int(k)]).area/g.area>=.7 for k in bt.query(g,predicate='intersects')):counts['native_building_protected']+=1;continue
                local=unary_union([ground[int(k)] for k in lt.query(overlap,predicate='intersects')])
                if local.is_empty or local.intersection(overlap).length<.5:counts['no_native_center_overlap']+=1;continue
                # Only cut the actual road intersection, never widen a road.
                cut=polygonal(overlap.intersection(local.buffer(4.25)))
                if cut.area<.25:counts['small_cut']+=1;continue
                if cut.area/g.area>.35:counts['large_conflict']+=1;continue
                fixed=polygonal(make_valid(g.difference(cut)))
                if fixed.is_empty or fixed.geom_type!=g.geom_type or fixed.area<20 or fixed.area/g.area<.65 or fixed.difference(g).area>.001 or fixed.intersection(cut).area>.001:counts['geometry_guard']+=1;continue
                geographic=transform(TO_WGS,fixed)
                if not geographic.is_valid:counts['serialization_guard']+=1;continue
                roundtrip=metric(geographic.__geo_interface__)
                if roundtrip.difference(g).area>.01 or roundtrip.intersection(cut).area>.01:counts['serialization_guard']+=1;continue
                entry={'row':i,'original':f['geometry'],'display':geographic.__geo_interface__}
                edits.append(entry);counts['trimmed']+=1
                names=[name for name,region in sites.items() if g.intersects(region)]
                for name in names:site_counts[name]+=1
                rows.append({'sheet':sheet['sheet'],'kind':kind,'row':i,'removed_m2':round(g.area-fixed.area,3),'original_m2':round(g.area,3),'sites':names})
            if edits:sheets[str(sheet['sheet'])+':'+kind]={'source':sheet[key],'source_count':len(data),'source_sha256':hashlib.sha256(raw).hexdigest(),'edits':edits}
    result={'schema':1,'sheets':sheets}
    write(out/'building-display-road-trims.json',result)
    write(out/'review.json',rows)
    summary={'counts':dict(counts),'site_counts':dict(site_counts),'sheets':len(sheets),'total_trimmed_m2':round(sum(r['removed_m2'] for r in rows),3),'production_changes':False,'original_graph_unchanged':True}
    write(out/'summary.json',summary);print('BUILDING_DISPLAY_ROAD_TRIM_RESULT',json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main(*map(pathlib.Path,sys.argv[1:3]))
