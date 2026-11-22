import {installAiSurfaceDismissGuard,isAiBlockedAfterDismiss,isMapDetailVisible} from './ai-surface-dismiss-guard.js';
/**
 * v8.9.0 — Replace the visible mobile theme orb with a green AI entry.
 * Keep #theme-toggle in the DOM: night visibility uses its original event
 * pipeline, so removing it would silently break night-mode activation.
 * No AI backend logic or existing event-bearing search button is duplicated.
 */
export function installMobileAiOrb(doc=document,win=window){
  const media=win.matchMedia?.('(max-width:1079px), (min-width:1080px) and (max-width:1366px) and (pointer:coarse)');
  const app=doc.getElementById('app');
  const theme=doc.getElementById('theme-toggle');
  const host=theme?.closest('.header-tools');
  if(!media||!app||!host||!theme)return ()=>{};
  const releaseDismissGuard=installAiSurfaceDismissGuard(doc);
  let orb=null;
  const openExistingAi=()=>{
    if(isAiBlockedAfterDismiss()||isMapDetailVisible(doc))return;
    // Never proxy a synthetic .click() and then force showModal() in the next
    // animation frame: that can reopen AI after a transport sheet is dismissed.
    const native=doc.getElementById('dj887-ai-quick-entry')||doc.getElementById('dj-ai-search-entry');
    if(native)doc.dispatchEvent(new CustomEvent('dongjak:explicit-ai-open'));
    else if(orb){orb.title='AI 검색 기능을 준비하고 있습니다';}
  };
  function sync(){
    if(!media.matches){
      orb?.remove();orb=null;
      return;
    }
    if(orb?.isConnected)return;
    orb=doc.createElement('button');
    orb.type='button';
    orb.id='dj890-ai-orb';
    orb.title='AI 보행안전정보 검색';
    orb.setAttribute('aria-label','AI 보행안전정보 검색 열기');
    orb.setAttribute('aria-haspopup','dialog');
    const txt=doc.createElement('span');
    txt.className='dj890-ai-orb-text';
    txt.textContent='AI';
    orb.append(txt);
    let startedOnOrb=false,pointerAt=0,keyboardAt=0;
    orb.addEventListener('pointerdown',event=>{
      startedOnOrb=!isAiBlockedAfterDismiss()&&orb.contains(event.target);
      pointerAt=Date.now();
    },true);
    orb.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '||event.key==='Spacebar')keyboardAt=Date.now();
    });
    orb.addEventListener('click',event=>{
      if(!event.isTrusted||isAiBlockedAfterDismiss()||isMapDetailVisible(doc)){
        startedOnOrb=false;return;
      }
      // iOS also emits click(detail=0) without a preceding pointer event
      // after the underlying popup disappears. Only a focused, deliberate
      // accessibility/keyboard activation may use that path.
      const pointerIntent=startedOnOrb&&Date.now()-pointerAt<1400;
      const accessibilityIntent=event.detail===0&&doc.activeElement===orb;
      const keyboardIntent=event.detail===0&&Date.now()-keyboardAt<1000;
      startedOnOrb=false;
      if(!pointerIntent&&!keyboardIntent&&!accessibilityIntent)return;
      openExistingAi();
    });
    host.insertBefore(orb,theme);
  }
  media.addEventListener?.('change',sync);
  sync();
  return ()=>{media.removeEventListener?.('change',sync);releaseDismissGuard();orb?.remove();orb=null;};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installMobileAiOrb(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
