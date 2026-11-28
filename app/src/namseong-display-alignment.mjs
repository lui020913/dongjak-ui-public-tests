// Display-only station/rail alignment inferred from four MOIS numbered entrances
// in dongjak-station-access-v1.json (1/4 east, 2/3 west).
// Not a survey of the tunnel or a modification of routing coordinates.
const exits=[
 [126.9705278363891,37.48462500685769],
 [126.97188050427256,37.484117199899984],
 [126.97060381589579,37.484743485930935],
 [126.9719526955837,37.48422632385968]
];
export const NAMSEONG_DISPLAY_CENTER=Object.freeze([0,1].map(i=>exits.reduce((sum,p)=>sum+p[i],0)/exits.length));
const X=88300,Y=111320;
const meters=(a,b)=>Math.hypot((a[0]-b[0])*X,(a[1]-b[1])*Y);
function project(p,a,b){
 const dx=(b[0]-a[0])*X,dy=(b[1]-a[1])*Y;
 const t=Math.max(0,Math.min(1,((p[0]-a[0])*X*dx+(p[1]-a[1])*Y*dy)/(dx*dx+dy*dy||1)));
 return {t,p:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]};
}
export function alignNamseongDisplayRail(collection){
 const features=collection?.features||[],target=NAMSEONG_DISPLAY_CENTER;
 let best=null;
 for(const f of features){
  if(f.properties?.line!=='7호선'||f.geometry?.type!=='LineString')continue;
  const points=f.geometry.coordinates;
  for(let i=1;i<points.length;i++){
   const q=project(target,points[i-1],points[i]),distance=meters(q.p,target);
   if(!best||distance<best.distance)best={...q,distance,f,i};
  }
 }
 if(!best||best.distance>70||best.distance<.05)return collection;
 const anchor=best.p,dx=target[0]-anchor[0],dy=target[1]-anchor[1];
 const shift=p=>{const d=meters(p,anchor);if(d>=180)return p;if(d<.001)return [...target];const t=d/180,w=1-t*t*(3-2*t);return [p[0]+dx*w,p[1]+dy*w];};
 return {...collection,features:features.map(f=>{
  if(f.properties?.line!=='7호선'||f.geometry?.type!=='LineString')return f;
  const original=f.geometry.coordinates;
  const coords=[];
  for(let i=0;i<original.length;i++){
   if(f===best.f&&i===best.i&&best.t>1e-7&&best.t<1-1e-7)coords.push([...target]);
   coords.push(shift(original[i]));
  }
  if(coords.length===original.length&&coords.every((p,i)=>p===original[i]))return f;
  return {...f,properties:{...f.properties,displayAlignment:'entrance-midpoint-approximation'},geometry:{...f.geometry,coordinates:coords}};
 })};
}
