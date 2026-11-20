import {normalizeBusServiceKey as normalizeSharedBusServiceKey} from '../../../src/bus-service-key.js';
/**
 * Cloudflare Pages Functions - transport API for deployed website.
 * The local 5178 server is NOT required on Pages. Secrets stay in context.env.
 * URLs: /api/transport/status, /bus, /bus/routes, /subway, /accessibility.
 */
import {parseSeoulBusArrival,parseSeoulSubwayArrival,resolveSeoulBusStation,parseSeoulBusStopsNearby,inspectSeoulApiResponse,isSeoulBusNoResult} from '../../../src/transport-data.js';
import {parseBusRouteList} from '../../../server/bus-route-list.mjs';
import {validateSeoulSubwayFeed} from '../../../src/transport-freshness.js';
import {permitsSubwayBulkRecovery,filterBulkArrivalsForStation,seoulSubwayIdForLine} from '../../../src/subway-source-recovery.js';
import {parseBusServiceTime,seoulDayTag} from '../../../server/service-hours.mjs';
import {fetchStationTimetables} from '../../../server/metro-timetable-common.mjs';
import {sillimStationUrl,parseSillimPublishedHtml} from '../../../server/sillim-published-timetable.mjs';
import {fetchSeoulJsonOverTcp} from '../../../server/seoul-openapi-tcp.mjs';
import {fetchDongjakNews} from '../../../server/dongjak-news.mjs';
import {normalizeMedianBusStops,isMedianBusStopName} from '../../../src/median-bus-stops.js';
import {nearbyOfficialStaticStops} from '../../../src/static-bus-stops.js';
import {ACCESS_BBOX,parseMetroExits,parseSeoulElevators,mergeAccessibilityCollections} from '../../../server/station-accessibility-data.mjs';

const ROUTES=new Set(['status','bus','bus/routes','bus/median-nearby','bus/stops-nearby','subway','accessibility','service-hours','operator-timetable','news']);
const EXIT_API='https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0/query';
let busStopsAuthBlockedUntil=0; // per-isolate cooldown for upstream credential/quota failures
let busStopsLastFailure=''; // sanitized upstream failure category; never store the key
let accessibilityFailureUntil=0; // remote 500 failures cannot be repaired by calling more frequently

// data.go.kr may provide an already URL-encoded key (%2B, %2F, %3D).
// Decode it once before encodeURIComponent() builds the request URL, preventing %252F double-encoding.
export function normalizeBusServiceKey(value){return normalizeSharedBusServiceKey(value);}
// Do not call every upstream failure 'AUTH': key denial, quota, and no-result need different fixes.
export function classifyBusStopsError(error){
  const message=String(error?.message||'');
  const apiCode=String(error?.apiCode||'');
  const http=message.match(/^UPSTREAM_HTTP_(401|403)$/);
  if(http)return {status:503,code:'BUS_API_AUTH',reason:`HTTP_${http[1]}`,cooldownMs:60_000};
  const header=message.match(/^BUS_API_(\d+)$/);
  if(header){
    const code=header[1];
    if(['5','6','7'].includes(code))return {status:503,code:'BUS_API_AUTH',reason:`BUS_HEADER_${code}`,cooldownMs:60_000};
    if(code==='8')return {status:429,code:'BUS_API_RATE_LIMIT',reason:'BUS_HEADER_8',cooldownMs:120_000};
    return {status:502,code:'BUS_STOPS_LOOKUP_ERROR',reason:`BUS_HEADER_${code}`,cooldownMs:0};
  }
  if(['INFO-100','ERROR-300','ERROR-301'].includes(apiCode))return {status:503,code:'BUS_API_AUTH',reason:apiCode.replace(/[^A-Z0-9-]/g,''),cooldownMs:60_000};
  if(apiCode)return {status:502,code:'BUS_STOPS_LOOKUP_ERROR',reason:'API_RESPONSE_ERROR',cooldownMs:0};
  if(message==='UPSTREAM_INVALID_JSON')return {status:502,code:'BUS_STOPS_LOOKUP_ERROR',reason:'INVALID_UPSTREAM_FORMAT',cooldownMs:0};
  const generic=message.match(/^UPSTREAM_HTTP_(\d{3})$/);
  return {status:502,code:'BUS_STOPS_LOOKUP_ERROR',reason:generic?`HTTP_${generic[1]}`:'UPSTREAM_ERROR',cooldownMs:0};
}
function busStopsCooldownResponse(){
  return respond({error:'서울시 정류소 API 재시도 대기 중입니다.',code:busStopsLastFailure==='BUS_HEADER_8'?'BUS_API_RATE_LIMIT':'BUS_API_AUTH',reason:busStopsLastFailure||'UPSTREAM_ERROR',retryAfterSeconds:Math.max(1,Math.ceil((busStopsAuthBlockedUntil-Date.now())/1000))},busStopsLastFailure==='BUS_HEADER_8'?429:503);
}
function busStopsFailure(error){
  const outcome=classifyBusStopsError(error);
  if(outcome.cooldownMs){busStopsAuthBlockedUntil=Date.now()+outcome.cooldownMs;busStopsLastFailure=outcome.reason;}
  console.warn('[Dongjak bus stop upstream]',outcome.code,outcome.reason); // no serviceKey or URL
  const notice=outcome.code==='BUS_API_RATE_LIMIT'?'서울시 정류소 API 요청 제한에 도달했습니다. 잠시 후 다시 확인해 주세요.':
    outcome.code==='BUS_API_AUTH'?'서울시 버스정류소 API 인증 또는 접근 권한을 확인해 주세요.':'서울시 정류소 API 응답을 확인하지 못했습니다.';
  return respond({error:notice,code:outcome.code,reason:outcome.reason},outcome.status);
}
const withCache=(seconds=0)=>({'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff',
  'Cache-Control':seconds?`public, max-age=0, s-maxage=${seconds}`:'no-store'});
