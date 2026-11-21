// One-shot recovery for installed iOS web apps. Actual OS chrome pixels are inaccessible.
export const MANUAL_THEME_RELOAD_KEY='dj-manual-theme-reload-v1';
export function readManualThemeReload(storage,now=Date.now()){
 try{const value=JSON.parse(storage?.getItem(MANUAL_THEME_RELOAD_KEY)||'null');storage?.removeItem(MANUAL_THEME_RELOAD_KEY);if(!value||!Number.isFinite(value.expires)||value.expires<now||!['light','dark'].includes(value.theme))return null;const c=value.camera;if(!Array.isArray(c?.center)||c.center.length!==2||![...c.center,c.zoom,c.pitch,c.bearing].every(Number.isFinite))return null;return value;}catch{return null;}
}
export function isInstalledIosPhone(win){const n=win.navigator||{};return Boolean(/iPhone|iPod/.test(n.userAgent||'')&&(n.standalone===true||win.matchMedia?.('(display-mode: standalone)')?.matches)&&win.matchMedia?.('(max-width:699px)')?.matches);}
export function installManualThemeReload({map,app,canReload,win=window,doc=document}){
 if(!isInstalledIosPhone(win))return ()=>{};
 let timer=0;
 // A stable map camera is sufficient for a one-shot iOS PWA relaunch.
 // The previous 'idle' and layer-snapshot gate skipped real theme changes on
 // slow networks or when an unrelated overlay was toggled.
 // canReload() still protects active route/edit and night-analysis sessions.
 const onChange=e=>{
  const theme=e.detail?.theme;if(!['light','dark'].includes(theme))return;
  win.clearTimeout(timer);
  // Avoid losing route, editing, or nondefault layer state. Reload only a settled settings session.
  if(!canReload())return;
  timer=win.setTimeout(()=>{
   if(!canReload()||app.dataset.theme!==theme)return;
   try{
    const center=map.getCenter();const camera={center:[center.lng,center.lat],zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()};
    const state={theme,camera,tab:'mine',expires:Date.now()+30000};
    win.sessionStorage.setItem(MANUAL_THEME_RELOAD_KEY,JSON.stringify(state));
    win.location.reload();
   }catch{}
  },280);
 };
 win.addEventListener('dongjak:manual-theme-change',onChange);
 return ()=>{win.clearTimeout(timer);win.removeEventListener('dongjak:manual-theme-change',onChange);};
}
