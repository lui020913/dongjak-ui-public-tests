/**
 * Read-only TOPIS ETA field diagnosis. No full URLs, keys, or raw bodies are logged.
 * Run from the DongjakApp project root:
 *   node scripts/check-metro-eta-values.mjs
 */
import {existsSync, readFileSync} from 'node:fs';
function envKey(name) {
  if (process.env[name]) return String(process.env[name]).trim();
  if (!existsSync('.env')) return '';
  const line = readFileSync('.env','utf8').split(/\r?\n/).find(row => new RegExp(`^\\s*${name}\\s*=`).test(row));
  if (!line) return '';
  let value = line.replace(/^\s*[^=]+\s*=\s*/, '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value=value.slice(1,-1);
  return value;
}
const key=envKey('SEOUL_SUBWAY_API_KEY')||envKey('SEOUL_OPEN_API_KEY');
if(!key) { console.error('로컬 .env에서 지하철 인증키를 찾지 못했습니다.'); process.exitCode=2; }
else {
  const cases=[
    ['노량진 1호선','노량진','1001'],
    ['대방 1호선','대방','1001'],
    ['대방 신림선','대방','1094'],
    ['보라매 신림선','보라매','1094'],
    ['상도 7호선 (비교)','상도(중앙대앞)','1007']
  ];
  function kindOfEta(value) {
    if(value==null)return '필드 없음/null';
    const s=String(value).trim();
    if(!s)return '빈 문자열';
    const n=Number(s);
    if(!Number.isFinite(n))return '숫자 아님';
    if(n===0)return '0초';
    if(n<0)return '음수';
    return '양수';
  }
  function summary(rows) {
    const etaGroups=Object.fromEntries(['양수','0초','빈 문자열','필드 없음/null','음수','숫자 아님'].map(k=>[k,0]));
    let m2=0,m3=0,m3HasMinutes=0;
    const codes=new Map();
    for(const row of rows){
      etaGroups[kindOfEta(row.barvlDt)]++;
      if(String(row.arvlMsg2??'').trim())m2++;
      const third=String(row.arvlMsg3??'').trim();
      if(third)m3++;
      if(/\d+\s*(?:분|초)\s*(?:후|남음)?/.test(third))m3HasMinutes++;
      const code=String(row.arvlCd??'미제공').trim().slice(0,10);
      codes.set(code,(codes.get(code)||0)+1);
    }
    const grouped=Object.entries(etaGroups).map(([k,v])=>`${k} ${v}`).join(' / ');
    const arvl=[...codes].map(([k,v])=>`${k}:${v}`).join(', ');
    return {grouped,m2,m3,m3HasMinutes,arvl};
  }
  console.log('[지하철 ETA 원본 필드 유형 진단]');
  console.log('인증키·완전한 URL·원본 본문·열차번호는 출력하지 않습니다.');
  for(const [label,station,lineId] of cases){
    const url=`http://swopenAPI.seoul.go.kr/api/subway/${encodeURIComponent(key)}/json/realtimeStationArrival/0/100/${encodeURIComponent(station)}`;
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(11500),headers:{Accept:'application/json'},cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      const full=Array.isArray(data.realtimeArrivalList)?data.realtimeArrivalList:[];
      const rows=full.filter(row=>String(row.subwayId)===lineId);
      const code=String(data.errorMessage?.code||data.RESULT?.CODE||'미제공').slice(0,25);
      const s=summary(rows);
      console.log(`\n${label}: HTTP ${response.status} / 서울시 ${code} / 해당 노선 ${rows.length}건 (역 전체 ${full.length}건)`);
      console.log(`  barvlDt: ${s.grouped}`);
      console.log(`  arvlMsg2 제공 ${s.m2}건 / arvlMsg3 제공 ${s.m3}건 / arvlMsg3 숫자 시간 언급 ${s.m3HasMinutes}건`);
      console.log(`  arvlCd 분포: ${s.arvl||'없음'}`);
    }catch(error){
      console.log(`\n${label}: 요청 실패 (${error.name==='TimeoutError'?'시간 초과':String(error.cause?.code||error.name).slice(0,40)})`);
    }
  }
  console.log('\n판독: barvlDt 양수가 0건이면 원천의 초 단위 ETA로 신뢰할 카운트다운을 생성할 수 없습니다. 0초·빈 문자열·비정상 문자열을 구분해 확인하세요.');
}
