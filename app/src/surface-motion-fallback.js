/** Short, local motion for explicit window actions without a motion owner.
 * Never animate the map, body, keyboard dialog, or navigation dock. No DOM
 * clones, style writes to root, or animation-dependent native state changes.
 */
const active=new WeakMap();
export const SURFACE_MOTION=Object.freeze({open:220,close:180,easing:'cubic-bezier(.25,.20,.40,1)'});
export function cancelSurfaceMotion(node){
 if(!node)return;
 active.get(node)?.cancel();
}
function canAnimate(node,win){
 return Boolean(node&&!node.hidden&&typeof node.animate==='function'&&win?.matchMedia?.('(max-width:699px)')?.matches&&
 !win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches&&
 !node.closest?.('.dj-reduced-animation')&&
 !node.classList?.contains('dj889-sheet-transitioning')&&!node.classList?.contains('dj-sheet-dragging'));
}
function run(node,opening,done,{duration=opening?SURFACE_MOTION.open:SURFACE_MOTION.close,win=globalThis.window}={}){
 if(!opening&&active.get(node)?.closing)return false;
 cancelSurfaceMotion(node);
 if(!canAnimate(node,win)){done?.();return false;}
 // Do not stack on a running CSS or Web Animation from another controller.
 if(node.getAnimations?.().some(a=>a.playState==='running')){done?.();return false;}
 let animation,timer,settled=false;
 const finish=(commit=true)=>{
  if(settled)return;settled=true;
  if(timer!==undefined)win.clearTimeout(timer);
  active.delete(node);
  if(animation){animation.onfinish=null;animation.oncancel=null;}
  // The existing close handler owns state. Release synchronously before
  // removing the visual effect, preventing a final-frame flash.
  try{if(commit)done?.();}finally{animation?.cancel?.();}
 };
 try{
  animation=node.animate(opening?[{filter:'opacity(.25)'},{filter:'opacity(1)'}]:[{filter:'opacity(1)'},{filter:'opacity(0)'}],
   {duration,easing:SURFACE_MOTION.easing,fill:'both'});
 }catch{done?.();return false;}
 active.set(node,{closing:!opening,cancel:()=>finish(false)});
 animation.onfinish=()=>finish();animation.oncancel=()=>finish();
 timer=win.setTimeout(()=>finish(),duration+60);
 return true;
}
export function revealSurface(node,options){return run(node,true,null,options);}
export function exitSurface(node,done,options){return run(node,false,done,options);}
