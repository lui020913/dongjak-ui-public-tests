// One gesture owner for mobile sheet headers. Safari can cancel PointerEvent
// streams when it interprets a finger as viewport scrolling. Capture native
// TouchEvents, explicitly prevent scrolling ONLY after a header start is
// accepted, and keep mouse/pen fallback. No duplicate touch/pointer motion.
export function bindHeaderDragInput(header,win,{down,move,up,cancel}){
 let activeTouch=null;
 const touchCapable=typeof win.TouchEvent==='function'||'ontouchstart' in win;
 const pointerAllowed=e=>e.pointerType!=='touch'||!touchCapable;
 const pd=e=>{if(pointerAllowed(e))down(e)};
 const pm=e=>{if(pointerAllowed(e))move(e)};
 const pu=e=>{if(pointerAllowed(e))up(e)};
 const pc=e=>{if(pointerAllowed(e))cancel(e)};
 const normalized=(e,t)=>({
  pointerId:'touch:'+t.identifier,clientX:t.clientX,clientY:t.clientY,
  target:e.target,currentTarget:header,pointerType:'touch',isPrimary:true,
  cancelable:e.cancelable,preventDefault:()=>{if(e.cancelable)e.preventDefault()},
  stopPropagation:()=>e.stopPropagation()
 });
 const find=(list,id)=>Array.from(list||[]).find(t=>t.identifier===id);
 const ts=e=>{
  if(activeTouch!==null||e.touches.length!==1)return;
  const t=e.changedTouches[0];if(!t)return;
  if(down(normalized(e,t))!==true)return;
  activeTouch=t.identifier;
  if(e.cancelable)e.preventDefault();
 };
 const tm=e=>{
  if(activeTouch===null)return;
  const t=find(e.touches,activeTouch);if(!t)return;
  if(e.cancelable)e.preventDefault();
  move(normalized(e,t));
 };
 const finish=(e,aborted)=>{
  if(activeTouch===null)return;
  const t=find(e.changedTouches,activeTouch);if(!t)return;
  activeTouch=null;
  if(e.cancelable)e.preventDefault();
  (aborted?cancel:up)(normalized(e,t));
 };
 const te=e=>finish(e,false),tc=e=>finish(e,true);
 const opts={capture:true,passive:false};
 header.addEventListener('pointerdown',pd);
 win.addEventListener('pointermove',pm,opts);
 win.addEventListener('pointerup',pu,opts);
 win.addEventListener('pointercancel',pc,opts);
 if(touchCapable){
  header.addEventListener('touchstart',ts,opts);
  win.addEventListener('touchmove',tm,opts);
  win.addEventListener('touchend',te,opts);
  win.addEventListener('touchcancel',tc,opts);
 }
 return ()=>{
  activeTouch=null;
  header.removeEventListener('pointerdown',pd);
  win.removeEventListener('pointermove',pm,true);
  win.removeEventListener('pointerup',pu,true);
  win.removeEventListener('pointercancel',pc,true);
  header.removeEventListener('touchstart',ts,true);
  win.removeEventListener('touchmove',tm,true);
  win.removeEventListener('touchend',te,true);
  win.removeEventListener('touchcancel',tc,true);
 };
}
