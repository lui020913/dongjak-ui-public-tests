/** v8.6.8. Common state transitions for all application surfaces.
 * A dismissal is authoritative; a delayed DOM mutation must not undo it.
 * A subsequent, explicit user action can always reopen the same surface.
 * This module is DOM-free so it can be regression-tested independently.
 */
export function createWindowLifecycle({now=()=>Date.now(),ghostWindowMs=680}={}){
  const records=new Map();
  let lastDismissedAt=-Infinity;
  function state(id){
    if(!records.has(id))records.set(id,{phase:'closed',revision:0,lastDismissedAt:-Infinity});
    return records.get(id);
  }
  function requestOpen(id,{explicit=false,origin='automatic'}={}){
    if(!id)return false;
    const record=state(id);
    if(!explicit&&(now()-record.lastDismissedAt<ghostWindowMs ||
      (origin==='automatic'&&now()-lastDismissedAt<ghostWindowMs))){return false;}
    if(record.phase!=='open'){record.phase='open';record.revision++;}
    return true;
  }
  function dismiss(id,{global=true}={}){
    if(!id)return false;
    const record=state(id);
    const wasOpen=record.phase==='open';
    record.phase='closed';record.revision++;record.lastDismissedAt=now();
    if(global)lastDismissedAt=record.lastDismissedAt;
    return wasOpen;
  }
  const snapshot=id=>Object.freeze({...state(id)});
  return {requestOpen,dismiss,snapshot};
}
