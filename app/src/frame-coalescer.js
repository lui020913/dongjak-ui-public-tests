/** At most one derived presentation update per animation frame. Flush a
 * pending update at gesture end, and discard queued work when its map dies.
 * Read current state when applying, not a stale event's captured camera.
 */
export function createFrameCoalescer(apply,{win=globalThis.window}={}){
 let token=null;
 function run(){token=null;apply();}
 function schedule(){
  if(token!==null)return;
  if(typeof win?.requestAnimationFrame!=='function'){apply();return;}
  token=win.requestAnimationFrame(run);
 }
 function cancel(){if(token!==null){win.cancelAnimationFrame?.(token);token=null;}}
 function flush(){if(token!==null){cancel();apply();}}
 return {schedule,flush,cancel};
}
