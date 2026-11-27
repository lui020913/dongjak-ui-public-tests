// Compare actual paths from the two pedestrian networks, never map paint
// or unverified straight-line connectors. Include endpoint snap distance.
const meters=(a,b)=>Math.hypot((a[0]-b[0])*88180,(a[1]-b[1])*111000);
export function pedestrianEffectiveMeters(route,from,to){
 if(!Number.isFinite(route?.kilometers)||route.kilometers<0||!Array.isArray(route.coords)||route.coords.length<2)return Infinity;
 const a=route.coords[0],b=route.coords.at(-1);
 if(![a,b].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return Infinity;
 const start=Math.max(meters(a,[from.lng,from.lat]),Number(route.snapStartM)||0),end=Math.max(meters(b,[to.lng,to.lat]),Number(route.snapEndM)||0);
 if(!Number.isFinite(start+end)||start>85||end>85)return Infinity;
 return route.kilometers*1000+start+end;
}
export function chooseShortestPedestrianNetwork(local,external,from,to){
 const a=pedestrianEffectiveMeters(local,from,to),b=pedestrianEffectiveMeters(external,from,to);
 // Keep the existing attributed graph if the difference is within 15m.
 return Number.isFinite(b)&&b+15<a?external:local||null;
}
export function shouldCompareTransitPedestrianNetwork(local,from,to){
 const straight=meters([from.lng,from.lat],[to.lng,to.lat]);
 const effective=pedestrianEffectiveMeters(local,from,to);
 return !Number.isFinite(effective)||(straight>100&&effective>straight*1.35+40)||(local?.vehiclePermittedM>100&&local.vehiclePermittedM>local.kilometers*500);
}
