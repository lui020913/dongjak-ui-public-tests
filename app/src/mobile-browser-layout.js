/** Browser-only phone layout mode.
 * Existing desktop, installed PWA and Capacitor layouts remain unchanged.
 * Only publishes environment and visual-viewport CSS variables; it does not
 * move map layers, change scrolling state, or touch route/login data.
 */
const phoneQuery='(max-width: 699px)';
const standaloneQuery='(display-mode: standalone)';
const fullscreenQuery='(display-mode: fullscreen)';
const mediaMatches=(win,query)=>Boolean(win.matchMedia?.(query)?.matches);

export function detectMobileRunMode(win){
  if(!win)return 'desktop';
  const phone=typeof win.matchMedia==='function'
    ?mediaMatches(win,phoneQuery):Number(win.innerWidth)<=699;
  if(!phone)return 'desktop';
  if(win.Capacitor?.isNativePlatform?.()===true)return 'native';
  const installed=win.navigator?.standalone===true ||
    mediaMatches(win,standaloneQuery) || mediaMatches(win,fullscreenQuery);
  return installed?'pwa':'browser';
}

export function installMobileBrowserLayout(doc,win){
  const root=doc?.documentElement;
  if(!root||!win||root.dataset.djBrowserLayoutInstalled==='1')return ()=>{};
  root.dataset.djBrowserLayoutInstalled='1';
  const queries=[phoneQuery,standaloneQuery,fullscreenQuery].map(q=>win.matchMedia?.(q)).filter(Boolean);
  let frame=0,disposed=false;

  const update=()=>{
    frame=0;
    if(disposed)return;
    const mode=detectMobileRunMode(win);
    root.dataset.djRunMode=mode;
    if(mode!=='browser'){
      root.style.removeProperty('--dj-browser-vvh');
      root.style.removeProperty('--dj-browser-keyboard-lift');
      delete root.dataset.djBrowserKeyboard;
      doc.getElementById?.('app')?.style.removeProperty('--dj829-tools-top');
      return;
    }
    // Mobile browser chrome changes the visual viewport dynamically. The
    // shortcut rail follows the REAL bottom edge of the search/AI row.
    const app=doc.getElementById?.('app');
    const topbar=app?.querySelector('.topbar');
    const headerRect=topbar?.getBoundingClientRect?.();
    if(headerRect?.height>30&&headerRect.bottom>30){
      app.style.setProperty('--dj829-tools-top',Math.ceil(headerRect.bottom+8)+'px');
    }
    const vv=win.visualViewport;
    const height=Number(vv?.height??win.innerHeight);
    if(Number.isFinite(height)&&height>240&&height<10000){
      root.style.setProperty('--dj-browser-vvh',Math.round(height)+'px');
    }
    // Use a keyboard lift only when a form control is actually focused.
    // Collapsing Safari/Chrome browser bars alone must never hide the dock.
    const visibleBottom=Number(vv?.offsetTop??0)+height;
    const innerHeight=Number(win.innerHeight??height);
    const lift=Math.max(0,innerHeight-visibleBottom);
    const active=doc.activeElement;
    const editable=Boolean(active&&(
      /^(INPUT|TEXTAREA|SELECT)$/i.test(active.tagName||'')||
      active.isContentEditable===true
    ));
    const keyboard=editable&&Number.isFinite(lift)&&lift>120;
    root.dataset.djBrowserKeyboard=keyboard?'open':'closed';
    root.style.setProperty('--dj-browser-keyboard-lift',
      (keyboard?Math.round(lift):0)+'px');
  };
  const schedule=()=>{
    if(disposed||frame)return;
    if(typeof win.requestAnimationFrame==='function'){
      frame=win.requestAnimationFrame(update);
    }else update();
  };
  const listeners=[
    [win,'resize',schedule],[win,'orientationchange',schedule],
    [win,'pageshow',schedule],[doc,'focusin',schedule],
    [doc,'focusout',schedule],[win.visualViewport,'resize',schedule],
    [win.visualViewport,'scroll',schedule]
  ];
  for(const [target,event,fn] of listeners)target?.addEventListener?.(event,fn,{passive:true});
  for(const q of queries)q.addEventListener?.('change',schedule);
  const topbar=doc.querySelector?.('#app .topbar');
  const resizeObserver=topbar&&typeof win.ResizeObserver==='function'
    ?new win.ResizeObserver(schedule):null;
  if(topbar)resizeObserver?.observe(topbar);
  update();
  return ()=>{
    disposed=true;
    if(frame)win.cancelAnimationFrame?.(frame);
    for(const [target,event,fn] of listeners)target?.removeEventListener?.(event,fn);
    for(const q of queries)q.removeEventListener?.('change',schedule);
    resizeObserver?.disconnect();
    delete root.dataset.djRunMode;
    delete root.dataset.djBrowserKeyboard;
    delete root.dataset.djBrowserLayoutInstalled;
    root.style.removeProperty('--dj-browser-vvh');
    root.style.removeProperty('--dj-browser-keyboard-lift');
    doc.getElementById?.('app')?.style.removeProperty('--dj829-tools-top');
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installMobileBrowserLayout(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
