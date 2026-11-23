/**
 * Walking-route presentation owner. Only the existing route/geolocation engine may
 * calculate, select, clear or navigate routes. This module controls presentation.
 * Existing DOM IDs/events are preserved for the router and automation contracts.
 */
import {routeComparisonItems,sameRoute,metersLabel} from './v804-route-comparison.js';
import './route-experience.css';

export function mountWalkingRouteExperience(doc=document,win=window){
  const byId=id=>doc.getElementById(id);
  const app=byId('app'),panel=byId('route-panel'),search=byId('route-place-search');
  const mapCard=byId('route-map-card'),liveCard=byId('nav-live-card');
  const variants=byId('route-variants'),routeCard=panel?.querySelector('.route-card');
  if(!app||!panel||!search||!mapCard||!liveCard||!variants||!routeCard||byId('dj-route-choice-list'))return ()=>{};

  // Keep original routed actions and their existing click handlers authoritative.
  const start=byId('route-start-label'),end=byId('route-end-label');
  for(const [label,target] of [[start,'route-search-start'],[end,'route-search-end']]){
    const trigger=label?.closest('.route-location-text');
    if(!trigger)continue;
    trigger.classList.add('dj-route-place-trigger');
    trigger.setAttribute('role','button');
    trigger.setAttribute('tabindex','0');
    trigger.setAttribute('aria-label',target==='route-search-start'?'출발지 검색':'목적지 검색');
    trigger.addEventListener('click',()=>byId(target)?.click());
    trigger.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();byId(target)?.click();}
    });
  }
  for(const summary of panel.querySelectorAll('.route-location-menu summary')){
    summary.textContent='⋯';
    summary.title='지도 선택·현재 위치';
  }
  const swap=doc.createElement('button');
  swap.id='dj-route-swap';swap.type='button';swap.title='출발지와 목적지 바꾸기';
  swap.setAttribute('aria-label','출발지와 목적지 바꾸기');swap.textContent='⇅';
  const locationRows=routeCard.querySelectorAll('.route-location-row');
  if(locationRows.length===2){
    locationRows[0].after(swap);
    swap.addEventListener('click',()=>win.dispatchEvent(new CustomEvent('dongjak:route-swap')));
  }

  // Advanced existing controls are retained but not imposed on every search.
  const tools=[byId('dj815-waypoints'),byId('dj815-rail-planner'),routeCard.querySelector('.dj815-route-share')].filter(Boolean);
  if(tools.length){
    const advanced=doc.createElement('details');advanced.id='dj-route-advanced';
    const caption=doc.createElement('summary');caption.textContent='경유지·다른 이동 옵션';
    const body=doc.createElement('div');body.className='dj-route-advanced-body';
    tools.forEach(el=>body.append(el));advanced.append(caption,body);
    const submit=byId('route-calc');submit?.before(advanced);
  }
  const disclaimer=panel.querySelector(':scope > .dj836-sheet-body > .page-note');
  if(disclaimer){
    const detail=doc.createElement('details');detail.id='dj-route-data-detail';
    const summary=doc.createElement('summary');summary.textContent='경로 데이터 및 이용 안내';
    detail.append(summary,disclaimer);
    routeCard.after(detail);
  }
  const routeHeading=panel.querySelector('.dj-sheet-chrome-title h2');
  if(routeHeading)routeHeading.textContent='길찾기';
  const submitLabel=byId('route-calc')?.querySelector('span');
  if(submitLabel)submitLabel.textContent='경로 찾기';
  const guide=byId('route-guide-start');if(guide)guide.textContent='안내 시작';
  const edit=byId('route-map-edit');if(edit)edit.textContent='경로 변경';
  const close=byId('route-map-close');if(close)close.textContent='종료';
  const searchQuery=byId('route-search-query');
  if(searchQuery)searchQuery.placeholder='장소·역·정류장·주소 검색';

  const choices=doc.createElement('section');choices.id='dj-route-choice-list';
  choices.setAttribute('aria-label','실제 계산된 경로 비교');
  choices.innerHTML='<div class="dj-route-choice-title"><strong>추천 도보 경로</strong><small>계산된 경로만 표시</small></div><div class="dj-route-choice-rows"></div><p class="dj-route-choice-hint"></p>';
  mapCard.querySelector('.route-map-card-actions')?.before(choices);

  const methodology=doc.createElement('details');methodology.id='dj-route-pri-detail';
  const summary=doc.createElement('summary');summary.textContent='PRI 평가 근거와 적용 범위';
  const content=doc.createElement('div');content.className='dj-route-pri-body';
  const caption=doc.createElement('p');
  caption.textContent='PRI 100점에 가까울수록 위험합니다. 평가되지 않은 도로는 안전한 도로로 간주하지 않습니다. 현장 통행상태는 별도로 확인하세요.';
  content.append(caption);
  const existingPri=byId('dj-pri-route-advice');
  if(existingPri)content.append(existingPri);
  methodology.append(summary,content);
  mapCard.append(methodology);

  // Navigation instruction is moved, not cloned: the existing GPS/turn updates
  // continue writing to exactly one #nav-instruction node.
  const topBanner=doc.createElement('section');topBanner.id='dj-route-turn-banner';
  topBanner.setAttribute('aria-label','다음 도보 안내');
  const kicker=doc.createElement('span');kicker.textContent='도보 길안내';
  kicker.className='dj-route-turn-kicker';
  topBanner.append(kicker);
  const instruction=byId('nav-instruction');
  if(instruction)topBanner.append(instruction);
  app.append(topBanner);

  let latest=null,assessment=null;
  const formatMinutes=x=>Number.isFinite(x)?Math.ceil(x)+'분':'시간 미확인';
  const assessmentFor=id=>assessment?.[id]||latest?.[id]?.priExposure||null;
  function readablePri(entry){
    if(!entry||!Number.isFinite(entry.risk)||entry.coverage<0.65)return {label:'PRI 미평가',tone:'unknown'};
    const risk=entry.risk;
    return {label:'PRI 위험 '+risk.toFixed(1)+'점',tone:risk>=67?'high':risk>=34?'medium':'low'};
  }
  function selectedKind(){
    return variants.querySelector('[data-route-variant][aria-pressed="true"]')?.dataset.routeVariant||'standard';
  }
  function refresh(){
    const rows=choices.querySelector('.dj-route-choice-rows');
    const hint=choices.querySelector('.dj-route-choice-hint');
    rows.replaceChildren();
    if(!latest){choices.hidden=true;return;}
    const items=routeComparisonItems(latest);
    if(!items.length){choices.hidden=true;return;}
    choices.hidden=false;
    const same=items.length===2&&sameRoute(latest.standard,latest.gentle);
    const visible=same?[items[0]]:items;
    const quickest=Math.min(...items.map(x=>x.minutes));
    for(const item of visible){
      const native=variants.querySelector('[data-route-variant="'+item.id+'"]');
      const chosen=selectedKind()===item.id;
      const button=doc.createElement('button');
      button.type='button';button.className='dj-route-choice';
      button.dataset.routeChoice=item.id;
      button.setAttribute('aria-pressed',String(chosen));
      button.setAttribute('aria-label',item.label+' 경로 선택');
      if(chosen)button.classList.add('is-current');
      const top=doc.createElement('span');top.className='dj-route-choice-top';
      const title=doc.createElement('strong');
      title.textContent=item.id==='gentle'?'완만한길':(same?'도보 경로':'빠른길');
      const marker=doc.createElement('small');
      marker.textContent=assessment?.recommendation===item.id?'PRI 상대 저위험':item.minutes===quickest?'빠른 도보':'경사 고려';
      top.append(title,marker);
      const metrics=doc.createElement('span');metrics.className='dj-route-choice-metrics';
      const time=doc.createElement('b');time.textContent=formatMinutes(item.minutes);
      const distance=doc.createElement('span');distance.textContent=metersLabel(item.meters);
      metrics.append(time,distance);
      const pri=readablePri(assessmentFor(item.id));
      const meta=doc.createElement('span');meta.className='dj-route-choice-pri';
      meta.dataset.tone=pri.tone;meta.textContent=pri.label;
      const coverage=assessmentFor(item.id)?.coverage;
      const support=doc.createElement('small');support.className='dj-route-choice-coverage';
      support.textContent=Number.isFinite(coverage)?'관측 '+Math.round(coverage*100)+'%':'PRI 관측자료 없음';
      button.append(top,metrics,meta,support);
      button.addEventListener('click',()=>{
        if(!native||native.disabled)return;
        native.click();
        refresh();
      });
      rows.append(button);
    }
    hint.textContent=same?'두 조건에서 같은 보행경로가 계산됐습니다.':
      assessment?.recommendation?'PRI 관측 구간의 상대 저위험 후보를 표시합니다. 실제 안전을 보장하지 않습니다.':
      'PRI 근거가 충분하지 않으면 안전 우선 경로를 단정하지 않습니다.';
  }
  const onReady=event=>{latest=event.detail;assessment=null;refresh();};
  const onPri=event=>{assessment=event.detail;refresh();};
  const onReset=()=>{latest=null;assessment=null;refresh();};
  win.addEventListener('dongjak:route-variants-ready',onReady);
  win.addEventListener('dongjak:route-pri-ready',onPri);
  byId('route-clear')?.addEventListener('click',onReset);
  byId('route-calc')?.addEventListener('click',onReset);
  const activeObserver=new MutationObserver(refresh);
  for(const choice of variants.querySelectorAll('[data-route-variant]')){
    activeObserver.observe(choice,{attributes:true,attributeFilter:['aria-pressed','disabled']});
  }
  const setStage=()=>{
    const stage=app.classList.contains('route-guiding')?'guiding':
      !search.hidden&&!panel.hidden?'search':
      !mapCard.hidden?'preview':
      app.dataset.tab==='route'?'input':'none';
    app.dataset.djRouteStage=stage;
  };
  const stateObserver=new MutationObserver(setStage);
  stateObserver.observe(app,{attributes:true,attributeFilter:['class','data-tab']});
  for(const el of [panel,search,mapCard,liveCard])stateObserver.observe(el,{attributes:true,attributeFilter:['hidden']});
  setStage();refresh();
  return ()=>{
    stateObserver.disconnect();activeObserver.disconnect();
    win.removeEventListener('dongjak:route-variants-ready',onReady);
    win.removeEventListener('dongjak:route-pri-ready',onPri);
    byId('route-clear')?.removeEventListener('click',onReset);
    byId('route-calc')?.removeEventListener('click',onReset);
    choices.remove();methodology.remove();topBanner.remove();swap.remove();
    delete app.dataset.djRouteStage;
  };
}
if(typeof document!=='undefined'){
  const boot=()=>mountWalkingRouteExperience();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}