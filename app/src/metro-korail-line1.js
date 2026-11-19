/** Official Korail station timetables, converted locally from operator data.
 * Do not generate service times from the realtime status stream (barvlDt=0).
 */
export function verifiedKorailLine1Timetable(payload,station,day){
  if(!payload || payload.schemaVersion!==1 || payload.provider!=='KORAIL' || !payload.sourceUrl?.startsWith('https://www.korail.com/'))return null;
  const name=String(station||'').trim().replace(/역$/,'').replace(/\([^)]*\)/g,'');
  if(!['노량진','대방'].includes(name))return null;
  const lookupDay=day==='1'?'weekday':'holiday';
  const raw=payload.stations?.[name]?.[lookupDay];
  if(!Array.isArray(raw))return null;
  const timetable=raw.filter(r=>{
    if(!['1','2'].includes(String(r?.directionCode)))return false;
    const match=/^(?:[01]?\d|2[0-4]):[0-5]\d$/.exec(String(r?.time||''));
    return !!match && Number.isFinite(Number(r.minute)) && Number(r.minute)>=300 && Number(r.minute)<=1499;
  }).map(row=>({
    line:'1호선',directionCode:String(row.directionCode),
    directionType:String(row.directionCode)==='1'?'상행':'하행',
    minute:Number(row.minute),time:row.time,
    destination:String(row.destination||''),express:row.express===true
  })).sort((a,b)=>a.minute-b.minute);
  if(!timetable.length)return null;
  return {status:'ok',kind:'subway',source:'한국철도공사 공식 전동열차 시각표',
    sourceUrl:payload.sourceUrl,day,requestedLines:['1호선'],items:[],timetable,
    notice:'코레일 정규 시각표 기준 · 실시간 운행 지연 및 임시 변경 미반영'};
}
