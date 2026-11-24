const categoryAliases=Object.freeze({
 bus:'버스정류장',bus_stop:'버스정류장',bus_station:'버스터미널',subway:'지하철·철도역',railway:'지하철·철도역',station:'지하철·철도역',train_station:'지하철·철도역',tram_stop:'철도 정류장',
 restaurant:'음식점',fast_food:'음식점',cafe:'카페',coffee:'카페',convenience:'편의점',supermarket:'마트',pharmacy:'약국',hospital:'병원',clinic:'의원',dentist:'치과',school:'학교',university:'대학교',college:'대학교',kindergarten:'유치원',park:'공원',garden:'정원',library:'도서관',bank:'은행',atm:'ATM',toilets:'화장실',toilet:'화장실',police:'경찰서',fire_station:'소방서',townhall:'공공기관',place_of_worship:'종교시설',church:'교회',parking:'주차장',fuel:'주유소',hotel:'숙박시설',shop:'상점',bakery:'제과점',marketplace:'시장',museum:'박물관',sports_centre:'체육시설',playground:'놀이터',community_centre:'주민시설',post_office:'우체국',shelter:'쉼터',food:'음식점',healthcare:'의료시설'
});
const rawType=p=>[p?.kind,p?.type,p?.category].map(v=>String(v||'').trim().toLowerCase());
export function searchPlaceKind(p){
 const values=rawType(p);
 if(values.some(v=>/^(bus|bus_stop|bus_station|busstop|버스정류장|버스터미널)$/.test(v)||v.includes('버스정류장')))return 'bus';
 if(values.some(v=>/^(subway|railway|station|train_station|tram_stop|rail)$/.test(v)||/지하철|철도역/.test(v)))return 'subway';
 return 'place';
}
const kindOf=searchPlaceKind;
export function displayFacilityCategory(p){
 const raw=String(p.category||p.kind||p.type||'').trim();
 return categoryAliases[raw.toLowerCase()]||(/[가-힣]/.test(raw)?raw:'일반 시설');
}
// Group already deduplicated, distance-ranked map-area rows without inventing
// missing categories or changing the visible-area limit.
export function groupVisibleFacilities(items){
  const groups=new Map();
  for(const place of items){
    const kind=searchPlaceKind(place);
    const label=kind==='bus'?'버스정류장':kind==='subway'?'지하철·철도역':displayFacilityCategory(place);
    if(!groups.has(label))groups.set(label,[]);
    groups.get(label).push(place);
  }
  const priority=label=>label==='지하철·철도역'?0:label==='버스정류장'?1:label==='일반 시설'?3:2;
  return [...groups].map(([label,rows])=>({label,rows})).sort((a,b)=>priority(a.label)-priority(b.label)||a.label.localeCompare(b.label,'ko'));
}
const userAddress=value=>String(value||'').split(/\s*·\s*/).map(v=>v.trim()).filter(v=>v&&!/openstreetmap|nominatim|photon|지도에 등록|운영 여부 미확인|저장된 역 위치|출입구와 다를 수|^ARS\b|^검색 결과$|^OSM\b|^©/i.test(v)).join(' · ');
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
    const address=userAddress(p.address);
    const lines=Array.isArray(p.lines)?p.lines:[];
    parts=[kind==='subway'?'지하철·철도역':displayFacilityCategory(p),...lines,...address.split(' · ').filter(v=>!lines.includes(v))];
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

/** Capture the actual map canvas footprint before opening the search overlay.
 * A rotated/pitched view is a quadrilateral, not the enclosing geographic bbox.
 */
export const MIN_VISIBLE_FACILITY_ZOOM=16;
export function captureVisibleFacilityArea(map){
  const zoom=Number(map.getZoom?.());
  if(!Number.isFinite(zoom)||zoom<MIN_VISIBLE_FACILITY_ZOOM)return null;
  const canvas=map.getCanvas?.(),w=canvas?.clientWidth,h=canvas?.clientHeight;
  if(!(w>0&&h>0)||typeof map.unproject!=='function')return null;
  const polygon=[[0,0],[w,0],[w,h],[0,h]].map(point=>{
    const p=map.unproject(point);return {lng:Number(p.lng),lat:Number(p.lat)};
  });
  if(polygon.some(p=>!Number.isFinite(p.lng)||!Number.isFinite(p.lat)))return null;
  const bbox=[Math.min(...polygon.map(p=>p.lng)),Math.min(...polygon.map(p=>p.lat)),Math.max(...polygon.map(p=>p.lng)),Math.max(...polygon.map(p=>p.lat))];
  // A strongly tilted camera may still cover a very large area at zoom 16.
  // Reject those views rather than querying an unbounded region.
  if(distanceMeters({lng:bbox[0],lat:bbox[1]},{lng:bbox[2],lat:bbox[3]})>3000)return null;
  const center=map.unproject([w/2,h/2]);
  return {polygon,bbox,center:{lng:center.lng,lat:center.lat}};
}
export function visibleAreaContains(area,p){
  if(!area?.polygon||!Number.isFinite(p.lng)||!Number.isFinite(p.lat))return false;
  let inside=false;const poly=area.polygon;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[j],b=poly[i],dx=b.lng-a.lng,dy=b.lat-a.lat;
    const cross=(p.lng-a.lng)*dy-(p.lat-a.lat)*dx;
    if(Math.abs(cross)<1e-12&&p.lng>=Math.min(a.lng,b.lng)-1e-9&&p.lng<=Math.max(a.lng,b.lng)+1e-9&&p.lat>=Math.min(a.lat,b.lat)-1e-9&&p.lat<=Math.max(a.lat,b.lat)+1e-9)return true;
    if((a.lat>p.lat)!==(b.lat>p.lat)&&p.lng<(b.lng-a.lng)*(p.lat-a.lat)/(b.lat-a.lat)+a.lng)inside=!inside;
  }
  return inside;
}
export function visibleFacilityResults(area,items,{limit=60}={}){
  const seen=new Set(),found=[];
  for(const p of items){
    if(!p?.name||p.lng==null||p.lat==null)continue;
    const row={...p,lng:Number(p.lng),lat:Number(p.lat)};
    if(!visibleAreaContains(area,row))continue;
    const key=searchResultKey(row);if(seen.has(key))continue;
    seen.add(key);
    // Do not expose distance from map center as if it were the user's distance.
    delete row.distanceMeters;found.push(row);
  }
  found.sort((a,b)=>distanceMeters(area.center,a)-distanceMeters(area.center,b));
  return {items:found.slice(0,limit),total:found.length};
}
export async function fetchVisibleOfficialPlaces(area,{signal,fetcher=fetch}={}){
  const bbox=area?.bbox;
  if(!bbox||bbox.length!==4||bbox.some(v=>!Number.isFinite(v))||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]||bbox[0]<126.5||bbox[2]>127.3||bbox[1]<37.2||bbox[3]>37.8)throw new Error('서울시 자료 범위 밖');
  const url=new URL('/api/seoul-facilities',location.origin);
  url.searchParams.set('bbox',bbox.map(x=>x.toFixed(6)).join(','));url.searchParams.set('limit','1500');
  const response=await fetcher(url,{signal});if(!response.ok)throw new Error('시설 조회 실패');
  const data=await response.json();return Array.isArray(data.places)?data.places:[];
}
