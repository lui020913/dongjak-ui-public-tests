const kindOf=p=>p.kind==='bus'||/버스정류장/.test(p.category||'')?'bus':p.kind==='subway'||/지하철|철도역/.test(p.category||'')?'subway':'place';
export function searchResultKey(p){
  const kind=kindOf(p),name=String(p.name||'').trim().replace(/역$/,'');
  if(kind==='bus'&&p.arsId)return 'bus:'+String(p.arsId);
  return kind+':'+name+':'+Number(p.lng).toFixed(4)+':'+Number(p.lat).toFixed(4);
}
export function searchResultSubtitle(p){
  const kind=kindOf(p);let parts;
  if(kind==='bus'){
    const direction=String(p.direction||'').trim();
    const known=direction&&!/^\d+$/.test(direction)&&!/^ARS\b/i.test(direction)&&!/^(?:미확인|방면 미확인|방면 정보 없음|정보 없음|unknown|undefined|null|-)$/i.test(direction);
    parts=['버스정류장',known?(direction.endsWith('방면')?direction:direction+' 방면'):'방면 미확인'];
  }else{
    const address=String(p.address||'').replace(/(?:^|\s*·\s*)ARS\s*\d+/gi,'').trim();
    parts=[p.category||p.kind||'시설',...(Array.isArray(p.lines)?p.lines:[]),address];
  }
  if(Number.isFinite(p.distanceMeters))parts.push(Math.round(p.distanceMeters)+'m');
  return [...new Set(parts.filter(Boolean))].join(' · ');
}
export function distanceMeters(a,b){
  const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
  return 6371000*2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
}
export function nearbySearchResults(origin,items,{radius=500,limit=30}={}){
  const seen=new Set(),found=[];
  for(const p of items){
    if(!p?.name||p.lng==null||p.lat==null)continue;
    const lng=Number(p.lng),lat=Number(p.lat);if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
    const row={...p,lng,lat},distance=distanceMeters(origin,row),key=searchResultKey(row);
    if(!Number.isFinite(distance)||distance>radius||seen.has(key))continue;
    seen.add(key);found.push({...row,distanceMeters:distance});
  }
  return found.sort((a,b)=>a.distanceMeters-b.distanceMeters).slice(0,limit);
}
export async function fetchNearbyOfficialPlaces(origin,{signal,fetcher=fetch}={}){
  const dy=500/111195,dx=dy/Math.cos(origin.lat*Math.PI/180);
  const bbox=[origin.lng-dx,origin.lat-dy,origin.lng+dx,origin.lat+dy];
  if(bbox[0]<126.5||bbox[2]>127.3||bbox[1]<37.2||bbox[3]>37.8)throw new Error('서울시 자료 범위 밖');
  const url=new URL('/api/seoul-facilities',location.origin);url.searchParams.set('bbox',bbox.map(x=>x.toFixed(5)).join(','));url.searchParams.set('limit','1500');
  const response=await fetcher(url,{signal});if(!response.ok)throw new Error('시설 조회 실패');
  const data=await response.json();return Array.isArray(data.places)?data.places:[];
}
