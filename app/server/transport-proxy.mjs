import {normalizeBusServiceKey} from '../src/bus-service-key.js';
// 예시 개발용 서울시 공식 도착정보 중계 서버. API 인증키는 이 서버의 환경변수에만 저장합니다.
// 본 서버는 기본적으로 127.0.0.1에만 바인딩됩니다. 공개 운영 전 TLS/인증/레이트 리밋 추가 필요.
import http from 'node:http';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {parseSeoulBusArrival,parseSeoulSubwayArrival,resolveSeoulBusStation,parseSeoulBusStopsNearby,inspectSeoulApiResponse,isSeoulBusNoResult} from '../src/transport-data.js';
import {parseBusRouteList} from './bus-route-list.mjs';
import {fetchBusRouteGeometry,fetchBusRouteStops,routePathFailure} from './bus-route-path.mjs';
import {validateSeoulSubwayFeed} from '../src/transport-freshness.js';
import {permitsSubwayBulkRecovery,filterBulkArrivalsForStation,seoulSubwayIdForLine} from '../src/subway-source-recovery.js';
import {fetchDongjakNews} from './dongjak-news.mjs';
import {parseBusServiceTime,seoulDayTag} from './service-hours.mjs';
import {fetchStationTimetables} from './metro-timetable-common.mjs';
import {sillimStationUrl,parseSillimPublishedHtml} from './sillim-published-timetable.mjs';
import {normalizeMedianBusStops,isMedianBusStopName} from '../src/median-bus-stops.js';
import {nearbyOfficialStaticStops} from '../src/static-bus-stops.js';
import {ACCESS_BBOX,parseMetroExits,parseSeoulElevators,mergeAccessibilityCollections,parseFieldVerified} from './station-accessibility-data.mjs';
if(existsSync('.env') && typeof process.loadEnvFile==='function')process.loadEnvFile('.env');
const PORT=Number(process.env.TRANSPORT_PORT||5178);
// 공공데이터포털 버스 서비스키는 '일반 인증키(Decoding)' 원문을 넣습니다.
const BUS_KEY=normalizeBusServiceKey(process.env.SEOUL_BUS_SERVICE_KEY);
const SUBWAY_KEY=String(process.env.SEOUL_SUBWAY_API_KEY||'').trim();
// 서울열린데이터광장 별도 키. 없는 경우 출구 자료만 사용합니다.
const ACCESS_KEY=String(process.env.SEOUL_OPEN_API_KEY||'').trim();
const cache=new Map();
let nearbyBusAuthBlockedUntil=0;
let accessibilityFailureUntil=0;
const nearbyAuthFailure=e=>/HTTP (?:401|403)|BUS_API_(?:4|7|8)/.test(String(e?.message||''));

