/**
 * Optional on-demand in-app rendition of the Sillim LRT operator's public
 * timetable pages. Scrapes only trusted, fixed station URLs. If the source
 * changes format or is unreachable, we return no departures rather than guess.
 * The embedded verified data in src/metro-inline-schedules.js is the offline
 * fallback for two stations/days.
 */
const STATIONS=['샛강','대방','서울지방병무청','보라매','보라매공원','보라매병원','당곡','신림','서원','서울대벤처타운','관악산'];
export function sillimStationUrl(station){
  const normalized=String(station||'').normalize('NFC').trim().replace(/역$/,'').replace(/\s*\([^)]*\)\s*/g,'').replace(/\s+/g,'');
  const index=STATIONS.indexOf(normalized);
  if(index<0)return null;
  return `https://www.sillimlrt.com/kr/html/sub01/010102${String(index+1).padStart(2,'0')}.html`;
}
const decodeEntities=(text)=>String(text).replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&')
  .replace(/&#(\d+);/g,(_,num)=>String.fromCodePoint(Number(num)))
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const strip=(html)=>decodeEntities(String(html).replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')).trim();
function timetableFromTable(table, direction){
  const rows=[];
  for(const match of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...match[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(x=>strip(x[1]));
    if(cells.length<2)continue;
    const hourText=cells[0].replace(/시$/,'').trim();
    if(!/^\d{1,2}$/.test(hourText))continue;
    const hour=Number(hourText);
    if(hour<5||hour>24)continue;
    const values=cells.slice(1).join(' ').match(/\d{1,2}/g)||[];
    for(const entry of values){
      const minute=Number(entry);
      if(minute>59)continue;
      rows.push({line:'신림선',directionCode:direction,minute:hour*60+minute,
        time:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,
        destination:direction==='1'?'샛강':'관악산',express:false});
    }
  }
  return rows.sort((a,b)=>a.minute-b.minute);
}
export function parseSillimPublishedHtml(html,{station,day='1'}={}){
  if(!sillimStationUrl(station)||!['1','2','3'].includes(day))return null;
  const tables=[...String(html).matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(x=>x[0]);
  // Station timetable pages have: weekday summary, weekday down/up,
  // weekend summary, weekend down/up. Restrict to actual hour/minute tables.
  const hourly=tables.filter(table=>{
    const count=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].filter(match=>{
      const first=match[1].match(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/i);
      const value=first?strip(first[1]).replace(/시$/,'').trim():'';
      return /^\d{1,2}$/.test(value)&&Number(value)>=5&&Number(value)<=24;
    }).length;
    return count>=8;
  });
  // Never infer day/direction mapping from incomplete or ambiguous source markup.
  if(hourly.length!==4)return null;
  const offset=day==='1'?0:2;
  const down=timetableFromTable(hourly[offset],'2');
  const up=timetableFromTable(hourly[offset+1],'1');
  const timetable=[...up,...down];
  if(!timetable.length)return null;
  return {status:'ok',kind:'subway',source:'신림선 도시철도 운영기관 홈페이지(역별 게시 시간표)',
    sourceUrl:sillimStationUrl(station),day,items:[],requestedLines:['신림선'],timetable,
    notice:'운영기관이 게시한 계획 운행시간표 · 실시간 ETA가 아닙니다. 운행 변경·임시편성 시 실제 운행과 다를 수 있습니다.'};
}
