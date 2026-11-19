from pathlib import Path
import geopandas as gpd
import json, math
from shapely.geometry import mapping
from shapely.validation import make_valid
root=Path(__file__).resolve().parent.parent / 'analysis' / 'road-speed-originals'
out=Path(__file__).resolve().parent.parent / 'public' / 'data' / 'road-speed'
out.mkdir(exist_ok=True,parents=True)
boundary=gpd.read_file(root/'상도1동_경계.gpkg').to_crs(5179).geometry.iloc[0]
files={10:'상도1동_10km_링크.gpkg',30:'상도1동_30km_링크.gpkg',40:'상도1동_40km_링크.gpkg',50:'상도1동_50km_링크_좌표.gpkg'}
features=[]
meta={'dataset':'표준노드링크 최고제한속도 상도1동 경계 교차 도로 (수집자료)','boundary_date':'2025-06-30','speed_record_updated':'2025-05-12','crs':'EPSG:4326','counts':{},'notes':['최고제한속도 링크 속성으로 법정 지정·현장 표지와 차이가 있을 수 있음','상도1동 경계로 기하 절단했으며 반대 방향·분할 링크는 각각 보존','제공된 GeoPackage 자료에서 생성. PDF 요약표 74건과 범위가 다름']}
for speed,p in files.items():
 df=gpd.read_file(root/p).to_crs(5179)
 sub=[]
 for _,r in df.iterrows():
  geom=r.geometry
  if geom is None or geom.is_empty:continue
  clip=geom.intersection(boundary)
  if clip.is_empty:continue
  if clip.geom_type=='GeometryCollection':
   from shapely.ops import linemerge
   clip=linemerge([g for g in clip.geoms if g.geom_type in ('LineString','MultiLineString')])
  if clip.is_empty or clip.geom_type not in ('LineString','MultiLineString'):continue
  sub.append({'link_id':str(r['LINK_ID']),'speed':int(speed),'updated':str(r.get('UPDATEDATE','')),'lanes':int(r['LANES']) if str(r.get('LANES','')).isdigit() else None,'length_m':round(float(clip.length),1),'geometry':clip})
 result=gpd.GeoDataFrame(sub,geometry='geometry',crs='EPSG:5179').to_crs(4326)
 for _,r in result.iterrows():
  geo=mapping(r.geometry)
  # compact to 7 decimals (~centimetre) and remove redundant Z
  def rounded(x):
   if isinstance(x,(list,tuple)):return [rounded(v) for v in x]
   return round(float(x),7)
  geo['coordinates']=rounded(geo['coordinates'])
  features.append({'type':'Feature','properties':{k:v for k,v in r.items() if k!='geometry'},'geometry':geo})
 meta['counts'][str(speed)]={'links':len(result),'clipped_length_km':round(sum(x['length_m'] for x in sub)/1000,3)}
print(meta)
(out/'sangdo1_speed_links.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(out/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print('output bytes', (out/'sangdo1_speed_links.geojson').stat().st_size)
