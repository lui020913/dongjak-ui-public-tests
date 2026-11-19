#!/usr/bin/env python3
"""Convert a user-downloaded Seoul official bus-stop CSV/XLSX into static map data.

Use only the original file from https://data.seoul.go.kr/dataList/OA-15067/S/1/datasetView.do
Examples:
 python scripts/import-official-bus-stops.py '서울시버스정류소위치정보(20260902).xlsx' --date 2026-09-02

No invented locations. Columns and coordinate ranges are validated; projected
EPSG:5179 coordinates are transformed using pyproj when present.
"""
from pathlib import Path
import argparse,csv,json,re,sys

parser=argparse.ArgumentParser()
parser.add_argument('input')
parser.add_argument('--date',required=True,help='Source data date YYYY-MM-DD')
parser.add_argument('--output',default='public/data/transport/seoul-bus-stops.json')
args=parser.parse_args()
src=Path(args.input)
if not src.is_file():raise SystemExit(f'파일 없음: {src}')
if not re.fullmatch(r'20\d\d-\d\d-\d\d',args.date):raise SystemExit('날짜는 YYYY-MM-DD 형식이어야 합니다.')

if src.suffix.lower()=='.csv':
    lines=None
    for encoding in ('utf-8-sig','cp949','euc-kr'):
        try:
            with src.open(encoding=encoding,newline='') as f:lines=list(csv.reader(f))
            break
        except UnicodeDecodeError:pass
    if lines is None:raise SystemExit('CSV 인코딩을 확인해 주세요.')
elif src.suffix.lower() in ('.xlsx','.xlsm'):
    from openpyxl import load_workbook
    w=load_workbook(src,read_only=True,data_only=True)
    lines=[list(row) for row in w.active.values]
else:raise SystemExit('CSV 또는 XLSX 파일만 지원합니다.')

ALIASES={
  'name':['정류소명','정류장명','정류소이름','정류장 이름','STTN_NM','ST_NM','STOP_NM','STATION_NM'],
  'ars':['ARS-ID','ARSID','ARS ID','ARS번호','ARS번호(5자리)','정류소번호','정류장번호','정류장ARS','STTN_NO','ARS_NO'],
  'lng':['X좌표','X 좌표','경도','LONGITUDE','LNG','GPS_X','X'],
  'lat':['Y좌표','Y 좌표','위도','LATITUDE','LAT','GPS_Y','Y']}
def norm(v):return re.sub(r'[^0-9A-Z가-힣]', '',str(v or '').upper())
header=None
for i,row in enumerate(lines[:20]):
    names=[norm(x) for x in row]
    indices={}
    for field,alts in ALIASES.items():
        for a in alts:
            if norm(a) in names:
                indices[field]=names.index(norm(a));break
    if len(indices)==4:header=(i,indices);break
if not header:
    raise SystemExit('필수 열(정류소명, ARS 번호, X좌표, Y좌표)을 인식하지 못했습니다. 원본의 첫 20행을 확인하십시오.')
idx,cols=header

def transform(x,y):
    if 126<=x<=128 and 37<=y<=38:return x,y
    if 800000<x<1200000 and 1700000<y<2200000:
        try:from pyproj import Transformer
        except ImportError:raise SystemExit('EPSG:5179 좌표 변환에 pyproj가 필요합니다: pip install pyproj')
        return Transformer.from_crs('EPSG:5179','EPSG:4326',always_xy=True).transform(x,y)
    return None
out={};invalid=0
for row in lines[idx+1:]:
    try:
        name=str(row[cols['name']] or '').strip()
        ars=str(row[cols['ars']] or '').strip()
        if ars.endswith('.0'):ars=ars[:-2]
        if ars.isdigit():ars=ars.zfill(5)
        x=float(row[cols['lng']]);y=float(row[cols['lat']])
        coords=transform(x,y)
        if not name or not re.fullmatch(r'\d{5}',ars) or not coords:invalid+=1;continue
        lng,lat=coords
        if not(126<=lng<=128 and 37<=lat<=38):invalid+=1;continue
        out[ars]={'arsId':ars,'name':name,'lng':round(lng,7),'lat':round(lat,7)}
    except (IndexError,ValueError,TypeError):invalid+=1
if len(out)<1000:raise SystemExit(f'정류소 {len(out)}건만 인식되었습니다. 열 또는 좌표계를 점검하세요. 잘못된 파일은 저장하지 않습니다.')
content={'source':'서울시 버스정류소 위치정보','sourceURL':'https://data.seoul.go.kr/dataList/OA-15067/S/1/datasetView.do',
 'sourceDate':args.date,'realtime':False,'stops':list(out.values())}
dst=Path(args.output);dst.parent.mkdir(parents=True,exist_ok=True)
dst.write_text(json.dumps(content,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(f'정적 버스정류소 {len(out)}건 변환 완료 / 무시 {invalid}건 / {dst}')
print('위치·이름만 제공하며 실시간 도착예정은 제공하지 않습니다.')
