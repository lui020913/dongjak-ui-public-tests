/** Read-only diagnostics for deployed Cloudflare Pages transport Functions.
 * No service keys are read, sent or logged by this script.
 * Usage: node scripts/check-transport-live.mjs https://your-site.pages.dev
 */
const site=new URL(process.argv[2]||'https://dongjak-walk-safety-preview.pages.dev').origin;
async function get(path){
  try{
    const response=await fetch(site+path,{signal:AbortSignal.timeout(11000),headers:{Accept:'application/json'},cache:'no-store'});
    const value=await response.json();
    return {ok:response.ok,status:response.status,value};
  }catch(error){return {ok:false,status:0,error:String(error?.message||error)};}
}
function report(title,result,notes=''){
  const body=result.value||{};
  console.log(`${title}: HTTP ${result.status||'연결 실패'}${notes?` · ${notes}`:''}`);
  if(!result.ok){
    console.log('  오류:',String(body.error||result.error||'응답 없음').slice(0,180),'code:',body.code||'');
    if(body.reason)console.log('  원인 구분:',String(body.reason).slice(0,50),'재시도 대기(초):',body.retryAfterSeconds??'없음');
  }
}
console.log('[동작구 교통정보 배포 진단]',site);
const status=await get('/api/transport/status');
report('설정 상태',status);
if(status.ok){
  const info=status.value;
  console.log(`  버스키 설정: ${Boolean(info.bus)} / 지하철키 설정: ${Boolean(info.subway)} (유효성은 별도 조회 필요)`);
}
const metro=await get('/api/transport/subway?station='+encodeURIComponent('숭실대입구'));
report('숭실대입구 실시간 지하철',metro);
if(metro.ok){
  const data=metro.value;
  const age=Date.now()-Date.parse(String(data.sourceTimestamp||''));
  const sourceFresh=data.sourceStatus==='ok'&&Number.isFinite(age)&&age>=-45000&&age<=180000;
  console.log(`  원천 상태: ${data.sourceStatus||'미제공'} / 생성시각(ISO): ${data.sourceTimestamp||'미제공'} / 경과(초): ${Number.isFinite(age)?Math.round(age/1000):'미확인'} / 도착 건수: ${data.items?.length??'미확인'}`);
  console.log(`  표시 적합성: ${sourceFresh?'최신 원천 시각 확인':'실시간 도착을 신뢰할 수 없음'} (심야 시간대에는 실제 운행 시간표와 별도 대조 필요)`);
}
const nearby=await get('/api/transport/bus/stops-nearby?lat=37.4955&lng=126.954&radius=180');
report('공식 버스정류소 위치·명칭',nearby);
if(nearby.value?.reason==='HTTP_401'||nearby.value?.reason==='HTTP_403'){
  console.log('  점검: API 인증 거부입니다. 키를 공개하지 말고, 로컬에서 node scripts/check-bus-key-local.mjs로 동일 요청을 비교하십시오.');
}
if(nearby.ok){
  const stops=Array.isArray(nearby.value.items)?nearby.value.items:[];
  console.log(`  공식조회 건수: ${stops.length} / 확인상태: ${nearby.value.lookupStatus||'미제공'}`);
  const stop=stops.find(x=>/^\d{5}$/.test(String(x.arsId||'')));
  if(stop){
    const bus=await get('/api/transport/bus?arsId='+encodeURIComponent(stop.arsId));
    report(`버스 도착 (${stop.name}, ARS ${stop.arsId})`,bus);
    if(bus.ok)console.log(`  경유/도착 응답: ${bus.value.items?.length??0}건 · 조회시각: ${bus.value.checkedAt||'미표시'} (버스 원천 생성시각은 API에서 제공하지 않음)`);
    const routes=await get('/api/transport/bus/routes?arsId='+encodeURIComponent(stop.arsId));
    report(`경유노선 (${stop.name})`,routes);
    if(routes.ok)console.log('  경유노선 건수:',routes.value.routes?.length??0);
  }else console.log('  진단용 좌표 반경 내 ARS 미확보: 실제 정류장 위치/다른 좌표로 재검사해 주세요.');
}
for(const type of ['official','media']){
  const news=await get(`/api/transport/news?type=${type}`);
  report(type==='official'?'구청 공식 소식':'동작구 지역 뉴스',news);
  if(type==='official'&&!news.ok)console.log('  점검: v6.1.0 공식소식 복구 패치 배포 여부와 외부 공급처 접속을 확인하십시오.');
  if(news.ok)console.log(`  출처: ${news.value.source||'미제공'} · 게시물 ${Array.isArray(news.value.items)?news.value.items.length:'미확인'}건 · 오래된 캐시: ${news.value.stale?'예':'아니오'}`);
}
console.log('참고: 버스키 설정 true는 인증 성공을 뜻하지 않습니다. BUS_API_AUTH인 경우 원인 구분 코드를 확인하세요.');
console.log('완료: 이 진단은 현재 배포 서버 응답만 확인하며, 개별 열차·버스의 실제 운행을 현장 검증하지는 않습니다.');
