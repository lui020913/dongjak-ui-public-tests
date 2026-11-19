import {detectPlatform} from './shared/detect-platform.js';
// Vite substitutes the constant per build. In universal deployments the
// platform is determined per browser (same Cloudflare URL for all users).
const buildTarget=typeof __DJ_PLATFORM_BUILD__==='string' ? __DJ_PLATFORM_BUILD__ : 'universal';
const target=detectPlatform(typeof window==='undefined'?{}:window,buildTarget);
if(typeof document!=='undefined'){
  document.documentElement.dataset.djPlatform=target;
}
if(target==='ios-pwa')await import('./ios-pwa/entry.js');
else if(target==='android')await import('./android/entry.js');
else await import('./pc-chromium/entry.js');
// Mobile sheet presentation has its own entry, separate from desktop/MapLibre.
if(target==='ios-pwa'||target==='android')await import('./shared/mobile-panel-layout.js');
export {target};
