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
