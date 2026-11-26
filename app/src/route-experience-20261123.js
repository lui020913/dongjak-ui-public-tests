import {revealSurface,exitSurface,cancelSurfaceMotion} from './surface-motion-fallback.js';
/**
 * Map-first, four-stage walking journey. One route editor, one result chooser,
 * one GPS readout. Native map, search, route choice, PRI and GPS are authoritative.
 *
 * INPUT -> PLACE SEARCH -> ROUTE CHOICE (with observed PRI colors) -> GUIDING
 * No standalone "route details" page. A locked guide admits only End Guidance.
 */
import {routeComparisonItems,sameRoute,metersLabel} from './v804-route-comparison.js';
import './route-experience.css';
import {mountTransitDetail} from './transit-route-detail.js';
import {recentPlaces} from './v815-place-store.js';
import {TEAM_FACTORS} from './pri-data.mjs';

export function mountWalkingRouteExperience(doc=document,win=window){
  const byId=id=>doc.getElementById(id);
  const app=byId('app'),panel=byId('route-panel'),search=byId('route-place-search'),
    card=panel?.querySelector('.route-card'),mapCard=byId('route-map-card'),
    navCard=byId('nav-live-card'),variants=byId('route-variants');
  if(!app||!panel||!search||!card||!mapCard||!navCard||!variants||byId('dj-route-choice-list'))return ()=>{};
  const remove=[];
  const on=(el,type,fn,opts)=>{if(!el)return;el.addEventListener(type,fn,opts);remove.push(()=>el.removeEventListener(type,fn,opts));};
  const add=(tag,id,cls)=>{const n=doc.createElement(tag);if(id)n.id=id;if(cls)n.className=cls;return n;};

  // The approved input screen is a map with a compact TOP card, not a modal
  // white page or a bottom entry sheet. Reuse the native close and GPS actions.
  const chrome=panel.querySelector(':scope > .dj-sheet-chrome');
  const nativeClose=chrome?.querySelector('.page-dismiss');
  const inputBack=add('button','dj-walk-input-back');
  inputBack.type='button';
  inputBack.setAttribute('aria-label','길찾기 뒤로 가기');
  inputBack.textContent='←';
  chrome?.querySelector('.dj-sheet-chrome-title')?.before(inputBack);
  on(inputBack,'click',()=>nativeClose?.click());

  const walkMode=add('div','dj-walk-mode');
  walkMode.innerHTML='<span aria-hidden="true">🚶</span><span>도보</span>';
  if(chrome){if(nativeClose?.parentNode===chrome)chrome.insertBefore(walkMode,nativeClose);else chrome.append(walkMode);}else card.prepend(walkMode);

  // These controls call existing handlers. No independent GPS/map state.
  const mapActions=add('div','dj-walk-map-actions');
  mapActions.hidden=true;
  mapActions.setAttribute('aria-label','길찾기 지도 조작');
  const center=add('button','dj-walk-map-center');
  center.type='button';center.textContent='⌖';
  center.setAttribute('aria-label','동작구 지도 중심으로 이동');
  const locate=add('button','dj-walk-map-locate');
  locate.type='button';locate.textContent='➤';
  locate.setAttribute('aria-label','내 위치로 이동');
  mapActions.append(center,locate);app.append(mapActions);
  on(center,'click',()=>byId('center-dongjak')?.click());
  on(locate,'click',()=>byId('current-location')?.click());

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
  const waypointPanel=byId('dj815-waypoints');
  if(waypointPanel)shortcuts.after(waypointPanel);
  const recent=add('section','dj-walk-recent');
  const recentTitle=add('strong');recentTitle.textContent='최근 검색 장소';
  const recentList=add('div',null,'dj-walk-recent-list');recent.append(recentTitle,recentList);
  (waypointPanel||shortcuts).after(recent);
  const refreshRecent=()=>{recentList.replaceChildren();const places=recentPlaces().slice(0,4);recent.hidden=!places.length;for(const place of places){const b=add('button');b.type='button';b.textContent=place.name;b.addEventListener('click',()=>win.dispatchEvent(new CustomEvent('dongjak:route-recent-pick',{detail:place})));recentList.append(b);}};
  on(win,'dongjak:recent-places-change',refreshRecent);refreshRecent();
  const optional=[byId('dj815-rail-planner'),card.querySelector('.dj815-route-share')].filter(Boolean);
  if(optional.length){
    const details=add('details','dj-route-advanced');
    const summary=add('summary');summary.textContent='다른 이동 옵션';
    const body=add('div',null,'dj-route-advanced-body');
    optional.forEach(node=>body.append(node));
    details.append(summary,body);
    recent.after(details);
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
  backBtn.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h13"/></svg>';backBtn.setAttribute('aria-label','길찾기 수정');
  const head=add('div',null,'dj-walk-map-title');
  head.innerHTML='<small>도보 길찾기</small><strong>경로 비교</strong>';
  const stopPreview=add('button','dj-walk-close');stopPreview.type='button';
  stopPreview.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';stopPreview.setAttribute('aria-label','길찾기 종료');
  top.append(backBtn,head,stopPreview);app.append(top);
  const leavePreview=id=>{
    if(app.dataset.djRouteStage!=='preview'||mapCard.hidden)return;
    exitSurface(mapCard,()=>{if(app.dataset.djRouteStage==='preview'&&!mapCard.hidden)byId(id)?.click();});
  };
  on(backBtn,'click',()=>leavePreview('route-map-edit'));
  on(stopPreview,'click',()=>leavePreview('route-map-close'));

  const choices=add('section','dj-route-choice-list');
  choices.setAttribute('aria-label','계산된 도보 경로 비교');
  const choiceHead=add('div',null,'dj-route-choice-title');
  const choiceTitle=add('strong');choiceTitle.textContent='추천 도보 경로';
  const choiceSub=add('small');choiceSub.textContent='경로를 눌러 지도 비교';
  choiceHead.append(choiceTitle,choiceSub);
  const priHeading=add('div',null,'dj-route-pri-heading');
  const priLabel=add('span');priLabel.textContent='보행 위험도 (PRI)';
  const priHelp=add('button','dj-route-pri-help');priHelp.type='button';priHelp.textContent='?';priHelp.setAttribute('aria-label','보행 위험도 PRI 설명');priHelp.setAttribute('aria-haspopup','dialog');
  priHeading.append(priLabel,priHelp);
  const priDialog=add('dialog','dj-route-pri-dialog');
  priDialog.setAttribute('aria-labelledby','dj-route-pri-dialog-title');
  const helpTitle=add('h2','dj-route-pri-dialog-title');helpTitle.textContent='보행 위험도(PRI)란?';
  const helpClose=add('button',null,'dj-route-pri-close');helpClose.type='button';helpClose.textContent='×';helpClose.setAttribute('aria-label','PRI 설명 닫기');
  const helpHead=add('header');helpHead.append(helpTitle,helpClose);
  const helpIntro=add('p');helpIntro.textContent='보행 환경의 잠재적 위험을 수치화한 연구용 지표입니다. 경로의 거리·시간과 함께 조사된 위험도를 비교하는 데 활용합니다.';
  const factors=add('ul',null,'dj-route-pri-factors');
  for(const factor of TEAM_FACTORS){const li=add('li');li.textContent=factor.label;factors.append(li);}
  const helpScale=add('div',null,'dj-route-pri-scale');
  helpScale.innerHTML='<div class="dj-route-pri-help-ramp" aria-hidden="true"></div><div><span>0~39 낮음</span><span>40~69 주의</span><span>70~100 높음</span></div>';
  const helpDetails=add('p');helpDetails.textContent='6개 지표는 동일 가중치이며, 실제로 평가된 자료만 반영합니다. 점수가 높을수록 잠재 위험이 큽니다. 현재 조사 범위는 상도1동 중심이며 일부 구간은 부분평가입니다.';
  const helpUnknown=add('p',null,'dj-route-pri-unknown');helpUnknown.textContent='평가 자료 부족: 경로 중 조사된 구간이 65% 미만이거나 점수를 확인할 수 없는 경우입니다. 회색은 위험도 미확인이지 안전하다는 뜻이 아닙니다. 상대적으로 낮은 점수도 실제 안전이나 사고 확률을 보장하지 않습니다.';
  const helpDone=add('button',null,'dj-route-pri-done');helpDone.type='button';helpDone.textContent='확인';
  priDialog.append(helpHead,helpIntro,factors,helpScale,helpDetails,helpUnknown,helpDone);doc.body.append(priDialog);
  const closePriHelp=()=>{if(priDialog.open)priDialog.close();};
  on(priHelp,'click',()=>{if(!app.classList.contains('route-guiding')&&!priDialog.open)priDialog.showModal();});
  on(helpClose,'click',closePriHelp);on(helpDone,'click',closePriHelp);
  on(priDialog,'click',e=>{if(e.target===priDialog){const r=priDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePriHelp();}});
  const choiceRows=add('div',null,'dj-route-choice-rows');
  const hint=add('p',null,'dj-route-choice-hint');
  const legend=add('div','dj-route-pri-legend');
  legend.innerHTML='<div class="dj-route-pri-ramp" aria-hidden="true"></div><span>낮은 위험</span><span>높은 위험</span><span class="dj-route-unknown-legend">━ 회색 실선: 평가 자료 부족</span>';
  choices.append(choiceHead,priHeading,choiceRows,hint,legend);
  const actions=mapCard.querySelector('.route-map-card-actions');
  actions?.before(choices);
  const disposeTransitDetail=mountTransitDetail({doc,win,app,mapCard,actions});
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
    mapCard.hidden=true;setStage();
    arrivedConfirm.focus({preventScroll:true});
  });

  // Guidance locks unrelated features, not map camera controls.
  const shield=add('div','dj-walk-guidance-lock');
  shield.setAttribute('aria-hidden','true');app.append(shield);
  const stop=byId('nav-stop');
  if(stop)stop.textContent='안내 종료';
  const allowedControls=()=>[...doc.querySelectorAll('#nav-map-controls:not([hidden]) button,#nav-stop,#nav-voice')].filter(el=>!el.disabled);
  const focusEnd=()=>{if(app.classList.contains('route-guiding')&&stop?.isConnected)stop.focus({preventScroll:true});};
  const intercept=e=>{
    if(!app.classList.contains('route-guiding'))return;
    if(e.type==='keydown'&&e.key==='Tab'){
      const controls=allowedControls(),idx=controls.indexOf(doc.activeElement);
      e.preventDefault();e.stopImmediatePropagation();
      controls[(idx+(e.shiftKey?-1:1)+controls.length)%controls.length]?.focus({preventScroll:true});return;
    }
    if(e.target?.closest?.('#nav-stop,#nav-map-controls'))return;
    if(e.target?.closest?.('#nav-voice'))return;
    // Allow actual canvas gestures, not POI clicks, marker buttons or other map overlays.
    if(e.target?.closest?.('#map .maplibregl-canvas')&&['pointerdown','pointerup','touchstart','touchmove','mousedown','wheel','dblclick'].includes(e.type))return;
    e.preventDefault?.();e.stopImmediatePropagation?.();e.stopPropagation?.();
    if(['pointerdown','click','mousedown','keydown'].includes(e.type))focusEnd();
  };
  on(win,'keydown',intercept,{capture:true,passive:false});
  for(const type of ['click','dblclick','pointerdown','pointerup','touchstart','touchmove','mousedown','wheel','contextmenu','keydown'])
    on(doc,type,intercept,{capture:true,passive:false});
  const trap=e=>{if(app.classList.contains('route-guiding')&&!allowedControls().includes(e.target))focusEnd();};
  on(doc,'focusin',trap,true);

  let latest=null,assessment=null;
  const riskLabel=entry=>{
    if(!entry||!Number.isFinite(entry.risk)||!Number.isFinite(entry.coverage)||entry.coverage<.65)
      return {text:'평가 자료 부족',tone:'unknown'};
    const risk=entry.risk;
    return {text:(risk>=70?'높음':risk>=40?'주의':'낮음')+' · '+risk.toFixed(1)+'점',tone:risk>=70?'high':risk>=40?'medium':'low'};
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
    choiceSub.textContent=rec?'관측 위험도가 낮은 후보 비교':'거리·시간 및 관측 가능한 위험도';
    for(const item of available){
      const native=variants.querySelector('[data-route-variant="'+item.id+'"]');
      const button=add('button',null,'dj-route-choice');
      button.type='button';button.dataset.routeChoice=item.id;
      const chosen=selected()===item.id;
      button.setAttribute('aria-pressed',String(chosen));
      if(chosen)button.classList.add('is-current');
      const label=add('strong');label.textContent=item.id==='gentle'?'완만한길':'빠른길';
      const subtitle=add('span',null,'dj-route-choice-subtitle');
      subtitle.textContent=rec===item.id?'상대적 저위험':item.minutes===quick?'소요시간 우선':'경사 고려';
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
        ?'평가 구간 '+Math.round(entry.coverage*100)+'%':(assessment?'평가 자료 부족':'평가 자료 확인 중');
      button.append(routeName,metric,badge,support);
      // The choice rows are replaced whenever PRI/selection state updates.
      // Attach to the ephemeral node directly; do not retain old buttons in
      // the long-lived disposal list after each render.
      button.addEventListener('click',()=>{
        if(native&&!native.disabled&&!app.classList.contains('route-guiding'))native.click();
      });
      choiceRows.append(button);
    }
    hint.textContent=equal?'두 옵션에서 같은 경로가 계산됐습니다.':
      rec?'색상은 조사된 도로 구간의 보행 위험도입니다. 실제 안전을 보장하지 않습니다.':
      '회색 실선은 평가 자료가 부족한 구간입니다. 자료 부족 시 안전 우선 경로를 단정하지 않습니다.';
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
  // Historic sheet styles can position a fixed footer relative to the
  // top route panel instead of the viewport. Keep the original CTA and its
  // handlers, then correct its *measured* position against the real dock.
  const footerKeys=['position','top','bottom','left','right','width','max-width','z-index','transform','translate','margin'];
  const originalFooterStyles=new WeakMap();
  // The v910 footer is inserted *after* this presenter mounts. Resolve its
  // real element at layout time, not once at initial module evaluation.
  const liveRouteFooter=()=>{
    const routeFooter=byId('dj910-route-footer');
    if(routeFooter&&!originalFooterStyles.has(routeFooter))
      originalFooterStyles.set(routeFooter,footerKeys.map(key=>({
        key,value:routeFooter.style.getPropertyValue(key),
        priority:routeFooter.style.getPropertyPriority(key)
      })));
    return routeFooter;
  };
  const restoreInputFooter=()=>{
    const routeFooter=liveRouteFooter();
    if(!routeFooter)return;
    for(const {key,value,priority} of originalFooterStyles.get(routeFooter)||[]){
      if(value)routeFooter.style.setProperty(key,value,priority);
      else routeFooter.style.removeProperty(key);
    }
  };
  const pinInputFooter=()=>{
    const routeFooter=liveRouteFooter();
    if(app.dataset.djRouteStage!=='input'||!routeFooter)return;
    const navRect=byId('bottom-nav')?.getBoundingClientRect();
    if(!navRect?.height)return;
    const dockOffset=Math.max(8,win.innerHeight-navRect.top+12);
    for(const [key,value] of [
      ['position','fixed'],['top','auto'],['bottom',dockOffset+'px'],
      ['left','12px'],['right','12px'],['width','calc(100vw - 24px)'],
      ['max-width','calc(100vw - 24px)'],['z-index','7600'],
      ['transform','none'],['translate','none'],['margin','0']
    ])routeFooter.style.setProperty(key,value,'important');
    // Some legacy transformed ancestors remain fixed containing blocks.
    // Use a measured fallback rather than letting the button hide the fields.
    const actual=routeFooter.getBoundingClientRect();
    const desired=navRect.top-12-actual.height;
    const delta=desired-actual.top;
    if(Math.abs(delta)>1)
      routeFooter.style.setProperty('transform','translateY('+Math.round(delta)+'px)','important');
  };
  // Leave map controls only in the truly exposed map gap; on short phones
  // omit them rather than overlap the location card or the route CTA.
  const positionMapActions=()=>{
    if(app.dataset.djRouteStage!=='input'){mapActions.hidden=true;return;}
    pinInputFooter();
    const top=panel.getBoundingClientRect().bottom;
    const footer=byId('dj910-route-footer')?.getBoundingClientRect();
    const bottom=footer?.top??win.innerHeight-180;
    const clear=bottom-top;
    mapActions.hidden=clear<134;
    if(!mapActions.hidden)mapActions.style.top=Math.round(top+Math.max(14,(clear-108)/2))+'px';
  };
  on(win,'resize',positionMapActions);
  const inputResizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(positionMapActions):null;
  inputResizeObserver?.observe(panel);
  // A later footer insertion does not necessarily resize the top card because
  // the footer is fixed. Observe the direct child insertion independently.
  const footerMountObserver=new MutationObserver(()=>{
    if(app.dataset.djRouteStage==='input')win.requestAnimationFrame?.(positionMapActions);
  });
  footerMountObserver.observe(panel,{childList:true});
  let oldStage='';
  const setStage=()=>{
    const stage=app.dataset.djWalkArrived==='1'?'arrived':app.classList.contains('route-guiding')?'guiding':
      !search.hidden&&!panel.hidden?'search':
      !mapCard.hidden?'preview':
      app.dataset.tab==='route'?'input':'none';
    if(stage==='preview'){
      head.querySelector('small').textContent=app.dataset.djTransitPreview?'대중교통 길찾기':'도보 길찾기';
      head.querySelector('strong').textContent=app.dataset.djTransitPreview?'경로 상세':'경로 비교';
    }
    if(stage===oldStage)return;
    oldStage=stage;app.dataset.djRouteStage=stage;
    if(stage!=='preview')closePriHelp();
    cancelSurfaceMotion(mapCard);
    if(stage==='preview')revealSurface(mapCard);
    shield.hidden=stage!=='guiding';
    if(stage!=='input')restoreInputFooter();
    mapActions.hidden=stage!=='input';
    if(stage==='input')win.requestAnimationFrame?.(positionMapActions);
    if(stage==='guiding')stop?.focus({preventScroll:true});
  };
  const stateObserver=new MutationObserver(setStage);
  stateObserver.observe(app,{attributes:true,attributeFilter:['class','data-tab','data-dj-walk-arrived','data-dj-transit-preview']});
  for(const node of [panel,search,mapCard,navCard])stateObserver.observe(node,{attributes:true,attributeFilter:['hidden']});
  // Light updates in guidance are performed by native GPS, not this presenter.
  setStage();refreshChoices();
  return ()=>{
    cancelSurfaceMotion(mapCard);
    disposeTransitDetail();
    stateObserver.disconnect();nativeObserver.disconnect();inputResizeObserver?.disconnect();
    footerMountObserver.disconnect();
    restoreInputFooter();
    remove.forEach(fn=>fn());
    delete app.dataset.djRouteStage;
    closePriHelp();priDialog.remove();top.remove();choices.remove();topBanner.remove();shield.remove();arrival.remove();swap.remove();shortcuts.remove();
    inputBack.remove();walkMode.remove();mapActions.remove();recent.remove();
    delete app.dataset.djWalkArrived;
    delete app.dataset.djWalkV2;
  };
}
if(typeof document!=='undefined'){
  const boot=()=>mountWalkingRouteExperience();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
