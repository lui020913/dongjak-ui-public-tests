/** v6.1.0 - One viewport geometry and mutually exclusive mobile map panels. */
export function mobileChromeMetrics({headerBottom=0,navHeight=0,viewportHeight=0}={}){
  return {header:Math.max(46,Math.ceil(Number(headerBottom)||0)),
    nav:Math.max(48,Math.ceil(Number(navHeight)||0)),
    viewport:Math.max(320,Math.ceil(Number(viewportHeight)||0))};
}
// Keep exactly one set of observers/listeners per app and map. Repeated
// bootstrap callers share the coordinator and release it by reference count.
const activeMobileLayoutCoordinators=new WeakMap();
export function installMobileLayoutCoordinator({app,map}={}){
  if(!app||typeof window==='undefined')return ()=>{};
  let byMap=activeMobileLayoutCoordinators.get(app);
  if(!byMap){byMap=new Map();activeMobileLayoutCoordinators.set(app,byMap);}
  const key=map??null;
  const releaseLease=record=>{
    record.refs++;
    let released=false;
    return ()=>{
      if(released)return;
      released=true;
      if(--record.refs===0){
        record.cleanup();
        byMap.delete(key);
        if(byMap.size===0)activeMobileLayoutCoordinators.delete(app);
      }
    };
  };
  const existing=byMap.get(key);
  if(existing)return releaseLease(existing);
  const header=app.querySelector('.topbar');
  const nav=app.querySelector('#bottom-nav');
  let raf=0;
  const sync=()=>{
    raf=0;
    // Shared layout metrics are synchronized for phones, tablets and desktop.
    const hb=header?.getBoundingClientRect?.().bottom||0;
    const nh=nav?.getBoundingClientRect?.().height||0;
    const size=mobileChromeMetrics({headerBottom:hb,navHeight:nh,
      viewportHeight:window.visualViewport?.height||window.innerHeight});
    app.style.setProperty('--dj-header-h',`${size.header}px`);
    app.style.setProperty('--dj-mobile-nav-h',`${size.nav}px`);
    app.style.setProperty('--dj-visible-vh',`${size.viewport}px`);
    // Never leave two modal drawers covering each other. When both are opened
    // externally, preserve the options drawer and dismiss safety consistently.
    if(app.classList.contains('map-controls-open')&&app.classList.contains('map-safety-open'))
      app.classList.remove('map-safety-open');
  };
  const request=()=>{if(!raf)raf=window.requestAnimationFrame(sync);};
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(request):null;
  for(const item of [header,nav])if(item)observer?.observe(item);
  const mutation=new MutationObserver(request);
  mutation.observe(app,{attributes:true,attributeFilter:['class','data-tab']});
  window.addEventListener('resize',request,{passive:true});
  window.addEventListener('orientationchange',request,{passive:true});
  window.visualViewport?.addEventListener?.('resize',request,{passive:true});
  map?.on?.('resize',request);
  request();
  const cleanup=()=>{if(raf)window.cancelAnimationFrame(raf);observer?.disconnect();mutation.disconnect();
    window.removeEventListener('resize',request);window.removeEventListener('orientationchange',request);
    window.visualViewport?.removeEventListener?.('resize',request);map?.off?.('resize',request);};
  const record={refs:0,cleanup};
  byMap.set(key,record);
  return releaseLease(record);
}
