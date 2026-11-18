/** v811: prevent redundant same-tab navigation and input overlays. */
export function installV811Experience(doc=document,win=window){
  const app=doc.getElementById('app'); if(!app)return ()=>{};
  // The unified owner handles duplicate active tab clicks.
  // Ensure a real input event from selected suggestions hides the overlay.
  const input=doc.getElementById('map-quick-search-query');
  const form=input?.closest('form');
  const sync=()=>form?.classList.toggle('dj807-has-input',Boolean(input?.value));
  input?.addEventListener('input',sync);
  input?.addEventListener('change',sync);
  // Native double-tap magnification can otherwise zoom the web page without
  // affecting MapLibre camera. Keep map gesture handlers untouched.
  let last=0;
  const preventNativeZoom=e=>{
    const now=Date.now();
    const allowed=e.target?.closest?.('#map,#map canvas,.maplibregl-canvas');
    if(!allowed && now-last<280 && e.cancelable)e.preventDefault();
    last=now;
  };
  doc.addEventListener('touchend',preventNativeZoom,{passive:false});
  return ()=>{input?.removeEventListener('input',sync);input?.removeEventListener('change',sync);doc.removeEventListener('touchend',preventNativeZoom);};
}
if(typeof document!=='undefined'){
 const run=()=>installV811Experience();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
}
