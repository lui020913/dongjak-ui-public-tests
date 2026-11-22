/** Unified UI theme contract. MapLibre remains the existing instance.
 * PWA metadata ownership: iOS standalone -> mobile-pwa-status-tone-v793;
 * other environments -> this controller. No screen reload or app remount. */
import css from './theme-contract.css?raw';
import {isIosHomeScreenPhone} from './mobile-pwa-status-tone-v793.js';

const STYLE_ID='dj-theme-contract';
const EDGE=Object.freeze({light:'#edf3ef',dark:'#252b32'});
export function syncThemeSurface({app,doc,win,force=false}) {
  const root=doc.documentElement;
  const theme=app?.dataset?.theme==='dark'?'dark':'light';
  const meta=doc.querySelector('meta[name="theme-color"]');
  const manifest=doc.getElementById('dj-app-manifest');
  root.dataset.theme=theme;
  root.style.colorScheme=theme;
  if(doc.body)doc.body.dataset.djThemeContract=theme;
  if(manifest){const href=`/manifest-${theme}.webmanifest`;if(manifest.getAttribute('href')!==href)manifest.setAttribute('href',href);}
  // iOS owns the native status-tone sampling and modal-specific colors.
  // Do not fight the existing standalone PWA status controller's meta writes.
  if((force||meta?.content!==EDGE[theme])&&!isIosHomeScreenPhone(win)&&meta)meta.content=EDGE[theme];
  return theme;
}
export function installThemeContract(doc=document,win=window) {
  const app=doc.getElementById('app');
  if(!app)return ()=>{};
  let style=doc.getElementById(STYLE_ID);
  let owned=false;
  if(!style){
    style=doc.createElement('style');
    style.id=STYLE_ID;
    style.textContent=css;
    doc.head.appendChild(style);
    owned=true;
  }
  const sync=()=>syncThemeSurface({app,doc,win});
  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.attributeName==='data-theme'))sync();
  });
  observer.observe(app,{attributes:true,attributeFilter:['data-theme']});
  win.addEventListener('dongjak:manual-theme-change',sync);
  win.addEventListener('pageshow',sync);
  sync();
  return ()=>{
    observer.disconnect();
    win.removeEventListener('dongjak:manual-theme-change',sync);
    win.removeEventListener('pageshow',sync);
    if(owned)style.remove();
  };
}
if(typeof document!=='undefined'){
  const boot=()=>installThemeContract(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
