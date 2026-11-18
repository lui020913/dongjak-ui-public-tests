/**
 * Read-only source comparison for the latest dongjak map. Uses local env keys,
 * never prints keys, request URLs, body values or identifiers tied to a user.
 * Tests whether station-specific results differ from the official ALL feed,
 * and whether an upstream HTTP 401 occurs before bus-key evaluation.
 */
import {existsSync,readFileSync} from 'node:fs';
import {filterBulkArrivalsForStation} from '../src/subway-source-recovery.js';
import {parseSeoulArrivalTime,SUBWAY_MAX_SOURCE_AGE_MS} from '../src/transport-freshness.js';
function getKey(name){
  if(process.env[name])return String(process.env[name]).trim();
  if(!existsSync('.env'))return '';
  const line=readFileSync('.env','utf8').split(/\r?\n/).find(x=>new RegExp(`^\\s*${name}\\s*=`).test(x));
  return line?line.replace(/^\s*[^=]+\s*=\s*/,'').trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/,'$1$2'):'';
}
const subwayKey=getKey('SEOUL_SUBWAY_API_KEY');
const busRaw=getKey('SEOUL_BUS_SERVICE_KEY');
let busKey=busRaw;
if(/%(?:2B|2F|3D)/i.test(busRaw)){try{busKey=decodeURIComponent(busRaw);}catch{/* Keep original. */}}
const timeout=9000;
async function probe(url){
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json'},cache:'no-store'});
    const raw=await response.text();let data={};try{data=JSON.parse(raw);}catch{}
    return {http:response.status,contentType:(response.headers.get('content-type')||'미제공').split(';')[0],
      server:response.headers.get('server')?'제공':'미제공',
      code:String(data.RESULT?.CODE??data.errorMessage?.code??data.msgHeader?.headerCd??'미제공').slice(0,30),
      rows:Array.isArray(data.realtimeArrivalList)?data.realtimeArrivalList:[],
      count:Number.isFinite(Number(data.list_total_count))?Number(data.list_total_count):null,
      data};
  }catch(e){return {http:0,contentType:'',code:'',rows:[],error:e.name==='TimeoutError'?'시간초과':String(e.cause?.code||e.name).slice(0,40)};}
}
function freshness(rows){
  const ms=rows.map(row=>parseSeoulArrivalTime(row.recptnDt)).filter(Number.isFinite);
  const age=ms.length?Math.round((Date.now()-Math.max(...ms))/1000):null;
  return {age,verified:age!==null&&age>=-45&&age<=SUBWAY_MAX_SOURCE_AGE_MS/1000};
}
console.log('===== 서울시 교통 API 원본 교차검증 (비밀키·원본 본문 미출력) =====');
if(subwayKey){
  const root=`http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(subwayKey)}/json/realtimeStationArrival/`;
  const stations=['상도','상도(LG전자사거리)','상도(중앙대앞)','숭실대입구','숭실대입구(살피재)','장승배기','남성','사당'];
  console.log('\n[역별 조회] 서울시 실시간 지하철');
  const results=[];
  // Avoid firing eight simultaneous requests at the city service.
  for(let offset=0;offset<stations.length;offset+=3){
    const batch=await Promise.all(stations.slice(offset,offset+3).map(async name=>{
      const r=await probe(root+`0/20/${encodeURIComponent(name)}`);
      const f=freshness(r.rows);
      console.log(`${name}: HTTP ${r.http} / 결과 ${r.code} / 원본 ${r.rows.length}건 / ${f.verified?'최신':'원본시각 미확인 또는 지연'}${f.age!==null?'('+f.age+'초)':''}${r.error?' / '+r.error:''}`);
      return {name,...r};
    }));
    results.push(...batch);
  }
  console.log('\n[일괄 조회] 역별 요청과 비교');
  const all=await probe(root+'ALL');
  console.log(`ALL: HTTP ${all.http} / 결과 ${all.code} / 총 원본 ${all.rows.length}건${all.error?' / '+all.error:''}`);
  if(all.rows.length){
    for(const station of ['상도','숭실대입구']){
      const matches=filterBulkArrivalsForStation(all.data,station);
      const f=freshness(matches);
      console.log(`${station}: 일괄 데이터에서 정확히 일치한 7호선 ${matches.length}건 / ${f.verified?'최신':'최신 정보 미확인'}${f.age!==null?' / 생성 후 '+f.age+'초':''}`);
    }
  }else console.log('ALL이 원본 열차 정보를 반환하지 않아 역별·일괄 데이터 차이를 확정할 수 없습니다.');
  if(results.some(r=>r.rows.length))console.log('검증: 지하철 키는 일부 역의 원본 데이터를 반환합니다. 0건 역의 원인을 별도로 추적하십시오.');
}else console.log('\n지하철 키를 찾지 못했습니다. .env에 SEOUL_SUBWAY_API_KEY가 있는지 확인해 주세요.');
if(busKey){
  const base='http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos';
  const args={tmX:'126.954',tmY:'37.4955',radius:'180',resultType:'json'};
  const request=key=>{const url=new URL(base);for(const [k,v] of Object.entries(args))url.searchParams.set(k,v);if(key)url.searchParams.set('ServiceKey',key);return url;};
  const [auth,without]=await Promise.all([probe(request(busKey)),probe(request(null))]);
  console.log('\n[버스 원천 HTTP 응답 비교]');
  for(const [label,r] of [['인증키 전달',auth],['인증키 미전달',without]])
    console.log(`${label}: HTTP ${r.http}, 본문형식 ${r.contentType||'확인불가'}, 서울시 코드 ${r.code}, 응답 서버식별 ${r.server||'미확인'}${r.error?' / '+r.error:''}`);
  console.log(auth.http===without.http&&auth.code===without.code&&auth.contentType===without.contentType
    ? '판정: 인증키 전달 여부와 무관하게 응답 특성이 같습니다. 키 오류로 단정하면 안 되며 제공기관의 공식 테스트와 비교하십시오.'
    : '판정: 키 전달 전후 응답 특성이 다릅니다. 제공기관에서 인증 처리 여부 확인이 필요합니다.');
}else console.log('\n버스 키를 찾지 못했습니다. .env에 SEOUL_BUS_SERVICE_KEY가 있는지 확인해 주세요.');
console.log('진단 종료: 원본 API 응답을 확인한 것이며, 지도 배포 결과나 차량 운행을 증명하지 않습니다.');
