/**
 * Verified published scheduled train departures (NOT real-time estimates).
 * Transcribed from the Sillim LRT operator's station-specific public timetable,
 * viewed 2026-11-10. Keep dated/attributed. Never infer missing time rows.
 * day: Seoul 1=weekday, 2=Saturday, 3=Sunday/holiday.
 */
const SILLIM_STATIONS=Object.freeze({
  '샛강':Object.freeze({
    sourceUrl:'https://www.sillimlrt.com/kr/html/sub01/01010201.html',
    // Terminus: no departures in the opposing direction.
    weekday:Object.freeze({
      down:`5:30 40 50|6:00 10 20 30 40 50 58|7:06 14 22 26 30 34 38 42 46 50 54 58|8:02 06 10 14 18 22 26 30 34 38 42 46 50 54 58|9:02 06 10 14 18 22 26 34 38 42 50 58|10:06 14 22 30 38 46 54|11:02 10 18 26 34 42 50 58|12:06 14 22 30 38 46 54|13:02 10 18 26 34 42 50 58|14:06 14 22 30 38 46 54|15:02 09 16 23 30 37 44 51 58|16:05 12 19 26 33 39 47 55|17:03 11 15 19 23 27 31 35 39 43 47 51 55 59|18:03 07 11 15 19 23 27 31 35 39 43 47 51 55 59|19:03 07 11 15 19 23 27 31 35 39 43 47 51 56|20:02 08 14 20 27 34 41 48 55|21:02 09 16 23 30 37 44 51 58|22:06 14 22 30 38 46 54|23:02 12 22 32 42 52|24:02 12 22 32 42`
    }),
    weekend:Object.freeze({
      down:`5:30 40 50|6:00 10 20 30 40 50|7:00 10 20 29 35 42 49 56|8:03 10 17 24 31 38 45 52 59|9:06 13 19 27 34 41 48 55|10:02 09 16 23 30 37 44 51 58|11:05 12 19 26 33 40 47 54|12:01 08 15 22 29 36 43 50 57|13:04 11 18 25 32 39 46 53|14:00 07 14 21 28 35 42 49 56|15:03 10 17 24 31 38 45 52 59|16:06 13 20 27 34 41 48 55|17:02 09 16 23 30 37 44 51 58|18:05 12 19 26 33 40 47 54|19:01 08 15 22 29 36 43 50 57|20:04 11 18 25 32 39 46 53|21:00 07 14 21 28 35 42 48 54|22:03 10 16 22 28 33 43 52|23:02 12 22 32 42`
    })
  }),
  '대방':Object.freeze({
    sourceUrl:'https://www.sillimlrt.com/kr/html/sub01/01010202.html',
    weekday:Object.freeze({
      down:`5:31 41 51|6:01 11 21 31 41 51 59|7:07 15 23 27 31 35 39 43 47 51 55 59|8:03 07 11 15 19 23 27 31 35 39 43 47 51 55 59|9:03 07 11 15 19 23 27 35 39 43 51 59|10:07 15 23 31 39 47 55|11:03 11 19 27 35 43 51 59|12:07 15 23 31 39 47 55|13:03 11 19 27 35 43 51 59|14:07 15 23 31 39 47 55|15:03 10 17 24 31 38 45 52 59|16:06 13 20 27 34 40 48 56|17:04 12 16 20 24 28 32 36 40 44 48 52 56|18:00 04 08 12 16 20 24 28 32 36 40 44 48 52 56|19:00 04 08 12 16 20 24 28 32 36 40 44 48 52 57|20:03 09 15 21 28 35 42 49 56|21:03 10 17 24 31 38 45 52 59|22:07 15 23 31 39 47 55|23:03 13 23 33 43 53|24:03 13 23 33 43`,
      up:`5:46 56|6:06 16 26 36 45 51 58|7:05 12 18 25 29 33 37 41 45 49 53 57|8:01 05 09 13 17 21 25 29 33 37 41 45 49 53 57|9:01 05 09 13 17 21 25 29 33 37 41 45 49 53 58|10:03 09 17 25 33 41 49 57|11:05 13 21 29 37 45 53|12:01 09 17 25 33 41 49 57|13:05 13 21 29 37 45 53|14:01 09 17 25 33 41 49 57|15:01 09 16 23 30 37 44 51 58|16:05 12 19 26 33 40 47 54|17:01 08 14 18 22 26 30 34 38 42 46 50 54 58|18:02 06 10 14 18 22 26 30 34 38 42 46 50 54 58|19:02 06 10 14 18 22 26 30 34 38 42 46 50 54 58|20:02 06 10 14 18 22 26 31 37 43 49 55|21:02 09 16 23 30 37 44 51 58|22:05 12 19 26 33 41 49 57|23:05 13 21 29 38 48 58|24:08 18 28 38 48 58`
    })
  })
});

export function normalizePublishedStationName(name){
  const base=String(name||'').trim().normalize('NFC').replace(/역$/,'').replace(/\s*\([^)]*\)\s*/g,'').replace(/\s+/g,'');
  return base;
}

export function parseOfficialHourlyRows(value,{line='신림선',directionCode='1',destination='샛강'}={}){
  if(!value)return [];
  const rows=[];
  for(const group of String(value).split('|')){
    const [rawHour,rawMinutes]=group.split(':');
    const hour=Number(rawHour);
    if(!Number.isInteger(hour)||hour<0||hour>24||rawMinutes===undefined)continue;
    for(const m of rawMinutes.trim().split(/\s+/)){
      if(!/^\d{1,2}$/.test(m))continue;
      const minute=Number(m);
      if(minute>59)continue;
      const total=hour*60+minute;
      rows.push({line,directionCode,minute:total,time:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,destination,express:false});
    }
  }
  return rows.sort((a,b)=>a.minute-b.minute);
}

/** Return only verified operator rows. No extrapolation to other stations or days. */
export function verifiedInlineOperatorTimetable(name,line,day){
  if(line!=='신림선')return null;
  const station=normalizePublishedStationName(name);
  const entry=SILLIM_STATIONS[station];
  if(!entry)return null;
  const service=day==='1'?entry.weekday:entry.weekend;
  if(!service)return null;
  const timetable=[
    ...parseOfficialHourlyRows(service.up,{line:'신림선',directionCode:'1',destination:'샛강'}),
    ...parseOfficialHourlyRows(service.down,{line:'신림선',directionCode:'2',destination:'관악산'})
  ];
  if(!timetable.length)return null;
  return {status:'ok',kind:'subway',source:'신림선 도시철도 공식 역별 열차시간안내',sourceUrl:entry.sourceUrl,
    day,requestedLines:['신림선'],items:[],timetable,
    notice:`신림선 운영기관 게시 시간표 · ${station}역 · 실시간 도착예정이 아닌 정규 운행시각입니다. 임시 편성·운행변경 가능.`};
}
