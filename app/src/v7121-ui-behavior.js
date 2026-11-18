/** v7.12.0 UI-only adaptors. The approved MapLibre/main.js engine remains byte-identical.
 * Text changes are intentionally limited to presentation of an existing
 * route candidate; GPS and pedestrian network calculations are unmodified.
 */
export function installRouteLocationPresentation(doc = document) {
  const panel=doc.getElementById('route-transit-confirm');
  const title=doc.getElementById('route-transit-confirm-name');
  const desc=doc.getElementById('route-transit-confirm-desc');
  if(!panel||!title||!desc)return ()=>{};
  const normalize=()=>{
    if(panel.hidden)return;
    // The route engine supplies real station/stop names when available.
    if(title.textContent.trim()==='지도에서 선택한 위치')title.textContent='선택한 지도 위치';
    const detail=desc.textContent||'';
    if(/위도\s*\d|경도\s*\d|^지도 위치\s*·/.test(detail)){
      desc.textContent='지도에서 선택한 장소가 맞습니까?';
    }
  };
  const panelWatch=new MutationObserver(normalize);
  panelWatch.observe(panel,{attributes:true,attributeFilter:['hidden']});
  const labels=['route-start-label','route-end-label'].map(id=>doc.getElementById(id)).filter(Boolean);
  const labelWatch=new MutationObserver(()=>{
    for(const el of labels){
      const t=el.textContent||'';
      if(/지도 지정\s*·\s*[-+]?\d/.test(t))el.textContent='지도에서 선택한 장소';
    }
  });
  labels.forEach(el=>labelWatch.observe(el,{childList:true,characterData:true,subtree:true}));
  normalize();
  return ()=>{panelWatch.disconnect();labelWatch.disconnect();};
}
if(typeof document!=='undefined'){
  const boot=()=>installRouteLocationPresentation(document);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
