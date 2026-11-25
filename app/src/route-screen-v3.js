/**
 * Walking route entry V3: a completely new, isolated visual screen.
 * No inherited route-card, legacy sheet layout, footer CSS, or cloned UI.
 * Only the existing validated routing/search/PRI/GPS actions are delegated.
 * Keeping the legacy DOM invisible is intentional: main.js still owns
 * geolocation permissions, route state, graph geometry and server responses.
 */
import viewCSS from './route-screen-v3.css?inline';
import './route-screen-v3-global.css';
import {recentPlaces,recentSearchQueries,recordSearchQuery,clearRecentPlaces} from './v815-place-store.js';

export function mountRouteScreenV3(doc=document, win=window) {
  const byId=id=>doc.getElementById(id);
  const app=byId('app'),old=byId('route-panel'),dock=byId('bottom-nav');
  const legacyStart=byId('route-start-label'),legacyEnd=byId('route-end-label');
  const legacyCalc=byId('route-calc'),nativeSearch=byId('route-place-search');
  if(!app||!old||!dock||!legacyStart||!legacyEnd||!legacyCalc||!nativeSearch||byId('dj-route-v3'))return ()=>{};
  const host=doc.createElement('div');
  host.id='dj-route-v3';host.hidden=true;
  const shadow=host.attachShadow({mode:'open'});
  const style=doc.createElement('style');style.textContent=viewCSS;
  shadow.append(style);
  const view=doc.createElement('div');
  view.className='canvas';
  view.innerHTML=String.raw`
    <header class="header" aria-label="길찾기 상단">
      <button type="button" data-v3="back" aria-label="지도 화면으로 돌아가기">
        <svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <strong class="heading">길찾기</strong>
      <span class="mode"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="m7 21 3-7 3 2 3 5M11 8l-2 5-4 2m6-7 4 4 4 1m-8-5 2-1 2 5"/></svg>도보</span>
    </header>
    <section class="route-panel" aria-label="출발지, 경유지와 도착지">
      <div class="fields">
        <span class="track" aria-hidden="true"></span>
        <button type="button" class="field first" data-v3="start" aria-label="출발지 검색">
          <span class="kind">출발지</span><strong class="place" id="v3-start">출발지를 선택하세요</strong>
        </button>
        <div id="v3-waypoints" class="waypoints" hidden></div>
        <div class="waypoint-add-row"><button type="button" class="waypoint-add" data-v3="waypoint" aria-label="경유지 추가"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>
        <button type="button" class="field second" data-v3="end" aria-label="도착지 검색">
          <span class="kind">도착지</span><strong class="place placeholder" id="v3-end">어디로 가시나요?</strong>
        </button>
        <button type="button" class="switch" data-v3="swap" aria-label="출발지와 도착지 교환">
          <svg viewBox="0 0 24 24"><path d="M8 3v17m0 0-4-4m4 4 4-4M16 21V4m0 0-4 4m4-4 4 4"/></svg>
        </button>
      </div>
      <section class="recent" id="v3-recent" hidden><div class="recent-head"><strong>최근 검색 장소</strong><button type="button" data-v3="clear-recent">기록 삭제</button></div><div class="recent-list"></div></section>
    </section>
    <div class="tools" aria-label="지도 조작">
      <button type="button" data-v3="center" aria-label="동작구 지도 중심으로">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></svg>
      </button>
      <button type="button" data-v3="locate" aria-label="내 위치로 지도 이동">
        <svg viewBox="0 0 24 24"><path d="m5 20 7-16 7 16-7-4z"/></svg>
      </button>
    </div>
    <button type="button" class="action" data-v3="calculate" disabled>
      <span id="v3-cta-label">경로 찾기</span><svg viewBox="0 0 24 24"><path d="M4 12h16m0 0-6-6m6 6-6 6"/></svg>
    </button>
    <section class="search-screen" data-v3-screen="search" role="dialog" aria-label="장소 검색" hidden>
      <div class="search-head"><button type="button" data-v3="search-back" aria-label="검색 닫기">←</button>
        <strong id="v3-search-title">도착지 검색</strong></div>
      <div class="search-control-row">
      <form class="search-bar" data-v3-form="search">
        <input type="search" id="v3-query" placeholder="역, 건물, 장소, 주소 검색" autocomplete="off" autocapitalize="off" enterkeyhint="search" maxlength="80" aria-label="장소명 또는 주소" />
        <button type="button" class="search-clear" data-v3="clear-query" aria-label="검색어 지우기" hidden>×</button>
      </form>
      <button type="button" class="search-location" data-v3="search-gps"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="2"/></svg><span>현재 위치</span></button>
      <button type="button" class="search-location" data-v3="search-map"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16"/></svg><span>지도에서 선택</span></button>
      </div>
      <p class="search-hint" id="v3-search-status" role="status" aria-live="polite">장소명 또는 주소를 검색해 주세요.</p>
      <div class="search-results" id="v3-results" aria-label="장소 검색 결과"></div>
    </section>
  `;
  shadow.append(view);doc.body.append(host);
  const q=s=>shadow.querySelector(s);
  const cleanups=[];
  const listen=(element,event,fn,opts)=>{
    if(!element)return;
    element.addEventListener(event,fn,opts);
    cleanups.push(()=>element.removeEventListener(event,fn,opts));
  };
  let searching=null,active=false,resizeFrame=0,searchTimer=0,composing=false;
  let pendingWaypoint=false,pendingBaseCount=0,searchGpsBusy=false;
  const cancelTimer=()=>{win.clearTimeout(searchTimer);searchTimer=0;};
  let searchLayoutHeight=0,searchLayoutWidth=0;
  const searchScreen=q('[data-v3-screen="search"]');
  const syncViewport=()=>{
    if(!searching)return;
    const vv=win.visualViewport;
    const width=win.innerWidth;
    const layout=Math.max(win.innerHeight||0,doc.documentElement.clientHeight||0);
    if(width!==searchLayoutWidth){searchLayoutWidth=width;searchLayoutHeight=layout;}
    searchLayoutHeight=Math.max(searchLayoutHeight,layout);
    const top=Math.max(0,Math.round(Number(vv?.offsetTop)||0));
    const height=Math.max(1,Math.round(Number(vv?.height)||layout||1));
    host.style.setProperty('--v3-search-top',top+'px');
    host.style.setProperty('--v3-search-height',height+'px');
    searchScreen.dataset.keyboard=searchLayoutHeight-top-height>100?'open':'closed';
  };
  const setSearchVisible=visible=>{
    searchScreen.hidden=!visible;
    if(visible){
      view.dataset.searchOpen='true';
      searchLayoutWidth=win.innerWidth;
      searchLayoutHeight=Math.max(win.innerHeight||0,doc.documentElement.clientHeight||0);
      syncViewport();
    }else{
      delete view.dataset.searchOpen;
      delete searchScreen.dataset.keyboard;
      host.style.removeProperty('--v3-search-top');
      host.style.removeProperty('--v3-search-height');
      searchLayoutHeight=0;searchLayoutWidth=0;
    }
  };
  const hasValue=node=>node?.textContent?.trim()&&node.textContent.trim()!=='선택되지 않음';
  const syncLabels=()=>{
    const start=hasValue(legacyStart)?legacyStart.textContent.trim():null;
    const end=hasValue(legacyEnd)?legacyEnd.textContent.trim():null;
    q('#v3-start').textContent=start||'출발지를 선택하세요';
    q('#v3-start').classList.toggle('placeholder',!start);
    q('[data-v3="start"]').setAttribute('aria-label',start?'출발지 '+start+' 변경':'출발지를 검색하거나 현재 위치로 지정');
    q('#v3-end').textContent=end||'어디로 가시나요?';
    q('#v3-end').classList.toggle('placeholder',!end);
    q('[data-v3="end"]').setAttribute('aria-label',end?'도착지 '+end+' 변경':'도착지 검색');
    const disabled=legacyCalc.disabled||!start||!end||pendingWaypoint;
    q('[data-v3="calculate"]').disabled=Boolean(disabled);
    q('#v3-cta-label').textContent=pendingWaypoint?'경유지를 선택해 주세요':legacyCalc.disabled&&start&&end?'경로 계산 중…':'경로 찾기';
  };
  const mirrorWaypoints=()=>{
    const target=q('#v3-waypoints');target.replaceChildren();
    const rows=byId('dj815-waypoints')?.querySelectorAll('.dj815-waypoint-row')||[];
    if(pendingWaypoint&&rows.length>pendingBaseCount)pendingWaypoint=false;
    target.hidden=!rows.length&&!pendingWaypoint;
    q('.waypoint-add-row').hidden=rows.length>=5||pendingWaypoint;
    q('[data-v3="waypoint"]').disabled=rows.length>=5||pendingWaypoint;
    for(const [i,row] of Array.from(rows).entries()){const item=doc.createElement('div');item.className='waypoint-item';const title=doc.createElement('span');title.textContent=(i+1)+'. '+(row.querySelector('.dj815-waypoint-title')?.textContent||'경유지');item.append(title);for(const native of row.querySelectorAll('button')){const b=doc.createElement('button');b.type='button';b.className='waypoint-control';b.textContent=native.textContent;b.disabled=native.disabled;b.setAttribute('aria-label',native.title||native.textContent);b.addEventListener('click',()=>native.click());item.append(b);}target.append(item);}
    if(pendingWaypoint){
      const item=doc.createElement('div');item.className='waypoint-item waypoint-pending';
      const search=doc.createElement('button');search.type='button';search.className='waypoint-input';search.textContent='경유지 입력';search.addEventListener('click',()=>openSearch('waypoint'));
      const cancel=doc.createElement('button');cancel.type='button';cancel.className='waypoint-control';cancel.textContent='×';cancel.setAttribute('aria-label','경유지 추가 취소');cancel.addEventListener('click',()=>{pendingWaypoint=false;mirrorWaypoints();requestPosition();});
      item.append(search,cancel);target.append(item);
    }
    syncLabels();
  };
  const addWaypointRow=()=>{
    const count=byId('dj815-waypoints')?.querySelectorAll('.dj815-waypoint-row').length||0;
    if(count>=5||pendingWaypoint)return;
    pendingBaseCount=count;pendingWaypoint=true;mirrorWaypoints();requestPosition();
    q('.waypoint-pending')?.scrollIntoView({block:'nearest',behavior:win.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };
  const refreshRecent=()=>{const box=q('#v3-recent'),list=box.querySelector('.recent-list');list.replaceChildren();const places=recentPlaces().filter((place,i,all)=>all.findIndex(p=>p.name===place.name&&Math.abs(Number(p.lng)-Number(place.lng))<0.0001&&Math.abs(Number(p.lat)-Number(place.lat))<0.0001)===i||!Number.isFinite(Number(place.lng))).slice(0,4);box.hidden=!places.length;for(const place of places){const b=doc.createElement('button');b.type='button';b.textContent=place.name;b.addEventListener('click',()=>win.dispatchEvent(new CustomEvent('dongjak:route-recent-pick',{detail:place})));list.append(b);}};
  const position=()=>{
    resizeFrame=0;
    if(!active||searching)return;
    const nav=dock.getBoundingClientRect();
    if(nav.height&&nav.top>0){
      const bottom=Math.max(12,Math.round(win.innerHeight-nav.top+12));
      host.style.setProperty('--v3-cta-bottom',bottom+'px');
    }
    const card=q('.route-panel').getBoundingClientRect();
    const cta=q('[data-v3="calculate"]').getBoundingClientRect();
    const room=cta.top-card.bottom;
    q('.tools').hidden=room<125;
    if(room>=125)host.style.setProperty('--v3-tools-top',Math.round(card.bottom+Math.min(26,Math.max(10,(room-110)/4)))+'px');
  };
  const requestPosition=()=>{
    if(resizeFrame)win.cancelAnimationFrame?.(resizeFrame);
    resizeFrame=win.requestAnimationFrame?.(position)||0;
  };
  const mirrorResults=()=>{
    if(!searching)return;
    const status=byId('route-search-status')?.textContent?.trim();
    if(status)q('#v3-search-status').textContent=status;
    const container=q('#v3-results');
    container.replaceChildren();
    if(!q('#v3-query').value.trim()&&(recentPlaces().length||recentSearchQueries().length)){
      const head=doc.createElement('div');head.className='search-recent-head';const title=doc.createElement('strong');title.textContent='최근 검색 장소';const clear=doc.createElement('button');clear.type='button';clear.textContent='기록 삭제';clear.addEventListener('click',()=>{clearRecentPlaces();byId('route-search-query').dispatchEvent(new Event('input',{bubbles:true}));});head.append(title,clear);container.append(head);const tools=doc.createElement('div');tools.className='search-history';
      for(const term of recentSearchQueries().filter(t=>!recentPlaces().some(p=>p.name===t))){const b=doc.createElement('button');b.type='button';b.textContent=term;b.addEventListener('click',()=>{q('#v3-query').value=term;recordSearchQuery(term);updateQuery();submitSearch();});tools.append(b);}if(tools.childElementCount)container.append(tools);
    }
    for(const native of byId('route-search-results')?.querySelectorAll('button.route-search-item')||[]){
      const button=doc.createElement('button');button.type='button';
      const title=doc.createElement('strong');
      title.textContent=native.querySelector('strong')?.textContent||native.textContent;
      const subtitle=doc.createElement('small');
      subtitle.textContent=native.querySelector('small')?.textContent||'';
      button.append(title,subtitle);
      button.addEventListener('click',()=>native.click());
      container.append(button);
    }
  };
  const finishSearch=()=>{
    if(!searching)return;
    cancelTimer();composing=false;searching=null;searchGpsBusy=false;
    q('[data-v3="search-gps"]').disabled=false;
    q('#v3-query').blur();
    setSearchVisible(false);
    byId('route-search-close')?.click();
    syncLabels();requestPosition();
  };
  const openSearch=which=>{
    if(!active)return;
    searching=which;
    if(which==='waypoint')byId('dj832-waypoint-details')?.querySelector('.dj815-actions button')?.click();else byId(which==='start'?'route-search-start':'route-search-end')?.click();
    if(nativeSearch.hidden){searching=null;return;}
    q('#v3-search-title').textContent=which==='start'?'출발지 검색':which==='waypoint'?'경유지 검색':'도착지 검색';
    cancelTimer();composing=false;
    q('#v3-query').value='';q('[data-v3="clear-query"]').hidden=true;
    q('#v3-results').replaceChildren();
    q('#v3-search-status').textContent='동작구 내 장소명 또는 주소를 입력해 주세요.';
    q('[data-v3="search-gps"]').disabled=searchGpsBusy;
    setSearchVisible(true);
    mirrorResults();
    q('#v3-query').focus({preventScroll:true});
  };
  // Keep the legacy route panel logically PRESENT for the native tab/sheet
  // controller. Making its visibility:hidden caused that controller to
  // revert data-tab to map and redraw the obsolete sheet. Clip the entire
  // rendering tree instead; the genuine new V3 Shadow DOM remains interactive.
  const oldMapTools=byId('dj-walk-map-actions');
  const oldMapToolsDisplay=oldMapTools?{
    value:oldMapTools.style.getPropertyValue('display'),
    priority:oldMapTools.style.getPropertyPriority('display')
  }:null;
  const hideOldMapTools=()=>{
    // Legacy rule uses a competing !important and :not([hidden]) selector.
    // Suppress its original map buttons at source, not only via a weak CSS
    // selector, while leaving the new independent two-button stack intact.
    if(oldMapTools && (oldMapTools.style.getPropertyValue('display')!=='none' ||
        oldMapTools.style.getPropertyPriority('display')!=='important'))
      oldMapTools.style.setProperty('display','none','important');
  };
  const restoreOldMapTools=()=>{
    if(!oldMapTools)return;
    if(oldMapToolsDisplay?.value)oldMapTools.style.setProperty('display',oldMapToolsDisplay.value,oldMapToolsDisplay.priority);
    else oldMapTools.style.removeProperty('display');
  };
  const oldVisualKeys=['clip-path','pointer-events'];
  const previousOldVisual=oldVisualKeys.map(key=>({
    key,value:old.style.getPropertyValue(key),priority:old.style.getPropertyPriority(key)
  }));
  const concealOld=()=>{
    for(const [key,value] of [['clip-path','inset(100%)'],['pointer-events','none']]){
      if(old.style.getPropertyValue(key)!==value||old.style.getPropertyPriority(key)!=='important')
        old.style.setProperty(key,value,'important');
    }
  };
  const restoreOld=()=>{
    for(const {key,value,priority} of previousOldVisual){
      if(value)old.style.setProperty(key,value,priority);
      else old.style.removeProperty(key);
    }
  };
  const oldStyleObserver=new MutationObserver(()=>{if(active)concealOld();});
  oldStyleObserver.observe(old,{attributes:true,attributeFilter:['style']});
  const sync=()=>{
    const next=app.dataset.tab==='route'&&win.innerWidth<700&&!app.classList.contains('route-guiding');
    if(next!==active){
      active=next;
      // The tab controller can retain only the real V3 overlay for a map-return fade.
      // Do not resurrect the legacy route sheet while it is being dismissed.
      host.hidden=!next&&host.dataset.djTabOutgoing!=='true';
      if(next){app.dataset.djRouteScreenV3='1';concealOld();hideOldMapTools();}
      else{
        restoreOld();restoreOldMapTools();
        delete app.dataset.djRouteScreenV3;
        cancelTimer();composing=false;searching=null;
        q('#v3-query').blur();
        setSearchVisible(false);
      }
    }
    if(active){
      concealOld();hideOldMapTools();
      if(searching&&nativeSearch.hidden){
        cancelTimer();composing=false;searching=null;q('#v3-query').blur();setSearchVisible(false);
      }
      syncLabels();mirrorWaypoints();refreshRecent();
      requestPosition();
    }
  };
  for(const key of ['back']){
    listen(q('[data-v3="'+key+'"]'),'click',()=>old.querySelector('[data-close-page="route"]')?.click());
  }
  listen(q('[data-v3="start"]'),'click',()=>openSearch('start'));
  listen(q('[data-v3="end"]'),'click',()=>openSearch('end'));
  listen(q('[data-v3="waypoint"]'),'click',addWaypointRow);

  listen(q('[data-v3="clear-recent"]'),'click',()=>clearRecentPlaces());
  listen(win,'dongjak:recent-places-change',refreshRecent);
  listen(q('[data-v3="swap"]'),'click',()=>win.dispatchEvent(new CustomEvent('dongjak:route-swap')));
  listen(q('[data-v3="search-map"]'),'click',()=>{
    if(!searching)return;
    const which=searching;
    q('#v3-query').blur();
    if(which==='waypoint')byId('dj832-waypoint-details')?.querySelectorAll('.dj815-actions button')[1]?.click();
    else byId(which==='start'?'route-pick-start':'route-pick-end')?.click();
  });
  listen(q('[data-v3="search-gps"]'),'click',()=>{
    if(!searching||searchGpsBusy)return;
    searchGpsBusy=true;q('[data-v3="search-gps"]').disabled=true;
    q('#v3-query').blur();
    win.dispatchEvent(new CustomEvent('dongjak:route-search-current-location',{detail:{which:searching}}));
  });
  listen(win,'dongjak:route-search-gps-finished',()=>{
    searchGpsBusy=false;q('[data-v3="search-gps"]').disabled=false;
  });
  listen(win,'dongjak:route-endpoint-registered',()=>{sync();if(active){pendingWaypoint=false;pendingBaseCount=0;mirrorWaypoints();syncLabels();requestPosition();}});
  listen(win,'dongjak:route-editor-reset',()=>{pendingWaypoint=false;pendingBaseCount=0;if(active){mirrorWaypoints();requestPosition();}});
  listen(q('[data-v3="center"]'),'click',()=>byId('center-dongjak')?.click());
  listen(q('[data-v3="locate"]'),'click',()=>byId('current-location')?.click());
  listen(q('[data-v3="calculate"]'),'click',()=>{
    syncLabels();if(!q('[data-v3="calculate"]').disabled)legacyCalc.click();
  });
  listen(q('[data-v3="search-back"]'),'click',finishSearch);
  const submitSearch=()=>{
    cancelTimer();
    if(!searching||composing)return;
    const nativeQuery=byId('route-search-query'),form=byId('route-search-form');
    if(!nativeQuery||!form||nativeQuery.value.trim().length<2)return;
    form.requestSubmit();
    mirrorResults();
  };
  const updateQuery=()=>{
    cancelTimer();
    if(!searching)return;
    const input=q('#v3-query'),nativeQuery=byId('route-search-query');
    q('[data-v3="clear-query"]').hidden=!input.value;
    if(!nativeQuery)return;
    nativeQuery.value=input.value;
    nativeQuery.dispatchEvent(new Event('input',{bubbles:true}));
    mirrorResults();
    if(!composing&&input.value.trim().length>=2)searchTimer=win.setTimeout(submitSearch,450);
  };
  listen(q('#v3-query'),'compositionstart',()=>{composing=true;cancelTimer();});
  listen(q('#v3-query'),'compositionend',()=>{composing=false;updateQuery();});
  listen(q('#v3-query'),'input',updateQuery);
  listen(q('[data-v3="clear-query"]'),'click',()=>{q('#v3-query').value='';updateQuery();q('#v3-query').focus({preventScroll:true});});
  listen(q('[data-v3-form="search"]'),'submit',e=>{e.preventDefault();if(!composing){recordSearchQuery(q('#v3-query').value);submitSearch();}});
  listen(win.visualViewport,'resize',syncViewport);
  listen(win.visualViewport,'scroll',syncViewport);
  listen(win,'resize',syncViewport);
  listen(win,'orientationchange',syncViewport);
  listen(win,'keydown',e=>{
    if(active&&searching&&e.key==='Escape'){e.preventDefault();finishSearch();}
  });
  listen(win,'resize',requestPosition);
  listen(win,'orientationchange',requestPosition);
  const observer=new MutationObserver(sync);
  observer.observe(app,{attributes:true,attributeFilter:['data-tab','class']});
  const labelsObserver=new MutationObserver(syncLabels);
  for(const item of [legacyStart,legacyEnd])labelsObserver.observe(item,{childList:true,subtree:true,characterData:true});
  labelsObserver.observe(legacyCalc,{attributes:true,attributeFilter:['disabled']});
  const waypointObserver=new MutationObserver(()=>{if(active){mirrorWaypoints();requestPosition();}});
  const waypointList=byId('dj815-waypoints')?.querySelector('.dj815-waypoint-list');
  if(waypointList)waypointObserver.observe(waypointList,{childList:true,subtree:true});
  const searchObserver=new MutationObserver(()=>{
    if(searching){
      mirrorResults();
      if(nativeSearch.hidden)finishSearch();
    }
  });
  searchObserver.observe(byId('route-search-results'),{childList:true,subtree:true});
  searchObserver.observe(byId('route-search-status'),{childList:true,subtree:true,characterData:true});
  searchObserver.observe(nativeSearch,{attributes:true,attributeFilter:['hidden']});
  const navObserver=typeof ResizeObserver==='function'?new ResizeObserver(requestPosition):null;
  navObserver?.observe(dock);
  const cardObserver=typeof ResizeObserver==='function'?new ResizeObserver(requestPosition):null;
  cardObserver?.observe(q('.route-panel'));
  sync();
  return ()=>{
    cancelTimer();observer.disconnect();labelsObserver.disconnect();searchObserver.disconnect();waypointObserver.disconnect();
    oldStyleObserver.disconnect();restoreOld();restoreOldMapTools();
    navObserver?.disconnect();cardObserver?.disconnect();
    cleanups.forEach(fn=>fn());
    if(resizeFrame)win.cancelAnimationFrame?.(resizeFrame);
    delete app.dataset.djRouteScreenV3;
    host.remove();
  };
}
if(typeof document!=='undefined'){
  const boot=()=>mountRouteScreenV3();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
