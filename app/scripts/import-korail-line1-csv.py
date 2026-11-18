#!/usr/bin/env python3
"""Import manually verified station-specific Korail departure rows exported as CSV.
Usage: py scripts/import-korail-line1-csv.py verified-line1.csv
CSV columns: station,day,directionCode,time,destination,express
  day: weekday or holiday; directionCode: 1 upbound, 2 downbound.
Only actual station-specific times from the Korail 2026-09 timetable may be used.
"""
import csv,json,sys,re,pathlib
if len(sys.argv)!=2:
    sys.exit('Usage: py scripts/import-korail-line1-csv.py verified-line1.csv')
path=pathlib.Path(sys.argv[1]);records={}; seen=set()
with path.open('r',encoding='utf-8-sig',newline='') as f:
    reader=csv.DictReader(f)
    required={'station','day','directionCode','time','destination','express'}
    if not required.issubset(reader.fieldnames or []):
        sys.exit('Missing CSV columns: '+', '.join(sorted(required-set(reader.fieldnames or []))))
    for i,row in enumerate(reader,2):
        station=row['station'].strip().removesuffix('역'); day=row['day'].strip()
        direction=row['directionCode'].strip(); t=row['time'].strip();expr=row['express'].strip().lower()
        if station not in ('노량진','대방') or day not in ('weekday','holiday') or direction not in ('1','2'):
            sys.exit(f'Invalid station/day/direction at row {i}: {row}')
        if not re.fullmatch(r'(?:[01]?\d|2[0-4]):[0-5]\d',t):sys.exit(f'Invalid time in row {i}: {t}')
        h,m=map(int,t.split(':'));minute=h*60+m
        if minute<300 or minute>1499:sys.exit(f'Unexpected service time in row {i}: {t}')
        if expr not in ('true','false','0','1','yes','no',''):sys.exit(f'Invalid express flag row {i}')
        key=(station,day,direction,minute)
        if key in seen:sys.exit(f'Duplicate station/day/direction/time in row {i}')
        seen.add(key)
        records.setdefault(station,{}).setdefault(day,[]).append({
          'time':f'{h:02d}:{m:02d}','minute':minute,'directionCode':direction,
          'destination':row['destination'].strip(),'express':expr in ('true','yes','1')})
if not records:sys.exit('No verified rows')
for station in records:
  for day in records[station]:records[station][day].sort(key=lambda r:r['minute'])
output=pathlib.Path('public/data/transport/korail-line1-stations.json')
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps({
 'schemaVersion':1,'provider':'KORAIL',
 'sourceUrl':'https://www.korail.com/com/userBoard.do?mode=list&schBcid=ticketTable',
 'basedOn':'한국철도공사 1호선 2026-09-01 적용 정규 시각표; 변경공고 우선',
 'stations':records},ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print(f'Wrote {output} with {len(seen)} verified station entries.')
