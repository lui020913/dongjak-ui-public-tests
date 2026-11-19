/** Shared mobile window motion policy, used by CSS and JS owners. */
export const WINDOW_MOTION=Object.freeze({open:420,close:320,easing:'cubic-bezier(.42,0,.58,1)'});
export function windowMotionProgress(t){
  const x=Math.max(0,Math.min(1,Number(t)||0));let lo=0,hi=1;
  for(let i=0;i<18;i++){const k=(lo+hi)/2,u=1-k;const bx=3*u*u*k*.42+3*u*k*k*.58+k*k*k;if(bx<x)lo=k;else hi=k;}
  if(x===0||x===1)return x;
  const k=(lo+hi)/2;return k*k*(3-2*k);
}
export function windowMotionFrame(progress,opening,distance,height,docked=false){
  const p=windowMotionProgress(progress),offset=Math.max(0,distance)*(opening?1-p:p);
  return {offset,opacity:1,clip:docked?Math.min(Math.max(0,height),offset):0};
}

/** Confirmations are stationary; fade the entire overlay and backdrop together. */
export const CONFIRM_MOTION=Object.freeze({open:200,close:180});
export function confirmMotionOpacity(progress,opening){const p=windowMotionProgress(progress);return opening?p:1-p;}
