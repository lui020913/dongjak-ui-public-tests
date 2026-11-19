/** Screen-space collision policy for DOM logo markers. MapLibre symbols use their
 * own collision engine; DOM logos need to be checked against the *whole* box. */
const intersection=(a,b,pad=0)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
export function markerBoxHidden({x,y,width,height,boxWidth=42,boxHeight=42,obstacles=[],margin=8}={}){
  if(![x,y,width,height,boxWidth,boxHeight].every(Number.isFinite))return true; // invalid projection: hide the logo
  const box={left:x-boxWidth/2,right:x+boxWidth/2,top:y-boxHeight/2,bottom:y+boxHeight/2};
  if(box.left<margin||box.right>width-margin||box.top<margin||box.bottom>height-margin)return true;
  return obstacles.some(obstacle=>obstacle&&intersection(box,obstacle,4));
}
/** Compatibility wrapper for previous project tests. */
export function markerHiddenAtScreenPoint({x,y,width,height,nav=null,margin=22}={}){
  // Keep earlier point-centric semantics for tests and non-DOM callers.
  if(![x,y,width,height].every(Number.isFinite))return false;
  if(x<margin||x>width-margin||y<margin||y>height-margin)return true;
  return Boolean(nav&&x>=nav.left-margin&&x<=nav.right+margin&&y>=nav.top-margin&&y<=nav.bottom+margin);
}
export function isMarkerOccluded(map,lng,lat,element=null){
  if(!map?.project||!map?.getContainer||typeof document==='undefined')return true;
  try{
    const point=map.project([lng,lat]),rect=map.getContainer().getBoundingClientRect();
    const obstacles=[];
    for(const selector of ['#bottom-nav','.topbar','#map-tools-toggle','#overview-sheet','.map-actions','#night-visibility-float','.map-advanced-controls','#weather-widget']){
      const e=document.querySelector(selector);
      if(!e||getComputedStyle(e).display==='none'||e.hidden)continue;
      const r=e.getBoundingClientRect();
      obstacles.push({left:r.left-rect.left-10,top:r.top-rect.top-10,right:r.right-rect.left+10,bottom:r.bottom-rect.top+10});
    }
    const label=element?.querySelector?.('.dongjak-education-name,.dongjak-landmark-name');
    const labelHidden=Boolean(label?.getAttribute?.('hidden')||label?.classList?.contains('label-hidden')||element?.classList?.contains('label-hidden'));
    const naturalWidth=Math.max(40,element?.offsetWidth||0,element?.getBoundingClientRect?.().width||0);
    const naturalHeight=Math.max(40,element?.offsetHeight||0,element?.getBoundingClientRect?.().height||0);
    const boxWidth=labelHidden?44:Math.min(180,naturalWidth||90);
    // A center coordinate close to the viewport's left edge can still leave
    // a cut-off logo visible. Keep a no-logo inset on *every* map edge.
    const isLogo=Boolean(element?.querySelector?.('img'));
    const edgeInset=isLogo ? Math.max(54,Math.min(82,rect.width*0.09)) : 34;
    return markerBoxHidden({x:point.x,y:point.y,width:rect.width,height:rect.height,
      boxWidth,boxHeight:naturalHeight,obstacles,margin:edgeInset});
  }catch{return true;} // fail closed: never pin a logo at the top-left when projection fails
}
