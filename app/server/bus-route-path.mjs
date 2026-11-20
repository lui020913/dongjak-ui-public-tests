/** Official Seoul bus route geometry: never substitute straight stop-to-stop lines. */
export function parseBusRoutePath(body,routeId){
  const raw=body?.msgBody?.itemList??body?.msgBody?.item??[];
  const rows=Array.isArray(raw)?raw:[raw];
  if(rows.length<2)return [];
  const points=rows.map(row=>({id:String(row?.busRouteId??routeId),order:Number(row?.no),lng:Number(row?.gpsX),lat:Number(row?.gpsY)}));
  if(points.some(p=>p.id!==String(routeId)||!Number.isInteger(p.order)||p.order<0||!Number.isFinite(p.lng)||!Number.isFinite(p.lat)||p.lng<124||p.lng>132||p.lat<33||p.lat>39))return [];
  points.sort((a,b)=>a.order-b.order);
  if(points.some((p,i)=>i>0&&p.order!==points[i-1].order+1))return [];
  const coordinates=points.map(p=>[p.lng,p.lat]).filter((p,i,all)=>!i||p[0]!==all[i-1][0]||p[1]!==all[i-1][1]);
  return coordinates.length>=2?coordinates:[];
}
export function busRoutePathUrl(key,id){
  return 'http://ws.bus.go.kr/api/rest/busRouteInfo/getRoutePathList?'+new URLSearchParams({ServiceKey:key,busRouteId:id,resultType:'json'});
}
