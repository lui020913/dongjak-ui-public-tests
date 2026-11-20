/**
 * Mobile MapLibre popups can lose a synthesized click after a short tap during
 * a compositor transform. A primary pointerup schedules the same native close
 * one task later; an ordinary click cancels that fallback. No synthetic click
 * is replayed and the popup's original close handler owns cleanup.
 */
export function bindReliablePopupClose(button,onClose,win=globalThis.window){
  if(!button||typeof onClose!=='function')return ()=>{};
  let pending=null,closed=false,disposed=false;
  const clear=()=>{if(pending!==null){win.clearTimeout(pending);pending=null;}};
  const invoke=()=>{
    if(disposed||closed)return;
    closed=true;clear();onClose();
  };
  const onClick=event=>{event.stopPropagation?.();invoke();};
  const onPointerUp=event=>{
    if(disposed||closed||event.isPrimary===false||event.button!==undefined&&event.button!==0)return;
    event.stopPropagation?.();
    clear();
    pending=win.setTimeout(invoke,0);
  };
  button.addEventListener('click',onClick);
  button.addEventListener('pointerup',onPointerUp);
  return ()=>{
    disposed=true;clear();
    button.removeEventListener('click',onClick);
    button.removeEventListener('pointerup',onPointerUp);
  };
}
