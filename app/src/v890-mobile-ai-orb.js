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
  let orb=null;
  let lastOrbPointer=0;
  const openExistingAi=()=>{
    const native=doc.getElementById('dj887-ai-quick-entry')||
      doc.getElementById('dj-ai-search-entry');
    const modal=doc.getElementById('dj-ai-search-modal');
    if(native){
      // Delegate exactly once. A deferred fallback could reopen AI after another sheet closes.
      native.click();
      return;
    }
    if(modal?.showModal){
      if(!modal.open)modal.showModal();
      modal.querySelector('.dj-ai-close')?.focus({preventScroll:true});
      return;
    }
    // The AI modal is map-dependent. Never route to an unrelated search.
    if(orb){
      orb.title='AI 검색 기능을 준비하고 있습니다';
      orb.setAttribute('aria-label','AI 검색 기능을 준비하고 있습니다');
    }
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
    // Require a pointer that actually began on this button. This blocks iOS
    // pointer retargeting after an unrelated sheet's close button disappears.
    orb.addEventListener('pointerdown',()=>{lastOrbPointer=Date.now();});
    orb.addEventListener('click',event=>{
      if(event.detail>0&&Date.now()-lastOrbPointer>1400)return;
      openExistingAi();
    });
    host.insertBefore(orb,theme);
  }
  media.addEventListener?.('change',sync);
  sync();
  return ()=>{media.removeEventListener?.('change',sync);orb?.remove();orb=null;};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installMobileAiOrb(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
