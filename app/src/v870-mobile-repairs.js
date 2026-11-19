/** v8.7.0: mobile-only window lifecycle repair, without synthetic button clicks. */
export function installMobile870Repairs(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app)return ()=>{};
  const phone=()=>win.matchMedia?.('(max-width:699px)')?.matches;
  const listeners=[];
  const on=(target,type,fn,capture=false)=>{
    target.addEventListener(type,fn,capture);
    listeners.push(()=>target.removeEventListener(type,fn,capture));
  };
  // More is owned by mobile-chrome-v790. Send its own close request instead
  // of allowing generic document-level managers to replay an X-button click.
  const moreClose=event=>{
    if(!phone())return;
    const close=event.target?.closest?.('#dj-mobile-utilities-close');
    if(!close)return;
    const sheet=doc.getElementById('dj-mobile-utilities');
    if(!sheet||sheet.hidden)return;
    event.preventDefault();event.stopImmediatePropagation();
    sheet.dispatchEvent(new Event('dongjak:close-more'));
  };
  on(win,'click',moreClose,true);
  for(const type of ['pointerdown','pointerup']){
    on(win,type,event=>{
      if(phone()&&event.target?.closest?.('#dj-mobile-utilities-close'))event.stopPropagation();
    },true);
  }

  // Safety Map is HOME, even when legacy route/sheet observers run after
  // navigate('map').  Explicit map-options district selection still works.
  let homeGuardUntil=-Infinity;
  const picker=doc.getElementById('admin-dong-picker');
  const overview=doc.getElementById('overview-sheet');
  const hideHomePanels=()=>{
    if(app.dataset.tab!=='map'||Date.now()>homeGuardUntil)return;
    if(overview&&!overview.hidden)overview.hidden=true;
    if(picker){if(!picker.hidden)picker.hidden=true;picker.classList.remove('dj-sheet-dragging','dj833-sheet-dismissing');}
    app.classList.remove('dj-admin-dongs-open');
  };
  const onHome=event=>{
    if(!event.target?.closest?.('#bottom-nav .nav-tab[data-tab="map"]'))return;
    homeGuardUntil=Date.now()+650;
    hideHomePanels();
    win.queueMicrotask?.(hideHomePanels);
    win.requestAnimationFrame?.(()=>{hideHomePanels();win.requestAnimationFrame?.(hideHomePanels);});
  };
  on(win,'click',onHome,true);
  const onExplicitDistrict=event=>{
    if(event.target?.closest?.('#open-admin-dongs,#open-admin-dongs-from-options'))homeGuardUntil=-Infinity;
  };
  on(win,'click',onExplicitDistrict,true);
  const homeObserver=(typeof win.MutationObserver==='function'&&picker&&overview)?new win.MutationObserver(hideHomePanels):null;
  if(homeObserver){homeObserver.observe(picker,{attributes:true,attributeFilter:['hidden']});homeObserver.observe(overview,{attributes:true,attributeFilter:['hidden']});}

  // Exit animation watches the *real* hidden transition after its owner's
  // native close handler runs. No replayed click, second overlay, or state change.
  const watchedIds=['route-panel','participation-panel','news-panel','mine-panel',
    'transport-sheet','admin-dong-picker','overview-sheet','detail-sheet','entry-sheet',
    'map-gesture-guide','dj-map-settings','dj-app-about','version-history-modal'];
  const timers=new Map();
  const elementObservers=[];
  for(const id of watchedIds){
    const element=doc.getElementById(id);
    if(!element||typeof win.MutationObserver!=='function')continue;
    let previousVisible=!element.hidden;
    const observer=new win.MutationObserver(()=>{
      const visible=!element.hidden;
      if(visible){
        if(timers.has(element)){win.clearTimeout(timers.get(element));timers.delete(element);}
        element.classList.remove('dj870-sheet-exit');
      }else if(previousVisible&&phone()&&!win.DongjakWindowMotion&&!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
        element.classList.add('dj870-sheet-exit');
        const old=timers.get(element);if(old)win.clearTimeout(old);
        timers.set(element,win.setTimeout(()=>{
          element.classList.remove('dj870-sheet-exit');timers.delete(element);
        },275));
      }
      previousVisible=visible;
    });
    observer.observe(element,{attributes:true,attributeFilter:['hidden']});
    elementObservers.push(observer);
  }
  return ()=>{
    listeners.forEach(clean=>clean());homeObserver?.disconnect();
    for(const observer of elementObservers)observer.disconnect();
    for(const [element,timer] of timers){win.clearTimeout(timer);element.classList.remove('dj870-sheet-exit');}
    timers.clear();
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installMobile870Repairs(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
