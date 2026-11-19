/** The visual viewport, not the CSS document viewport, ends at the iOS
 * keyboard. Keep live search results reachable without moving the map.
 * No search/provider behavior is changed here.
 */
export function installMobileSearchKeyboardBounds(doc=document,win=window){
  const input=doc.getElementById('map-quick-search-query');
  const dropdown=doc.getElementById('map-quick-search-dropdown');
  if(!input||!dropdown||dropdown.dataset.dj884ViewportReady==='1')return ()=>{};
  dropdown.dataset.dj884ViewportReady='1';
  const phone=()=>win.matchMedia?.('(max-width:699px)')?.matches===true;
  let raf=0,delay=0;
  const sync=()=>{
    raf=0;if(!phone()||dropdown.hidden)return;
    const vv=win.visualViewport;
    const viewportBottom=vv?vv.offsetTop+vv.height:win.innerHeight;
    const top=dropdown.getBoundingClientRect().top;
    const room=Math.max(112,Math.floor(viewportBottom-top-12));
    dropdown.style.setProperty('--dj884-search-room',room+'px');
  };
  const schedule=()=>{
    if(raf)return;
    if(typeof win.requestAnimationFrame==='function')raf=win.requestAnimationFrame(sync);
    else sync();
  };
  const afterKeyboard=()=>{
    schedule();
    if(delay)win.clearTimeout(delay);
    delay=win.setTimeout(sync,350);
  };
  const watcher=typeof MutationObserver!=='undefined'
    ?new MutationObserver(schedule):null;
  watcher?.observe(dropdown,{attributes:true,attributeFilter:['hidden','class']});
  for(const [target,type,fn] of [
    [input,'focus',afterKeyboard],[input,'blur',afterKeyboard],
    [win,'resize',afterKeyboard],[win,'orientationchange',afterKeyboard],
    [win,'pageshow',schedule],[win.visualViewport,'resize',schedule],
    [win.visualViewport,'scroll',schedule]
  ])target?.addEventListener?.(type,fn,{passive:true});
  schedule();
  return ()=>{
    watcher?.disconnect();if(raf)win.cancelAnimationFrame?.(raf);
    if(delay)win.clearTimeout(delay);
    for(const [target,type,fn] of [
      [input,'focus',afterKeyboard],[input,'blur',afterKeyboard],
      [win,'resize',afterKeyboard],[win,'orientationchange',afterKeyboard],
      [win,'pageshow',schedule],[win.visualViewport,'resize',schedule],
      [win.visualViewport,'scroll',schedule]
    ])target?.removeEventListener?.(type,fn);
    dropdown.style.removeProperty('--dj884-search-room');
    delete dropdown.dataset.dj884ViewportReady;
  };
}
if(typeof document!=='undefined'){
  const boot=()=>installMobileSearchKeyboardBounds(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
