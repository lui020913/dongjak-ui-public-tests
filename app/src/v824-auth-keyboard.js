/** iOS account-entry viewport protection.
 * Prevent document-level panning during input focus; scroll the inner account
 * panel only, leaving the map header and bottom nav under their own control. */
export function installAccountKeyboardGuard(doc=document,win=window){
  const panel=doc.getElementById('mine-panel');
  if(!panel)return ()=>{};
  const root=doc.documentElement;
  const isAuthInput=node=>node?.matches?.('#dj824-account input,#dj824-account textarea,#dj824-account select');
  const isMobile=()=>win.matchMedia?.('(max-width:699px)')?.matches;
  const sync=()=>{
    const focused=doc.activeElement;
    const active=isMobile()&&isAuthInput(focused)&&panel.contains(focused)&&!panel.hidden;
    root.classList.toggle('dj824-auth-focused',!!active);
    if(!active)return;
    // iOS keyboard shrinks the visual viewport. Scroll the panel, NOT window.
    const vv=win.visualViewport;
    const visibleBottom=vv?(vv.offsetTop+vv.height):win.innerHeight;
    const box=focused.getBoundingClientRect();
    const overlap=box.bottom-(visibleBottom-12);
    if(overlap>0 && typeof panel.scrollBy==='function')panel.scrollBy({top:overlap+12,behavior:'auto'});
  };
  const onFocus=event=>{if(isAuthInput(event.target))win.requestAnimationFrame?.(sync);};
  const onBlur=event=>{if(isAuthInput(event.target))win.requestAnimationFrame?.(sync);};
  panel.addEventListener('focusin',onFocus);
  panel.addEventListener('focusout',onBlur);
  win.visualViewport?.addEventListener('resize',sync,{passive:true});
  win.visualViewport?.addEventListener('scroll',sync,{passive:true});
  return ()=>{
    root.classList.remove('dj824-auth-focused');
    panel.removeEventListener('focusin',onFocus);
    panel.removeEventListener('focusout',onBlur);
    win.visualViewport?.removeEventListener('resize',sync);
    win.visualViewport?.removeEventListener('scroll',sync);
  };
}
if(typeof document!=='undefined'){
  const boot=()=>installAccountKeyboardGuard(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
