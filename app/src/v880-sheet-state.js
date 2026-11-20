/** v8.8.0: one owner of the mobile fullscreen-sheet state.
 * This module never opens/closes a sheet: existing window lifecycle controls
 * visibility, while this coordinator only owns optional expansion.
 */
export function createMobileSheetCoordinator({app,doc,win,panels,nav}={}) {
  if(!app||!doc||!win)return {sync(){},schedule(){},toggle(){return false;},dispose(){}};
  const list=(panels||[]).filter(Boolean);
  const isPhone=()=>win.matchMedia?.('(max-width:1079px)')?.matches===true;
  let disposed=false,queued=false,rafId=null,fallbackId=null,version=0;
  const measureNav=()=>{
    const rect=nav?.getBoundingClientRect?.();
    // The bottom bar is sometimes temporarily hidden during route transitions.
    const height=nav&&!nav.hidden&&rect?.height>0?Math.ceil(rect.height):0;
    app.style?.setProperty?.('--dj877-nav-height',`${height}px`);
  };
  const sync=()=>{
    if(disposed)return;
    const phone=isPhone();
    // Hidden sheets may keep the old CSS class after their exit transition.
    for(const panel of list)if((panel.hidden||!phone)&&panel.classList.contains('dj871-sheet-expanded')){
      panel.classList.remove('dj871-sheet-expanded');
    }
    // Last visible panel wins; two expanded sheets must never overlap.
    const expanded=[...new Set([...list,...(doc.querySelectorAll?.('.dj871-sheet-expanded:not([hidden])')||[])])].filter(p=>phone&&!p.hidden&&p.classList.contains('dj871-sheet-expanded'));
    const active=expanded.at(-1)||null;
    for(const panel of expanded){if(panel!==active)panel.classList.remove('dj871-sheet-expanded');}
    app.classList.toggle('dj877-any-expanded',Boolean(active));
    measureNav();
    for(const panel of list){
      const button=panel.querySelector?.('.dj877-expand-button');
      if(!button)continue;
      const selected=panel===active;
      button.setAttribute('aria-pressed',String(selected));
      button.setAttribute('aria-expanded',String(selected));
      button.setAttribute('aria-label',selected?'창 작게 접기':'창 크게 펼치기');
    }
  };
  const invalidate=()=>{
    version++;queued=false;
    if(rafId!==null)win.cancelAnimationFrame?.(rafId);
    if(fallbackId!==null)win.clearTimeout?.(fallbackId);
    rafId=null;fallbackId=null;
  };
  const schedule=()=>{
    if(disposed||queued)return;
    queued=true;
    const token=++version;
    const commit=()=>{
      if(disposed||token!==version)return;
      invalidate();sync();
    };
    try{
      if(typeof win.requestAnimationFrame==='function')rafId=win.requestAnimationFrame(commit);
    }catch{rafId=null;}
    // iOS PWA rAF may stall after tab/background resume.
    fallbackId=win.setTimeout?.(commit,150)??null;
    if(rafId===null&&fallbackId===null)commit();
  };
  const toggle=(panel)=>{
    if(disposed||!isPhone()||!list.includes(panel)||panel.hidden)return false;
    const expand=!panel.classList.contains('dj871-sheet-expanded');
    for(const sibling of list)if(sibling!==panel)sibling.classList.remove('dj871-sheet-expanded');
    panel.classList.toggle('dj871-sheet-expanded',expand);
    invalidate();sync();
    return expand;
  };
  sync();
  return {sync,schedule,toggle,dispose(){if(disposed)return;invalidate();disposed=true;
    app.classList.remove('dj877-any-expanded');app.style?.removeProperty?.('--dj877-nav-height');}};
}
