/** Phone-only 2026-11-21 UI coordination.
 * Does not own map/theme/auth requests or duplicate button action listeners.
 */
export function installPhoneUxFollowup(doc=document,win=window){
  const app=doc.getElementById('app');
  const nav=doc.getElementById('bottom-nav');
  const searchForm=doc.querySelector('#map-quick-search .map-quick-search-form');
  if(!app||!nav||!searchForm||app.dataset.djPhoneUxFollowup==='ready')return ()=>{};
  app.dataset.djPhoneUxFollowup='ready';
  const phone=()=>win.matchMedia?.('(max-width:699px)')?.matches===true;
  const background=doc.createElement('div');
  background.id='dj-phone-tab-background';background.setAttribute('aria-hidden','true');
  const shield=doc.createElement('div');
  shield.id='dj-phone-tab-shield';shield.setAttribute('aria-hidden','true');
  app.append(background,shield);
  let seq=0,entering=0,release=0,watchdog=0,raf=0,resize=null,observer=null;
  const requestFrame=fn=>win.requestAnimationFrame?.(fn)??win.setTimeout(fn,16);
  const cancelFrame=id=>win.cancelAnimationFrame?.(id)??win.clearTimeout(id);

  function updateSearchPosition(){
    raf=0;
    if(!phone())return;
    const bottom=searchForm.getBoundingClientRect().bottom;
    if(!Number.isFinite(bottom)||bottom<=0)return;
    const value=Math.round(bottom+8)+'px';
    if(app.style.getPropertyValue('--dj-phone-search-results-top')!==value)
      app.style.setProperty('--dj-phone-search-results-top',value);
  }
  function schedule(){
    if(!raf)raf=requestFrame(updateSearchPosition);
  }
  function startTransition(){
    if(!phone())return;
    const token=++seq;
    win.clearTimeout(release);win.clearTimeout(watchdog);
    app.dataset.djPhoneTabShield='true';
    app.dataset.djPhoneTabEntering='true';
    const hide=()=>{
      if(token!==seq)return;
      // The new primary page is already opaque; fading the shield out reveals
      // the map only when the destination is explicitly the map tab.
      delete app.dataset.djPhoneTabShield;
      win.clearTimeout(entering);
      entering=win.setTimeout(()=>{
        if(token===seq)delete app.dataset.djPhoneTabEntering;
      },175);
    };
    release=win.setTimeout(hide,75);
    watchdog=win.setTimeout(()=>{
      if(token!==seq)return;
      delete app.dataset.djPhoneTabShield;
      delete app.dataset.djPhoneTabEntering;
    },700);
  }
  const onNavClick=event=>{
    if(!phone())return;
    const button=event.target?.closest?.('#bottom-nav .nav-tab[data-tab]');
    if(!button||button.disabled||button.dataset.tab===app.dataset.tab)return;
    startTransition();
  };
  // Capture at window, before the existing bottom-tab handler can cancel a
  // legacy sheet or perform a synchronous page swap.
  win.addEventListener('click',onNavClick,true);
  const onViewport=()=>schedule();
  for(const target of [win,win.visualViewport]){
    target?.addEventListener?.('resize',onViewport,{passive:true});
    target?.addEventListener?.('scroll',onViewport,{passive:true});
  }
  searchForm.addEventListener('focusin',onViewport);
  searchForm.addEventListener('focusout',onViewport);
  if(win.ResizeObserver){
    resize=new win.ResizeObserver(schedule);
    resize.observe(searchForm);
  }
  if(win.MutationObserver){
    observer=new win.MutationObserver(records=>{
      if(records.some(r=>r.type==='childList'||r.attributeName==='class'||r.attributeName==='hidden'))
        schedule();
    });
    observer.observe(searchForm,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  }
  schedule();
  return ()=>{
    seq++;win.clearTimeout(release);win.clearTimeout(watchdog);win.clearTimeout(entering);
    if(raf)cancelFrame(raf);
    resize?.disconnect();observer?.disconnect();
    win.removeEventListener('click',onNavClick,true);
    for(const target of [win,win.visualViewport]){
      target?.removeEventListener?.('resize',onViewport);
      target?.removeEventListener?.('scroll',onViewport);
    }
    searchForm.removeEventListener('focusin',onViewport);
    searchForm.removeEventListener('focusout',onViewport);
    background.remove();shield.remove();
    delete app.dataset.djPhoneTabShield;delete app.dataset.djPhoneTabEntering;
    delete app.dataset.djPhoneUxFollowup;
    app.style.removeProperty('--dj-phone-search-results-top');
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const run=()=>installPhoneUxFollowup(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
}
