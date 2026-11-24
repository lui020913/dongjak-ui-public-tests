import {fadePanelOut} from './v852-panel-transition.js';
import {dispatchLocalClick} from './v865-close-dispatch.js';
/** Main safety tab as a home action: restore default visible layers, map extent,
 * and dismiss open sheets. The existing buttons remain owners of map layers.
 * Never clear saved places, community posts, accounts, or theme preferences. */
export const DEFAULT_BASE_LAYERS=Object.freeze(['metro','bus','buildings','boundary']);
export const OPTIONAL_TOGGLES=Object.freeze([
  '[data-dj-import]',
  '#toggle-safety-facilities','#toggle-crosswalks','#toggle-essentials',
  '#toggle-public-facilities','#toggle-station-accessibility',
  '#protection-zone-toggle','#sangdo-speed-toggle','#sangdo-camera-toggle',
  '#night-visibility-toggle','#ped-access-toggle','#toggle-road-width',
  '#dj-sangdo-team-toggle','[data-live-vehicle]'
]);

function isPressed(button){return button?.getAttribute('aria-pressed')==='true';}
function closeIfOpen(doc,selector,win=doc.defaultView||globalThis.window){
  const node=doc.querySelector(selector);
  if(node&&!node.hidden)dispatchLocalClick(node.querySelector('button[aria-label*="닫기"]'),win);
}
export function resetMapDisplay(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app)return {restored:0};
  let restored=0;
  // Reset using controller-owned controls so app state, MapLibre visibility,
  // and localStorage are synchronized. Never directly mutate map layer IDs.
  for(const key of DEFAULT_BASE_LAYERS){
    const btn=doc.querySelector(`[data-base-layer="${key}"]`);
    if(btn&&btn.getAttribute('aria-pressed')==='false'&&!btn.disabled){btn.click();restored++;}
  }
  for(const selector of OPTIONAL_TOGGLES){
    for(const btn of doc.querySelectorAll(selector)){
      if(isPressed(btn)&&!btn.disabled){btn.click();restored++;}
    }
  }
  const all=doc.querySelector('[data-filter="전체"]');
  if(all&&!all.classList.contains('selected'))all.click();
  // Reset district selection through the district layer controller.
  doc.dispatchEvent(new CustomEvent('dongjak:map-home-reset'));
  const districtClear=doc.getElementById('admin-dong-clear');
  // The event is sufficient when the district module was installed; the
  // controller's clear button remains an optional compatibility fallback.
  if(!districtClear){doc.getElementById('overview-admin-clear')?.click();}
  const overview=doc.getElementById('overview-sheet');
  if(overview)overview.hidden=true;
  for(const id of ['map-advanced-controls','map-safety-controls']){
    const cls=id==='map-advanced-controls'?'map-controls-open':'map-safety-open';
    const toggle=doc.getElementById(id==='map-advanced-controls'?'map-tools-toggle':'map-safety-toggle');
    if(app.classList.contains(cls)&&toggle)toggle.click();
  }
  // Remove transient map surface cards without touching stored content.
  for(const id of ['transport-sheet','detail-sheet','entry-sheet','admin-dong-picker']){
    const panel=doc.getElementById(id);
    if(panel&&!panel.hidden){
      const close=panel.querySelector('#transport-close,#close-detail,#cancel-add,#admin-dong-close');
      dispatchLocalClick(close,win);
    }
  }
  for(const popup of doc.querySelectorAll('.maplibregl-popup-close-button'))dispatchLocalClick(popup,win);
  // Use the app's existing home-camera action, which also resets pitch/bearing.
  doc.getElementById('center-dongjak')?.click();
  app.dataset.djHomeResetAt=String(Date.now());
  return {restored};
}
/** Dismiss temporary windows on the first home press, without changing map
 * layers, active filters, or camera. Double tap within 1000ms to reset. */
export function closeMapWindows(doc=document,win=doc.defaultView||globalThis.window){
  const app=doc.getElementById('app');
  if(!app)return;
  // A page close does not imply resetting persisted layers or favorites.
  for(const id of ['overview-sheet','admin-dong-picker','transport-sheet','detail-sheet',
    'entry-sheet','map-gesture-guide','dj833-night-modal','dj833-weather-sheet',
    'dj832-feature-sheet','dj832-info-sheet','dj-mobile-utilities']){
    const panel=doc.getElementById(id);
    if(panel&&!panel.hidden){
      const close=panel.querySelector('#admin-dong-close,#transport-close,#close-detail,#cancel-add,#overview-sheet-close,#map-gesture-guide-close,[class*="close"]');
      if(close)dispatchLocalClick(close,win);
      else if(id==='dj-mobile-utilities')fadePanelOut(panel,win,190);
      else panel.hidden=true;
    }
  }
  for(const [className,buttonId] of [['map-controls-open','map-tools-toggle'],
    ['map-safety-open','map-safety-toggle']]){
    if(app.classList.contains(className))doc.getElementById(buttonId)?.click();
  }
  for(const panel of doc.querySelectorAll('.page-panel'))if(panel.dataset.djTabOutgoing!=='true')panel.hidden=true;
  const overview=doc.getElementById('overview-sheet');if(overview)overview.hidden=true;
  doc.querySelectorAll('.maplibregl-popup-close-button').forEach(node=>dispatchLocalClick(node,win));
  doc.dispatchEvent(new CustomEvent('dj836:close-overlay-tools'));
}
export function installSafetyHomeTab(doc=document,win=window){
  const app=doc.getElementById('app');
  const home=doc.querySelector('#bottom-nav .nav-tab[data-tab="map"]');
  if(!app||!home)return ()=>{};
  home.setAttribute('aria-label','안전지도: 한 번은 창 닫기, 빠르게 두 번은 지도 초기화');
  let lastTap=-Infinity;
  const onClick=(event)=>{
    if(event.target?.closest?.('#bottom-nav .nav-tab[data-tab="map"]')!==home)return;
    // A newer native home navigator owns this tab in the integrated app.
    if(app.dataset.djHomeGuardActive==='1')return;
    if(app.dataset.dj836NavigationOnly==='1')return;
    const now=typeof win.performance?.now==='function'?win.performance.now():Date.now();
    const doubleTap=now-lastTap<=1000;
    lastTap=doubleTap?-Infinity:now;
    // The legacy single-click handler opens an overview when map is active.
    // Cancel that handler only on map, allowing regular tab transitions otherwise.
    if(app.dataset.tab==='map'){event.stopImmediatePropagation();event.preventDefault();}
    const action=()=>{if(doubleTap)resetMapDisplay(doc,win);else closeMapWindows(doc);};
    win.queueMicrotask(action);
  };
  doc.addEventListener('click',onClick,true);
  return ()=>doc.removeEventListener('click',onClick,true);
}
if(typeof document!=='undefined'){
  const start=()=>installSafetyHomeTab(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
