/** Restore rendering on mobile PWA foreground without reloading map/style.
 * A suspended iOS requestAnimationFrame must not leave recovery permanently
 * pending: a bounded watchdog completes the wake when frames do not resume.
 */
export function installMapResumeRecovery({map,app,doc=document,win=window,now=()=>Date.now()}={}){
  if(!map||!app)return ()=>{};
  let disposed=false,pending=false,lastAttempt=-Infinity,contextLost=false;
  let attemptId=0,watchdog=null,followup=null;
  const timers=new Set();
  const frame=win.requestAnimationFrame?.bind(win)||((fn)=>win.setTimeout(fn,16));
  const delay=(fn,ms)=>{
    const timer=win.setTimeout(()=>{timers.delete(timer);if(!disposed)fn();},ms);
    timers.add(timer);return timer;
  };
  const clearTimer=(timer)=>{
    if(timer==null)return;
    win.clearTimeout(timer);timers.delete(timer);
  };
  const cancelPending=()=>{
    attemptId++;pending=false;
    clearTimer(watchdog);watchdog=null;
  };
  const cancelFollowup=()=>{clearTimer(followup);followup=null;};
  const wake=({force=false}={})=>{
    if(disposed||doc.hidden||contextLost||pending)return;
    if(!force&&now()-lastAttempt<550)return;
    pending=true;lastAttempt=now();
    const id=++attemptId;
    const apply=()=>{
      if(disposed||id!==attemptId||!pending)return;
      pending=false;
      clearTimer(watchdog);watchdog=null;
      if(doc.hidden||contextLost)return;
      try{map.resize?.();map.triggerRepaint?.();}catch(err){console.warn('[지도 복귀]',err);}
    };
    // On iOS, rAF can remain suspended after pageshow. The watchdog avoids
    // permanently blocking later focus/context-restored recovery attempts.
    watchdog=delay(apply,1100);
    try{frame(()=>frame(apply));}catch{apply();}
  };
  const scheduleFollowup=(ms)=>{
    cancelFollowup();
    followup=delay(()=>{followup=null;wake({force:true});},ms);
  };
  const lost=e=>{
    contextLost=true;e.preventDefault?.();
    cancelPending();cancelFollowup();
    app.dataset.dj875GraphicsLost='true';
  };
  const restored=()=>{
    contextLost=false;delete app.dataset.dj875GraphicsLost;
    cancelPending();wake({force:true});scheduleFollowup(650);
  };
  const visible=()=>{
    if(doc.hidden){cancelPending();cancelFollowup();return;}
    wake();scheduleFollowup(700);
  };
  const focus=()=>wake();
  const canvas=map.getCanvas?.();canvas?.addEventListener('webglcontextlost',lost,false);
  canvas?.addEventListener('webglcontextrestored',restored,false);
  doc.addEventListener('visibilitychange',visible);
  win.addEventListener('pageshow',visible);win.addEventListener('focus',focus);
  return ()=>{
    disposed=true;cancelPending();cancelFollowup();
    for(const timer of timers)win.clearTimeout(timer);timers.clear();
    canvas?.removeEventListener('webglcontextlost',lost);
    canvas?.removeEventListener('webglcontextrestored',restored);
    doc.removeEventListener('visibilitychange',visible);
    win.removeEventListener('pageshow',visible);win.removeEventListener('focus',focus);
  };
}
