/** v8.7.6 desktop behavior, with every listener limited to its own controls. */
import './v876-desktop-final.css';

export function installDesktopV876(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app||app.dataset.dj876DesktopReady==='true')return ()=>{};
  app.dataset.dj876DesktopReady='true';
  const cleanups=[];
  const on=(node,event,handler,options)=>{if(!node)return;node.addEventListener(event,handler,options);cleanups.push(()=>node.removeEventListener(event,handler,options));};
  const isDesktop=()=>win.matchMedia?.('(min-width:700px)')?.matches===true;
  // Confirmation is only for a person's actual click; internal route cleanup,
  // analysis shutdown and the confirmed click still use the original owner.
  const dialog=doc.createElement('section');
  dialog.id='dj876-night-confirm';dialog.hidden=true;
  dialog.innerHTML='<div class="dj876-night-card" role="dialog" aria-modal="true" aria-labelledby="dj876-night-title"><h2 id="dj876-night-title">야간 보행시야를 전환할까요?</h2><p>보행시야 분석을 켜거나 끄면 지도 색상과 표시 정보가 변경됩니다.</p><div class="dj876-night-actions"><button type="button" data-dj876-night="cancel">취소</button><button type="button" data-dj876-night="confirm">전환</button></div></div>';
  app.append(dialog);cleanups.push(()=>dialog.remove());
  let pending=null;
  on(doc,'click',event=>{
    if(!isDesktop()||!event.isTrusted)return;
    const target=event.target?.closest?.('#night-visibility-quick-off,#night-visibility-toggle');
    if(!target||!dialog.hidden)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    pending=target;dialog.hidden=false;
    dialog.querySelector('[data-dj876-night="cancel"]')?.focus?.({preventScroll:true});
  },true);
  on(dialog,'click',event=>{
    const action=event.target.closest?.('[data-dj876-night]')?.dataset.dj876Night;
    if(!action)return;
    dialog.hidden=true;
    if(action==='confirm'&&pending?.isConnected)pending.click();
    pending=null;
  });
  on(doc,'keydown',event=>{if(!dialog.hidden&&event.key==='Escape'){dialog.hidden=true;pending=null;}});
  // Deferred cleanup of any stale selected pin at the origin on desktop.
  // A real selection is never removed while its detail or transport window is open.
  const cleanOrphanPin=()=>{
    if(!win.matchMedia?.('(min-width:1080px)')?.matches)return;
    if(doc.querySelector('#map .dj-place-detail-popup,#transport-sheet:not([hidden])'))return;
    for(const marker of doc.querySelectorAll('#map .maplibregl-marker:has(.dj807-facility-pin)')){
      if(marker.closest('.maplibregl-popup'))continue;
      marker.remove();
    }
  };
  let cleanupTimer=0;
  const scheduleCleanup=()=>{
    if(cleanupTimer)win.clearTimeout(cleanupTimer);
    cleanupTimer=win.setTimeout(()=>{cleanupTimer=0;cleanOrphanPin();},380);
  };
  on(doc,'click',event=>{if(event.target?.closest?.('#transport-close,.maplibregl-popup-close-button,#map-quick-search-close'))scheduleCleanup();},true);
  cleanups.push(()=>cleanupTimer&&win.clearTimeout(cleanupTimer));
  return ()=>{cleanups.forEach(fn=>fn());delete app.dataset.dj876DesktopReady;};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installDesktopV876(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
