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
  let band=null;
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
      const guide=doc.getElementById('map-gesture-guide');
      const dimmed=guide&&!guide.hidden;
      themeMeta.setAttribute('content',dimmed?(theme==='dark'?'#14292b':'#98a5a1'):(theme==='dark'?'#192d32':'#e5ece8'));
    } else {
      band?.remove();band=null;
      themeMeta.setAttribute('content',baselineColor());
    }
  }
  const observer=new MutationObserver(sync);
  observer.observe(app,{attributes:true,attributeFilter:['data-theme']});
  const guide=doc.getElementById('map-gesture-guide');
  if(guide)observer.observe(guide,{attributes:true,attributeFilter:['hidden']});
  const size=win.matchMedia?.('(max-width: 699px)');
  const standalone=win.matchMedia?.('(display-mode: standalone)');
  for(const mq of [size,standalone])mq?.addEventListener?.('change',sync);
  win.addEventListener?.('pageshow',sync);
  sync();
  return ()=>{
    observer.disconnect();
    for(const mq of [size,standalone])mq?.removeEventListener?.('change',sync);
    win.removeEventListener?.('pageshow',sync);
    band?.remove();band=null;
    root.classList.remove('dj-ios-home-pwa');
    themeMeta.content=baselineColor();
  };
}
if(typeof document!=='undefined' && typeof window!=='undefined') {
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installPwaStatusTone(),{once:true});
  else installPwaStatusTone();
}
