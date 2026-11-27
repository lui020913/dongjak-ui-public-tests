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

// Never shrink the occlusion padding: a route must fit the genuinely exposed
// map rectangle, not the map area behind a floating sheet.
export function strictRoutePreviewPadding({mapTop,viewportHeight,toolbarBottom,sheetTop,inset=26,side=34}={}){
 if(![mapTop,viewportHeight,toolbarBottom,sheetTop].every(Number.isFinite))return null;
 const top=Math.max(0,toolbarBottom-mapTop)+inset;
 const bottom=Math.max(0,mapTop+viewportHeight-sheetTop)+inset;
 return top+bottom<=viewportHeight-36?{top:Math.ceil(top),bottom:Math.ceil(bottom),left:side,right:side}:null;
}

/** Check the actual projected route against the visible rectangle after the
 * camera settles. A bounded correction accounts for retained camera constraints
 * or different mobile viewport geometry without shrinking the occlusion margin. */
export function routeProjectionCorrection(points,width,height,padding){
 if(!points?.length||![width,height,padding?.left,padding?.right,padding?.top,padding?.bottom].every(Number.isFinite))return null;
 const w=width-padding.left-padding.right,h=height-padding.top-padding.bottom;
 if(w<=0||h<=0)return null;
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
 if(![...xs,...ys].every(Number.isFinite))return null;
 const l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys);
 if(l>=padding.left-2&&r<=width-padding.right+2&&t>=padding.top-2&&b<=height-padding.bottom+2)return null;
 const scale=Math.max(0.01,Math.min(1,w/Math.max(1,r-l),h/Math.max(1,b-t))*.96);
 const vx=(padding.left+width-padding.right)/2,vy=(padding.top+height-padding.bottom)/2;
 return {x:(l+r)/2+(width/2-vx)/scale,y:(t+b)/2+(height/2-vy)/scale,zoomOut:-Math.log2(scale)};
}
