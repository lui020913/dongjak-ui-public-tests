// One-shot recovery for installed iOS web apps. Actual OS chrome pixels are inaccessible.
export const MANUAL_THEME_RELOAD_KEY='dj-manual-theme-reload-v1';
export function readManualThemeReload(storage,now=Date.now()){
 try{const value=JSON.parse(storage?.getItem(MANUAL_THEME_RELOAD_KEY)||'null');storage?.removeItem(MANUAL_THEME_RELOAD_KEY);if(!value||!Number.isFinite(value.expires)||value.expires<now||!['light','dark'].includes(value.theme))return null;const c=value.camera;if(!Array.isArray(c?.center)||c.center.length!==2||![...c.center,c.zoom,c.pitch,c.bearing].every(Number.isFinite))return null;return value;}catch{return null;}
}
export function isInstalledIosPhone(win){const n=win.navigator||{};return Boolean(/iPhone|iPod/.test(n.userAgent||'')&&(n.standalone===true||win.matchMedia?.('(display-mode: standalone)')?.matches)&&win.matchMedia?.('(max-width:699px)')?.matches);}
// Retired: no destructive iOS theme relaunches. Existing consumers may still import this.
export function installManualThemeReload(){return ()=>{};}
