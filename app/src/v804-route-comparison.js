/** Comparative presentation for *actual* locally calculated pedestrian routes.
 * Does not invent a third geometry, an accessibility score, or a safety ranking.
 */
export function routeComparisonItems(routes){
  return ['standard','gentle'].flatMap(id=>{
    const r=routes?.[id]; if(!r?.coords?.length)return [];
    return [{id,label:id==='standard'?'일반 보행':'경사 회피 우선',
      meters:Number(r.kilometers)*1000,minutes:Math.ceil(Number(r.seconds)/60),
      ascent:Number.isFinite(Number(r.slopeAscentM))?Number(r.slopeAscentM):null,
      uncertain:Number.isFinite(Number(r.slopeUncertainM))?Number(r.slopeUncertainM):null,
      source:r.source||'unverified',coords:r.coords}];
  });
}
export function sameRoute(a,b){
  if(!a?.coords||!b?.coords)return false;
  return JSON.stringify(a.coords)===JSON.stringify(b.coords);
}
export function metersLabel(value){return !Number.isFinite(value)?'미확인':value<1000?`${Math.round(value)}m`:`${(value/1000).toFixed(2)}km`;}
export function routePointProximity(coords, points,threshold=60){
  if(!Array.isArray(coords)||coords.length<2||!Array.isArray(points))return null;
  const out=[];
  for(const point of points){
    if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))continue;
    let nearest=Infinity;
    for(let i=1;i<coords.length;i++){
      const a=coords[i-1],b=coords[i];
      const scaleX=88500, scaleY=111200;
      const ax=(a[0]-point[0])*scaleX,ay=(a[1]-point[1])*scaleY;
      const vx=(b[0]-a[0])*scaleX,vy=(b[1]-a[1])*scaleY;
      const t=Math.max(0,Math.min(1,(ax*-vx+ay*-vy)/Math.max(1e-8,vx*vx+vy*vy)));
      nearest=Math.min(nearest,Math.hypot(ax+vx*t,ay+vy*t));
      if(nearest<=threshold)break;
    }
    if(nearest<=threshold)out.push(point);
  }
  return out.length;
}
/* The legacy comparison mount was removed; route-experience-20261123.js owns the sole view. */