function respond(body,status=200,ttl=0){return new Response(JSON.stringify(body),{status,headers:withCache(ttl)});}
function fail(message,status=502,code='UPSTREAM_ERROR'){
  return respond({error:message,code},status);
}
const cleanSecret=v=>String(v??'').trim();
async function external(url,timeout=8500,accept='application/json'){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),timeout);
  try{
    const response=await fetch(url,{signal:ac.signal,headers:{Accept:accept,'User-Agent':'DongjakSafetyMap-Beta/1.0'}});
    if(!response.ok)throw new Error(`UPSTREAM_HTTP_${response.status}`);
    const raw=await response.text();
    if(raw.length>3_000_000)throw new Error('UPSTREAM_TOO_LARGE');
    return raw;
  }finally{clearTimeout(timer);}
}
async function officialJson(url,{allowEmptyResult=false}={}){
  const raw=await external(url);
  let data;
  try{data=JSON.parse(raw);}catch{throw new Error('UPSTREAM_INVALID_JSON');}
  const notice=inspectSeoulApiResponse(data);
  if(notice.state==='empty')return allowEmptyResult?{msgHeader:{headerCd:0},msgBody:{itemList:[]}}:{realtimeArrivalList:[]};
  if(notice.state==='error'){
    const error=new Error('API_RESPONSE');
    error.apiCode=notice.code;error.publicMessage=notice.message;
    throw error;
  }
  if(allowEmptyResult && isSeoulBusNoResult(data))return {msgHeader:{headerCd:0},msgBody:{itemList:[]}};
  if(data?.msgHeader?.headerCd!==undefined && Number(data.msgHeader.headerCd)!==0)
    throw new Error(`BUS_API_${String(data.msgHeader.headerCd).slice(0,6)}`);
  return data;
}
function nowKorea(){return new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date());}
function validLocation(lat,lng){return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=37&&lat<=38&&lng>=126&&lng<=128;}
function exitUrl(bounds=ACCESS_BBOX,count=2000){
  const q=new URL(EXIT_API);
  for(const [k,v] of Object.entries({where:'1=1',geometry:bounds.join(','),geometryType:'esriGeometryEnvelope',
    inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'sub_ent_sn,entrc_no,entrc_nm,stn_cd,stn_nm,sub_nm',
    returnGeometry:'true',resultRecordCount:String(count),f:'json'}))q.searchParams.set(k,v);
  return q.toString();
}
async function fetchExitArcgis(bounds=ACCESS_BBOX,count=2000){
  const data=JSON.parse(await external(exitUrl(bounds,count),11000));
  if(data?.error)throw new Error(`EXITS_API_ERROR_${String(data.error.code||'UNKNOWN').slice(0,10)}`);
  return data;
}
async function fetchExitArcgisResilient(){
  try{return await fetchExitArcgis();}
  catch(error){
    // A large-area 500 can sometimes be avoided with smaller requests.
    // Only retry a server 500; never retry authentication or malformed requests.
    if(!/UPSTREAM_HTTP_500|EXITS_API_ERROR_500/.test(String(error?.message||'')))throw error;
    const [west,south,east,north]=ACCESS_BBOX,mid=(west+east)/2;
    const [a,b]=await Promise.all([
      fetchExitArcgis([west,south,mid,north],1000),
      fetchExitArcgis([mid,south,east,north],1000)
    ]);
    return {features:[...(a.features||[]),...(b.features||[])]};
  }
}
async function accessibility(openKey){
  if(Date.now()<accessibilityFailureUntil)return fail('공개 역사 출구 서비스 재시도 대기 중입니다.',503,'ACCESSIBILITY_UPSTREAM_UNAVAILABLE');
  const errors=[];
  let exits={type:'FeatureCollection',features:[]}, elevators={type:'FeatureCollection',features:[]};
  try{
    exits=parseMetroExits(await fetchExitArcgisResilient());
  }catch(e){errors.push(`출구 API: ${String(e.message).slice(0,70)}`);}
  if(openKey){
    try{
      const u=`http://openapi.seoul.go.kr:8088/${encodeURIComponent(openKey)}/json/tbTraficElvtr/1/1000/`;
      const data=JSON.parse(await external(u,10000));
      if(data?.tbTraficElvtr?.RESULT?.CODE && data.tbTraficElvtr.RESULT.CODE!=='INFO-000')throw new Error('ELEVATOR_API_ERROR');
      elevators=parseSeoulElevators(data);
    }catch(e){errors.push(`승강기 API: ${String(e.message).slice(0,70)}`);}
  }
  const geo=mergeAccessibilityCollections(exits,elevators);
  if(!geo.features.length){accessibilityFailureUntil=Date.now()+5*60*1000;return fail('공개 출구·엘리베이터 좌표 조회에 실패했습니다. 실제 위치를 임의로 표시하지 않습니다.',503,'ACCESSIBILITY_UNAVAILABLE');}
  return respond({features:geo,sourceStatus:{exits:exits.features.length,elevators:elevators.features.length,
    fieldVerified:0,elevatorApiConfigured:Boolean(openKey),errors},
    notice:'좌표는 설비 운영 여부를 보증하지 않습니다. 현장에서 확인하세요.'},200,3600);
}

