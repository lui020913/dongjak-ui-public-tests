/** Installation entry point. Existing routing / weather / safety state remains owned by v8.0.3. */
import './v804-new-features.css';
import './v820-integration-polish.css';
import {initRouteComparison} from './v804-route-comparison.js';
import {initNavigationExtras} from './v804-navigation-extras.js';
import {initWeatherSafety} from './v804-weather-safety.js';
import {initSafetyReport} from './v804-analysis-report.js';

export function installV804NewFeatures(doc=document,win=window){
  if(doc.getElementById('dj804-weather-safety'))return ()=>{};
  const safety=doc.querySelector('#dj-safety-actions .dj-safety-group-body');
  if(!safety)return ()=>{};
  const wrap=doc.createElement('div');wrap.id='dj804-safety-extensions';wrap.innerHTML=`
    <section class="dj804-tool" id="dj804-weather-safety" data-weather-level="idle" aria-label="날씨 연계 보행정보">
      <div class="dj804-tool-head"><div><strong>날씨 연계 보행정보</strong><small>동작구 현재 기상자료 · Open-Meteo</small></div><span class="dj804-pill">참고정보</span></div>
      <button type="button" class="dj804-main-button" id="dj804-weather-toggle" aria-pressed="false">날씨 보행정보 켜기</button>
      <p id="dj804-weather-status" class="dj804-status" role="status">표시 꺼짐</p>
      <div id="dj804-weather-detail" hidden></div>
      <div class="dj804-inline-actions"><button type="button" id="dj804-weather-refresh" hidden>다시 조회</button><button type="button" id="dj804-weather-sensors" hidden>S-DoT 레이어 전환</button></div>
      <p class="dj804-caveat">기상청 특보나 도로별 안전도 평가가 아닙니다. 현재 통행가능 여부는 현장에서 확인하세요.</p>
    </section>
    <section class="dj804-tool" id="dj804-report-panel" aria-label="보행안전 분석 리포트 자동 생성">
      <div class="dj804-tool-head"><div><strong>보행안전 분석 리포트</strong><small>확보된 공개 데이터 · 지역별 현황</small></div><span class="dj804-pill">인쇄·저장</span></div>
      <label class="dj804-report-label" for="dj804-report-area">분석 범위</label>
      <select id="dj804-report-area"><option value="dongjak">동작구 전체</option><option value="sangdo1">상도1동</option></select>
      <div class="dj804-inline-actions"><button type="button" id="dj804-report-print">인쇄·PDF로 저장</button><button type="button" id="dj804-report-html">HTML 저장</button></div>
      <p id="dj804-report-status" class="dj804-status" role="status" aria-live="polite">보고서를 만들면 사고 선정기록·CCTV·음향신호기·경사 추정자료를 자동 집계합니다.</p>
      <p class="dj804-caveat">사고 건수 합산이나 시설 정상 작동 판정은 하지 않습니다. PDF 저장은 브라우저의 인쇄 기능을 사용합니다.</p>
    </section>`;
  // Preserve the one-screen PC safety workbench: advanced analysis tools are
  // discoverable but collapsed until requested, on both desktop and mobile.
  const container=doc.createElement('details');container.className='dj820-safety-addons';
  const summary=doc.createElement('summary');
  summary.innerHTML='<span class="dj820-addon-symbol" aria-hidden="true">◈</span><span class="dj820-addon-label"><strong>날씨·보행안전 분석</strong><small>날씨 연계 정보 · 데이터 리포트</small></span><span class="dj820-addon-chevron" aria-hidden="true">⌄</span>';
  container.append(summary,wrap);
  safety.append(container);
  const cleaners=[initRouteComparison(doc,win),initNavigationExtras(doc,win),initWeatherSafety(doc,win),initSafetyReport(doc,win)];
  return ()=>{cleaners.forEach(fn=>fn?.());container.remove();};
}
if(typeof document!=='undefined'){
  const start=()=>installV804NewFeatures();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
