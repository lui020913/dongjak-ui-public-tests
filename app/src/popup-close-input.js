/**
 * Mobile MapLibre popups can lose a synthesized click after a short tap during
 * a compositor transform. A primary pointerup schedules the same native close
 * one task later; an ordinary click cancels that fallback. No synthetic click
 * is replayed and the popup's original close handler owns cleanup.
 */
export function bindReliablePopupClose(button,onClose,win=globalThis.window){
  if(!button||typeof onClose!=='function')return ()=>{};
  let pending=null,closed=false,disposed=false,touch=null;
  const timers=win&&typeof win.setTimeout==='function'&&typeof win.clearTimeout==='function'?win:globalThis;
  const clear=()=>{if(pending!==null){timers.clearTimeout(pending);pending=null;}};
  const invoke=()=>{
    if(disposed||closed)return;
    closed=true;clear();onClose();
  };
  const onClick=event=>{event?.stopPropagation?.();invoke();};
  const onPointerUp=event=>{
    if(disposed||closed||event.isPrimary===false||event.button!==undefined&&event.button!==0)return;
    event.stopPropagation?.();
    clear();
    pending=timers.setTimeout(invoke,0);
  };
  // Safari may deliver native TouchEvents but no pointerup/click after a
  // sheet transform. Only a short single-finger tap starting and ending on
  // this button is eligible. A swipe or cancelled gesture must not close it.
  const onTouchStart=e=>{
    const t=e.changedTouches?.[0];
    touch=e.touches?.length===1&&t?{id:t.identifier,x:t.clientX,y:t.clientY}:null;
  };
  const onTouchMove=e=>{
    if(!touch)return;
    const t=Array.from(e.touches||[]).find(t=>t.identifier===touch.id);
    if(!t||Math.hypot(t.clientX-touch.x,t.clientY-touch.y)>12)touch=null;
  };
  const onTouchEnd=e=>{
    const start=touch;touch=null;
    if(!start||disposed||closed)return;
    const t=Array.from(e.changedTouches||[]).find(t=>t.identifier===start.id);
    if(!t||Math.hypot(t.clientX-start.x,t.clientY-start.y)>12)return;
    const r=button.getBoundingClientRect?.();
    if(r&&(t.clientX<r.left||t.clientX>r.right||t.clientY<r.top||t.clientY>r.bottom))return;
    e.stopPropagation?.();clear();pending=timers.setTimeout(invoke,0);
  };
  const onTouchCancel=()=>{touch=null;clear();};
  const listeners=[['click',onClick],['pointerup',onPointerUp],['touchstart',onTouchStart],['touchmove',onTouchMove],['touchend',onTouchEnd],['touchcancel',onTouchCancel]];
  for(const [type,fn] of listeners)button.addEventListener(type,fn);
  const dispose=()=>{
    disposed=true;touch=null;clear();
    for(const [type,fn] of listeners)button.removeEventListener(type,fn);
  };
  // Transport reuses one persistent DOM button for each selected stop/station.
  // Reset only when a new selection is committed, cancelling stale fallbacks.
  dispose.reset=()=>{if(!disposed){clear();closed=false;touch=null;}};
  return dispose;
}
