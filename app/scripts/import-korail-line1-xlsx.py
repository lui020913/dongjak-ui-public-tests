#!/usr/bin/env python3
"""Convert KORAIL's ORIGINAL September 2026 Line 1 Excel timetable to station JSON.

Usage (run from project root):
  py scripts/import-korail-line1-xlsx.py <weekday.xlsx> <holiday.xlsx>

Reads the official timetable workbooks without changing them; no third-party
packages required. Each train is a column with origin/destination/number in
rows 2/3/4. Labeled station rows contain ARRIVAL times; the following row,
when present, contains departure times. The app displays arrival countdowns.

For the selected station, the sheet '_상' / '_하' identifies direction and
'경인급행' identifies express services. Overnight Excel clock fractions are
assigned to 24:xx of the preceding railway service day. The workbook uses
some half-minute times; the JSON's `minute` retains their fractional value,
while `time` rounds to an approximate minute for display.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
RID='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
N={'x':MAIN}
DEST_ALIAS={
  '1지청':'청량리',  # KORAIL abbreviation: underground Cheongnyangni
  '지하서':'서울',    # underground Seoul Station
  '1종로':'종로3가',
  '1동대':'동대문',
}
STATIONS=('노량진','대방')
SOURCE_URL='https://www.korail.com/com/userBoard.do?mode=list&schBcid=ticketTable'


def column_number(name):
    n=0
    for letter in name:n=n*26+ord(letter)-64
    return n


def normalized(value):
    return re.sub(r'\s+','',str(value or ''))


def xlsx_sheets(file_path:Path):
    with ZipFile(file_path) as z:
        shared=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            root=ET.fromstring(z.read('xl/sharedStrings.xml'))
            for item in root.findall('x:si',N):
                shared.append(''.join(t.text or '' for t in item.findall('.//x:t',N)))
        workbook=ET.fromstring(z.read('xl/workbook.xml'))
        rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        id_to_target={r.get('Id'):r.get('Target') for r in rels}
        for sh in workbook.findall('x:sheets/x:sheet',N):
            name=sh.get('name')
            target=id_to_target[sh.get('{'+RID+'}id')].lstrip('/')
            target=target if target.startswith('xl/') else 'xl/'+target
            root=ET.fromstring(z.read(target)); rows={}
            for row in root.findall('x:sheetData/x:row',N):
                cells={}
                for cell in row.findall('x:c',N):
                    ref=cell.get('r','')
                    match=re.match(r'[A-Z]+',ref)
                    if not match:continue
                    col=column_number(match.group())
                    v=cell.find('x:v',N)
                    inline=cell.find('x:is',N)
                    if v is not None:
                        value=v.text
                        if cell.get('t')=='s':value=shared[int(value)]
                    elif inline is not None:
                        value=''.join(t.text or '' for t in inline.findall('.//x:t',N))
                    else:continue
                    cells[col]=value
                rows[int(row.get('r'))]=cells
            yield name,rows


def seconds_from_excel(value):
    """Return railway-service-day seconds; None for blanks / non-time cells."""
    if value is None or not str(value).strip():return None
    try:decimal=float(str(value).strip())
    except (ValueError,TypeError):return None
    if not 0<=decimal<2:return None
    seconds=round(decimal*86400)
    if seconds<4*3600:seconds+=86400  # midnight rollover in Excel day fraction
    if not 5*3600<=seconds<=24*3600+59*60+59:return None
    return seconds


def to_record(seconds, dest, train_no, express, sheet, col):
    display_minute=(seconds+30)//60  # displayed minute is rounded; ETA uses exact seconds
    hour,minute=divmod(display_minute,60)
    destination=normalized(dest)
    destination=DEST_ALIAS.get(destination,destination)
    return {
      'time':f'{hour:02d}:{minute:02d}',
      'minute':round(seconds/60,6),
      'directionCode':'1' if sheet.endswith('_상') else '2',
      'destination':destination,
      'express':bool(express),
      'trainNumber':str(train_no or '').strip(),
    }


def convert(weekday:Path,holiday:Path):
    station_data={name:{'weekday':[],'holiday':[]} for name in STATIONS}
    raw_counts=Counter();dedup=Counter(); source_stats={}
    for day,path in [('weekday',weekday),('holiday',holiday)]:
        if not path.is_file():raise FileNotFoundError(path)
        source_stats[day]={
          'file':path.name,
          'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        }
        seen={name:set() for name in STATIONS}
        for sheet,rows in xlsx_sheets(path):
            if not re.search(r'_(상|하)$',sheet):continue
            express='급행' in sheet
            headers={col:val for col,val in rows.get(4,{}).items() if col>1}
            for name in STATIONS:
                matches=[r for r,cells in rows.items() if normalized(cells.get(1))==name]
                if not matches:continue
                if len(matches)!=1:
                    raise ValueError(f'Ambiguous station row: {path} {sheet} {name}: {matches}')
                station_row=rows[matches[0]]
                for col,train_no in headers.items():
                    seconds=seconds_from_excel(station_row.get(col))
                    if seconds is None:continue
                    dest=rows.get(3,{}).get(col,'')
                    if not normalized(dest):raise ValueError(f'Missing destination: {sheet} {name} {col}')
                    record=to_record(seconds,dest,train_no,express,sheet,col)
                    # A KORAIL train may be present in multiple service groups;
                    # deduplicate same train only, never simultaneous different trains.
                    key=(record['directionCode'],record['trainNumber'],seconds)
                    raw_counts[(day,name)]+=1
                    if key in seen[name]:dedup[(day,name)]+=1;continue
                    seen[name].add(key)
                    station_data[name][day].append(record)
        for name in STATIONS:
            station_data[name][day].sort(key=lambda x:(x['minute'],x['directionCode'],x['trainNumber']))
            if not station_data[name][day]:raise ValueError(f'No rows for {name}/{day}')
    return {
      'schemaVersion':1,
      'provider':'KORAIL',
      'sourceUrl':SOURCE_URL,
      'basedOn':'2026-09-01 적용 코레일 1호선 정규 시각표(평일·휴일). 임시 운행변경/파업 시각표 별도 확인 필요.',
      'displayPrecision':'원본 초 단위 시각을 사용하여 ETA 계산. 화면 출발시각은 가장 가까운 분으로 표시.',
      'sources':source_stats,
      'stations':station_data,
    },raw_counts,dedup


def verify(payload):
    for station,days in payload['stations'].items():
        for day,rows in days.items():
            assert len(rows)>100,(station,day,len(rows))
            for direction in ('1','2'):
                assert any(r['directionCode']==direction for r in rows),(station,day,direction)
            for row in rows:
                assert re.fullmatch(r'(?:[01]\d|2[0-4]):[0-5]\d',row['time']),row
                assert 300<=row['minute']<=1499,row
                assert row['destination'],row
                assert row['trainNumber'],row
    # At least one after-midnight departure in the original KORAIL data
    assert any(r['time'].startswith('24:') for days in payload['stations'].values() for rows in days.values() for r in rows)


def main(args):
    if len(args)!=2:
        raise SystemExit('Usage: py scripts/import-korail-line1-xlsx.py weekday.xlsx holiday.xlsx')
    payload,raw_counts,dedup=convert(*map(Path,args))
    verify(payload)
    target=Path('public/data/transport/korail-line1-stations.json')
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print('[KORAIL 공식 1호선 시간표 반영]')
    for station,days in payload['stations'].items():
        for day,rows in days.items():
            n_up=sum(r['directionCode']=='1' for r in rows)
            n_down=sum(r['directionCode']=='2' for r in rows)
            n_express=sum(r['express'] for r in rows)
            print(f'{station}/{day}: {len(rows)}편 (상행 {n_up}, 하행 {n_down}, 급행 {n_express}), 원본 중복 제거 {dedup[(day,station)]}건')
    print('출력:',target)

if __name__=='__main__':main(sys.argv[1:])
