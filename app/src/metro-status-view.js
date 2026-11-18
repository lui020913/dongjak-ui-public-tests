/**
 * Provider updates can include station/train states but no usable ETA.
 * This module is presentation-only: no fabricated countdown, location or train movement.
 */
export function statusReportLabel(message='') {
  const raw=String(message||'').trim();
  const m=/^최근 수신:\s*(.*?)\s*·\s*도착시간 미확인$/.exec(raw);
  if(!m)return '';
  const state=String(m[1]||'').trim();
  return state ? `마지막 보고: ${state.slice(0,65)}` : '최근 열차정보 수신';
}
export function compactReportedArrivals(rows=[],maxPerDirection=2){
  const limit=Math.max(1,Math.min(3,Math.floor(maxPerDirection)||2));
  // Preserve direction group and destination order while avoiding a 3-screen list of
  // repeated no-ETA placeholders. These are train reports, not live positions.
  const visible=[];
  let hidden=0;
  const used=new Map();
  for(const row of rows){
    const direction=String(row?.directionType||row?.direction||'').split(/[·|,/\s]+/)[0]||'방향 미확인';
    const line=String(row?.line||'');
    const key=`${line}::${direction}`;
    const count=used.get(key)||0;
    if(count>=limit){hidden++;continue;}
    used.set(key,count+1);visible.push(row);
  }
  return {visible,hidden,total:rows.length};
}
export function metroTerminalLabel(name,line,direction){
  // A known endpoint is a terminus, not a data failure.
  const order={'신림선':['샛강','관악산'],'1호선':[]};
  const ends=order[String(line)]||[];
  const atStart=ends[0]&&String(name).replace(/역$/,'')===ends[0];
  const atEnd=ends[1]&&String(name).replace(/역$/,'')===ends[1];
  if(direction==='previous'&&atStart)return '기점';
  if(direction==='next'&&atEnd)return '종점';
  return direction==='previous'?'이전역 없음':'다음역 없음';
}