let staticStopsData=null;
async function locallyAvailableBusStops(lat,lng,radius){
  try{
    if(!staticStopsData){
      const p=join(process.cwd(),'public','data','transport','seoul-bus-stops.json');
      if(!existsSync(p))return null;
      const data=JSON.parse(await readFile(p,'utf8'));
      if(!Array.isArray(data.stops)||data.stops.length<1000||!data.sourceDate)return null;
      staticStopsData=data;
    }
    const items=nearbyOfficialStaticStops(staticStopsData,lat,lng,radius);
    return {items,source:'서울시 버스정류소 위치정보 · 정적 파일',sourceDate:staticStopsData.sourceDate,
      verified:true,realtimeAvailable:false,lookupStatus:items.length?'found':'empty'};
  }catch{return null;}
}
// 역명/ARS별 공식 시간표는 변동 빈도가 낮으므로 20분 캐시합니다. API 키는 브라우저에 보내지 않습니다.
async function openSeoulJSON(service,parts,limit=7500){
  const path=`/${encodeURIComponent(ACCESS_KEY)}/json/${service}/1/${parts.map(x=>encodeURIComponent(String(x))).join('/')}/`;
  let previous;
  for(const base of ['https://openapi.seoul.go.kr','http://openapi.seoul.go.kr:8088']){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),limit);
    try{
      const resp=await fetch(`${base}${path}`,{signal:ctrl.signal,headers:{Accept:'application/json'}});
      if(!resp.ok)throw new Error(`공식 서울시 시간표 HTTP ${resp.status}`);
      const data=await resp.json();
      if(data?.RESULT?.CODE&&!['INFO-000','INFO-200'].includes(data.RESULT.CODE))
        throw new Error(`서울시 시간표 ${data.RESULT.CODE}`);
      if(!data?.[service]&&!data?.RESULT)throw new Error('서울시 시간표 응답 형식 오류');
      return data;
    }catch(error){previous=error;}finally{clearTimeout(timer);}
  }
  throw previous||new Error('서울시 시간표 조회 불가');
}
function officialBusRows(data){
  const value=data?.msgBody?.itemList??data?.msgBody?.item??data?.itemList??[];
  return Array.isArray(value)?value:(value?[value]:[]);
}
async function getServiceHours({kind,station,line,arsId,day}){
  const serviceDay=/^[123]$/.test(String(day||''))?String(day):seoulDayTag();
  const dayId=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const key=`hours:${kind}:${station}:${line}:${arsId}:${dayId}:${serviceDay}`;
  const memo=cache.get(key);
  if(memo && Date.now()-memo.at<(memo.data?.status==='ok'?20:2)*60*1000)return memo.data;
  let data;
  if(kind==='subway'){
    if(!ACCESS_KEY)return {status:'unconfigured',kind,items:[],notice:'첫차·막차 시간표는 서울 열린데이터광장 인증키(SEOUL_OPEN_API_KEY)가 필요합니다.'};
    data=await fetchStationTimetables({station,line,day:serviceDay,fetchJSON:openSeoulJSON});
  }else{
    if(!BUS_KEY)return {status:'unconfigured',kind,items:[],notice:'버스 API 인증키가 없습니다.'};
    const getList=`http://ws.bus.go.kr/api/rest/stationinfo/getRouteByStation?ServiceKey=${encodeURIComponent(BUS_KEY)}&arsId=${encodeURIComponent(arsId)}&resultType=json`;
    const routes=officialBusRows(await fetchOfficial(getList)).filter(x=>/^\d{5,}$/.test(String(x.busRouteId||'')));
    const chosen=[...new Map(routes.map(x=>[String(x.busRouteId),x])).values()].slice(0,8);
    const settled=await Promise.allSettled(chosen.map(async x=>{
      const routeId=String(x.busRouteId);
      const url=`http://ws.bus.go.kr/api/rest/stationinfo/getBustimeByStation?ServiceKey=${encodeURIComponent(BUS_KEY)}&arsId=${encodeURIComponent(arsId)}&busRouteId=${encodeURIComponent(routeId)}&resultType=json`;
      return parseBusServiceTime(await fetchOfficial(url),String(x.busRouteNm||x.rtNm||routeId));
    }));
    const items=settled.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value);
    data={status:items.length?'ok':'unavailable',kind,items,source:'서울시 정류소별 노선 첫차·막차 예정시간',
      notice:`정류장 기준 · 최대 8개 노선 표시${routes.length>8?' (그 외 노선은 미표시)':''}. 시간표가 없다고 막차 통과를 단정하지 않습니다.`};
  }
  cache.set(key,{at:Date.now(),data});return data;
}

