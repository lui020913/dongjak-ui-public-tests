/**
 * Direct TOPIS subway API check using a local key; prints no secrets or complete URLs.
 * Usage: node scripts/check-subway-source.mjs
 */
import {existsSync,readFileSync} from 'node:fs';
function getKey(name){
  if(process.env[name])return String(process.env[name]).trim();
  if(!existsSync('.env'))return '';
  const line=readFileSync('.env','utf8').split(/\r?\n/).find(x=>new RegExp(`^\\s*${name}\\s*=`).test(x));
  return line?line.replace(/^\s*[^=]+\s*=\s*/,'').trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/,'$1$2'):'';
}
const key=getKey('SEOUL_SUBWAY_API_KEY')||getKey('SEOUL_OPEN_API_KEY');
if(!key){console.log('SEOUL_SUBWAY_API_KEY 또는 SEOUL_OPEN_API_KEY가 로컬 .env에 없습니다.');process.exit(2);}
console.log('[서울시 지하철 실시간 API 원본 비교]');
console.log('인증키·완전한 요청 URL·원본 응답은 출력하지 않습니다.');
for(const station of ['숭실대입구','상도','사당','서울','노량진','대방','신림','보라매','보라매공원','보라매병원','서울지방병무청','샛강']){
  const endpoint=`http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(key)}/json/realtimeStationArrival/0/20/${encodeURIComponent(station)}`;
  try{
    const response=await fetch(endpoint,{signal:AbortSignal.timeout(11000)});
    const raw=await response.text();let parsed={};try{parsed=JSON.parse(raw);}catch{}
    const code=String(parsed.RESULT?.CODE??parsed.errorMessage?.code??parsed.realtimeArrivalList?.[0]?.resultCode??'미제공').slice(0,40);
    const rows=Array.isArray(parsed.realtimeArrivalList)?parsed.realtimeArrivalList:[];
    const lines=Object.fromEntries([...new Set(rows.map(x=>String(x.subwayId||'')).filter(x=>/^\\d{4}$/.test(x)))].map(line=>[line,rows.filter(x=>String(x.subwayId)===line).length]));
    const stamps=rows.map(x=>String(x.recptnDt||'').trim()).filter(Boolean).sort();
    console.log(`${station}: HTTP ${response.status} / 원천 코드 ${code} / 원천 행 ${rows.length} / 호선별 행 ${JSON.stringify(lines)} / 생성시각 ${stamps.at(-1)||'없음'}`);
  }catch(e){console.log(`${station}: 접속 실패 (${e.name==='TimeoutError'?'11초 시간초과':String(e.cause?.code||e.name||'NETWORK_ERROR').slice(0,40)})`);}
}
console.log('원천 행이 있는데 배포 지도의 도착 건수가 0이면 최신성 필터·파싱·역명 처리 문제를 확인하십시오.');
