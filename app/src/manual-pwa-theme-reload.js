// One-shot recovery for installed iOS web apps. Actual OS chrome pixels are inaccessible.
export const MANUAL_THEME_RELOAD_KEY='dj-manual-theme-reload-v1';
export function readManualThemeReload(storage,now=Date.now()){
 try{const value=JSON.parse(storage?.getItem(MANUAL_THEME_RELOAD_KEY)||'null');storage?.removeItem(MANUAL_THEME_RELOAD_KEY);if(!value||!Number.isFinite(value.expires)||value.expires<now||!['light','dark'].includes(value.theme))return null;const c=value.camera;if(!Array.isArray(c?.center)||c.center.length!==2||![...c.center,c.zoom,c.pitch,c.bearing].every(Number.isFinite))return null;return value;}catch{return null;}
}
export function isInstalledIosPhone(win){const n=win.navigator||{};return Boolean(/iPhone|iPod/.test(n.userAgent||'')&&(n.standalone===true||win.matchMedia?.('(display-mode: standalone)')?.matches)&&win.matchMedia?.('(max-width:699px)')?.matches);}
/** iOS Home Screen PWA can ignore a live theme-color update in native chrome.
 * Only an explicit user theme change can request a one-shot refresh. The map
 * camera and active tab are restored after the next map load. */
export function requestIosThemeRefresh({win=window,app,map,theme}={}){
 if(!isInstalledIosPhone(win)||!['light','dark'].includes(theme))return false;
 try{
  const center=map?.getCenter?.();
  const camera={
   center:[Number(center?.lng),Number(center?.lat)],
   zoom:Number(map?.getZoom?.()),pitch:Number(map?.getPitch?.()),bearing:Number(map?.getBearing?.())
  };
  if(![...camera.center,camera.zoom,camera.pitch,camera.bearing].every(Number.isFinite))return false;
  const allowed=['map','route','participate','news','mine'];
  const tab=allowed.includes(app?.dataset?.tab)?app.dataset.tab:'map';
  const activePri=app?.dataset?.djPriVisible==='true'&&typeof app?.dataset?.djPriMode==='string'
   ?app.dataset.djPriMode:null;
  const priMode=activePri&&/^[a-zA-Z][a-zA-Z0-9_.-]{0,40}$/.test(activePri)?activePri:null;
  win.sessionStorage.setItem(MANUAL_THEME_RELOAD_KEY,JSON.stringify({
   theme,tab,camera,priMode,expires:Date.now()+30000
  }));
  win.location.reload();
  return true;
 }catch{
  try{win.sessionStorage.removeItem(MANUAL_THEME_RELOAD_KEY);}catch{}
  return false;
 }
}
// Kept as a no-op for older imports. Theme refresh is handled by the single
// explicit user-choice owner in ui-environment.js.
export function installManualThemeReload(){return ()=>{};}
