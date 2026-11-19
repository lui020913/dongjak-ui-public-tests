import {insideBoundary} from './dongjak-verified-data-layers.js';
/** Descriptive counts only. Never convert accident selection records to accident totals. */
export function reportPointCount(features,boundary=null){
  if(!Array.isArray(features))return null;
  return features.filter(f=>f?.geometry?.type==='Point' && Array.isArray(f.geometry.coordinates) &&
    f.geometry.coordinates.length===2 && f.geometry.coordinates.every(Number.isFinite) &&
    (!boundary || insideBoundary(f.geometry.coordinates,boundary))).length;
}
export function reportLineCount(features,boundary=null){
  if(!Array.isArray(features))return null;
  const center=coords=>coords[Math.floor(coords.length/2)];
  return features.filter(f=>{
    const geo=f?.geometry;if(!geo||!['LineString','MultiLineString'].includes(geo.type))return false;
    const coords=geo.type==='LineString'?geo.coordinates:geo.coordinates?.[0];
    const mid=Array.isArray(coords)&&coords.length?center(coords):null;
    return Array.isArray(mid) && mid.length===2&&mid.every(Number.isFinite)&&(!boundary||insideBoundary(mid,boundary));
  }).length;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function reportDocument({area,generatedAt,metrics,metadata={}}){
  const region=area==='sangdo1'?'상도1동':'동작구 전체';
  const rows=metrics.map(x=>`<tr><th scope="row">${escapeHtml(x.label)}</th><td>${x.value===null?'미확인':escapeHtml(x.value.toLocaleString('ko-KR'))}</td><td>${escapeHtml(x.note)}</td></tr>`).join('');
  const date=escapeHtml(generatedAt);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${region} 보행안전 자료 현황</title>
  <style>body{font-family:system-ui,-apple-system,'Malgun Gothic',sans-serif;max-width:850px;margin:25px auto;padding:0 20px;color:#152c36;line-height:1.6}h1{font-size:25px}h2{font-size:18px;margin-top:29px}small,.muted{color:#60727b}.caps{letter-spacing:.12em;font-size:12px;font-weight:700;color:#138276}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;border-bottom:1px solid #dce5e8;padding:12px 8px;vertical-align:top}th{width:29%}td:nth-child(2){white-space:nowrap;font-weight:750}section{break-inside:avoid}aside{background:#f1f7f6;padding:16px;border-radius:12px}button{background:#126e69;color:white;border:0;border-radius:8px;padding:10px 14px;cursor:pointer}@media print{button{display:none}body{margin:0;max-width:none}aside{background:#f4f4f4!important;print-color-adjust:exact}h1{font-size:23px}a{color:#152c36}}</style></head><body>
  <div class="caps">DONGJAK · PEDESTRIAN SAFETY DATA</div><h1>${region} 보행안전 자료 현황 보고서</h1><p class="muted">생성: ${date} · 지도 앱 내 데이터 자동 집계 · 안전도 등급이 아닌 현황 보고서</p><button onclick="window.print()">인쇄 / PDF로 저장</button>
  <section><h2>1. 공개 데이터 현황</h2><table><thead><tr><th>항목</th><th>집계</th><th>해석·제약</th></tr></thead><tbody>${rows}</tbody></table></section>
  <section><h2>2. 해석 범위</h2><aside><strong>안전한 경로를 인증하는 보고서가 아닙니다.</strong><p>사고다발지역은 연도별 선정기록입니다. 동일 장소의 선정·집계기간 중복 가능성이 있으므로 사고 발생 건수로 합산하지 않았습니다. CCTV 설치 위치는 실시간 작동·관제 여부가 확인되지 않습니다. 음향신호기는 등록 위치일 뿐 정상 작동을 보증하지 않습니다.</p><p>경사도는 지형 모델 기반 추정으로 실제 보도 경사·계단·휠체어 접근 가능 여부를 증명하지 않습니다. 도로 통제, 야간 시야, 현장 공사 여부는 이 정적 집계만으로 판단할 수 없습니다. 정확한 지점별 검토에는 현장 실사가 필요합니다.</p></aside></section>
  <section><h2>3. 자료와 기준</h2><p>사고다발지역: 공공데이터포털 보행자 사고다발지역 원본(앱 내 중복 기록 포함) · 방범 CCTV: 동작구 등록 CCTV 공개자료 · 음향신호기: 서울시 A073_P 공간정보 · 보행 링크/경사: 서울시 도보 네트워크와 지형 추정자료 · S-DoT: 서울시 과거 관측 스냅샷</p><p>${area==='sangdo1'?'분석 경계: 앱에 포함된 admdongkor 상도1동 참고 폴리곤(2026-10-01). 선형 보행링크는 대표 중간점을 기준으로 집계한 추정치입니다.':'동작구 전체: 기존 동작구 대상 정적 파일을 사용합니다. 구 밖 후보가 포함된 음향신호기는 개수로 집계하지 않습니다.'}</p><p>S-DoT 이력: ${escapeHtml(metadata.sdotPeriod||'자료기간 확인 필요')} · API를 호출하지 못한 항목은 0건이 아니라 미확인으로 표시합니다.</p></section>
  <section><h2>4. 향후 분석 권고</h2><p>선정기록 근접 권역에서 횡단시설·안전시설과 실제 보행동선을 중첩하고, 접근성·야간조명·현장 통제자료의 정확도를 검토한 다음 개선 우선순위를 판단해야 합니다.</p></section>
  <footer class="muted"><small>본 문서는 앱의 현재 데이터 파일에서 자동 생성되었습니다. 법정 평가·공식 안전진단 결과가 아닙니다.</small></footer></body></html>`;
}
const getJSON=async(url)=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);
  try{const response=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error(String(response.status));return await response.json();}
  catch{return null;}finally{clearTimeout(timer);}
};
export async function buildSafetyReport(area){
  const sangdo=area==='sangdo1';
  const paths={boundary:'/data/protection-zone/boundary_reference.geojson',
    accidents:'/data/safety/accidents/dongjak_accident_points_all.geojson',
    cctv:'/data/safety/cctv/dongjak_cctv_security.geojson',
    audio:'/data/safety/accessibility/dongjak_audio_signals_candidates.geojson',
    slope:'/data/safety/slope/dongjak_walk_links_slope_visual.geojson',
    sdot:'/data/safety/sdot/dongjak_sdot_archive_20261026_1101.json',
    aed:'/api/aed',road:'/api/road-incidents'};
  const keys=Object.keys(paths);
  const values=await Promise.all(keys.map(k=>getJSON(paths[k])));
  const data=Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
  const boundary=sangdo?data.boundary?.features?.find(f=>f.properties?.emdnm==='상도1동')?.geometry:null;
  if(sangdo&&!boundary)throw Error('상도1동 참고 경계가 없어 보고서를 생성할 수 없습니다.');
  const metrics=[
    {label:'사고다발지역 선정기록',value:reportPointCount(data.accidents?.features,boundary),note:'연도별 선정 대표점 수 · 사고 발생 총건수 아님'},
    {label:'방범·보호 목적 CCTV 등록지점',value:reportPointCount(data.cctv?.features,boundary),note:'등록된 설치지점 수 · 운영 여부 미검증'},
    {label:'음향신호기 위치',value:sangdo?reportPointCount(data.audio?.features,boundary):null,note:sangdo?'설치기록 기준 · 작동 여부 미확인':'주변 후보 파일에 구 밖 지점 포함 → 전체 개수 미집계'},
    {label:'도보 링크 경사도 추정 구간',value:reportLineCount(data.slope?.features,boundary),note:sangdo?'선형 중간점 기준 참고 수치 · 실제 보도 검증 아님':'모델로 산출한 선형 수 · 경사 품질 혼합'},
    {label:'AED 좌표 확인 시설',value:data.aed?.meta?.status==='ok'&&data.aed?.meta?.source_complete===true
      ?reportPointCount(data.aed.features,boundary):null,note:'조회 성공·전체 조회 완료 시만 집계 · 실제 이용 가능 여부 미검증'},
    {label:'TOPIS 도로 돌발정보',value:data.road?.type==='FeatureCollection'&&!data.road?.meta?.result_limited
      ?reportPointCount(data.road.features,boundary):null,note:'조회시점 도로교통 돌발정보 · 보행로 통제로 간주 불가'},
    {label:'과거 S-DoT 센서(동작구)',value:!sangdo&&data.sdot?.status==='historical'?Number(data.sdot.sensor_count):null,
      note:'2026.10.26~11.01 주간 관측 이력 · 현재 센서 상태 아님'},
  ];
  return {html:reportDocument({area,generatedAt:new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}),metrics,
    metadata:{sdotPeriod:data.sdot?.period?`${data.sdot.period.start} ~ ${data.sdot.period.end}`:''}}),metrics};
}
export function initSafetyReport(doc=document,win=window){
  const panel=doc.getElementById('dj804-report-panel');if(!panel)return ()=>{};
  const selection=panel.querySelector('#dj804-report-area');const status=panel.querySelector('#dj804-report-status');
  const print=panel.querySelector('#dj804-report-print');const download=panel.querySelector('#dj804-report-html');
  let busy=false;
  const filename=()=>`Dongjak_Walk_Safety_${selection.value}_${new Date().toISOString().slice(0,10)}.html`;
  function downloadReport(html){
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
    const link=doc.createElement('a');link.href=url;link.download=filename();doc.body.append(link);link.click();link.remove();win.setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  async function run(mode){
    if(busy)return;
    // Popup MUST be opened in the user's direct click gesture; never after fetch.
    const popup=mode==='print'?win.open('','_blank'):null;
    if(popup){popup.document.write('<!doctype html><html lang="ko"><meta charset="utf-8"><title>자료 정리 중</title><body>보고서 데이터를 집계하고 있습니다…</body></html>');popup.document.close();}
    busy=true;print.disabled=true;download.disabled=true;status.textContent='지역별 데이터를 읽고 집계하고 있습니다…';
    try{
      const {html,metrics}=await buildSafetyReport(selection.value);
      const errors=metrics.filter(m=>m.value===null).length;
      if(mode==='print'&&popup&&!popup.closed){popup.document.open();popup.document.write(html);popup.document.close();popup.focus();}
      else{downloadReport(html);if(mode==='print')status.textContent='새 창을 열 수 없어 HTML 파일로 저장했습니다. 브라우저에서 열어 PDF로 인쇄할 수 있습니다.';}
      if(mode!=='print'||(popup&&!popup.closed))status.textContent=`보고서 생성 완료 · ${metrics.length}개 항목 · 미확인 ${errors}개. 인쇄 화면에서 PDF로 저장하세요.`;
    }catch(error){if(popup&&!popup.closed)popup.close();status.textContent=`보고서 생성 실패: ${String(error?.message||error)}`;}
    finally{busy=false;print.disabled=false;download.disabled=false;}
  }
  const onPrint=()=>void run('print');const onDownload=()=>void run('download');
  print.addEventListener('click',onPrint);download.addEventListener('click',onDownload);
  return ()=>{print.removeEventListener('click',onPrint);download.removeEventListener('click',onDownload);};
}
