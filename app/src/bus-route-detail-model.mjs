// Only a unique official next-stop ID establishes the direction/position.
// Never infer position from the closest GPS point on overlapping return routes.
export function routeVehicleGroups(stops,vehicles){
  const groups=new Map(),unplaced=[];
  for(const v of vehicles||[]){
    const matches=v.nextStopId?stops.filter(s=>s.stationId===v.nextStopId):[];
    if(matches.length!==1||stops.indexOf(matches[0])===0){unplaced.push(v);continue;}
    const seq=matches[0].seq;
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