function reply(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
async function fetchOfficial(url,{allowEmptyResult=false}={}){
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const response=await fetch(url,{signal:ctrl.signal,headers:{'Accept':'application/json'}});
    const raw=await response.text();
    let data;
    try{data=JSON.parse(raw);}catch{throw new Error(`공식 API가 JSON이 아닌 형식으로 응답했습니다. (HTTP ${response.status})`);}
    // 정상적인 지하철 응답에도 errorMessage:{code:'INFO-000'} 객체가 실려옵니다.
    // v17.2에서는 객체가 존재하기만 하면 실패로 처리하는 오류가 있었습니다.
    const notice=inspectSeoulApiResponse(data);
    if(notice.state==='empty')return allowEmptyResult?{msgHeader:{headerCd:0},msgBody:{itemList:[]}}:{realtimeArrivalList:[]};
    if(notice.state==='error'){
      const e=new Error(notice.message);
      e.apiCode=notice.code;
      e.publicMessage=notice.message;
      throw e;
    }
    if(!response.ok)throw new Error(`공식 API HTTP ${response.status}`);
    if(allowEmptyResult && isSeoulBusNoResult(data))return {msgHeader:{headerCd:0},msgBody:{itemList:[]}};
    if(data?.msgHeader?.headerCd!==undefined && Number(data.msgHeader.headerCd)!==0)throw new Error(data.msgHeader.headerMsg||'버스 API 오류');
    return data;
  }finally{clearTimeout(timer);}
}
const GEO_API='https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0/query';
const ACCESS_TTL=6*60*60*1000;
function exitQuery(bounds=ACCESS_BBOX,count=2000){
  const q=new URL(GEO_API);
  for(const [k,v] of Object.entries({
    where:'1=1',geometry:bounds.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',
    spatialRel:'esriSpatialRelIntersects',outFields:'sub_ent_sn,entrc_no,entrc_nm,stn_cd,stn_nm,sub_nm',
    outSR:'4326',returnGeometry:'true',resultRecordCount:String(count),f:'json'
  }))q.searchParams.set(k,v);
  return q;
}
async function fetchExitArcgis(bounds=ACCESS_BBOX,count=2000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),11000);
  try{
    const response=await fetch(exitQuery(bounds,count),{signal:ctrl.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`행안부 출구 데이터 HTTP ${response.status}`);
    const data=await response.json();
    if(data?.error)throw new Error(`행안부 출구 데이터 오류 ${data.error.code||''}`);
    return data;
  }finally{clearTimeout(timer);}
}
async function fetchExitArcgisResilient(){
  try{return await fetchExitArcgis();}
  catch(error){
    if(!/HTTP 500|오류 500/.test(String(error?.message||'')))throw error;
    const [west,south,east,north]=ACCESS_BBOX,mid=(west+east)/2;
    const [a,b]=await Promise.all([
      fetchExitArcgis([west,south,mid,north],1000),
      fetchExitArcgis([mid,south,east,north],1000)
    ]);
    return {features:[...(a.features||[]),...(b.features||[])]};
  }
}
async function getAccessibility(){
  if(Date.now()<accessibilityFailureUntil)throw new Error('출구·승강기 API 재시도 대기 중(외부 서비스 오류)');
  const memo=cache.get('station-accessibility');
  if(memo&&Date.now()-memo.at<ACCESS_TTL)return memo.data;
  let exits={type:'FeatureCollection',features:[]},elevators={type:'FeatureCollection',features:[]};
  const errors=[];
    try{exits=parseMetroExits(await fetchExitArcgisResilient());}
    catch(err){errors.push(err.message);console.warn('[역 출구 위치]',err.message);}
    if(ACCESS_KEY){
      try{
        const url=`http://openapi.seoul.go.kr:8088/${encodeURIComponent(ACCESS_KEY)}/json/tbTraficElvtr/1/1000/`;
        const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
        let response;
        try{response=await fetch(url,{signal:ctrl.signal});}
        finally{clearTimeout(timer);}
        if(!response.ok)throw new Error(`서울시 엘리베이터 API HTTP ${response.status}`);
        const body=await response.json();
        if(body?.tbTraficElvtr?.RESULT?.CODE && body.tbTraficElvtr.RESULT.CODE!=='INFO-000')
          throw new Error(`서울시 엘리베이터 API ${body.tbTraficElvtr.RESULT.CODE}`);
        elevators=parseSeoulElevators(body);
      }catch(err){errors.push(err.message);console.warn('[엘리베이터 위치]',err.message);}
    }
  
  let fieldSurvey={type:'FeatureCollection',features:[]};
  try{
    const content=await readFile(join(process.cwd(),'public','data','metro-accessibility-verified.geojson'),'utf8');
    fieldSurvey=parseFieldVerified(JSON.parse(content));
  }catch(err){if(err.code!=='ENOENT')console.warn('[검증 현장 설비]',err.message);}
  const data={features:mergeAccessibilityCollections(exits,elevators,fieldSurvey),
    sourceStatus:{exits:exits.features.length,elevators:elevators.features.length,fieldVerified:fieldSurvey.features.length,
      // Not the same as proving zero elevators exist.
      elevatorApiConfigured:Boolean(ACCESS_KEY),errors},
    notice:'출구 위치와 승강기 정보는 운영 상태가 아니므로 현장에서 확인하세요.'};
  if(!data.features.features.length){
    const err=new Error(errors.join('; ')||'유효한 위치 데이터가 없습니다.');
    err.accessibilityUnavailable=true;accessibilityFailureUntil=Date.now()+5*60*1000;throw err;
  }
  cache.set('station-accessibility',{at:Date.now(),data});
  return data;
}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.method!=='GET')return reply(res,405,{error:'GET 요청만 가능합니다.'});
    if(url.pathname==='/api/transport/news'){
      try{
        const body=await fetchDongjakNews({type:url.searchParams.get('type')||'media',openApiKey:ACCESS_KEY,
          force:url.searchParams.get('refresh')==='1',
          fetchOfficialApi:(service,parts)=>openSeoulJSON(service,parts)});
        return reply(res,200,body);
      }catch(error){return reply(res,error.status||502,{error:error.message||'지역 소식 조회 실패'});}
    }
    if(url.pathname==='/api/transport/status')return reply(res,200,{bus:Boolean(BUS_KEY),subway:Boolean(SUBWAY_KEY),service:'dongjak-transport-proxy-v17.2'});
    if(url.pathname==='/api/transport/operator-timetable'){
      const station=String(url.searchParams.get('station')||'').slice(0,60);
      const day=String(url.searchParams.get('day')||'1');
      const sourceUrl=sillimStationUrl(station);
      if(!sourceUrl||!['1','2','3'].includes(day))return reply(res,400,{status:'error',notice:'지원하지 않는 역 또는 요일입니다.'});
      try{
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8500);
        let html;
        try{const response=await fetch(sourceUrl,{signal:controller.signal});if(!response.ok)throw new Error('OPERATOR_NOT_AVAILABLE');html=await response.text();}
        finally{clearTimeout(timer);}
        return reply(res,200,parseSillimPublishedHtml(html,{station,day})||{status:'unavailable',kind:'subway',notice:'운영기관 게시물 형식을 확인하지 못했습니다.'});
      }catch{return reply(res,200,{status:'unavailable',kind:'subway',notice:'신림선 게시시간표 연결에 실패했습니다.'});}
    }
    if(url.pathname==='/api/transport/service-hours'){
      const kind=url.searchParams.get('kind');
      const arsId=String(url.searchParams.get('arsId')||'');
      const station=String(url.searchParams.get('station')||'').trim().slice(0,50);
      const line=String(url.searchParams.get('line')||'').slice(0,60);
      const day=String(url.searchParams.get('day')||'');
      if(!['subway','bus'].includes(kind))return reply(res,400,{error:'잘못된 교통수단입니다.'});
      if(kind==='bus'&&!/^\d{5}$/.test(arsId))return reply(res,400,{error:'정류소 ARS 번호가 필요합니다.'});
      if(kind==='subway'&&(!station||/[<>\/]/.test(station)))return reply(res,400,{error:'역명을 확인해 주세요.'});
      if(day&&!/^[123]$/.test(day))return reply(res,400,{error:'요일은 1(평일), 2(토요일), 3(일요일/공휴일)만 가능합니다.'});
      try{return reply(res,200,await getServiceHours({kind,station,line,arsId,day}));}
      catch(error){console.warn('[교통 첫차·막차]',error.message);return reply(res,502,{status:'error',kind,items:[],notice:'첫차·막차 시간표 조회에 실패했습니다. 실시간 운행 상태와 다를 수 있습니다.'});}
    }

    if(url.pathname==='/api/transport/accessibility'){
      try{return reply(res,200,await getAccessibility());}
      catch(e){return reply(res,503,{error:'출구 위치 자료 연결에 실패했습니다. 실제 출구 위치를 임의로 생성하지 않습니다.',detail:String(e.message||'').slice(0,180)});}
    }
    // 지도 확대 시 이름/ARS가 누락된 버스 POI를 서울시 공식 정류소 자료로 보완합니다.
    if(url.pathname==='/api/transport/bus/stops-nearby'){
      const lng=Number(url.searchParams.get('lng')),lat=Number(url.searchParams.get('lat'));
      const radius=Math.max(40,Math.min(180,Number(url.searchParams.get('radius')||130)));
      if(!Number.isFinite(lng)||!Number.isFinite(lat)||lng<126.8||lng>127.2||lat<37.35||lat>37.7)
        return reply(res,400,{error:'서울시 내 정류소 좌표가 필요합니다.'});
      if(!BUS_KEY || Date.now()<nearbyBusAuthBlockedUntil){
        const offline=await locallyAvailableBusStops(lat,lng,radius);
        if(offline)return reply(res,200,offline);
        return reply(res,503,{error:BUS_KEY?'정류소 API 인증정보를 확인해 주세요.':'버스 API 인증키 미설정',
          code:BUS_KEY?'BUS_API_AUTH':'MISSING_BUS_KEY'});
      }
      const memoKey=`bus-stops:${lng.toFixed(4)}:${lat.toFixed(4)}:${radius}`;
      const memo=cache.get(memoKey);
      if(memo&&Date.now()-memo.at<15*60*1000)return reply(res,200,memo.data);
      const target=`http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos?ServiceKey=${encodeURIComponent(BUS_KEY)}&tmX=${encodeURIComponent(lng)}&tmY=${encodeURIComponent(lat)}&radius=${radius}&resultType=json`;
      try{
        const upstream=await fetchOfficial(target,{allowEmptyResult:true});
        const items=parseSeoulBusStopsNearby(upstream,lat,lng,radius);
        const data={items,source:'서울특별시 정류소정보조회 서비스',verified:true,lookupStatus:items.length?'found':'empty'};
        cache.set(memoKey,{at:Date.now(),data});
        return reply(res,200,data);
      }catch(error){
        if(nearbyAuthFailure(error)){
          nearbyBusAuthBlockedUntil=Date.now()+60*1000;
          const offline=await locallyAvailableBusStops(lat,lng,radius);
          if(offline)return reply(res,200,offline);
          console.warn('[주변 버스정류소 이름] 인증 오류');
          return reply(res,503,{error:'공식 버스 API 인증정보 또는 접근 권한을 확인해 주세요.',code:'BUS_API_AUTH'});
        }
        console.warn('[주변 버스정류소 이름]',String(error?.message||'').slice(0,80));
        return reply(res,502,{error:'주변 버스정류소 이름을 조회하지 못했습니다.'});
      }
    }
    // 중앙차로 '(중)' 승강장을 공식 ARS 번호·GPS 좌표별로 구분합니다.
    if(url.pathname==='/api/transport/bus/median-nearby'){
      if(!BUS_KEY)return reply(res,503,{error:'버스 API 인증키 미설정'});
      const lng=Number(url.searchParams.get('lng'));
      const lat=Number(url.searchParams.get('lat'));
      const name=String(url.searchParams.get('name')||'').slice(0,80);
      if(!Number.isFinite(lng)||!Number.isFinite(lat)||lng<126.8||lng>127.2||lat<37.35||lat>37.7||!isMedianBusStopName(name))
        return reply(res,400,{error:'중앙차로 정류장 이름과 서울시 내 좌표가 필요합니다.'});
      const memoKey=`median:${name}:${lng.toFixed(4)}:${lat.toFixed(4)}`;
      const memo=cache.get(memoKey);
      if(memo&&Date.now()-memo.at<3*60*60*1000)return reply(res,200,memo.data);
      const target=`http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos?ServiceKey=${encodeURIComponent(BUS_KEY)}&tmX=${encodeURIComponent(lng)}&tmY=${encodeURIComponent(lat)}&radius=125&resultType=json`;
      const upstream=await fetchOfficial(target,{allowEmptyResult:true});
      const items=normalizeMedianBusStops(upstream,{name,lng,lat,radius:125});
      const data={items,source:'서울특별시 정류소정보조회 서비스',verified:true,lookupStatus:items.length?'found':'empty'};
      cache.set(memoKey,{at:Date.now(),data});
      return reply(res,200,data);
    }
    if(url.pathname==='/api/transport/bus/route-path'){
      const id=url.searchParams.get('routeId')||'';
      if(!/^\d{5,15}$/.test(id))return reply(res,400,{error:'유효한 버스 노선 ID가 필요합니다.'});
      const routeKey=normalizeBusServiceKey(process.env.SEOUL_BUS_ROUTE_SERVICE_KEY)||BUS_KEY;
      if(!routeKey)return reply(res,503,{error:'버스 노선 API 인증키 미설정',code:'MISSING_BUS_KEY'});
      const memoKey='bus-route-path:'+id;
      const memo=cache.get(memoKey);
      if(memo&&Date.now()-memo.at<3600000)return reply(res,200,memo.data);
      const [result,routeStops]=await Promise.all([fetchBusRouteGeometry(routeKey,id),fetchBusRouteStops(routeKey,id)]);
      if(result.code){const error=routePathFailure(result.code);return reply(res,error.status,{error:error.error,code:error.code});}
      const data={routeId:id,coordinates:result.coordinates,stops:routeStops,source:'서울시 노선정보조회 서비스'};
      cache.set(memoKey,{at:Date.now(),data});return reply(res,200,data);
    }
    const routeList=url.pathname==='/api/transport/bus/routes';
    if(url.pathname!=='/api/transport/bus'&&url.pathname!=='/api/transport/subway'&&!routeList)return reply(res,404,{error:'경로가 없습니다.'});
    const bus=routeList||url.pathname.endsWith('/bus');
    let id=bus?url.searchParams.get('arsId'):url.searchParams.get('station');
    const lat=Number(url.searchParams.get('lat'));
    const lng=Number(url.searchParams.get('lng'));
    if(bus && (!id||!/^\d{5}$/.test(id))) {
      if(!(Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=37&&lat<=38&&lng>=126&&lng<=128))
        return reply(res,400,{error:'ARS 5자리 또는 정류소 좌표가 필요합니다.'});
    }
    if(!bus && (!id||id.length>60||/[<>/]/.test(id)))return reply(res,400,{error:'역 이름이 올바르지 않습니다.'});
    if(bus&&!BUS_KEY)return reply(res,503,{error:'SEOUL_BUS_SERVICE_KEY가 서버에 설정되지 않았습니다.'});
    if(!bus&&!SUBWAY_KEY)return reply(res,503,{error:'SEOUL_SUBWAY_API_KEY가 서버에 설정되지 않았습니다.'});
    if(bus && (!id||!/^\d{5}$/.test(id))){
      const locate=`http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos?ServiceKey=${encodeURIComponent(BUS_KEY)}&tmX=${encodeURIComponent(lng)}&tmY=${encodeURIComponent(lat)}&radius=70&resultType=json`;
      const nearby=await fetchOfficial(locate);
      id=resolveSeoulBusStation(nearby,lat,lng,url.searchParams.get('name')||'');
      if(!id)return reply(res,404,{error:'가까운 공식 정류소 ARS 번호를 확인하지 못했습니다.'});
    }
    if(routeList){
      const cacheKey=`routeList:${id}`;
      const memo=cache.get(cacheKey);
      if(memo&&Date.now()-memo.at<180000)return reply(res,200,memo.data);
      const target=`http://ws.bus.go.kr/api/rest/stationinfo/getRouteByStation?ServiceKey=${encodeURIComponent(BUS_KEY)}&arsId=${encodeURIComponent(id)}&resultType=json`;
      const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
      try{
        const upstream=await fetch(target,{signal:ctrl.signal});
        const body=await upstream.text();
        if(!upstream.ok)throw new Error(`경유 노선 API HTTP ${upstream.status}`);
        const routes=parseBusRouteList(body);
        const data={arsId:id,routes,updatedAt:new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date())};
        cache.set(cacheKey,{at:Date.now(),data});
        return reply(res,200,data);
      }finally{clearTimeout(timer);}
    }
    const useBulk=!bus && url.searchParams.get('mode')==='bulk';
    const requestedLineId=!bus?seoulSubwayIdForLine(url.searchParams.get('line')||''):'';
    if(!bus && url.searchParams.has('line') && !requestedLineId)return reply(res,400,{error:'지원하지 않는 호선입니다.',code:'UNSUPPORTED_SUBWAY_LINE'});
    if(useBulk&&!permitsSubwayBulkRecovery(id,requestedLineId||'1007'))return reply(res,400,{error:'지원하지 않는 일괄 조회 대상입니다.',code:'UNSUPPORTED_BULK_STATION'});
    const cacheKey=`${bus?'bus':useBulk?'subway-bulk':'subway'}:${id}:${requestedLineId}`;
    const cached=cache.get(cacheKey);
    if(cached&&Date.now()-cached.at<10000)return reply(res,200,cached.data);
    const upstream=bus
      ? `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?ServiceKey=${encodeURIComponent(BUS_KEY)}&arsId=${encodeURIComponent(id)}&resultType=json`
      // 서울시 공개 명세는 이 API를 HTTP 주소로 안내합니다. 브라우저에서 직접 호출하지 마세요.
      : useBulk
        ? `http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(SUBWAY_KEY)}/json/realtimeStationArrival/ALL`
        : `http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(SUBWAY_KEY)}/json/realtimeStationArrival/0/100/${encodeURIComponent(id)}`;
    const rawBody=await fetchOfficial(upstream);
    const rawRows=Array.isArray(rawBody?.realtimeArrivalList)?rawBody.realtimeArrivalList:[];
    const body=useBulk
      ? {realtimeArrivalList:filterBulkArrivalsForStation(rawBody,id,{lineId:requestedLineId||'1007'})}
      : requestedLineId?{realtimeArrivalList:rawRows.filter(row=>String(row.subwayId)===requestedLineId)}:rawBody;
    const validation=bus?null:validateSeoulSubwayFeed(body);
    const items=bus?parseSeoulBusArrival(body):parseSeoulSubwayArrival({realtimeArrivalList:validation.rows});
    const routes=bus?[...new Set(items.map(x=>x.route).filter(x=>x!=='노선 정보 없음'))]:[];
    const checkedAt=new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date());
    const data={items,routes,arsId:bus?id:'',updatedAt:bus?'':validation.sourceAt,checkedAt,
      sourceTimestamp:bus?'':validation.sourceTimestamp||'',
      sourceStatus:bus?'unverified':validation.state,
      sourceAgeSeconds:bus?null:validation.sourceAgeSeconds,
      sourceDiagnostics:bus?null:validation.diagnostics,
      sourceMode:bus?'':useBulk?'bulk-verified':'station',
      emptyMessage:bus?(items.length?'':'현재 정류장에 제공되는 버스 도착예정 정보가 없습니다.'):
        validation.message};
    cache.set(cacheKey,{at:Date.now(),data});
    reply(res,200,data);
  }catch(error){
    // 인증키는 절대 응답에 포함시키지 않습니다. 공식 오류코드만 표시합니다.
    console.error('[교통 API]',error.apiCode||'UPSTREAM_ERROR',error.message);
    reply(res,502,{error:error.publicMessage||'공식 교통정보를 가져오지 못했습니다. API 서버 로그를 확인해 주세요.',code:error.apiCode||'UPSTREAM_ERROR'});
  }
});
server.listen(PORT,'127.0.0.1',()=>console.log(`동작구 교통정보 서버 http://127.0.0.1:${PORT} (버스키: ${BUS_KEY?'설정':'없음'}, 지하철키: ${SUBWAY_KEY?'설정':'없음'})`));
