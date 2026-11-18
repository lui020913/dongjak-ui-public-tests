#!/usr/bin/env python3
"""Convert a supplied official Seoul bus stop XLSX to the app's established JSON format.
Uses the standard library XML reader to preserve 5-digit ARS IDs without needing Excel packages.
No invented coordinates or runtime API dependencies.
"""
from pathlib import Path
from zipfile import ZipFile
import argparse, collections, json, math, re, xml.etree.ElementTree as ET

NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
CELL_RE=re.compile(r'^([A-Z]+)\d+$')

def column_number(text):
    result=0
    for ch in text:
        result=result*26+ord(ch)-64
    return result-1

def read_xlsx(path):
    with ZipFile(path) as archive:
        strings=[]
        with archive.open('xl/sharedStrings.xml') as f:
            for _,el in ET.iterparse(f,events=('end',)):
                if el.tag==NS+'si':
                    strings.append(''.join(x.text or '' for x in el.iter(NS+'t')))
                    el.clear()
        with archive.open('xl/worksheets/sheet1.xml') as f:
            for _,el in ET.iterparse(f,events=('end',)):
                if el.tag!=NS+'row':continue
                record={}
                for cell in el.findall(NS+'c'):
                    ref=cell.attrib.get('r','')
                    m=CELL_RE.fullmatch(ref)
                    if not m:continue
                    v=cell.find(NS+'v')
                    if v is None:continue
                    value=v.text or ''
                    if cell.attrib.get('t')=='s':
                        value=strings[int(value)]
                    record[column_number(m.group(1))]=value
                yield [record.get(i,'') for i in range(max(record.keys(),default=-1)+1)]
                el.clear()

def run():
    parser=argparse.ArgumentParser()
    parser.add_argument('xlsx')
    parser.add_argument('--date',default='2026-09-02')
    parser.add_argument('--output',default='public/data/transport/seoul-bus-stops.json')
    args=parser.parse_args()
    rows=read_xlsx(Path(args.xlsx))
    headers=[str(x).strip().upper().replace('-','_').replace(' ','') for x in next(rows)]
    def index(*alts):
        for alt in alts:
            if alt in headers:return headers.index(alt)
        raise ValueError(f'필수 열 없음: {alts}, {headers}')
    namecol=index('정류소명','정류장명')
    arscol=index('ARS_ID','ARSID','ARS번호')
    loncol=index('X좌표','경도')
    latcol=index('Y좌표','위도')
    seen={};status=collections.Counter();conflicts=[]
    for row in rows:
        status['source_rows']+=1
        try:
            ars=str(row[arscol]).strip()
            if re.fullmatch(r'\d+\.0',ars):ars=ars[:-2]
            if ars.isdigit():ars=ars.zfill(5)
            name=str(row[namecol]).strip()
            lon=float(row[loncol]);lat=float(row[latcol]);
            if not re.fullmatch(r'\d{5}',ars) or not name or not math.isfinite(lon) or not math.isfinite(lat) or not(126<=lon<=128 and 37<=lat<=38):
                status['invalid']+=1;continue
            item={'arsId':ars,'name':name,'lng':round(lon,7),'lat':round(lat,7)}
            if ars in seen:
                if seen[ars]!=item:conflicts.append([ars,seen[ars],item])
                status['duplicate_ars']+=1
                continue
            seen[ars]=item
            status['valid']+=1
        except (IndexError,ValueError,TypeError):
            status['invalid']+=1
    if len(seen)<1000 or conflicts:raise ValueError(f'검증 실패: count={len(seen)} conflicts={conflicts[:5]}')
    output={'source':'서울시 버스정류소 위치정보',
            'sourceURL':'https://data.seoul.go.kr/dataList/OA-15067/S/1/datasetView.do',
            'sourceDate':args.date,'realtime':False,
            'stops':list(seen.values())}
    dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
    print('원본 표제:',headers)
    print('검증 결과:',dict(status))
    print('위치 범위:',min(x['lng'] for x in seen.values()),max(x['lng'] for x in seen.values()),min(x['lat'] for x in seen.values()),max(x['lat'] for x in seen.values()))
    print('JSON 경로:',dest,'용량(KB):',round(dest.stat().st_size/1024))
if __name__=='__main__':run()
