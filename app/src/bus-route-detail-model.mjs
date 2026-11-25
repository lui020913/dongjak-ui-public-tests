// Use official route sequence to resolve missing or repeated next-stop IDs.
// Never infer position from the closest GPS point on overlapping return routes.
export function routeVehicleGroups(stops,vehicles){
  const groups=new Map(),unplaced=[];
  for(const v of vehicles||[]){
    const nextId=String(v.nextStopId??'');
    const usableId=/^[1-9]\d*$/.test(nextId)||(/[^\d]/.test(nextId)&&nextId!=='undefined'&&nextId!=='null');
    const matches=usableId?stops.filter(s=>String(s.stationId??'')===nextId):[];
    // sectOrd identifies the last passed stop; the vehicle belongs before the next stop.
    const current=Number.isInteger(v.sectionOrder)&&v.sectionOrder>0?stops.findIndex(s=>s.seq===v.sectionOrder):-1;
    const candidate=current>=0&&current+1<stops.length?stops[current+1]:null;
    const byOrder=candidate&&candidate.seq===v.sectionOrder+1&&(!matches.length||matches.includes(candidate))?candidate:null;
    const match=matches.length===1?matches[0]:byOrder;
    if(!match||stops.indexOf(match)===0){unplaced.push(v);continue;}
    const seq=match.seq;
    if(!groups.has(seq))groups.set(seq,[]);
    groups.get(seq).push(v);
  }
  return {groups,unplaced};
}
const congestion={'3':'여유','4':'보통','5':'혼잡','6':'매우 혼잡'};
export function vehicleLabel(v){
  return [v.vehicleNumber||'차량번호 미제공',congestion[v.congestion],v.busType==='1'?'저상':null].filter(Boolean).join(' · ');
}
export function stopHours(s){return s.firstTime||s.lastTime?`${s.firstTime||'미제공'} – ${s.lastTime||'미제공'}`:'첫·막차 정보 미제공';}

