/**
 * Pure viewport padding for an entire walking route. The map is only navigable
 * between the toolbar and the top edge of its floating preview card.
 * Avoid screen-height guesses: 390px PWA and Safari chrome differ markedly.
 */
export function walkingRouteViewportPadding({
  viewportHeight, mapTop=0, toolbarBottom, sheetTop, navigationTop,
  side=24, inset=14, minVisible=126
}={}){
  const height=Math.max(240,Number(viewportHeight)||700);
  const absBottom=Number(mapTop||0)+height;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const toolbar=Number.isFinite(Number(toolbarBottom))?Number(toolbarBottom)-Number(mapTop||0):height*.2;
  let top=clamp(toolbar+inset,75,height*.63);
  const blockers=[sheetTop,navigationTop].map(Number).filter(v=>Number.isFinite(v)&&v>Number(mapTop||0)+40);
  const first=blockers.length?Math.min(...blockers):absBottom;
  let bottom=clamp(absBottom-first+inset,36,height*.62);
  if(top+bottom>height-minVisible){
    const space=Math.max(80,height-minVisible);
    const scale=space/(top+bottom);
    top=Math.max(46,Math.round(top*scale));
    bottom=Math.max(34,Math.round(bottom*scale));
  }
  return {top:Math.ceil(top),bottom:Math.ceil(bottom),left:side,right:side};
}

// Actual floating surfaces are hard occlusion boundaries, not soft padding hints.
export function strictRouteViewportPadding({mapTop=0,viewportHeight,toolbarBottom,sheetTop,side=32}={}){
 if(![mapTop,viewportHeight,toolbarBottom,sheetTop].every(Number.isFinite)||viewportHeight<=0)return null;
 const top=Math.ceil(Math.max(0,toolbarBottom-mapTop)+48);
 const bottom=Math.ceil(Math.max(0,mapTop+viewportHeight-sheetTop)+18);
 if(top+bottom>=viewportHeight-32)return null;
 return {top,bottom,left:side,right:side};
}
export async function waitForRouteViewport(measure,isCurrent,{now=()=>performance.now(),frame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),settleMs=200,timeoutMs=1800}={}){
 const start=now();let signature='',stableAt=start;
 while(isCurrent()&&now()-start<timeoutMs){
  const padding=measure();const next=padding?JSON.stringify(padding):'';
  if(next!==signature){signature=next;stableAt=now();}
  if(padding&&now()-stableAt>=settleMs)return padding;
  await frame();
 }
 return isCurrent()?measure():null;
}
