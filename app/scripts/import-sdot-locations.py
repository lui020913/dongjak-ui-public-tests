"""Import official S-DoT location workbook (OA-22833) into an audited Dongjak GeoJSON.
Requires Python 3 and openpyxl. Supports WGS84 longitude/latitude ONLY, never guesses TM CRS.
Run: python scripts/import-sdot-locations.py "location workbook.xlsx"
"""
from pathlib import Path
import json, sys, re
try:
    from openpyxl import load_workbook
except ImportError:
    raise SystemExit('openpyxl 미설치: py -m pip install openpyxl')

def normal(key):
    return re.sub(r'[^0-9a-z가-힣]', '', str(key or '').lower())

def find(cols,names):
    want={normal(n) for n in names}
    for i,col in enumerate(cols):
        if normal(col) in want:return i
    return None

def choose_columns(rows):
    serials=('serial','serialnumber','센서시리얼','센서시리얼번호','시리얼','시리얼번호','시리얼넘버','센서id','센서아이디','기기번호')
    lats=('위도','gps위도','위도wgs84','latitude','lat','gpslat')
    lons=('경도','gps경도','경도wgs84','longitude','lon','lng','gpslon')
    dists=('자치구','자치구명','행정구','시군구','시군구명','autonomousdistrict')
    for i,row in enumerate(rows[:20]):
        si=find(row,serials);la=find(row,lats);lo=find(row,lons)
        if si is not None and la is not None and lo is not None:
            return i,si,la,lo,find(row,dists)
    raise RuntimeError('시리얼/위도/경도 열을 찾을 수 없습니다. 좌표계 또는 컬럼 이름을 원본에서 확인해 주세요. 임의 보정하지 않습니다.')

def convert(path,target):
    book=load_workbook(path,read_only=True,data_only=True)
    features=[];bad=[];nrows=0;seen=set()
    try:
        for sheet in book.worksheets:
            rows=list(sheet.iter_rows(values_only=True))
            try: head,si,la,lo,di=choose_columns(rows)
            except RuntimeError:continue
            for index,row in enumerate(rows[head+1:],head+2):
                nrows+=1
                serial=str(row[si] or '').strip() if si<len(row) else ''
                try:
                    lat=float(row[la]);lon=float(row[lo])
                except (ValueError,TypeError,IndexError):bad.append(f'{sheet.title} {index}: 좌표 없음');continue
                if not serial or len(serial)>100 or not(126.85<=lon<=127.05 and 37.45<=lat<=37.57):
                    bad.append(f'{sheet.title} {index}: 시리얼/동작구 인접 좌표 검사 실패');continue
                district=str(row[di] or '').replace(' ','') if di is not None and di<len(row) else ''
                if district and '동작구' not in district:continue
                if serial in seen:bad.append(f'{sheet.title} {index}: 동일 센서 중복');continue
                seen.add(serial)
                features.append({'type':'Feature','geometry':{'type':'Point','coordinates':[lon,lat]},
                    'properties':{'serial':serial,'source':'서울시 S-DoT 설치 위치정보','location_review':'확인 필요'}})
    finally:book.close()
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps({'type':'FeatureCollection','features':features,
      'meta':{'source_filename':path.name,'coordinate_system':'WGS84','note':'동작구 인접 범위 1차 검사만 완료. 정확한 동작구 경계는 지도에서 필터링합니다.'}},ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print('검토 좌표:',len(features),'제외/오류:',len(bad),'원본 행:',nrows)
    print('출력:',target)
    if bad:
        log=target.with_suffix('.review.txt');log.write_text('\n'.join(bad),encoding='utf-8')
        print('검토 목록:',log)

if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('사용법: python scripts/import-sdot-locations.py "공식 설치 위치정보.xlsx"')
    base=Path(__file__).resolve().parents[1]
    convert(Path(sys.argv[1]),base/'public/data/safety/sdot/dongjak_sdot_locations.geojson')
