/** One authoritative open/close state for a bus/subway information window.
 * The map can report more than one feature for the same physical gesture.
 * A closing X can also produce a delayed native click on iOS after the
 * underlying canvas becomes visible. Neither is a new user intent.
 *
 * This module never changes DOM or starts animations. The transport module
 * commits a successful transition to its DOM and data state synchronously.
 */
export function createTransportWindowLifecycle({now=()=>Date.now(),ghostWindowMs=700}={}){
  let status='closed';
  let key='';
  let lastDismissedAt=-Infinity;
  let revision=0;
  const seenMapEvents=new WeakSet();
  const snapshot=()=>Object.freeze({status,key,revision,lastDismissedAt});
  function beginOpen(nextKey,{origin='map',refresh=false,mapEvent=null}={}){
    const next=String(nextKey||'');
    if(!next)return false;
    if(origin==='map'){
      const inputEvent=mapEvent?.originalEvent;
      if(inputEvent&&typeof inputEvent==='object'){
        if(seenMapEvents.has(inputEvent))return false;
        // A MapLibre click following the real iOS close touch is not a new
        // explicit selection. Keyboard and programmatic actions remain usable.
        if(inputEvent.isTrusted===true && now()-lastDismissedAt<ghostWindowMs)return false;
        seenMapEvents.add(inputEvent);
      }else if(now()-lastDismissedAt<ghostWindowMs){
        return false;
      }
      if(status==='open'&&key===next&&!refresh)return false;
    }
    status='open';key=next;revision++;
    return true;
  }
  function dismiss(){
    if(status==='closed')return false;
    status='closed';key='';lastDismissedAt=now();revision++;
    return true;
  }
  return {beginOpen,dismiss,snapshot};
}
