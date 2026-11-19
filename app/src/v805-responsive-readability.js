import {dispatchLocalClick} from './v865-close-dispatch.js';

/** Follow-up UI coordination for the user's AUDIO/AED/SANGDO integrated base.
 * The existing map and admin controls remain the sole owners of GIS state.
 */
export function installResponsiveReadability(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app)return ()=>{};
  const cleaners=[];
  const listen=(node,name,fn,opts)=>{
    node?.addEventListener?.(name,fn,opts);
    cleaners.push(()=>node?.removeEventListener?.(name,fn,opts));
  };
  // v8.4.3: 안전지도 탭은 지도로만 이동합니다. 행정동 선택창은
  // 사용자가 지도 옵션의 행정동 선택 버튼을 명시적으로 누른 경우에만
  // 기존 main.js/행정동 레이어 컨트롤러가 열도록 합니다.
  // 과거 데스크톱 전용 탭 선택에 따른 자동 열기 기능을 제거했습니다.

  // Clear the device-specific redundant mobile scroll when the station is
  // short enough to fit. If the display is exceptionally short, scrolling is
  // retained rather than hiding an action at the bottom.
  const transport=doc.getElementById('transport-sheet');
  let fitFrame=0;
  const fit=()=>{
    fitFrame=0;
    if(!transport)return;
    transport.classList.remove('dj805-subway-tight','dj805-subway-no-scroll');
    if(!win.matchMedia?.('(max-width:699px)')?.matches||transport.hidden||transport.dataset.kind!=='subway')return;
    if(transport.scrollHeight>transport.clientHeight+2){
      transport.classList.add('dj805-subway-tight');
    }
    // Recalculate after the tighter spacing. Never hide overflow unless the
    // entire station information really fits the currently available height.
    if(transport.scrollHeight<=transport.clientHeight+2){
      transport.classList.add('dj805-subway-no-scroll');
    }
  };
  const scheduleFit=()=>{
    if(fitFrame)return;
    fitFrame=win.requestAnimationFrame?.(fit)||0;
    if(!fitFrame)Promise.resolve().then(fit);
  };
  // Recheck after live results, time-table tab changes and viewport rotation.
  if(transport){
    const observer=new MutationObserver(scheduleFit);
    observer.observe(transport,{attributes:true,attributeFilter:['hidden','data-kind','data-transport-view'],childList:true,subtree:true});
    cleaners.push(()=>observer.disconnect());
  }
  listen(win,'resize',scheduleFit,{passive:true});
  listen(win,'orientationchange',scheduleFit,{passive:true});
  scheduleFit();

  // The old modules often hide a panel synchronously on click, which defeats
  // CSS exit animation. Delay ONLY a direct close-button click until its exit
  // animation finishes; then invoke the original button listener with a
  // non-bubbling event so the map canvas cannot interpret it as another tap.
  // Browser/assistive-tech reduced-motion preferences keep immediate closing.
  const closeControls=[
    '#transport-close','#admin-dong-close','#map-options-mobile-close',
    '#map-options-desktop-close','#map-safety-close','#road-width-legend-close',
    '#map-gesture-guide-close','#version-history-close',
    '.dj-about-close','.dj-about-done','#dj-settings-close','#dj-settings-done',
    '.dj800-type-close','.dj800-type-done','.page-dismiss','[data-close-page]',
    '#overview-sheet-close','#close-detail','#back-to-map','#pza-road-close',
    '#night-visibility-float-stop','.maplibregl-popup-close-button'
  ].join(',');
  const closing=new WeakSet();
  const closeWithMotion=event=>{
    if(app.dataset.dj806Motion==='on')return;
    if(!event.isTrusted)return; // programmatic replay uses original handlers.
    const button=event.target?.closest?.(closeControls);
    if(!button)return;
    if(closing.has(button)){event.preventDefault();event.stopImmediatePropagation();return;}
    if(app.classList.contains('dj-reduced-animation') ||
       win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
    const container=button.closest?.(
      '.page-panel,#transport-sheet,#admin-dong-picker,#map-advanced-controls,'+
      '#map-safety-controls,#road-width-legend,#map-gesture-guide,'+
      '#version-history-modal,#dj-app-about,#dj-map-settings,#dj800-type-panel,'+
      '#overview-sheet,#detail-sheet,#pza-road-sheet,#night-visibility-float,.maplibregl-popup');
    if(!container || container.hidden || typeof container.animate!=='function')return;
    const target=container.id==='dj-app-about'?container.querySelector('.dj-about-card')||container:
      container.id==='dj-map-settings'?container.querySelector('.dj-map-settings-card')||container:
      container.id==='version-history-modal'?container.querySelector('.version-history-dialog')||container:
      container.classList.contains('maplibregl-popup')?container.querySelector('.maplibregl-popup-content')||container:container;
    if(typeof target.animate!=='function')return;
    event.preventDefault();event.stopImmediatePropagation();
    closing.add(button);
    const anim=target.animate([
      {opacity:1,translate:'0 0',scale:'1'},
      {opacity:0,translate:'0 12px',scale:'.988'}
    ],{duration:170,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
    // WebKit may not settle animation.finished after a tab/PWA interruption.
    // A bounded timeout and exactly-once guard prevent the close control
    // from leaving an invisible sheet intercepting every subsequent tap.
    let completed=false;
    let fallback=null;
    const replay=()=>{
      if(completed)return;
      completed=true;
      if(fallback!==null)win.clearTimeout(fallback);
      try{anim.cancel();}catch{}
      closing.delete(button);
      dispatchLocalClick(button,win);
    };
    fallback=win.setTimeout(replay,260);
    anim.finished.then(replay,replay);
  };
  listen(doc,'click',closeWithMotion,true);
  return ()=>{
    if(fitFrame)win.cancelAnimationFrame?.(fitFrame);
    for(const clean of cleaners)clean();
  };
}
if(typeof document!=='undefined'){
  const boot=()=>installResponsiveReadability();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