async function seoulOpenJson(key,service,parts){
  // These Seoul Open Data Plaza services are documented on legacy HTTP:8088.
  // Cloudflare's ordinary HTTPS fetch sometimes gives a proxy response without
  // the requested service body. In that case use the Workers TCP fallback.
  const tail=parts.map(v=>encodeURIComponent(String(v))).join('/');
  const secure=`https://openapi.seoul.go.kr/${encodeURIComponent(key)}/json/${service}/1/${tail}/`;
  let response,previousFailure=null;
  try{
    const raw=await external(secure,6500,'application/json');
    response=JSON.parse(raw);
    if(!response?.[service]&&!response?.RESULT)throw new Error('SEOUL_HTTPS_UNEXPECTED_RESPONSE');
  }catch(error){previousFailure=error;response=null;}
  if(!response){
    try{response=await fetchSeoulJsonOverTcp({key,service,parts,timeoutMs:9000});}
    catch(error){
      console.warn('[시간표 서울시 API 연결 실패]',service,
        String(previousFailure?.message||'').slice(0,42),String(error?.message||'').slice(0,42));
      throw new Error('SEOUL_TIMETABLE_UPSTREAM_UNREACHABLE');
    }
  }
  const result=String(response?.[service]?.RESULT?.CODE||response?.RESULT?.CODE||'');
  if(result && !['INFO-000','INFO-200'].includes(result))
    throw new Error(`SEOUL_TIMETABLE_API_${result.slice(0,20)}`);
  if(!response?.[service]&&!response?.RESULT)
    throw new Error('SEOUL_TIMETABLE_INVALID_RESPONSE');
  return response;
}
async function serviceHours(query,{busKey,openKey}){
  const kind=query.get('kind');
  const station=String(query.get('station')||'').trim().slice(0,50);
  const line=String(query.get('line')||'').slice(0,60);
  const arsId=String(query.get('arsId')||'');
  const day=String(query.get('day')||seoulDayTag());
  if(!['subway','bus'].includes(kind)||!/^[123]$/.test(day))return fail('시간표 조회 조건이 올바르지 않습니다.',400,'INVALID_HOURS_QUERY');
  if(kind==='subway'){
    if(!station||/[<>/]/.test(station))return fail('역명이 올바르지 않습니다.',400,'INVALID_STATION');
    if(!openKey)return respond({status:'unconfigured',kind,items:[],notice:'시간표를 표시하려면 Cloudflare Secrets에 SEOUL_OPEN_API_KEY를 등록해야 합니다.'});
    try{
      const body=await fetchStationTimetables({station,line,day,
        fetchJSON:(service,parts)=>seoulOpenJson(openKey,service,parts)});
      return respond(body,200,body.status==='ok'?900:0);
    }catch(error){
      console.warn('[Dongjak Pages hours]',String(error?.message||'').slice(0,80));
      const code=String(error?.message||'');
      const sourceFailure=code.startsWith('SEOUL_TIMETABLE_API_')?'upstream_api_error':
        code==='SEOUL_TIMETABLE_UPSTREAM_UNREACHABLE'?'upstream_unreachable':'lookup_error';
      return respond({status:'error',kind,items:[],code:sourceFailure,
        notice:sourceFailure==='upstream_unreachable'
          ? '서울시 시간표 서버에 연결하지 못했습니다. HTTPS 및 기존 8088 포트 연결을 점검해 주세요.'
          : sourceFailure==='upstream_api_error'
            ? '서울시 시간표 API에서 오류가 반환됐습니다. 서비스키·승인 범위와 API 응답을 확인해 주세요.'
            : '시간표 조회가 실패했습니다. 역코드·호선과 서울시 서비스 제공 범위를 확인해 주세요.'},502);
    }
  }
  if(!/^\d{5}$/.test(arsId))return fail('버스 정류소 ARS 5자리 번호가 필요합니다.',400,'INVALID_STATION');
  if(!busKey)return respond({status:'unconfigured',kind,items:[],notice:'버스 API 인증키를 등록해 주세요.'});
  try{
    const url=`http://ws.bus.go.kr/api/rest/stationinfo/getRouteByStation?ServiceKey=${encodeURIComponent(busKey)}&arsId=${arsId}&resultType=json`;
    const listed=await officialJson(url);
    const raw=listed?.msgBody?.itemList??listed?.msgBody?.item??listed?.itemList??[];
    const routes=Array.isArray(raw)?raw:[raw];
    const selected=[...new Map(routes.filter(x=>/^\d{5,}$/.test(String(x.busRouteId||'')))
      .map(x=>[String(x.busRouteId),x])).values()].slice(0,8);
    const settled=await Promise.allSettled(selected.map(async x=>{
      const routeId=String(x.busRouteId);
      const endpoint=`http://ws.bus.go.kr/api/rest/stationinfo/getBustimeByStation?ServiceKey=${encodeURIComponent(busKey)}&arsId=${arsId}&busRouteId=${routeId}&resultType=json`;
      return parseBusServiceTime(await officialJson(endpoint),String(x.busRouteNm||x.rtNm||routeId));
    }));
    const items=settled.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value);
    return respond({status:items.length?'ok':'unavailable',kind,items,
      source:'서울시 정류소별 노선 첫차·막차 예정시간',
      notice:'정류장 기준 최대 8개 노선. 실제 운행 종료 여부가 아닌 예정 시각입니다.'},200,900);
  }catch(e){
    console.warn('[Dongjak Pages bus hours]',String(e?.message||'').slice(0,80));
    return respond({status:'error',kind,items:[],notice:'버스 첫차·막차 정보를 조회하지 못했습니다.'},502);
  }
}
// Auth failures must not erase previously published, offline official stop
// locations. This fallback is active only after a REAL official file has been
// imported into public/data/transport; it never invents live arrival data.
let staticBusStopCache=null;
async function staticBusStopsFromAssets(env,request,lat,lng,radius){
  if(!env?.ASSETS?.fetch)return null;
  try{
    if(!staticBusStopCache){
      const origin=new URL(request.url).origin;
      const response=await env.ASSETS.fetch(new Request(origin+'/data/transport/seoul-bus-stops.json'));
      if(!response.ok)return null;
      const data=await response.json();
      if(!Array.isArray(data.stops)||data.stops.length<1000||!data.sourceDate)return null;
      staticBusStopCache=data;
    }
    const items=nearbyOfficialStaticStops(staticBusStopCache,lat,lng,radius);
    return respond({items,source:'서울시 버스정류소 위치정보 · 정적 파일',sourceDate:staticBusStopCache.sourceDate,
      verified:true,realtimeAvailable:false,lookupStatus:items.length?'found':'empty'},200,900);
  }catch{return null;}
}
async function nearbyBusStops(query,busKey,env,request){
  const lng=Number(query.get('lng')),lat=Number(query.get('lat'));
  const radius=Math.max(40,Math.min(180,Number(query.get('radius')||130)));
  if(!Number.isFinite(lng)||!Number.isFinite(lat)||lng<126.8||lng>127.2||lat<37.35||lat>37.7)
    return fail('서울시 내 정류소 좌표가 필요합니다.',400,'INVALID_BUS_LOCATION');
  const offline=()=>staticBusStopsFromAssets(env,request,lat,lng,radius);
  if(!busKey)return await offline()||fail('버스 API 인증키가 설정되지 않았습니다.',503,'MISSING_BUS_KEY');
  if(Date.now()<busStopsAuthBlockedUntil)return await offline()||busStopsCooldownResponse();
  const endpoint=`http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos?ServiceKey=${encodeURIComponent(busKey)}&tmX=${encodeURIComponent(lng)}&tmY=${encodeURIComponent(lat)}&radius=${radius}&resultType=json`;
  try{
    const items=parseSeoulBusStopsNearby(await officialJson(endpoint,{allowEmptyResult:true}),lat,lng,radius);
    return respond({items,source:'서울시 공식 정류소정보',verified:true,lookupStatus:items.length?'found':'empty'},200,900);
  }catch(error){
    const outcome=classifyBusStopsError(error);
    if(outcome.code==='BUS_API_AUTH'||outcome.code==='BUS_API_RATE_LIMIT'){
      const safe=await offline();if(safe)return safe;
    }
    return busStopsFailure(error);
  }
}
async function medianNearby(query,busKey){
  if(!busKey)return fail('버스 API 인증키가 설정되지 않았습니다.',503,'MISSING_BUS_KEY');
  if(Date.now()<busStopsAuthBlockedUntil)return busStopsCooldownResponse();
  const lng=Number(query.get('lng')),lat=Number(query.get('lat'));
  const name=String(query.get('name')||'').slice(0,80);
  if(!Number.isFinite(lng)||!Number.isFinite(lat)||lng<126.8||lng>127.2||lat<37.35||lat>37.7||!isMedianBusStopName(name))
    return fail('중앙차로 정류장 이름과 서울시 내 좌표가 필요합니다.',400,'INVALID_MEDIAN_STOP');
  const endpoint=`http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos?ServiceKey=${encodeURIComponent(busKey)}&tmX=${encodeURIComponent(lng)}&tmY=${encodeURIComponent(lat)}&radius=125&resultType=json`;
  try{
    const items=normalizeMedianBusStops(await officialJson(endpoint,{allowEmptyResult:true}),{name,lng,lat,radius:125});
    return respond({items,source:'서울시 정류소정보조회',verified:true},200,7200);
  }catch(error){
    return busStopsFailure(error);
  }
}
async function news(query,openKey){
  const type=String(query.get('type')||'media');
  if(!['official','media','seoul'].includes(type))return fail('유효하지 않은 뉴스 분류입니다.',400,'INVALID_NEWS_TYPE');
  try{
    const result=await fetchDongjakNews({type,openApiKey:openKey,force:query.get('refresh')==='1',
      fetchOfficialApi:(service,parts)=>seoulOpenJson(openKey,service,parts)});
    return respond(result,200,600);
  }catch(error){
    console.warn('[Dongjak Pages news]',String(error?.message||'').slice(0,100));
    const message=type==='official'
      ?'동작구청 공식 게시판 또는 열린데이터광장에 연결하지 못했습니다.'
      :'뉴스 검색 피드와 동작구청 보도자료 대체 경로에 연결하지 못했습니다.';
    return fail(message,502,'NEWS_UNAVAILABLE');
  }
}

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const route=url.pathname.replace(/^\/api\/transport\/?/,'').replace(/\/$/,'');
  if(!ROUTES.has(route))return fail('지원하지 않는 API 경로입니다.',404,'NOT_FOUND');
  const busKey=normalizeBusServiceKey(env.SEOUL_BUS_SERVICE_KEY);
  const subwayKey=cleanSecret(env.SEOUL_SUBWAY_API_KEY);
  const openKey=cleanSecret(env.SEOUL_OPEN_API_KEY);
  if(route==='status')return respond({bus:Boolean(busKey),subway:Boolean(subwayKey),newsOfficial:true,newsOpenApiKey:Boolean(openKey),accessibility:true,
    service:'dongjak-cloudflare-pages-functions',timetableKeyConfigured:Boolean(openKey),note:'동작구 소식은 공식 HTTPS 게시판을 우선 사용하며 서울 열린데이터광장 API는 보조 경로입니다.'});
  if(route==='accessibility')return accessibility(openKey);
  if(route==='news')return news(url.searchParams,openKey);
  if(route==='service-hours')return serviceHours(url.searchParams,{busKey,openKey});
  if(route==='operator-timetable'){
    const station=String(url.searchParams.get('station')||'').slice(0,60);
    const day=String(url.searchParams.get('day')||'1');
    const sourceUrl=sillimStationUrl(station);
    if(!sourceUrl||!['1','2','3'].includes(day))return fail('지원하지 않는 역 또는 요일입니다.',400,'INVALID_OPERATOR_STATION');
    try{
      const html=await external(sourceUrl,8500,'text/html');
      const data=parseSillimPublishedHtml(html,{station,day});
      return data?respond(data,200,3600):respond({status:'unavailable',kind:'subway',notice:'운영기관 게시물 형식을 확인하지 못해 시각을 임의 표시하지 않습니다.'},200,0);
    }catch(error){
      return respond({status:'unavailable',kind:'subway',notice:'신림선 운영기관 시간표 원본을 가져오지 못했습니다. 임의 시각은 표시하지 않습니다.'},200,0);
    }
  }
  if(route==='bus/median-nearby')return medianNearby(url.searchParams,busKey);
  if(route==='bus/stops-nearby')return nearbyBusStops(url.searchParams,busKey,env,request);
  const isBus=route==='bus'||route==='bus/routes';
  if(isBus&&!busKey)return fail('Cloudflare Pages에 SEOUL_BUS_SERVICE_KEY가 설정되지 않았습니다.',503,'MISSING_BUS_KEY');
  if(!isBus&&!subwayKey)return fail('Cloudflare Pages에 SEOUL_SUBWAY_API_KEY가 설정되지 않았습니다.',503,'MISSING_SUBWAY_KEY');
  let id=isBus?url.searchParams.get('arsId'):url.searchParams.get('station');
  const lat=url.searchParams.has('lat')?Number(url.searchParams.get('lat')):NaN;
  const lng=url.searchParams.has('lng')?Number(url.searchParams.get('lng')):NaN;
  if(isBus&&!/^\d{5}$/.test(id||'')&&!validLocation(lat,lng))return fail('ARS 5자리 또는 정류소 좌표가 필요합니다.',400,'INVALID_STATION');
  if(!isBus&&(!id||id.length>60||/[<>/]/.test(id)))return fail('역 이름이 올바르지 않습니다.',400,'INVALID_STATION');
  try{
    if(isBus&&!/^\d{5}$/.test(id||'')){
      const locate=`http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos?ServiceKey=${encodeURIComponent(busKey)}&tmX=${lng}&tmY=${lat}&radius=70&resultType=json`;
      id=resolveSeoulBusStation(await officialJson(locate),lat,lng,url.searchParams.get('name')||'');
      if(!id)return fail('공식 ARS 정류소 번호를 찾지 못했습니다.',404,'STATION_NOT_FOUND');
    }
    if(route==='bus/routes'){
      const endpoint=`http://ws.bus.go.kr/api/rest/stationinfo/getRouteByStation?ServiceKey=${encodeURIComponent(busKey)}&arsId=${id}&resultType=json`;
      const routes=parseBusRouteList(await external(endpoint,10000,'application/json, application/xml'));
      return respond({arsId:id,routes,updatedAt:nowKorea()},200,180);
    }
    const useBulk=!isBus && url.searchParams.get('mode')==='bulk';
    const requestedLineId=!isBus?seoulSubwayIdForLine(url.searchParams.get('line')||''):'';
    if(!isBus && url.searchParams.has('line') && !requestedLineId)return fail('지원하지 않는 호선입니다.',400,'UNSUPPORTED_SUBWAY_LINE');
    if(useBulk&&!permitsSubwayBulkRecovery(id,requestedLineId||'1007'))return fail('지원하지 않는 일괄 조회 대상입니다.',400,'UNSUPPORTED_BULK_STATION');
    const endpoint=isBus
      ? `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?ServiceKey=${encodeURIComponent(busKey)}&arsId=${id}&resultType=json`
      : useBulk
        ? `http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(subwayKey)}/json/realtimeStationArrival/ALL`
        : `http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(subwayKey)}/json/realtimeStationArrival/0/100/${encodeURIComponent(id)}`;
    const rawBody=await officialJson(endpoint);
    // ALL feed is never rendered as-is: strictly select the same station and
    // 7호선 so a neighboring/other-line train cannot be shown by mistake.
    // Match both requested station and platform line before source-time validation.
    // Never substitute a different line at an interchange.
    const rawRows=Array.isArray(rawBody?.realtimeArrivalList)?rawBody.realtimeArrivalList:[];
    const body=useBulk
      ? {realtimeArrivalList:filterBulkArrivalsForStation(rawBody,id,{lineId:requestedLineId||'1007'})}
      : requestedLineId?{realtimeArrivalList:rawRows.filter(row=>String(row.subwayId)===requestedLineId)}:rawBody;
    const validation=isBus?null:validateSeoulSubwayFeed(body);
    const items=isBus?parseSeoulBusArrival(body):parseSeoulSubwayArrival({realtimeArrivalList:validation.rows});
    const routes=isBus?[...new Set(items.map(x=>x.route).filter(x=>x!=='노선 정보 없음'))]:[];
    return respond({items,routes,arsId:isBus?id:'',
      // Bus API has no per-arrival source timestamp: 'checkedAt' is a query time.
      // Subway 'updatedAt' MUST come from source recptnDt, not the proxy clock.
      updatedAt:isBus?'':validation.sourceAt,checkedAt:nowKorea(),
      sourceTimestamp:isBus?'':validation.sourceTimestamp||'',
      sourceStatus:isBus?'unverified':validation.state,
      sourceAgeSeconds:isBus?null:validation.sourceAgeSeconds,
      sourceDiagnostics:isBus?null:validation.diagnostics,
      sourceMode:isBus?'':useBulk?'bulk-verified':'station',
      emptyMessage:isBus?(items.length?'':'현재 정류장에 제공되는 버스 도착예정 정보가 없습니다.'):
        validation.message},200,0);
  }catch(e){
    // The location API is not the only route that can receive a credential
    // rejection. Present consistent, sanitized diagnostics for bus arrivals
    // and route lists too. The key, URL and raw response are never exposed.
    if(isBus){
      const classified=classifyBusStopsError(e);
      if(classified.code==='BUS_API_AUTH'||classified.code==='BUS_API_RATE_LIMIT')return busStopsFailure(e);
    }
    const message=e.publicMessage||'서울시 공식 교통정보 서버에 연결하지 못했습니다. 인증키와 공식 API 접근 상태를 확인해 주세요.';
    const code=e.apiCode||String(e.message||'UPSTREAM_ERROR').match(/^(UPSTREAM_[A-Z_]+(?:\d{3})?|BUS_API_\d+)$/)?.[0]||'UPSTREAM_ERROR';
    // Never expose URL, ServiceKey, or upstream response in public API error payloads.
    console.warn('[Dongjak Pages API]',route,code);
    return fail(message,502,code);
  }
}
export async function onRequest(context){
  if(context.request.method!=='GET')return fail('GET 요청만 지원합니다.',405,'METHOD_NOT_ALLOWED');
  return onRequestGet(context);
}
