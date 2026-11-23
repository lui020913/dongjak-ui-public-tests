// One-shot recovery for installed iOS web apps. Actual OS chrome pixels are inaccessible.
export const MANUAL_THEME_RELOAD_KEY='dj-manual-theme-reload-v1';
export function readManualThemeReload(storage,now=Date.now()){
 try{const value=JSON.parse(storage?.getItem(MANUAL_THEME_RELOAD_KEY)||'null');storage?.removeItem(MANUAL_THEME_RELOAD_KEY);if(!value||!Number.isFinite(value.expires)||value.expires<now||!['light','dark'].includes(value.theme))return null;const c=value.camera;if(!Array.isArray(c?.center)||c.center.length!==2||![...c.center,c.zoom,c.pitch,c.bearing].every(Number.isFinite))return null;return value;}catch{return null;}
}
// Kept as a no-op for older imports. Theme refresh is handled by the single
// explicit user-choice owner in ui-environment.js.
export function installManualThemeReload(){return ()=>{};}
