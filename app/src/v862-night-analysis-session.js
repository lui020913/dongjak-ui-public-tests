/** Keep temporary night-visibility analysis scoped to the standalone map.
 * The report must close before entering the pedestrian-safety workbench and
 * must not remain active after leaving the map tab. */
export function installNightAnalysisSessionGuard({app=document.getElementById('app'),doc=document}={}){
  if(!app||!doc||typeof MutationObserver==='undefined')return ()=>{};
  const stop=()=>{
    const button=doc.getElementById('night-visibility-quick-off');
    if(button?.getAttribute('aria-pressed')==='true')button.click();
  };
  const stopIfLeavingMapOrOpeningWorkbench=()=>{
    if(app.dataset.tab!=='map'||app.classList.contains('map-safety-open'))stop();
  };
  const safetyToggle=doc.getElementById('map-safety-toggle');
  // Capture before the workbench's own click handler changes its panel state.
  safetyToggle?.addEventListener('click',stop,true);
  const observer=new MutationObserver(stopIfLeavingMapOrOpeningWorkbench);
  observer.observe(app,{attributes:true,attributeFilter:['data-tab','class']});
  stopIfLeavingMapOrOpeningWorkbench();
  return ()=>{observer.disconnect();safetyToggle?.removeEventListener('click',stop,true);};
}
if(typeof document!=='undefined'){
  const start=()=>installNightAnalysisSessionGuard();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
