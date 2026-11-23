/**
 * Map-first, four-stage walking journey. One route editor, one result chooser,
 * one GPS readout. Native map, search, route choice, PRI and GPS are authoritative.
 *
 * INPUT -> PLACE SEARCH -> ROUTE CHOICE (with observed PRI colors) -> GUIDING
 * No standalone "route details" page. A locked guide admits only End Guidance.
 */
import {routeComparisonItems,sameRoute,metersLabel} from './v804-route-comparison.js';
import './route-experience.css';

export function mountWalkingRouteExperience(doc=document,win=window){
  const byId=id=>doc.getElementById(id);
  const app=byId('app'),panel=byId('route-panel'),search=byId('route-place-search'),
    card=panel?.querySelector('.route-card'),mapCard=byId('route-map-card'),
    navCard=byId('nav-live-card'),variants=byId('route-variants');
  if(!app||!panel||!search||!card||!mapCard||!navCard||!variants||byId('dj-route-choice-list'))return ()=>{};
  const remove=[];
  const on=(el,type,fn,opts)=>{if(!el)return;el.addEventListener(type,fn,opts);remove.push(()=>el.removeEventListener(type,fn,opts));};
  const add=(tag,id,cls)=>{const n=doc.createElement(tag);if(id)n.id=id;if(cls)n.className=cls;return n;};

  // Input: actionable full-height place fields are at the top, not a floating
  // centered card with unused space. Existing native handlers remain intact.
  const heading=panel.querySelector('.dj-sheet-chrome-title h2');
  if(heading)heading.textContent='길찾기';
  const rows=[...card.querySelectorAll('.route-location-row')];
  const frame=add('section','dj-walk-fields');
  frame.setAttribute('aria-label','출발지와 목적지 입력');
  rows[0]?.before(frame);
  for(const [i,row] of rows.entries()){
    frame.append(row);
    const field=row.querySelector('.route-location-text');
    const target=i===0?'route-search-start':'route-search-end';
    if(field){
      field.classList.add('dj-walk-field');
      field.setAttribute('role','button');
      field.setAttribute('tabindex','0');
      field.setAttribute('aria-label',i===0?'출발지 검색':'목적지 검색');
      on(field,'click',()=>byId(target)?.click());
      on(field,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();byId(target)?.click();}});
    }
    const menu=row.querySelector('.route-location-menu summary');
    if(menu){menu.textContent='⋯';menu.title='위치 선택 방법';}
  }
  const divider=card.querySelector('.route-location-divider');if(divider)divider.hidden=true;
  const swap=add('button','dj-route-swap');swap.type='button';
  swap.textContent='⇅';swap.title='출발지와 목적지 교환';
  swap.setAttribute('aria-label','출발지와 목적지 교환');
  frame.append(swap);
  on(swap,'click',()=>win.dispatchEvent(new CustomEvent('dongjak:route-swap')));
  const shortcuts=add('div','dj-walk-shortcuts');
  const current=add('button','dj-walk-start-gps');
  current.type='button';current.textContent='◎ 현재 위치에서 출발';
  const pick=add('button','dj-walk-pick-end');
  pick.type='button';pick.textContent='⌖ 지도에서 목적지 선택';
  shortcuts.append(current,pick);
  frame.after(shortcuts);
  on(current,'click',()=>byId('route-gps-start')?.click());
  on(pick,'click',()=>byId('route-pick-end')?.click());

  // Secondary native controls are preserved in one disclosure.
  const optional=[byId('dj815-waypoints'),byId('dj815-rail-planner'),card.querySelector('.dj815-route-share')].filter(Boolean);
  if(optional.length){
    const details=add('details','dj-route-advanced');
    const summary=add('summary');summary.textContent='경유지·다른 이동 옵션';
    const body=add('div',null,'dj-route-advanced-body');
    optional.forEach(node=>body.append(node));
    details.append(summary,body);
    shortcuts.after(details);
  }
  const intro=panel.querySelector('.dj-page-intro');if(intro)intro.hidden=true;
  const note=panel.querySelector(':scope > .dj836-sheet-body > .page-note');
  if(note){
    const d=add('details','dj-route-data-detail');
    const sum=add('summary');sum.textContent='경로 데이터와 이용 안내';
    d.append(sum,note);card.after(d);
  }
  const submitLabel=byId('route-calc')?.querySelector('span:first-child');
  if(submitLabel)submitLabel.textContent='경로 찾기';
  for(const [id,text] of [['route-guide-start','안내 시작'],['route-map-edit','경로 변경'],['route-map-close','종료']]){
    if(byId(id))byId(id).textContent=text;
  }
  const query=byId('route-search-query');
  if(query)query.placeholder='역·정류장·건물·주소 검색';
  const back=byId('route-search-close');
  if(back)back.textContent='←';

  // Preview is a single small bottom sheet; no duplicate main heading nor
  // separate third route-detail screen. Compare only 1–2 real route geometries.
  const top=add('div','dj-walk-map-head');
  const backBtn=add('button','dj-walk-back');backBtn.type='button';
  backBtn.textContent='←';backBtn.setAttribute('aria-label','길찾기 수정');
  const head=add('div',null,'dj-walk-map-title');
  head.innerHTML='<small>도보 길찾기</small><strong>경로 비교</strong>';
  const stopPreview=add('button','dj-walk-close');stopPreview.type='button';
  stopPreview.textContent='×';stopPreview.setAttribute('aria-label','길찾기 종료');
  top.append(backBtn,head,stopPreview);app.append(top);
  on(backBtn,'click',()=>byId('route-map-edit')?.click());
  on(stopPreview,'click',()=>byId('route-map-close')?.click());

  const choices=add('section','dj-route-choice-list');
  choices.setAttribute('aria-label','계산된 도보 경로 비교');
  const choiceHead=add('div',null,'dj-route-choice-title');
  const choiceTitle=add('strong');choiceTitle.textContent='추천 도보 경로';
  const choiceSub=add('small');choiceSub.textContent='경로를 눌러 지도 비교';
  choiceHead.append(choiceTitle,choiceSub);
  const choiceRows=add('div',null,'dj-route-choice-rows');
  const hint=add('p',null,'dj-route-choice-hint');
  const legend=add('div','dj-route-pri-legend');
  legend.innerHTML='<div class="dj-route-pri-ramp" aria-hidden="true"></div><span>낮은 위험</span><span>높은 위험</span><span class="dj-route-unknown-legend">┄ 회색 점선: 미평가</span>';
  choices.append(choiceHead,choiceRows,hint,legend);
  const actions=mapCard.querySelector('.route-map-card-actions');
  actions?.before(choices);
  const summaryTop=mapCard.querySelector(':scope > div:first-child');
  if(summaryTop)summaryTop.classList.add('dj-walk-native-summary');

  // Move the existing live instruction into the top turn HUD, never clone it.
  const topBanner=add('section','dj-route-turn-banner');
  topBanner.setAttribute('aria-label','도보 길안내 방향');
  const kicker=add('span',null,'dj-route-turn-kicker');
  kicker.textContent='도보 길안내';
  topBanner.append(kicker);
  const instruction=byId('nav-instruction');
  if(instruction)topBanner.append(instruction);
  app.append(topBanner);

  // Only a genuine GPS arrival event opens this completion summary.
  // Never display an invented travel duration, walked distance or PRI score.
  const arrival=add('section','dj-walk-arrival');
  arrival.hidden=true;arrival.setAttribute('role','dialog');
  arrival.setAttribute('aria-label','도보 안내 완료');
  const arrivedMark=add('span',null,'dj-walk-arrived-mark');
  arrivedMark.textContent='✓';
  const arrivedTitle=add('h2');arrivedTitle.textContent='목적지 근처에 도착했습니다';
  const arrivedText=add('p');arrivedText.textContent='실제 도착 위치와 보행 환경을 확인하세요. 길안내가 종료되었습니다.';
  const arrivedConfirm=add('button','dj-walk-arrival-confirm');
  arrivedConfirm.type='button';arrivedConfirm.textContent='확인';
  arrival.append(arrivedMark,arrivedTitle,arrivedText,arrivedConfirm);
  app.append(arrival);
  const closeArrival=()=>{
    arrival.hidden=true;delete app.dataset.djWalkArrived;
  };
  on(arrivedConfirm,'click',()=>{closeArrival();byId('route-map-close')?.click();});
  on(byId('route-map-edit'),'click',closeArrival);
  on(byId('route-map-close'),'click',closeArrival);
  on(win,'dongjak:route-arrived',()=>{
    arrival.hidden=false;app.dataset.djWalkArrived='1';
    arrivedConfirm.focus({preventScroll:true});
  });

  // Full-viewport transparent shield. Its only interactive exception is the
  // original #nav-stop. Suppress touch, mouse, keyboard and map gestures before
  // other feature handlers receive them. GPS/voice update events are untouched.
  const shield=add('div','dj-walk-guidance-lock');
  shield.setAttribute('aria-hidden','true');app.append(shield);
  const stop=byId('nav-stop');
  if(stop)stop.textContent='안내 종료';
  const intercept=e=>{
    if(!app.classList.contains('route-guiding'))return;
    if(e.target?.closest?.('#nav-stop'))return;
    if(e.type==='keydown'&&e.key==='Tab'){
      e.preventDefault();stop?.focus({preventScroll:true});return;
    }
    // Block both genuine input and scripted UI dispatch. GPS and map
    // rendering updates are not DOM interaction events and keep running.
    e.preventDefault?.();
    e.stopImmediatePropagation?.();
    e.stopPropagation?.();
  };
  for(const type of ['click','dblclick','pointerdown','pointerup','touchstart','touchmove','mousedown','wheel','contextmenu','keydown']){
    on(doc,type,intercept,{capture:true,passive:false});
  }
  const trap=e=>{
    if(app.classList.contains('route-guiding')&&e.target!==stop)stop?.focus({preventScroll:true});
  };
  on(doc,'focusin',trap,true);

  let latest=null,assessment=null;
  const riskLabel=entry=>{
    if(!entry||!Number.isFinite(entry.risk)||!Number.isFinite(entry.coverage)||entry.coverage<.65)
      return {text:'PRI 미평가',tone:'unknown'};
    const risk=entry.risk;
    return {text:'PRI '+risk.toFixed(1)+'점',tone:risk>=70?'high':risk>=40?'medium':'low'};
  };
  const selected=()=>variants.querySelector('[data-route-variant][aria-pressed="true"]')?.dataset.routeVariant||'standard';
  function refreshChoices(){
    choiceRows.replaceChildren();
    const items=routeComparisonItems(latest);
    if(!items.length){choices.hidden=true;return;}
    choices.hidden=false;
    const equal=items.length===2&&sameRoute(latest.standard,latest.gentle);
    const available=equal?[items[0]]:items;
    const quick=Math.min(...items.map(x=>x.minutes));
    const rec=assessment?.recommendation;
    // Never call the fastest route "safe" based on unobserved data.
    choiceSub.textContent=rec?'관측 PRI 상대 저위험 후보 비교':'거리·시간 및 관측 가능한 위험도';
    for(const item of available){
      const native=variants.querySelector('[data-route-variant="'+item.id+'"]');
      const button=add('button',null,'dj-route-choice');
      button.type='button';button.dataset.routeChoice=item.id;
      const chosen=selected()===item.id;
      button.setAttribute('aria-pressed',String(chosen));
      if(chosen)button.classList.add('is-current');
      const label=add('strong');label.textContent=item.id==='gentle'?'완만한길':'빠른길';
      const subtitle=add('span',null,'dj-route-choice-subtitle');
      subtitle.textContent=rec===item.id?'PRI 상대 저위험':item.minutes===quick?'소요시간 우선':'경사 고려';
      const routeName=add('span',null,'dj-route-choice-head');
      routeName.append(label,subtitle);
      const metric=add('span',null,'dj-route-choice-metrics');
      const minutes=add('b');minutes.textContent=Number.isFinite(item.minutes)?item.minutes+'분':'시간 미확인';
      const distance=add('span');distance.textContent=metersLabel(item.meters);
      metric.append(minutes,distance);
      const entry=assessment?.[item.id]||latest?.[item.id]?.priExposure;
      const risk=riskLabel(entry);
      const badge=add('span',null,'dj-route-choice-pri');badge.dataset.tone=risk.tone;badge.textContent=risk.text;
      const support=add('small',null,'dj-route-choice-coverage');
      support.textContent=Number.isFinite(entry?.coverage)
        ?'평가 구간 '+Math.round(entry.coverage*100)+'%':'PRI 자료 확인 중';
      button.append(routeName,metric,badge,support);
      on(button,'click',()=>{if(native&&!native.disabled&&!app.classList.contains('route-guiding'))native.click();});
      choiceRows.append(button);
    }
    hint.textContent=equal?'두 옵션에서 같은 경로가 계산됐습니다.':
      rec?'색상은 평가된 도로 구간의 PRI 위험도입니다. 실제 안전을 보장하지 않습니다.':
      '회색 점선은 미평가 구간입니다. 자료 부족 시 안전 우선 경로를 단정하지 않습니다.';
  }
  const onReady=e=>{latest=e.detail;assessment=null;refreshChoices();};
  const onPri=e=>{assessment=e.detail;refreshChoices();};
  const reset=()=>{latest=null;assessment=null;refreshChoices();};
  on(win,'dongjak:route-variants-ready',onReady);
  on(win,'dongjak:route-pri-ready',onPri);
  on(byId('route-clear'),'click',reset);
  on(byId('route-calc'),'click',reset);
  const nativeObserver=new MutationObserver(refreshChoices);
  for(const native of variants.querySelectorAll('[data-route-variant]'))
    nativeObserver.observe(native,{attributes:true,attributeFilter:['aria-pressed','disabled']});
  let oldStage='';
  const setStage=()=>{
    const stage=app.classList.contains('route-guiding')?'guiding':
      !search.hidden&&!panel.hidden?'search':
      !mapCard.hidden?'preview':
      app.dataset.tab==='route'?'input':'none';
    if(stage===oldStage)return;
    oldStage=stage;app.dataset.djRouteStage=stage;
    shield.hidden=stage!=='guiding';
    if(stage==='guiding')stop?.focus({preventScroll:true});
  };
  const stateObserver=new MutationObserver(setStage);
  stateObserver.observe(app,{attributes:true,attributeFilter:['class','data-tab']});
  for(const node of [panel,search,mapCard,navCard])stateObserver.observe(node,{attributes:true,attributeFilter:['hidden']});
  // Light updates in guidance are performed by native GPS, not this presenter.
  setStage();refreshChoices();
  return ()=>{
    stateObserver.disconnect();nativeObserver.disconnect();
    remove.forEach(fn=>fn());
    delete app.dataset.djRouteStage;
    top.remove();choices.remove();topBanner.remove();shield.remove();arrival.remove();swap.remove();shortcuts.remove();
    delete app.dataset.djWalkArrived;
    delete app.dataset.djWalkV2;
  };
}
if(typeof document!=='undefined'){
  const boot=()=>mountWalkingRouteExperience();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
