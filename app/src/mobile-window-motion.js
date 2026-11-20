/** Shared mobile window motion policy, used by CSS and JS owners. */
export const WINDOW_MOTION=Object.freeze({open:350,close:300,easing:'cubic-bezier(.25,.20,.40,1)'});
function cubicProgress(t,x1,x2,y1=0,y2=1){
  const x=Math.max(0,Math.min(1,Number(t)||0));let lo=0,hi=1;
  for(let i=0;i<18;i++){const k=(lo+hi)/2,u=1-k;const bx=3*u*u*k*x1+3*u*k*k*x2+k*k*k;if(bx<x)lo=k;else hi=k;}
  if(x===0||x===1)return x;
  const k=(lo+hi)/2,u=1-k;return 3*u*u*k*y1+3*u*k*k*y2+k*k*k;
}
export function windowMotionProgress(t){return cubicProgress(t,.25,.40,.20,1);}
export function windowMotionFrame(progress,opening,distance,height,docked=false){
  const p=windowMotionProgress(progress),offset=Math.max(0,distance)*(opening?1-p:p);
  return {offset,opacity:1,clip:docked?Math.min(Math.max(0,height),offset):0};
}

/** Confirmations are stationary; fade the entire overlay and backdrop together. */
export const CONFIRM_MOTION=Object.freeze({open:200,close:180});
export const TAB_MOTION=Object.freeze({open:145,close:105});
// Keep at least two intermediate samples even when the map drops frames.
// At normal 60/120Hz the combined 250ms target retains smooth intermediate frames.
export function tabMotionFrameDelta(delta){return Math.max(0,Math.min(32,Number(delta)||0));}
export function confirmMotionOpacity(progress,opening){const p=cubicProgress(progress,.42,.58);return opening?p:1-p;}

// Apple HIG / WWDC fluid motion principles; web-specific tuning, not UIKit constants.
export const INTERACTION_MOTION=Object.freeze({press:100,tab:240,settle:350,feedback:220,spring:'cubic-bezier(.22,.80,.32,1.04)'});
export function rubberBand(delta,limit=72){
  const d=Number(delta)||0,l=Math.max(1,Number(limit)||72);
  return Math.sign(d)*l*(1-1/(1+Math.abs(d)*.55/l));
}
export function sheetDragOffset(delta,upLimit,expandable=true){
  const d=Number(delta)||0,min=expandable?-Math.max(0,Number(upLimit)||0):0;
  return d<min?min+rubberBand(d-min):d;
}
export function projectedDrag(delta,velocity){
  return (Number(delta)||0)+Math.max(-180,Math.min(180,(Number(velocity)||0)*110));
}
export function continuationOffset(offset,progress,opening,distance){
  const p=windowMotionProgress(progress),to=opening?0:Math.max(0,distance);
  return offset+(to-offset)*p;
}
