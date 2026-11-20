import './ios-pwa.css';
// Existing iOS PWA status/tone behavior is retained in src/ios-pwa-overlay-chrome.js.
// This module owns new iOS-only presentation from v7.10 onward.

// iOS Home Screen PWA: save a small transition token before an intentional
// reload. The inline <head> bootstrap uses it to draw a full-screen message
// before the first paint on the new page. Android and desktop never reload.
export const PWA_TRANSITION_KEY='dj-pwa-transition-v7104';
export function installIosPwaThemeReload(doc=document,win=window){
  const installed=()=>win.navigator?.standalone===true || !!win.matchMedia?.('(display-mode: standalone)').matches;
  if(!installed())return ()=>{};
  const toggle=doc.getElementById('theme-toggle');
  const app=doc.getElementById('app');
  if(!toggle||!app)return ()=>{};
  const mobile=()=>!!win.matchMedia?.('(max-width:699px)')?.matches;
  let timer=null,themePending=false,nightGestureAt=0,restoring=false,reloadRequested=false;
  const root=doc.documentElement;
  const getToken=()=>{try{return JSON.parse(win.sessionStorage.getItem(PWA_TRANSITION_KEY)||'null');}catch{return null;}};
  const clearToken=()=>{try{win.sessionStorage.removeItem(PWA_TRANSITION_KEY);}catch{}delete root.dataset.djReloadSplash;delete root.dataset.djReloadLabel;delete root.dataset.djReloadMode;};
  const busy=()=>['route-guiding','route-picking','route-preview','adding','detail-open'].some(c=>app.classList.contains(c)) ||
    (doc.activeElement?.matches?.('input,textarea,[contenteditable="true"]'));
  const safe=()=>installed()&&mobile()&&!busy()&&app.dataset.tab==='map' &&
    !!doc.getElementById('admin-dong-picker')?.hidden && !!doc.getElementById('dj-mobile-utilities')?.hidden;
  const start=(night=null)=>{
    if(reloadRequested || restoring || !safe())return false;
    const token={night,expires:Date.now()+18000};
    try{win.sessionStorage.setItem(PWA_TRANSITION_KEY,JSON.stringify(token));}catch{return false;}
    root.dataset.djReloadSplash='true';
    root.dataset.djReloadMode=night==='on'?'night':'theme';
    root.dataset.djReloadLabel=night===null?'테마 전환 중…':'야간 시야 전환 중…';
    reloadRequested=true;
    win.clearTimeout(timer);
    timer=win.setTimeout(()=>win.location.reload(),150);
    return true;
  };
  // Existing theme handler executes on this same click. Its localStorage write
  // finishes before our delayed reload; no transition panel is lost mid-navigation.
  const onTheme=(event)=>{
    if(event?.isTrusted===false || restoring || !safe())return;
    themePending=true;
    win.clearTimeout(timer);
    timer=win.setTimeout(()=>{
      if(!themePending || !safe())return;
      themePending=false;
      try{if(win.localStorage.getItem('dongjak_safety_color_theme_v1')!==app.dataset.theme)return;}
      catch{return;}
      start(null);
    },70);
  };
  toggle.addEventListener('click',onTheme);
  // Night analysis is asynchronous. Wait for its REAL active/inactive state
  // before reloading; never reload a failed enable attempt.
  const onClick=(event)=>{
    const button=event.target?.closest?.('#dj-v794-night,#night-visibility-quick-off,#night-visibility-toggle');
    if(!button || event.isTrusted===false || !safe() || restoring)return;
    nightGestureAt=Date.now();
  };
  doc.addEventListener('click',onClick,true);
  const onNightState=()=>{
    if(restoring || !nightGestureAt || Date.now()-nightGestureAt>15000 || reloadRequested)return;
    nightGestureAt=0;
    start(app.dataset.sangdoNight==='on'?'on':'off');
  };
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.attributeName==='data-sangdo-night'))onNightState();
  });
  observer.observe(app,{attributes:true,attributeFilter:['data-sangdo-night']});

  // Restore a night-analysis session after a full navigation. Theme preference
  // stays intact; night mode uses the existing temporary-theme pipeline.
  const pending=getToken();
  if(pending?.expires && pending.expires>Date.now()){
    restoring=true;
    let done=false,restoreAttempted=false;
    const finish=()=>{
      if(done)return;
      done=true;restoring=false;clearToken();
      restoreObserver.disconnect();win.clearTimeout(guard);
    };
    const ready=()=>{
      const startup=doc.getElementById('map-startup-overlay');
      if(startup && !startup.hidden && !startup.classList.contains('is-hidden'))return false;
      if(pending.night==='on' && app.dataset.sangdoNight!=='on')return false;
      return true;
    };
    const tryRestore=()=>{
      if(done)return;
      const night=doc.getElementById('night-visibility-quick-off');
      // The night handlers are attached by main.js only after MapLibre 'load'.
      if(pending.night==='on' && !restoreAttempted && night && !night.hidden){
        restoreAttempted=true;night.click();
      }
      if(ready())win.setTimeout(()=>{if(ready())finish();},170);
    };
    const restoreObserver=new MutationObserver(tryRestore);
    restoreObserver.observe(app,{attributes:true,attributeFilter:['data-sangdo-night']});
    const night=doc.getElementById('night-visibility-quick-off');
    if(night)restoreObserver.observe(night,{attributes:true,attributeFilter:['hidden','aria-pressed']});
    const startup=doc.getElementById('map-startup-overlay');
    if(startup)restoreObserver.observe(startup,{attributes:true,attributeFilter:['hidden','class']});
    const guard=win.setTimeout(finish,17500);
    win.setTimeout(tryRestore,90);
  }else if(pending)clearToken();
  return ()=>{toggle.removeEventListener('click',onTheme);doc.removeEventListener('click',onClick,true);
    observer.disconnect();win.clearTimeout(timer);};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installIosPwaThemeReload(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
