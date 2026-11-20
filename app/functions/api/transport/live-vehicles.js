/** Seoul live vehicles — Cloudflare Pages GET /api/transport/live-vehicles.
 * No public credentials, no simulated data and no dependency on existing arrival handlers.
 * Seoul metro: realtimePosition; Seoul bus: getBusPosByRtid.
 */
import {normalizeBusServiceKey} from '../../../src/bus-service-key.js';
import {metroQuotaUntil,markMetroQuota,metroQuotaResponse} from '../../../server/metro-quota.mjs';
const METRO_LINES=['1호선','2호선','4호선','7호선','9호선'];
const METRO_LINE_IDS={'1001':'1호선','1002':'2호선','1004':'4호선','1007':'7호선','1009':'9호선'};
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
// Decode only known provider row containers and validate their actual field names.
export function metroRows(body,kind='position'){
  const list=kind==='position'?'realtimePositionList':'realtimeArrivalList';
  const service=kind==='position'?'realtimePosition':'realtimeStationArrival';
  const train=kind==='position'?'trainNo':'btrainNo';
  const asRows=x=>Array.isArray(x)?x:x&&typeof x==='object'?[x]:null;
  for(const box of [body,body?.[service],body?.response?.body,body?.body,body?.data,body?.data?.[service]]){
    if(!box||typeof box!=='object')continue;
    const candidate=Array.isArray(box)?box:box[list]??box.row??box.rows??box.itemList??box.items;
    const rows=asRows(candidate?.row??candidate?.item??candidate);
    if(rows&&(rows.length===0||rows.some(r=>r?.[train]!=null&&r?.statnNm!=null)))return rows;
  }
  return null;
}
function metroSourceTime(row,now){
  const day=String(row.lastRecptnDt??'').trim().replace(/[-./]/g,'');
  const time=String(row.recptnDt??'').trim();
  if(/^\d{8}$/.test(day)&&/^\d{2}:?\d{2}:?\d{2}$/.test(time))return normalizeKST(day+time.replace(/:/g,''),now);
  return normalizeKST(time||(/^\d{14}$/.test(day)?day:''),now);
}
export function parseMetroResponse(json,line,now=new Date()){
  const rows=metroRows(json)??[];
  return rows.filter(r=>r.trainNo&&r.statnNm).map(r=>({
    id:`metro:${r.subwayId||r.subwayNm||line}:${r.trainNo}:${r.updnLine??''}`,
    trainNo:String(r.trainNo),line:String(r.subwayNm||line),station:String(r.statnNm),
    destination:String(r.statnTnm??''),direction:String(r.updnLine??''),status:String(r.trainSttus??''),
    observedAt:metroSourceTime(r,now),positionSource:'position'
  })).filter(x=>x.observedAt);
}
function xmlTag(block,tag){return block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]?.trim()||'';}
export function parseBusResponse(xml,routeId,now=new Date(),routeName=''){
  const blocks=typeof xml==='string'?(xml.match(/<itemList(?:\s[^>]*)?>[\s\S]*?<\/itemList>/gi)||[]):
    (Array.isArray(xml?.msgBody?.itemList??xml?.msgBody?.item)?(xml.msgBody.itemList??xml.msgBody.item):(xml?.msgBody?.itemList??xml?.msgBody?.item)?[xml.msgBody.itemList??xml.msgBody.item]:[]);
  return blocks.map(block=>{
    const field=key=>typeof block==='string'?xmlTag(block,key):String(block?.[key]??'');
    const lng=Number(field('gpsX')||field('posX')||field('longitude')),lat=Number(field('gpsY')||field('posY')||field('latitude'));
    const id=field('vehId')||field('plainNo');
    return {id:id?`bus:${id}`:'',routeId:String(field('routeId')||routeId),routeName:routeName||String(routeId),
      vehicleNumber:field('plainNo'),longitude:lng,latitude:lat,observedAt:normalizeKST(field('dataTm')||field('gpsTime')||field('tm'),now),receivedAt:now.toISOString()};
  }).filter(b=>b.id&&xy(b.longitude,b.latitude));
}
async function load(url,format='json'){
  const response=await fetch(url,{signal:AbortSignal.timeout(7000),headers:{Accept:format==='json'?'application/json':format==='raw'?'application/json, application/xml, text/xml':'application/xml','User-Agent':'DongjakSafetyMap-Beta/1.0'}});
  if(!response.ok)throw new Error('PROVIDER_HTTP_'+response.status);
  const text=await response.text();
  if(text.length>1500000)throw new Error('PROVIDER_RESPONSE_TOO_LARGE');
  if(format==='text'||format==='raw')return text;
  try{return JSON.parse(text);}catch{throw new Error('PROVIDER_INVALID_JSON');}
}
function validProviderJson(json){
  const result=json?.errorMessage||json?.RESULT||json?.result;
  const code=String(result?.CODE||result?.code||'').trim();
  if(code&&!['INFO-000','INFO-200'].includes(code))throw new Error('PROVIDER_'+code.replace(/[^A-Z0-9-]/g,''));
}
export function decodeMetroPayload(raw,kind='position'){
  const source=String(raw??'').replace(/^\uFEFF/,'').trim();
  const list=kind==='position'?'realtimePositionList':'realtimeArrivalList';
  let body,format='json';
  if(source.startsWith('<')){
    format='xml';
    const code=xmlTag(source,'CODE')||xmlTag(source,'code');
    const fields=kind==='position'?['subwayId','subwayNm','statnId','statnNm','trainNo','lastRecptnDt','recptnDt','updnLine','statnTid','statnTnm','trainSttus']:['subwayId','statnNm','btrainNo','updnLine','arvlCd','recptnDt','bstatnNm'];
    // Prefer leaf records; an outer list wrapper may contain multiple row nodes.
    let blocks=[...source.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)];
    if(!blocks.length)blocks=[...source.matchAll(/<itemList\b[^>]*>([\s\S]*?)<\/itemList>/gi)];
    if(!blocks.length)blocks=[...source.matchAll(new RegExp('<'+list+'\\b[^>]*>([\\s\\S]*?)<\\/'+list+'>','gi'))];
    const rows=blocks.map(m=>Object.fromEntries(fields.map(k=>[k,xmlTag(m[1],k)]))).filter(r=>r.statnNm&&(r.trainNo||r.btrainNo));
    body={RESULT:{CODE:code},...(rows.length||code==='INFO-200'?{[list]:rows}:{})};
  }else{
    try{body=JSON.parse(source);}catch{const e=new Error('PROVIDER_INVALID_JSON');e.details={format:'unknown'};throw e;}
  }
  const wrapper=body?.[kind==='position'?'realtimePosition':'realtimeStationArrival'];
  const header=body?.errorMessage??body?.RESULT??wrapper?.RESULT??body?.response?.header;
  const rawCode=String(header?.code??header?.CODE??header?.resultCode??body?.code??body?.CODE??'').trim();
  const code=/^(?:INFO|ERROR)-\d{3}$/.test(rawCode)?rawCode:'';
  // Only report allowlisted field names, never raw upstream data or arbitrary keys.
  const known=['realtimePositionList','realtimeArrivalList','realtimePosition','realtimeStationArrival','errorMessage','RESULT','result','response','body','data','row','rows','items','itemList','list_total_count','code','status','message','error'];
  const shape=known.filter(key=>Object.hasOwn(body??{},key));
  const rows=metroRows(body,kind);
  const details={format,shape,code:code||null,rawRows:rows?.length??null};
  if(code&&!['INFO-000','INFO-200'].includes(code)){const e=new Error('PROVIDER_'+code);e.details=details;throw e;}
  if(!rows&&code!=='INFO-200'){const e=new Error('METRO_FEED_UNAVAILABLE');e.details=details;throw e;}
  return {body:{[list]:rows??[]},details};
}
async function loadMetroPayload(url,kind){
  try{return decodeMetroPayload(await load(url,'raw'),kind);}catch(e){
    // Explicit provider rejection or lack of service is not an invitation to retry.
    if(!['METRO_FEED_UNAVAILABLE','PROVIDER_INVALID_JSON'].includes(e.message))throw e;
    const first=e.details;
    try{return decodeMetroPayload(await load(url.replace('/json/','/xml/'),'text'),kind);}catch(second){second.details={json:first??null,xml:second.details??null};throw second;}
  }
}
async function metroLine(key,line){
  const url='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimePosition/0/250/'+encodeURIComponent(line);
  const {body,details}=await loadMetroPayload(url,'position');
  const list=parseMetroResponse(body,line);
  return {list,details};
}
// Real arrival observations are a fallback only when the positions service is unavailable.
// 0/1/2 identify an actual observed station event. Never infer a train from ETA-only rows.
export function parseMetroArrivalPositions(json,lines=METRO_LINES,now=new Date()){
 const rows=metroRows(json,'arrival')??[],byTrain=new Map();
 for(const r of rows){
   const line=METRO_LINE_IDS[String(r.subwayId)],status=String(r.arvlCd??''),station=String(r.statnNm??'').trim(),trainNo=String(r.btrainNo??'').trim();
   if(!lines.includes(line)||!['0','1','2'].includes(status)||!station||!trainNo)continue;
   const observedAt=normalizeKST(r.recptnDt,now),age=now.getTime()-Date.parse(observedAt);
   if(!Number.isFinite(age)||age< -10000||age>180000)continue;
   const direction=/상행|내선/.test(r.updnLine||'')?'0':/하행|외선/.test(r.updnLine||'')?'1':'';
   const candidate={id:'metro:arrival:'+line+':'+trainNo+':'+direction,line,station,trainNo,destination:String(r.bstatnNm??''),direction,status,observedAt,positionSource:'arrival'};
   const previous=byTrain.get(candidate.id);
   if(!previous||Date.parse(observedAt)>Date.parse(previous.observedAt))byTrain.set(candidate.id,candidate);
 }
 return [...byTrain.values()];
}
async function arrivalPositionFallback(key,lines){
 const url='http://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimeStationArrival/ALL';
 const {body,details}=await loadMetroPayload(url,'arrival');return {list:parseMetroArrivalPositions(body,lines),details};
}
function safeMetroError(err){
 const m=String(err?.message??'');
 return /^(?:PROVIDER_(?:HTTP_[0-9]{3}|INFO-[0-9]{3}|ERROR-[0-9]{3}|INVALID_JSON|RESPONSE_TOO_LARGE)|METRO_FEED_UNAVAILABLE)$/.test(m)?m:'FEED_UNAVAILABLE';
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
  const arrivalKey=pick(env,'SEOUL_SUBWAY_API_KEY','SEOUL_METRO_API_KEY');
  const metroKey=pick(env,'SEOUL_SUBWAY_POSITION_API_KEY')||arrivalKey;
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
  const warningCodes=[],metro=[],bus=[],metroDiagnostics={};
  let quotaUntil=wantMetro?await metroQuotaUntil(request,metroKey):0;
  if(quotaUntil&&!wantBus)return metroQuotaResponse(quotaUntil,{metro:[],bus:[],warnings:['METRO_DAILY_QUOTA'],availability:{metro:!!metroKey,bus:!!busKey,busRoutes:0},metroDiagnostics:{quota:{state:'error',code:'PROVIDER_ERROR-337'}}});
  // A single probe before the remaining lines avoids five simultaneous rejects on an exhausted key.
  const loadLine=async line=>{
    if(quotaUntil){metroDiagnostics[line]={state:'error',code:'PROVIDER_ERROR-337'};return {mode:'metro',list:[]};}
    try{const {list,details}=await metroLine(metroKey,line);metroDiagnostics[line]={state:'ok',rows:list.length,...details};return {mode:'metro',list};}
    catch(e){const code=safeMetroError(e);metroDiagnostics[line]={state:'error',code,response:e.details??null};if(code==='PROVIDER_ERROR-337')quotaUntil=await markMetroQuota(request,metroKey);return {mode:'metro',list:[],failed:true};}
  };
  const metroTasks=wantMetro&&metroKey&&lines.length?[ (async()=>{const first=await loadLine(lines[0]);const rest=quotaUntil?[]:await Promise.all(lines.slice(1).map(loadLine));if(quotaUntil)for(const line of lines)if(!metroDiagnostics[line])metroDiagnostics[line]={state:'error',code:'PROVIDER_ERROR-337'};return {mode:'metro',list:[first,...rest].flatMap(x=>x.list),failed:[first,...rest].every(x=>x.failed||!x.list.length)&&Object.values(metroDiagnostics).every(x=>x.state==='error')};})() ]:[];
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
    if(!r.value.failed)fulfilled++;else warningCodes.push('FEED_UNAVAILABLE');if(r.value.mode==='metro')metro.push(...r.value.list);else bus.push(...r.value.list);
  }else warningCodes.push(r.reason?.message?.startsWith('PROVIDER_')?'PROVIDER_UNAVAILABLE':r.reason?.message==='BUS_POSITION_UNAVAILABLE'?'BUS_POSITION_UNAVAILABLE':'FEED_UNAVAILABLE');}
  const missingLines=lines.filter(line=>metroDiagnostics[line]?.state==='error');
  if(wantMetro&&arrivalKey&&missingLines.length&&!(arrivalKey===metroKey&&quotaUntil)&&!await metroQuotaUntil(request,arrivalKey)){
    try{
      const {list:fallback,details}=await arrivalPositionFallback(arrivalKey,missingLines);
      if(fallback.length){metro.push(...fallback);fulfilled++;warningCodes.push('METRO_ARRIVAL_FALLBACK');}
      metroDiagnostics.arrivalFallback={state:fallback.length?'ok':'empty',rows:fallback.length,...details};
    }catch(e){const code=safeMetroError(e);metroDiagnostics.arrivalFallback={state:'error',code,response:e.details??null};if(code==='PROVIDER_ERROR-337'){const until=await markMetroQuota(request,arrivalKey);quotaUntil=Math.max(quotaUntil,until);}}
  }
  if(quotaUntil)warningCodes.unshift('METRO_DAILY_QUOTA');
  const errors=[...new Set(warningCodes)].slice(0,5);
  const data={ok:fulfilled>0,updatedAt:new Date().toISOString(),metro,bus,
    availability:{metro:!!metroKey,bus:!!busKey,busRoutes:wantBus?busRoutes.length:0},warnings:errors,metroDiagnostics,
    source:{metro:'서울시 realtimePosition / 실패 시 realtimeStationArrival 실제 역 상태 (추정)',bus:'서울시 getBusPosByRtid (실측 좌표)'}};
  if(quotaUntil&&!metro.length&&!wantBus)return metroQuotaResponse(quotaUntil,data);
  if(!data.ok){const codes=Object.values(metroDiagnostics).map(x=>x.code).filter(Boolean);return result({...data,error:codes.length?'서울시 열차 위치정보 조회 실패 · '+[...new Set(codes)].join(', '):'실시간 위치 API 응답을 확인하지 못했습니다.'},502);}
  const response=result(data);
  if(store)try{await store.put(requestKey,response.clone());}catch{}
  return response;
}
export async function onRequest(context){
  if(context.request.method!=='GET')return new Response(JSON.stringify({ok:false,code:'METHOD_NOT_ALLOWED'}),{status:405,headers:{'Content-Type':'application/json'}});
  return onRequestGet(context);
}
