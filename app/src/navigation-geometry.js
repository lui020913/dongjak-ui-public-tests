// 내비게이션 경로 거리·투영·분할. 브라우저 API에 의존하지 않는 순수 함수.
const EARTH_M = 6371008.8;
const rad = x => x * Math.PI / 180;
export function distanceMeters(a,b) {
  const dLat=rad(b[1]-a[1]), dLng=rad(b[0]-a[0]);
  const h=Math.sin(dLat/2)**2 + Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dLng/2)**2;
  return 2*EARTH_M*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function makeRouteIndex(coords) {
  if(!Array.isArray(coords)||coords.length<2)throw new Error('경로 좌표가 부족합니다.');
  const lengths=[0];
  for(let i=1;i<coords.length;i++) lengths.push(lengths.at(-1)+distanceMeters(coords[i-1],coords[i]));
  return {coords,lengths,total:lengths.at(-1)};
}
export function nearestOnRoute(index,position) {
  let best=null;
  const latR=rad(position[1]);
  const sx=111320*Math.cos(latR), sy=111195;
  for(let i=0;i<index.coords.length-1;i++) {
    const a=index.coords[i],b=index.coords[i+1];
    const dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*sy;
    const px=(position[0]-a[0])*sx,py=(position[1]-a[1])*sy;
    const lenSq=dx*dx+dy*dy;
    const t=lenSq?Math.max(0,Math.min(1,(px*dx+py*dy)/lenSq)):0;
    const snapped=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    const error=distanceMeters(position,snapped);
    if(!best||error<best.offRouteMeters)best={segment:i,t,point:snapped,
      offRouteMeters:error,progressMeters:index.lengths[i]+(index.lengths[i+1]-index.lengths[i])*t};
  }
  return best;
}
export function pointAtProgress(index,meters) {
  const p=Math.max(0,Math.min(index.total,meters));
  for(let i=0;i<index.coords.length-1;i++) {
    if(p<=index.lengths[i+1]||i===index.coords.length-2) {
      const length=index.lengths[i+1]-index.lengths[i];
      const t=length?(p-index.lengths[i])/length:0;
      const a=index.coords[i],b=index.coords[i+1];
      return {point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],segment:i};
    }
  }
  return {point:index.coords.at(-1),segment:index.coords.length-2};
}
export function splitRoute(index,meters) {
  const p=Math.max(0,Math.min(index.total,meters));
  const {point,segment}=pointAtProgress(index,p);
  return {
    traveled:[...index.coords.slice(0,segment+1),point],
    remaining:[point,...index.coords.slice(segment+1)],
    remainingMeters:index.total-p
  };
}
