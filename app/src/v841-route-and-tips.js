/** v8.4.1: supplementary UI behavior. Does not change routing or map layers. */
import './v841-route-and-tips.css';
export function installV841InputViewport(doc=document,win=window){
  const panel=doc.getElementById('route-panel');
  const search=doc.getElementById('route-place-search');
  const query=doc.getElementById('route-search-query');
  if(!panel||!search||!query)return ()=>{};
  // Open the established route editor BEFORE its existing waypoint-search callback
  // receives the click. Routing core remains byte-identical to v8.4.0.
  const onWaypointClick=(event)=>{
    const button=event.target.closest?.('#dj815-waypoints button');
    const title=button?.textContent?.trim()||'';
    // v8.4.2 labels this control '＋ 경유지 검색'; older builds used '검색으로 추가'.
    if(!button||!(title.includes('경유지 검색')||title==='검색으로 추가'))return;
    const app=doc.getElementById('app');
    if(app?.classList.contains('route-guiding'))return;
    if(app?.dataset.tab!=='route')doc.querySelector('#bottom-nav [data-tab=route]')?.click();
  };
  doc.addEventListener('click',onWaypointClick,true);
  const scrollToInput=()=>{
    if(search.hidden||panel.hidden)return;
    // Only the scrollable body moves, never the fixed header or the map.
    query.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
  };
  const onResize=()=>{
    if(search.hidden||panel.hidden){
      panel.style.removeProperty('--dj841-keyboard-lift');
      panel.style.removeProperty('--dj841-visible-viewport');
      return;
    }
    const viewport=win.visualViewport;
    if(viewport){
      const keyboard=win.innerHeight-viewport.height>140;
      panel.style.setProperty('--dj841-keyboard-lift',keyboard?`${Math.max(0,win.innerHeight-viewport.height-viewport.offsetTop+8)}px`:'0px');
      panel.style.setProperty('--dj841-visible-viewport',keyboard?`${Math.max(240,viewport.height)}px`:'100dvh');
    }
    if(doc.activeElement===query)win.requestAnimationFrame?.(scrollToInput);
  };
  query.addEventListener('focus',onResize);
  win.visualViewport?.addEventListener('resize',onResize);
  const searchObserver=new MutationObserver(onResize);
  searchObserver.observe(search,{attributes:true,attributeFilter:['hidden']});
  // Hide duplicate links in More; keep the existing side-by-side quick actions.
  const compactMore=()=>{
    const utility=doc.getElementById('dj-mobile-utilities');
    if(!utility||utility.hidden)return;
    if(!utility.querySelector('.dj840-more-quick-actions'))return;
    for(const button of utility.querySelectorAll('button')){
      if(button.closest('.dj840-more-quick-actions'))continue;
      const title=button.textContent?.trim();
      if(title==='전체 업데이트 내역'||title==='지도 설정'){
        button.classList.add('dj841-redundant-more-action');
      }
    }
  };
  const utility=doc.getElementById('dj-mobile-utilities');
  let observer;
  if(utility){observer=new MutationObserver(compactMore);observer.observe(utility,{attributes:true,attributeFilter:['hidden']});}
  compactMore();
  return ()=>{doc.removeEventListener('click',onWaypointClick,true);query.removeEventListener('focus',onResize);win.visualViewport?.removeEventListener('resize',onResize);searchObserver.disconnect();observer?.disconnect();};
}
if(typeof document!=='undefined'){
  const boot=()=>installV841InputViewport();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
