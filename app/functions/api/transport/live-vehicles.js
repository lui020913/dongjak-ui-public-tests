/** Seoul live vehicles — Cloudflare Pages GET /api/transport/live-vehicles.
 * No public credentials, no simulated data and no dependency on existing arrival handlers.
 * Seoul metro: realtimePosition; Seoul bus: getBusPosByRtid.
 */
import {normalizeBusServiceKey} from '../../../src/bus-service-key.js';
const METRO_LINES=['1호선','2호선','4호선','7호선','9호선'];
const DEFAULT_STATIONS=['20011','20151','20160','20125'];
let discoveredRoutesCache={until:0,keyTag:'',routes:[]}; // Official Seoul stop ARS IDs within Dongjak
const asCsv=v=>String(v??'').split(',').map(x=>x.trim()).filter(Boolean);
const pick=(env,...keys)=>keys.map(k=>env?.[k]).find(x=>typeof x==='string'&&x.trim())?.trim()||'';
const todayKST=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function normalizeKST(value,now=new Date()){
  if(!value)return ''; // Don't attach a fabricated timestamp to old/unknown source records.
  const s=String(value).trim();
  if(/^\d{14}$/.test(s))return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}+09:00`;
  if(/^\d{4}-\d{2}-\d{2}\s+\d\d:\d\d:\d\d(?:\.\d+)?$/.test(s))return `${s.replace(' ','T')}+09:00`;
  if(/^\d\d:\d\d:\d\d$/.test(s))return `${todayKST(now)}T${s}+09:00`;
  const epoch=Date.parse(s);return Number.isFinite(epoch)?new Date(epoch).toISOString():'';
}
const xy=(lng,lat)=>Number.isFinite(lng)&&Number.isFinite(lat)&&lng>125&&lng<129&&lat>36&&lat<39;
export function parseMetroResponse(json,line,now=new Date()){
  if(!Array.isArray(json?.realtimePositionList))return [];
  return json.realtimePositionList.filter(r=>r.trainNo&&r.statnNm).map(r=>({
    id:`metro:${r.subwayId||r.subwayNm||line}:${r.trainNo}:${r.updnLine??''}`,
    trainNo:String(r.trainNo),line:String(r.subwayNm||line),station:String(r.statnNm),
    destination:String(r.statnTnm??''),direction:String(r.updnLine??''),status:String(r.trainSttus??''),
    observedAt:normalizeKST(r.recptnDt || (String(r.lastRecptnDt||'').length>=14?r.lastRecptnDt:''),now)
  })).filter(x=>x.observedAt);
}
function xmlTag(block,tag){return block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]?.trim()||'';}
export function parseBusResponse(xml,routeId,now=new Date(),routeName=''){
  const blocks=typeof xml==='string'?(xml.match(/<itemList(?:\s[^>]*)?>[\s\S]*?<\/itemList>/gi)||[]):
    (Array.isArray(xml?.msgBody?.itemList)?xml.msgBody.itemList:xml?.msgBody?.itemList?[xml.msgBody.itemList]:[]);
  return blocks.map(block=>{
    const field=key=>typeof block==='string'?xmlTag(block,key):String(block?.[key]??'');
    const lng=Number(field('gpsX')||field('posX')||field('longitude')),lat=Number(field('gpsY')||field('posY')||field('latitude'));
    const id=field('vehId')||field('plainNo');
    return {id:id?`bus:${id}`:'',routeId:String(field('routeId')||routeId),routeName:routeName||String(routeId),
      vehicleNumber:field('plainNo'),longitude:lng,latitude:lat,observedAt:normalizeKST(field('dataTm')||field('gpsTime')||field('tm'),now),receivedAt:now.toISOString()};
  }).filter(b=>b.id&&xy(b.longitude,b.latitude));
}
async function load(url,format='json'){
  const response=await fetch(url,{signal:AbortSignal.timeout(7000),headers:{Accept:format==='json'?'application/json':'application/xml'}});
  if(!response.ok)throw new Error('PROVIDER_HTTP_'+response.status);
  const text=await response.text();
  if(text.length>1500000)throw new Error('PROVIDER_RESPONSE_TOO_LARGE');
  if(format==='text')return text;
  try{return JSON.parse(text);}catch{throw new Error('PROVIDER_INVALID_JSON');}
}
function validProviderJson(json){
  const result=json?.RESULT||json?.result;
  const code=String(result?.CODE||result?.code||'');
  if(code&&!['INFO-000','INFO-200'].includes(code))throw new Error('PROVIDER_'+code.replace(/[^A-Z0-9-]/g,''));
}
async function metroLine(key,line){
  const url=`http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(key)}/json/realtimePosition/0/250/${encodeURIComponent(line)}`;
  const json=await load(url);validProviderJson(json);
  if(!Array.isArray(json.realtimePositionList)){
    if(json?.RESULT?.CODE==='INFO-200')return [];
    throw new Error('METRO_FEED_UNAVAILABLE');
  }
  return parseMetroResponse(json,line);
}
async function busRouteAtStop(key,arsId){
  const url=`http://ws.bus.go.kr/api/rest/stationinfo/getRouteByStation?ServiceKey=${encodeURIComponent(key)}&arsId=${arsId}&resultType=json`;
  const json=await load(url);validProviderJson(json);
  if(json?.msgHeader?.headerCd!=null&&Number(json.msgHeader.headerCd)!==0)throw new Error('BUS_ROUTES_UNAVAILABLE');
  const raw=json?.msgBody?.itemList||json?.msgBody?.item||[];
  const items=Array.isArray(raw)?raw:[raw];
  return items.filter(x=>/^\d{6,12}$/.test(String(x.busRouteId||''))).map(x=>({id:String(x.busRouteId),name:String(x.busRouteNm||x.rtNm||x.busRouteId)}));
}
/** Prefer lines crossing multiple representative Dongjak stops, but don't invent route IDs. */
export function selectBusRoutes(groups=[],limit=8){
  const routes=new Map();
  for(const group of groups){
    const unique=new Set();
    for(const r of group){if(!/^\d{6,12}$/.test(String(r.id))||unique.has(r.id))continue;unique.add(r.id);
      const old=routes.get(r.id)||{...r,seen:0};old.seen++;routes.set(r.id,old);
    }
  }
  return [...routes.values()].sort((a,b)=>b.seen-a.seen||a.id.localeCompare(b.id)).slice(0,limit);
}
async function busRoute(key,route){
  const url=`http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid?ServiceKey=${encodeURIComponent(key)}&busRouteId=${route.id}&resultType=json`;
  // JSON first, with controlled XML fallback for deployments returning XML despite resultType=json.
  let body;
  try{body=await load(url);validProviderJson(body);}catch(err){
    if(err.message!=='PROVIDER_INVALID_JSON')throw err;
    body=await load(url.replace('resultType=json','resultType=xml'),'text');
    if(/<headerCd>(?!0<\/headerCd>)/.test(body))throw new Error('BUS_POSITION_UNAVAILABLE');
  }
  if(body?.msgHeader?.headerCd!=null&&Number(body.msgHeader.headerCd)!==0)throw new Error('BUS_POSITION_UNAVAILABLE');
  return parseBusResponse(body,route.id,new Date(),route.name);
}
export async function onRequestGet({request,env={}}){
  const headers={'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=0, s-maxage=20'};
  const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,...(status>=400?{'Cache-Control':'no-store'}:{})}});
  const metroKey=pick(env,'SEOUL_SUBWAY_API_KEY','SEOUL_METRO_API_KEY');
  const busKey=normalizeBusServiceKey(pick(env,'SEOUL_BUS_SERVICE_KEY','SEOUL_BUS_API_KEY','BUS_API_KEY'));
  if(!metroKey&&!busKey)return result({ok:false,code:'MISSING_KEYS',error:'교통 위치 API 키가 설정되지 않았습니다.',metro:[],bus:[]},503);
  const store=typeof caches!=='undefined'?caches.default:null;
  const query=new URL(request.url).searchParams;
  const modes=String(query.get('modes')||'metro,bus').split(',').filter(x=>['metro','bus'].includes(x));
  if(!modes.length)return result({ok:false,code:'INVALID_MODES',error:'지원하지 않는 교통수단 요청입니다.',metro:[],bus:[]},400);
  const wantMetro=modes.includes('metro'),wantBus=modes.includes('bus');
  const cacheUrl=new URL('/api/transport/live-vehicles',request.url);cacheUrl.searchParams.set('modes',modes.sort().join(','));
  const requestKey=new Request(cacheUrl.toString(),{method:'GET'});
  if(store)try{const cached=await store.match(requestKey);if(cached)return cached;}catch{}
  const requestedLines=env?.LIVE_TRANSIT_METRO_LINES?asCsv(env.LIVE_TRANSIT_METRO_LINES):METRO_LINES;
  const lines=METRO_LINES.filter(line=>requestedLines.includes(line));
  const manual=asCsv(env?.LIVE_TRANSIT_BUS_ROUTE_IDS).filter(id=>/^\d{6,12}$/.test(id)).slice(0,8);
  const stopIds=asCsv(env?.LIVE_TRANSIT_BUS_STATION_IDS||DEFAULT_STATIONS.join(',')).filter(id=>/^\d{5}$/.test(id)).slice(0,4);
  const warningCodes=[],metro=[],bus=[];
  const metroTasks=wantMetro&&metroKey?lines.map(async line=>({mode:'metro',list:await metroLine(metroKey,line)})):[];
  let busRoutes=manual.map(id=>({id,name:id}));
  if(wantBus&&busKey&&!busRoutes.length){
    const tag=stopIds.join(',');
    if(discoveredRoutesCache.keyTag===tag&&discoveredRoutesCache.until>Date.now())busRoutes=discoveredRoutesCache.routes;
    else {
      const groups=await Promise.allSettled(stopIds.map(id=>busRouteAtStop(busKey,id)));
      for(const group of groups)if(group.status==='rejected')warningCodes.push('BUS_ROUTE_DISCOVERY_UNAVAILABLE');
      busRoutes=selectBusRoutes(groups.filter(x=>x.status==='fulfilled').map(x=>x.value),8);
      if(busRoutes.length)discoveredRoutesCache={until:Date.now()+15*60_000,keyTag:tag,routes:busRoutes};
    }
  }
  const tasks=[...metroTasks,...(wantBus&&busKey?busRoutes.map(async route=>({mode:'bus',list:await busRoute(busKey,route)})):[])];
  const results=await Promise.allSettled(tasks);
  let fulfilled=0;
  for(const r of results){if(r.status==='fulfilled'){
    fulfilled++;if(r.value.mode==='metro')metro.push(...r.value.list);else bus.push(...r.value.list);
  }else warningCodes.push(r.reason?.message?.startsWith('PROVIDER_')?'PROVIDER_UNAVAILABLE':r.reason?.message==='BUS_POSITION_UNAVAILABLE'?'BUS_POSITION_UNAVAILABLE':'FEED_UNAVAILABLE');}
  const errors=[...new Set(warningCodes)].slice(0,5);
  const data={ok:fulfilled>0,updatedAt:new Date().toISOString(),metro,bus,
    availability:{metro:!!metroKey,bus:!!busKey,busRoutes:wantBus?busRoutes.length:0},warnings:errors,
    source:{metro:'서울시 realtimePosition (역 위치 기반 추정)',bus:'서울시 getBusPosByRtid (실측 좌표)'}};
  if(!data.ok)return result({...data,error:'실시간 위치 API 응답을 확인하지 못했습니다.'},502);
  const response=result(data);
  if(store)try{await store.put(requestKey,response.clone());}catch{}
  return response;
}
export async function onRequest(context){
  if(context.request.method!=='GET')return new Response(JSON.stringify({ok:false,code:'METHOD_NOT_ALLOWED'}),{status:405,headers:{'Content-Type':'application/json'}});
  return onRequestGet(context);
}
