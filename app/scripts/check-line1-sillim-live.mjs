/** Verify deployed metro source status without displaying any credential. */
const root=(process.argv[2]||'https://dongjak-walk-safety-preview.pages.dev').replace(/\/+$/,'');
const cases=[
  ['노량진 1호선','노량진','1호선',false],
  ['대방 1호선','대방','1호선',false],
  ['대방 신림선','대방','신림선',false],
  ['대방 신림선 일괄','대방','신림선',true],
  ['보라매 신림선 일괄','보라매','신림선',true]
];
console.log('[동작구 1호선·신림선 실제 배포 응답 점검]');
for(const [label,station,line,bulk] of cases){
  const query=new URLSearchParams({station,line});if(bulk)query.set('mode','bulk');
  const url=`${root}/api/transport/subway?${query}`;
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),13000);
    let res;try{res=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});}finally{clearTimeout(timer);}
    const data=await res.json().catch(()=>({}));
    const rows=Array.isArray(data.items)?data.items:[];
    const labels=[...new Set(rows.map(x=>String(x.line||'')))].filter(Boolean);
    const dg=data.sourceDiagnostics||{};
    const detail=dg.rawCount!=null?` / 원본 ${dg.rawCount}건 · 유효ETA ${dg.validEtaCount||0}건 · 만료ETA ${dg.expiredEtaCount||0}건 · ETA없음 ${dg.missingEtaCount||0}건 · 최근상태 ${dg.recentStatusCount||0}건`:'';
    console.log(`${label}: HTTP ${res.status} / 원천 ${data.sourceStatus||'미제공'} / ${rows.length}건 / 노선 ${labels.join(',')||'-'}${detail} / ${data.emptyMessage||data.error||''}`);
  }catch(error){console.log(`${label}: 조회 실패 (${error.name==='AbortError'?'시간 초과':'네트워크 오류'})`);}
}
console.log('실시간 정보가 0건이어도 미운행으로 단정하지 마세요. 원본 생성시각 검증과 제공기관 상태를 확인해야 합니다.');
