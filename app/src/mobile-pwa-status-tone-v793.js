/** v7.9.3 iOS Home Screen PWA native status-tone sync. No map or API imports.
 * The native status area is owned by iOS: we match its surface color to our
 * map's upper land tone while leaving the search field solid and sharp.
 */
export function isIosHomeScreenPhone(win=window) {
  const nav=win.navigator||{};
  const ios=/iPhone|iPad|iPod/.test(nav.userAgent||'') ||
    (nav.platform==='MacIntel' && Number(nav.maxTouchPoints)>1);
  const standalone=nav.standalone===true ||
    !!win.matchMedia?.('(display-mode: standalone)').matches;
  return !!(ios && standalone && win.matchMedia?.('(max-width: 699px)').matches);
}

export function installPwaStatusTone(doc=document,win=window) {
  const root=doc.documentElement;
  const app=doc.getElementById('app');
  const themeMeta=doc.querySelector('meta[name="theme-color"]');
  if(!root || !app || !themeMeta)return ()=>{};
  let band=null,bridge=null,sample=null;
  let enabled=false;
  const baselineColor=()=>root.dataset.theme==='dark'?'#101f25':'#f3f7f5';
  function sync() {
    enabled=isIosHomeScreenPhone(win);
    // The installed PWA's page root may retain a previous theme through page
    // restoration. The app state is authoritative for both background and bar.
    const theme=app.dataset.theme==='dark'?'dark':'light';
    root.dataset.theme=theme;
    // Native chrome is managed by iOS. Update web-exposed theme hints on
    // every manual toggle, in addition to CSS safe-area colors.
    root.style.colorScheme=theme;
    root.classList.toggle('dj-ios-home-pwa',enabled);
    if(enabled) {
      if(!band) {
        band=doc.createElement('div');
        band.id='dj-ios-pwa-map-seam';
        band.setAttribute('aria-hidden','true');
        app.appendChild(band);
      }
      if(!bridge){bridge=doc.createElement('div');bridge.id='dj-ios-pwa-status-bridge';bridge.setAttribute('aria-hidden','true');app.appendChild(bridge);}
      const visible=id=>{const n=doc.getElementById(id);return !!n&&!n.hidden&&win.getComputedStyle(n).display!=='none'&&win.getComputedStyle(n).visibility!=='hidden';};
      const dimmed=!!doc.getElementById('dj-ai-search-modal')?.open||app.classList.contains('map-safety-open')||app.classList.contains('map-controls-open')||['map-gesture-guide','djNext-layer-panel','djNext-permissions','dj860-onboarding','dj854-weather-sheet','dj-map-settings','dj-app-about','version-history-modal','dj833-night-modal','dj840-theme-confirm'].some(visible);
      if(root.dataset.djPwaDimmed!==String(dimmed))root.dataset.djPwaDimmed=String(dimmed);
      // Keep the OS-owned hint stable; a fixed web gradient bridges to the dimmed map.
      const color=theme==='dark'?(dimmed?'#142428':'#192d32'):(dimmed?'#bfc6c2':'#e5ece8');
      root.style.setProperty('--dj-pwa-status-color',color);
      root.style.setProperty('background-color',color,'important');
      if(!sample){sample=doc.createElement('div');sample.id='dj-ios-pwa-status-sample';sample.setAttribute('aria-hidden','true');app.appendChild(sample);}
      if(sample.style.backgroundColor!==color)sample.style.backgroundColor=color;
      if(themeMeta.getAttribute('content')!==color)themeMeta.setAttribute('content',color);
    } else {
      band?.remove();band=null;bridge?.remove();bridge=null;sample?.remove();sample=null;delete root.dataset.djPwaDimmed;root.style.removeProperty('--dj-pwa-status-color');root.style.removeProperty('background-color');
      themeMeta.setAttribute('content',baselineColor());
    }
  }
  const observer=new MutationObserver(sync);
  observer.observe(app,{attributes:true,attributeFilter:['data-theme','class','hidden','aria-hidden','open'],childList:true,subtree:true});
  const size=win.matchMedia?.('(max-width: 699px)');
  const standalone=win.matchMedia?.('(display-mode: standalone)');
  for(const mq of [size,standalone])mq?.addEventListener?.('change',sync);
  win.addEventListener?.('pageshow',sync);
  sync();
  return ()=>{
    observer.disconnect();
    for(const mq of [size,standalone])mq?.removeEventListener?.('change',sync);
    win.removeEventListener?.('pageshow',sync);
    band?.remove();band=null;bridge?.remove();bridge=null;sample?.remove();sample=null;
    root.classList.remove('dj-ios-home-pwa');delete root.dataset.djPwaDimmed;root.style.removeProperty('--dj-pwa-status-color');
    themeMeta.content=baselineColor();
  };
}
if(typeof document!=='undefined' && typeof window!=='undefined') {
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installPwaStatusTone(),{once:true});
  else installPwaStatusTone();
}
