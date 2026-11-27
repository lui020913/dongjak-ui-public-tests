// Transparent planning estimate, not live traffic or timetable prediction.
// Boarding wait estimates and in-station transfer time are separate from
// measured route walking seconds. Ride times are derived from ordered geometry.
const length=coords=>Array.isArray(coords)&&coords.length>=2&&coords.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))?coords.slice(1).reduce((s,p,i)=>s+Math.hypot((p[0]-coords[i][0])*88180,(p[1]-coords[i][1])*111195),0):null;
export function estimateTransitTime(plan,walkSeconds){
 if(!Number.isFinite(walkSeconds)||walkSeconds<0||!plan)return null;
 const legs=plan.legs||[plan];if(!legs.length)return null;
 let rideSeconds=0,waitSeconds=0,transferSeconds=0;
 const rides=[];
 for(const leg of legs){
  const count=leg.stops?.length-1;if(!Number.isInteger(count)||count<1)return null;
  let ride;
  if(leg.kind==='bus'){
   const m=length(leg.coords);if(!(m>0))return null;
   ride=m/(19*1000/3600)+count*20;
   waitSeconds+=5*60;
  }else if(leg.kind==='rail'){
   if(!Array.isArray(leg.lines)||leg.lines.length!==count)return null;
   let changes=0;for(let i=1;i<leg.lines.length;i++)if(leg.lines[i]!==leg.lines[i-1])changes++;
   ride=count*120;waitSeconds+=(changes+1)*4*60;transferSeconds+=changes*4*60;
  }else return null;
  rides.push(Math.ceil(ride/60));rideSeconds+=ride;
 }
 return {totalMinutes:Math.ceil((walkSeconds+rideSeconds+waitSeconds+transferSeconds)/60),walkMinutes:Math.ceil(walkSeconds/60),rideMinutes:Math.ceil(rideSeconds/60),waitMinutes:Math.ceil(waitSeconds/60),transferMinutes:Math.ceil(transferSeconds/60),rideLegMinutes:rides,estimated:true};
}
