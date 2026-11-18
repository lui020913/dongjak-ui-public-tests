/** v7.11.0 user-interface improvements. Presentation/events only: no map source edits. */
export function installExperienceV711(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app)return ()=>{};
  const cleanup=[];
  const listen=(el,type,fn,opts)=>{el?.addEventListener?.(type,fn,opts);cleanup.push(()=>el?.removeEventListener?.(type,fn,opts));};
  const mobile=()=>!!win.matchMedia?.('(max-width:699px)')?.matches;
  const root=doc.documentElement;
  const logo=doc.querySelector('.topbar .map-quick-search-form > .brand');
  const query=doc.getElementById('map-quick-search-query');
  if(logo){
    logo.setAttribute('role','button');logo.setAttribute('tabindex','0');
    logo.setAttribute('aria-label','동작하는 안전지도 이름 펼치기');
    logo.setAttribute('aria-expanded','false');
    const change=()=>{
      if(!mobile())return;
      const expanded=!app.classList.contains('dj-v711-brand-expanded');
      app.classList.toggle('dj-v711-brand-expanded',expanded);
      logo.setAttribute('aria-expanded',String(expanded));
      logo.setAttribute('aria-label',expanded?'서비스명 접기':'동작하는 안전지도 이름 펼치기');
    };
    listen(logo,'click',change);
    listen(logo,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();change();}});
    listen(query,'focus',()=>{app.classList.remove('dj-v711-brand-expanded');logo.setAttribute('aria-expanded','false');});
  }
  // A real glass loading screen, not the app artwork. One UI for desktop, mobile
  // and the iOS PWA's pre-/post-reload token. Ios script owns its token lifetime.
  const overlay=doc.getElementById('dj-full-transition');
  const label=doc.getElementById('dj-full-transition-label');
  let timeout=null,settle=null,watch=null,started=0,transitionKind='theme';
  const stop=()=>{
    win.clearTimeout(timeout);win.clearTimeout(settle);watch?.disconnect();watch=null;
    if(root.dataset.djReloadSplash==='true')return; // PWA restoration still running
    if(overlay)overlay.hidden=true;
    root.classList.remove('dj-v711-transition-active');
  };
  const start=(kind)=>{
    if(!overlay)return;
    // The bounded theme flash owns normal changes; reserve the full screen for reload restoration.
    if(kind==='theme'&&root.dataset.djReloadSplash!=='true'){stop();return;}
    transitionKind=kind;
    started=Date.now();
    label.textContent=kind==='night'?'야간 시야 전환 중…':'테마 전환 중…';
    const description=doc.getElementById('dj-transition-message');
    if(description) description.textContent=kind==='night'?'야간 보행환경 분석을 준비하고 있습니다.':'지도 색상과 화면 설정을 적용하고 있습니다.';
    overlay.hidden=false;
    root.classList.add('dj-v711-transition-active');
    win.clearTimeout(timeout);win.clearTimeout(settle);watch?.disconnect();
    // Delayed rendering/network can fail; never leave the map permanently hidden.
    timeout=win.setTimeout(stop,8000);
    let lastChange=Date.now();
    watch=new MutationObserver(()=>{lastChange=Date.now();});
    watch.observe(app,{attributes:true,attributeFilter:['data-theme','data-sangdo-night','class']});
    const check=()=>{
      if(overlay?.hidden||root.dataset.djReloadSplash==='true')return;
      const elapsed=Date.now()-started;
      const quiet=Date.now()-lastChange;
      const stillLoading=transitionKind==='night' &&
        (doc.getElementById('night-visibility-status')?.textContent||'').includes('불러오는 중');
      if(elapsed>=850 && quiet>=650 && !stillLoading){stop();return;}
      // The app's MapLibre idle/render guard also runs independently. Stay visible
      // through the last state change but enforce the 8-second limit.
      settle=win.setTimeout(check,210);
    };
    settle=win.setTimeout(check,900);
  };
  const transitionClick=e=>{
    const target=e.target?.closest?.('#theme-toggle,#night-visibility-toggle,#night-visibility-quick-off,#dj-v794-night,#night-visibility-float-stop');
    if(!target)return;
    // Night mode is now consent-gated by v831. This document-level CAPTURE
    // handler runs before the dialog's own click listener, so starting a
    // splash here covers the screen before the user can answer. A night
    // request is not a theme-change commitment; only the actual theme toggle
    // may start the visual transition after a confirmed action.
    if(target.id!=='theme-toggle')return;
    if(target.dataset.dj840ThemeConfirmed!=='1')return;
    start('theme');
  };
  listen(doc,'click',transitionClick,true);
  // Splash starts on first HTML paint, even before this controller loads.
  if(root.dataset.djReloadSplash==='true'){
    if(overlay){overlay.hidden=false;label.textContent=root.dataset.djReloadLabel||'화면을 전환하고 있습니다…';}
  }
  // The iOS reload owner clears its prepaint token after map/night restoration.
  // That event, not a fixed delay, closes this overlay on the new document.
  const reloadObserver=new MutationObserver(()=>{
    if(root.dataset.djReloadSplash!=='true' && overlay && !overlay.hidden)stop();
  });
  reloadObserver.observe(root,{attributes:true,attributeFilter:['data-dj-reload-splash']});
  // Explicitly keep route/news/community/records layouts unchanged on desktop.
  const modal=doc.getElementById('version-history-modal');
  const historyClick=e=>{
    const button=e.target?.closest?.('.v707-history-switch-button');
    if(!button||!modal)return;
    modal.classList.remove('dj-v711-history-enter');
    void modal.offsetWidth;
    modal.classList.add('dj-v711-history-enter');
  };
  listen(modal,'click',historyClick);
  const keydown=e=>{if(e.key==='Escape' && app.classList.contains('dj-v711-brand-expanded'))app.classList.remove('dj-v711-brand-expanded');};
  listen(doc,'keydown',keydown);
  return ()=>{cleanup.forEach(fn=>fn());win.clearTimeout(timeout);win.clearTimeout(settle);watch?.disconnect();reloadObserver.disconnect();};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installExperienceV711();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
