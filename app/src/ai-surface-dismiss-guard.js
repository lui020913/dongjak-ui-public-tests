/** A single owner for accidental AI reopens after map sheet dismissal.
 * On iOS a delayed native click can land on the AI orb behind a popup that
 * was removed during pointerup. The original pointer must not become AI intent.
 * Explicit later taps and keyboard accessibility continue to work.
 */
export const AI_DISMISS_GUARD_MS=1900;
export const AI_DISMISS_CONTROLS=[
  '#transport-close','.dj-place-header-close',
  '.maplibregl-popup-close-button',
  '.dj-sheet-chrome-close','.page-dismiss',
  '[data-close-page]','[data-dismiss]',
  '.dj-place-close','#dj-mobile-utilities-close',
  '[aria-label*="닫기"]'
].join(',');

let blockedUntil=0;
const installed=new WeakMap();

export function markAiSurfaceDismissal(now=Date.now(),duration=AI_DISMISS_GUARD_MS){
  blockedUntil=Math.max(blockedUntil,now+Math.max(0,duration));
  return blockedUntil;
}
export function isAiBlockedAfterDismiss(now=Date.now()){
  return now<blockedUntil;
}
export function isAiSurfaceDismissControl(target){
  return Boolean(target?.closest?.(AI_DISMISS_CONTROLS));
}
export function isMapDetailVisible(doc=globalThis.document){
  return Boolean(doc?.querySelector?.(
    '#transport-sheet:not([hidden]),.dj-place-detail-popup:not([hidden])'
  ));
}
export function installAiSurfaceDismissGuard(doc=globalThis.document){
  if(!doc?.addEventListener)return ()=>{};
  const current=installed.get(doc);
  if(current){
    current.refs++;
    return ()=>{
      if(--current.refs===0){current.dispose();installed.delete(doc);}
    };
  }
  const capture=event=>{
    if(isAiSurfaceDismissControl(event.target))markAiSurfaceDismissal();
  };
  const onDismiss=()=>markAiSurfaceDismissal();
  for(const name of ['pointerdown','touchstart','click']){
    doc.addEventListener(name,capture,true);
  }
  for(const name of ['dongjak:transport-dismiss-start','dongjak:facility-dismiss-start']){
    doc.addEventListener(name,onDismiss,true);
  }
  const entry={
    refs:1,
    dispose(){
      for(const name of ['pointerdown','touchstart','click']){
        doc.removeEventListener(name,capture,true);
      }
      for(const name of ['dongjak:transport-dismiss-start','dongjak:facility-dismiss-start']){
        doc.removeEventListener(name,onDismiss,true);
      }
    }
  };
  installed.set(doc,entry);
  return ()=>{
    if(--entry.refs===0){entry.dispose();installed.delete(doc);}
  };
}
