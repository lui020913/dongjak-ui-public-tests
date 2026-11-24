/** GPS-triggered safety snapshot, integrated with v8.2.5 navigation without editing its tracking code. */
import {Capacitor} from '@capacitor/core';
import {Geolocation} from '@capacitor/geolocation';
import {analyzeGpsSafety,DATASET_PATHS,direction8,metersLabel,validCoord} from './gps-safety-model.js';
import './gps-safety-popup.css';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelOf=x=>esc(x?.feature?.properties?.name||'횡단 지점');
const locationLine=x=>x?`${direction8(x.bearing)} ${metersLabel(x.distance)}`:'자료 없음';
let cached=null;
let inFlight=0;
let popup=null;
let restoreFocus=null;
let appObserver=null;
let toastTimeout=null;

export async function fetchSafetyDatasets(fetcher=fetch){
  if(cached)return cached;
  const entries=await Promise.all(Object.entries(DATASET_PATHS).map(async ([key,path])=>{
    try{
      const response=await fetcher(path,{cache:'force-cache'});
      if(!response.ok)throw new Error(String(response.status));
      return [key,await response.json()];
    }catch(error){console.warn('[GPS 보행안전] 데이터 조회 실패:',key,error);return [key,null];}
  }));
  const result=Object.fromEntries(entries);
  // Retry on the next tap if any partial data was missing; never treat network failure as safety.
  if(entries.every(([,value])=>value!==null))cached=result;
  return result;
}
const errorLabel=error=>{
  const code=String(error?.code??'');
  if(code==='1'||code==='OS-PLUG-GLOC-0003')return '위치 권한이 거부됐습니다. 브라우저·기기 설정에서 위치 권한을 확인해 주세요.';
  if(code==='3'||code==='OS-PLUG-GLOC-0010')return '위치 확인 시간이 초과됐습니다. 실외에서 다시 시도해 주세요.';
  return '현재 위치를 확인할 수 없습니다. GPS 및 네트워크 상태를 확인해 주세요.';
};
async function readLocation(){
  if(Capacitor.isNativePlatform())return Geolocation.getCurrentPosition({enableHighAccuracy:true,timeout:18000,maximumAge:5000});
  if(!navigator.geolocation)throw {code:2};
  return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:18000,maximumAge:5000}));
}
function ensurePopup(){
  if(popup)return popup;
  popup=document.createElement('section');popup.id='dj-gps-safety-popup';popup.className='dj-gps-popup';popup.hidden=true;
  popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');popup.setAttribute('aria-label','현재 위치 보행안전 분석');
  popup.innerHTML=`<div class="dj-gps-handle" aria-hidden="true"></div>
    <header class="dj-gps-head"><div class="dj-gps-head-title"><span class="dj-gps-emblem" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 22s7-7.1 7-12a7 7 0 1 0-14 0c0 4.9 7 12 7 12Z"/><circle cx="12" cy="10" r="2.4"/></svg></span><div><span class="dj-gps-eyebrow">내 위치 · 보행안전</span><h2 id="dj-gps-title">위치 확인 중</h2></div></div>
    <button class="dj-gps-close" type="button" aria-label="보행안전 정보 닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg></button></header>
    <div class="dj-gps-content" id="dj-gps-content" aria-live="polite"></div>
    <footer class="dj-gps-footer"><button type="button" class="dj-gps-refresh">위치 다시 조회</button><span>위치는 서버에 별도로 전송·저장하지 않습니다.</span></footer>`;
  document.body.append(popup);
  popup.querySelector('.dj-gps-close').addEventListener('click',closePopup);
  popup.querySelector('.dj-gps-refresh').addEventListener('click',()=>void openSnapshot(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden)closePopup();});
  document.querySelectorAll('.nav-tab').forEach(btn=>btn.addEventListener('click',()=>closePopup(false)));
  document.getElementById('stop-gps-tracking')?.addEventListener('click',()=>closePopup(false));
  const app=document.getElementById('app');
  if(app&&typeof MutationObserver!=='undefined'){
    appObserver=new MutationObserver(()=>{
      if(app.dataset.tab!=='map'||app.classList.contains('route-guiding'))closePopup(false);
      if(popup)popup.style.setProperty('--dj-gps-text-delta',app.dataset.djSettingsText==='large'?'3px':app.dataset.djSettingsText==='small'?'-2px':'0px');
    });
    appObserver.observe(app,{attributes:true,attributeFilter:['data-tab','class','data-dj-settings-text']});
  }
  window.addEventListener('resize',alignAboveBottomNav,{passive:true});
  window.visualViewport?.addEventListener('resize',alignAboveBottomNav,{passive:true});
  return popup;
}
function alignAboveBottomNav(){
  if(!popup||popup.hidden||window.innerWidth>=700)return;
  const nav=document.getElementById('bottom-nav');
  if(nav&&getComputedStyle(nav).display!=='none'){
    const bounds=nav.getBoundingClientRect();
    const offset=Math.max(10,Math.min(180,window.innerHeight-bounds.top+12));
    popup.style.setProperty('--dj-gps-bottom-offset',`${Math.round(offset)}px`);
  }else popup.style.setProperty('--dj-gps-bottom-offset','calc(12px + env(safe-area-inset-bottom,0px))');
}
function closePopup(shouldRestoreFocus=true){
  if(!popup||popup.hidden)return;
  inFlight++;
  popup.hidden=true;
  document.body.classList.remove('dj-gps-popup-open');
  if(shouldRestoreFocus&&restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});
  restoreFocus=null;
}
function guidanceNotice(){
  const box=document.getElementById('toast');
  if(!box)return;
  if(toastTimeout)clearTimeout(toastTimeout);
  box.textContent='길안내 중에는 안전정보 창을 숨기고 경로를 우선 표시합니다.';
  box.classList.add('show');
  toastTimeout=setTimeout(()=>box.classList.remove('show'),3600);
}
const row=(name,value)=>`<div class="dj-gps-fact"><span>${esc(name)}</span><strong>${value}</strong></div>`;
const pill=(text,kind='neutral')=>`<span class="dj-gps-pill dj-gps-${kind}">${esc(text)}</span>`;
function renderSnapshot(data){
  const {level,pilot,closest,accidents,zones,cctv,light,slopes,cardinals,accuracy,night,accidentDataAvailable,zoneDataAvailable}=data;
  const states={
    risk:['주의가 필요한 위치입니다','risk','사고다발지역 포함'],
    caution:['횡단 지점까지 이동이 필요합니다','caution','등록 지점 100m 초과'],
    'near-crossing':['가까운 횡단 지점이 있습니다','near','등록 지점 100m 이내'],
    unknown:['현재 위치 안전정보를 확인하세요','unknown','판정 자료 제한']
  };
  const [heading,tone,tag]=states[level];
  const crossed=pilot&&closest?
    `${locationLine(closest)} · ${labelOf(closest)}`:
    '이 위치의 검토된 횡단 지점 데이터가 없습니다';
  const sampleNote=!data.boundaryDataAvailable
    ? '시범 조사영역 경계 자료를 불러오지 못했습니다. 지점·영역 판정을 보류합니다.'
    : pilot
      ? '상도1동 팀 조사 지점 41개 기반 · 현장 미검증 · 지점 누락 가능'
      : '현재 좌표는 상도1동 시범 조사영역 밖입니다. 횡단 지점 미표시는 시설 부재를 뜻하지 않습니다.';
  const warning=level==='risk'
    ? '보행자 사고다발지역 통계 면에 포함됩니다. 진행 방향과 관계없이 지정 횡단시설을 이용하세요.'
    : level==='caution'
      ? '수집된 지점 중 가장 가까운 후보가 직선거리 100m를 초과합니다. 가까운 횡단보도를 현장에서 확인하세요.'
      : level==='near-crossing'
        ? '횡단 지점이 가까워도 이동 경로와 신호 운영을 반드시 확인하세요.'
        : '데이터가 부족하거나 GPS 오차가 큽니다. 현재 위치를 안전·위험으로 확정할 수 없습니다.';
  const clock=new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(data.collectedAt);
  const riskZones=accidents.map(a=>a.properties?.site_name||a.properties?.category_ko||'보행자 사고다발지역');
  const zoneText=!zoneDataAvailable?'보호구역 자료 조회 불가':zones.length?zones.map(z=>esc((z.properties?.facility_name||'시설')+' · '+(z.properties?.facility_type||'보호구역'))).join('<span class="dj-gps-item-sep"> / </span>'):'자료상 지정 보호구역 포함 확인되지 않음';
  const nearby=cardinals.map(({direction,hit})=>
    `<div class="dj-gps-direction"><span>${direction}쪽</span><strong>${hit?locationLine(hit):'500m 내 등록 지점 없음'}</strong></div>`).join('');
  const grade=Number(slopes[0]?.feature?.properties?.slope_max_15m_pct);
  const gradeText=!data.slopeDataAvailable?'경사자료 조회 불가':Number.isFinite(grade)&&grade>=8 ? `근처 약 ${metersLabel(slopes[0].distance)} 지점의 도로경사 최대 약 ${grade.toFixed(1)}% (모델 추정)`
    : slopes.length?'근처 도로 경사자료 있음 · 급경사로 판정하지 않음':'인근 경사자료 없음';
  const cctvText=cctv?`${locationLine(cctv)} · 방범용 CCTV 등록위치 (작동 여부 미확인)`:'반경 150m 내 등록 방범 CCTV 확인 안 됨';
  const lightText=light?`${locationLine(light)} · ${light.feature?.security?'보안등':'가로등'} 등록위치 (조도·점등 미확인)`:'반경 150m 내 등록 조명 위치 확인 안 됨';
  const crossingSummary=closest?`<strong>${metersLabel(closest.distance)}</strong><small>${labelOf(closest)} · ${direction8(closest.bearing)}</small>`:'<strong>확인 불가</strong><small>조사지역 외부 또는 자료 미확보</small>';
  const accidentSummary=!accidentDataAvailable?'자료 조회 실패':accidents.length?'통계상 주의':'포함 확인 안 됨';
  const quickZone=!zoneDataAvailable?'보호구역 자료 미확보':zones.length?'보호구역 경계 포함':'보호구역 포함 확인 안 됨';
  return `<div class="dj-gps-status dj-gps-status-${tone}">
    <div class="dj-gps-status-label">${pill(tag,tone)}${pill(night?'야간':'주간')}${pill(closest?`${metersLabel(closest.distance)} · 직선`:'거리 미확인')}</div>
    <h3>${heading}</h3><p>${esc(warning)}</p></div>
    <div class="dj-gps-meta">조회 ${esc(clock)} · GPS 오차 ${accuracy===null?'미확인':`약 ${Math.round(accuracy)}m`} ${accuracy!==null&&accuracy>100?'<b>· 위치 오차가 커 판정 보류</b>':''}</div>
    <div class="dj-gps-glance" aria-label="보행 안전 핵심 정보">
      <div class="dj-gps-glance-card"><span>가장 가까운 조사 횡단 지점</span>${crossingSummary}</div>
      <div class="dj-gps-glance-card"><span>사고다발지역</span><strong>${esc(accidentSummary)}</strong><small>${esc(quickZone)}</small></div>
    </div>
    ${night?`<section class="dj-gps-section dj-gps-night"><h3><span aria-hidden="true">☾</span> 야간 보행 참고정보</h3>
      <p class="dj-gps-night-lead">기기 시각 18:00–06:00 · 실시간 조도 및 시설 가동 여부는 확인되지 않습니다.</p>
      ${row('가로등·보안등',!data.lightDataAvailable?'조명 자료 조회 불가':esc(lightText))}
      ${row('방범 CCTV',!data.cctvDataAvailable?'CCTV 자료 조회 불가':esc(cctvText))}
      <details class="dj-gps-more"><summary>경사로·유동인구 등 추가 정보</summary>
        ${row('근처 경사로',esc(gradeText))}
        ${row('유동인구','실시간 정보 미연동')}
        ${row('비상벨·AED','검증된 위치 데이터 미연동')}
        <p class="dj-gps-note">등록 조명 위치는 밝기 측정값이 아니며 CCTV 위치는 가동 확인을 뜻하지 않습니다.</p></details>
      </section>`:''}
    <section class="dj-gps-section"><h3>현재 위치 · 구역 특성</h3>
      ${row('횡단 지점',crossed)}
      ${row('보호구역',zoneText)}
      ${row('사고다발지역',!accidentDataAvailable?'사고자료 조회 불가':riskZones.length?riskZones.slice(0,2).map(esc).join(' / '):'등록 통계 면에 포함되지 않음 (안전 인증 아님)')}
      <p class="dj-gps-note">${esc(sampleNote)}</p></section>
    <section class="dj-gps-section"><h3>동서남북 횡단 지점</h3>
      ${pilot?`<div class="dj-gps-direction-grid">${nearby}</div>`:'<p class="dj-gps-note">상도1동 시범 조사영역 밖에서는 방향별 후보를 계산하지 않습니다.</p>'}
      <p class="dj-gps-note">모든 거리는 GPS 좌표에서 계산한 <strong>직선거리</strong>입니다. 실제 보행거리나 가시거리 분석이 아니며, 100m는 법정 위험기준이 아닙니다.</p></section>
    <section class="dj-gps-section"><h3>안전한 횡단을 위해</h3>
      <p class="dj-gps-warning">보행 신호와 차량 접근을 직접 확인하고 지정 횡단시설을 이용하세요. 사고 통계는 과거 선정 권역으로 실시간 사고 발생 정보가 아닙니다.</p></section>
    <p class="dj-gps-source">자료: 상도1동 팀 조사 후보(현장 미검증), 공개 사고다발지역, 일부 보호구역 경계${night?', CCTV 등록 위치와 조명·경사 추정자료':''}. GPS 오차 및 시설 누락 가능성이 있습니다.</p>`;
}
async function openSnapshot(fromButton=true){
  const app=document.getElementById('app');
  if(app?.classList.contains('route-guiding')){guidanceNotice();return;}
  const panel=ensurePopup();if(fromButton)restoreFocus=document.activeElement;
  panel.style.setProperty('--dj-gps-text-delta',app?.dataset.djSettingsText==='large'?'3px':app?.dataset.djSettingsText==='small'?'-2px':'0px');
  panel.hidden=false;document.body.classList.add('dj-gps-popup-open');
  alignAboveBottomNav();
  panel.querySelector('#dj-gps-title').textContent='현재 위치 확인';
  panel.querySelector('#dj-gps-content').innerHTML='<div class="dj-gps-loading" role="status">GPS 위치와 주변 안전정보를 확인하고 있습니다…</div>';
  const seq=++inFlight;
  try{
    const [position,datasets]=await Promise.all([readLocation(),fetchSafetyDatasets()]);
    if(seq!==inFlight)return;
    const coords=[Number(position?.coords?.longitude),Number(position?.coords?.latitude)];
    if(!validCoord(coords))throw new Error('invalid_gps');
    const rawAccuracy=position?.coords?.accuracy;
    const measuredAccuracy=rawAccuracy===null||rawAccuracy===undefined?null:Number(rawAccuracy);
    const data=analyzeGpsSafety(coords,measuredAccuracy,datasets,new Date());
    panel.querySelector('#dj-gps-title').textContent='내 위치 보행안전 안내';
    panel.querySelector('#dj-gps-content').innerHTML=renderSnapshot(data);
  }catch(error){
    if(seq!==inFlight)return;
    panel.querySelector('#dj-gps-title').textContent='위치를 확인하지 못했습니다';
    panel.querySelector('#dj-gps-content').innerHTML=`<p class="dj-gps-failure">${esc(errorLabel(error))}</p>`;
  }
}
// The surrounding-information panel is the sole UI owner. No GPS button listener.
export async function renderNearbySafetySnapshot(coords,accuracy){
  if(!validCoord(coords))throw new Error('invalid_gps');
  const datasets=await fetchSafetyDatasets();
  return renderSnapshot(analyzeGpsSafety(coords,accuracy,datasets,new Date()));
}
