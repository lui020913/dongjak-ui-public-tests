/**
 * Bus stops may be supplied by Seoul ARS, high-zoom OSM and OpenFreeMap tiles.
 * Merge duplicate descriptions of the SAME platform, never distinct ARS
 * boarding points merely because they share a name across the street.
 */
export function busStopMeters(a,b){
  const avg=(Number(a.lat)+Number(b.lat))*Math.PI/360;
  const dx=(Number(a.lng)-Number(b.lng))*111320*Math.cos(avg);
  const dy=(Number(a.lat)-Number(b.lat))*111320;
  return Math.hypot(dx,dy);
}
const placeholder=/^(?:정류장명 미등록|이름 미등록(?: 버스정류장)?|버스정류장)$/;
export function normalizedBusStopName(name){
  const value=String(name||'').normalize('NFKC').replace(/\s+/g,'').replace(/[·.,()（）\[\]\-]/g,'').toLowerCase();
  return placeholder.test(String(name||'').trim())?'':value;
}
function origin(p){
  if(p.source==='seoul-official-bus-stop'||String(p.arsId||'').trim())return 'official';
  if(p.source==='osm-visible-stop'||/^osm-viewport-/.test(String(p.id||'')))return 'osm-viewport';
  if(p.source==='basemap-poi'||/^basemap\//.test(String(p.id||'')))return 'basemap';
  return 'osm';
}
function priority(p){
  return (origin(p)==='official'?100:origin(p)==='osm-viewport'?60:origin(p)==='osm'?50:20)
    +(normalizedBusStopName(p.name)?8:0)+(p.arsId?10:0);
}
export function samePhysicalBusStop(a,b){
  if(!a||!b||a.kind!=='bus'||b.kind!=='bus')return false;
  const idA=String(a.arsId||'').trim(),idB=String(b.arsId||'').trim();
  // Different official identifiers designate distinct boarding platforms.
  if(idA&&idB)return idA===idB;
  if(a.id&&b.id&&a.id===b.id)return true;
  const distance=busStopMeters(a,b);
  if(!Number.isFinite(distance))return false;
  const nameA=normalizedBusStopName(a.name),nameB=normalizedBusStopName(b.name);
  const dirA=String(a.direction||'').trim(),dirB=String(b.direction||'').trim();
  if(dirA&&dirB&&dirA!==dirB)return false;
  if(nameA&&nameB&&nameA!==nameB)return false;
  // Unnamed records cannot be merged loosely: they may be opposite stops.
  if(!nameA||!nameB)return distance<=8;
  // Two separate OSM/official features from the same feed are normally
  // different stops. Only near-exact geometry can eliminate tile seams.
  if(origin(a)===origin(b))return distance<=5;
  // Two feeds frequently place the same platform a few metres apart.
  return distance<=27;
}
export function deduplicateBusStops(records=[]){
  const sorted=[...records].filter(p=>p?.kind==='bus'&&Number.isFinite(p.lng)&&Number.isFinite(p.lat))
    .sort((a,b)=>priority(b)-priority(a));
  const result=[];
  for(const stop of sorted){
    if(!result.some(p=>samePhysicalBusStop(p,stop)))result.push(stop);
  }
  return result;
}

export const BASEMAP_BUS_FILTER=['any',
  ['==',['get','class'],'bus'],
  ['==',['get','subclass'],'bus_stop'],
  ['==',['get','subclass'],'bus_station']];
/** Tiles have no knowledge of the app's administrative boundary.
 * Apply this to the OSM tile fallback, not just the official GeoJSON source.
 * No boundary => no bus symbols, instead of leaking out-of-district stops.
 */
export function busFilterInsideDistrict(filter,geometry){
  if(!['Polygon','MultiPolygon'].includes(geometry?.type)||!Array.isArray(geometry.coordinates))
    return ['==',1,0];
  return ['all',filter,['within',{type:geometry.type,coordinates:geometry.coordinates}]];
}
function ringAroundStop(stop,radiusMeters=16){
  const dLat=radiusMeters/111320;
  const dLng=radiusMeters/(111320*Math.max(0.25,Math.cos(stop.lat*Math.PI/180)));
  return Array.from({length:13},(_,i)=>{
    const angle=2*Math.PI*i/12;
    return [stop.lng+Math.cos(angle)*dLng,stop.lat+Math.sin(angle)*dLat];
  });
}
/** Hide a tile marker only where the unified GeoJSON already has a stop.
 * Nearby unmatched tile stops remain visible if the official API is missing.
 * The small exclusion radius protects opposite-side boarding platforms.
 */
export function busTileFallbackFilter(stops=[],center=null,{limit=100,radiusMeters=16}={}){
  if(!center||!Number.isFinite(center.lng)||!Number.isFinite(center.lat))return BASEMAP_BUS_FILTER;
  const selected=stops.filter(p=>p?.kind==='bus'&&Number.isFinite(p.lng)&&Number.isFinite(p.lat))
    .map(p=>({p,d:busStopMeters(p,center)})).filter(x=>x.d<1250)
    .sort((a,b)=>a.d-b.d).slice(0,limit).map(x=>x.p);
  if(!selected.length)return BASEMAP_BUS_FILTER;
  return ['all',BASEMAP_BUS_FILTER,['!', ['within',{
    type:'MultiPolygon',coordinates:selected.map(p=>[ringAroundStop(p,radiusMeters)])
  }]]];
}
