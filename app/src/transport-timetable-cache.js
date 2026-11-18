/** Verified timetable cache and strictly labelled local bus observations.
 * No public transport provider guarantees past arrival timestamps in the
 * station-arrival endpoint. Never infer actual arrivals from disappearing ETAs.
 */
const PREFIX='dj_transport_timetable_v724_';
const BUS_PREFIX='dj_bus_observed_v724_';
const MAX_AGE_MS=18*60*60*1000;
const MAX_BUS_AGE_MS=36*60*60*1000;
const MAX_STORED_ROWS=80;
function validStorage(store){return store&&typeof store.getItem==='function'&&typeof store.setItem==='function';}
function read(store,key){try{return JSON.parse(store.getItem(key)||'null');}catch{return null;}}
function write(store,key,value){try{store.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function timetableCacheKey(place,day){
  const kind=place?.kind==='bus'?'bus':'subway';
  const placeName=kind==='bus'?String(place?.arsId||''):String(place?.name||'').trim();
  const line=kind==='bus'?'':String(place?.selectedLine||'');
  const dayCode=String(day||'');
  if(!placeName||!/^[1-3]$/.test(dayCode))return '';
  return `${PREFIX}${encodeURIComponent([kind,placeName,line,dayCode].join('|'))}`;
}
export function saveTimetable(place,day,data,{store=globalThis.localStorage,now=Date.now()}={}){
  if(!validStorage(store)||!data||data.status!=='ok')return false;
  const rows=Array.isArray(data.timetable)?data.timetable:[];
  const items=Array.isArray(data.items)?data.items:[];
  if(!rows.length&&!items.length)return false;
  const key=timetableCacheKey(place,day);if(!key)return false;
  // Only public, scheduled timetable values, never credentials or raw API data.
  const table={status:'ok',kind:place.kind,day,items:items.slice(0,80),timetable:rows.slice(0,1200),
    source:String(data.source||''),sourceUrl:String(data.sourceUrl||''),notice:String(data.notice||''),
    requestedLines:Array.isArray(data.requestedLines)?data.requestedLines.slice(0,8):[],
    station:String(data.station||place.name||'')};
  return write(store,key,{at:now,data:table});
}
export function loadTimetable(place,day,{store=globalThis.localStorage,now=Date.now()}={}){
  const key=timetableCacheKey(place,day);if(!key||!validStorage(store))return null;
  const cached=read(store,key);
  if(!cached||!Number.isFinite(cached.at)||cached.at>now||now-cached.at>MAX_AGE_MS)return null;
  if(cached.data?.status!=='ok')return null;
  return {...cached.data,cachedAt:cached.at,cachedOffline:true};
}
export function parsedBusEtaMinutes(message){
  const value=String(message||'').trim();
  const n=value.match(/(?:약\s*)?(\d{1,3})\s*분/);
  if(n)return Number(n[1]);
  if(/곧\s*도착|잠시\s*후/.test(value))return 0;
  return null;
}
export function expectedBusHeadway(row){
  const a=parsedBusEtaMinutes(row?.message),b=parsedBusEtaMinutes(row?.nextMessage);
  if(a===null||b===null)return null;
  const gap=b-a;
  return gap>0&&gap<=120?gap:null;
}
function busHistoryKey(arsId){return /^\d{5}$/.test(String(arsId||''))?`${BUS_PREFIX}${arsId}`:'';}
export function storeBusObservation(arsId,items,{store=globalThis.localStorage,now=Date.now()}={}){
  const key=busHistoryKey(arsId);
  if(!key||!validStorage(store)||!Array.isArray(items)||!items.length)return false;
  const current=read(store,key);
  const previous=Array.isArray(current?.rows)?current.rows:[];
  const retained=previous.filter(row=>Number.isFinite(row.at)&&now-row.at>=0&&now-row.at<MAX_BUS_AGE_MS);
  const observed=items.filter(x=>String(x.route||'').trim()).map(row=>({
    at:now,route:String(row.route).slice(0,36),direction:String(row.destination||'').slice(0,60),
    message:String(row.message||'').slice(0,100),nextMessage:String(row.nextMessage||'').slice(0,100),
    // Explicit "도착" only, never a guess based on disappearance/zero minutes.
    confirmedArrivalNotice:/^(?:도착|현\s*정류장\s*도착|이번\s*정류장\s*도착)$/.test(String(row.message||'').trim())
  }));
  return write(store,key,{rows:[...retained,...observed].slice(-MAX_STORED_ROWS)});
}
export function latestBusObservations(arsId,{store=globalThis.localStorage,now=Date.now()}={}){
  const key=busHistoryKey(arsId);if(!key||!validStorage(store))return [];
  const saved=read(store,key);
  const rows=Array.isArray(saved?.rows)?saved.rows:[];
  const recent=rows.filter(row=>Number.isFinite(row?.at)&&row.at<=now&&now-row.at<=MAX_BUS_AGE_MS);
  const latest=new Map();
  for(const item of recent)latest.set(`${item.route}|${item.direction}`,item);
  return [...latest.values()].sort((a,b)=>a.route.localeCompare(b.route,'ko'));
}
export function displaySeoulObservationTime(ms){
  if(!Number.isFinite(ms))return '미관측';
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
}
