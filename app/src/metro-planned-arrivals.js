/**
 * Timetable-based countdown for lines whose Seoul realtime API returns barvlDt=0.
 * This is never live train tracking; renderers MUST label it planned.
 * Values are derived only from verified, station-specific departure tables.
 */
export function seoulServiceClock(date=new Date()) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',
    weekday:'short',hourCycle:'h23'}).formatToParts(date);
  const get=(key)=>parts.find(p=>p.type===key)?.value||'';
  const hour=Number(get('hour')),minute=Number(get('minute')),second=Number(get('second'));
  const week=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const index=week.indexOf(get('weekday'));
  // Trains marked 24:xx belong to the previous railway service day.
  const afterMidnight=hour<4;
  const serviceDay=afterMidnight?(index+6)%7:index;
  return {
    day: serviceDay===0?'3':serviceDay===6?'2':'1',
    minute:(afterMidnight?hour+24:hour)*60+minute,
    second,
    afterMidnight,
    sourceDate:date.toISOString()
  };
}
function scheduledMinute(row){
  if(Number.isFinite(row?.minute))return Number(row.minute);
  const m=/^(\d{1,2}):(\d{2})$/.exec(String(row?.time||''));
  if(!m)return null;
  const hour=Number(m[1]),minute=Number(m[2]);
  return hour<=24&&minute<=59?hour*60+minute:null;
}
/** An array of next planned train cards, up to `perDirection` for each direction. */
export function plannedArrivalsFromTimetable(rows,line,clock=seoulServiceClock(),perDirection=2){
  if(!Array.isArray(rows))return [];
  const nowSecond=clock.minute*60+clock.second;
  const options=[];
  for(const row of rows){
    if(row?.line && String(row.line)!==line)continue;
    const rawMinute=scheduledMinute(row);
    if(rawMinute===null || !['1','2'].includes(String(row.directionCode)))continue;
    const minute=clock.afterMidnight&&rawMinute<240?rawMinute+1440:rawMinute;
    const remainingSeconds=minute*60-nowSecond;
    if(remainingSeconds < 0 || remainingSeconds > 3*3600)continue;
    const displayTime=String(row.time||`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`);
    options.push({
      line,
      directionCode:String(row.directionCode),
      directionType:String(row.directionCode)==='1'?'상행':'하행',
      direction:String(row.directionCode)==='1'?'상행':'하행',
      destination:String(row.destination||'').replace(/행$/,''),
      plannedTime:displayTime,
      remainingSeconds,
      // No invented live arrival time; make the distinction clear even inside the card.
      message:`약 ${Math.max(1,Math.ceil(remainingSeconds/60))}분 후 도착`,
      isPlanned:true,
      sourceLabel:'시간표 기준 · 실시간 지연 미반영',
      serviceType:row.express===true?'급행':'일반'
    });
  }
  const counts={'1':0,'2':0};
  return options.sort((a,b)=>a.remainingSeconds-b.remainingSeconds)
    .filter(row=>++counts[row.directionCode]<=perDirection);
}
