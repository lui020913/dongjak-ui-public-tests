// v17.10: keep map tools outside the visible guide sheet at any viewport size.
// Recalculate after the draggable sheet moves or the device is rotated.
export function computeActionPlacement({viewportWidth,viewportHeight,panelRect,actionsWidth,actionsHeight}) {
  const gap=12;
  const baseBottom=85;
  const baseRight=16;
  if(!panelRect) return {right:baseRight,bottom:baseBottom,horizontal:false};
  const rightGutter=viewportWidth-panelRect.right;
  if(rightGutter>=actionsWidth+gap*2) {
    return {right:Math.max(gap,rightGutter-actionsWidth-gap),bottom:baseBottom,horizontal:false};
  }
  const leftGutter=panelRect.left;
  if(leftGutter>=actionsWidth+gap*2 && viewportWidth>=700) {
    return {left:Math.max(gap,leftGutter-actionsWidth-gap),bottom:baseBottom,horizontal:false};
  }
  const bottom=Math.max(baseBottom,viewportHeight-panelRect.top+gap);
  const spaceAbove=viewportHeight-bottom;
  const needsRow=spaceAbove<actionsHeight+170;
  return {right:baseRight,bottom,horizontal:needsRow};
}
export function installAdaptiveMapActions({app,overview,actions}) {
  if(!app||!overview||!actions)return ()=>{};
  let frame=0;
  const update=()=>{
    frame=0;
    if(app.dataset.tab!=='map' || overview.hidden || app.classList.contains('route-picking') || app.classList.contains('route-guiding')){
      actions.style.removeProperty('left');actions.style.removeProperty('right');actions.style.removeProperty('bottom');
      actions.classList.remove('map-actions-horizontal');
      return;
    }
    const r=overview.getBoundingClientRect();
    const placement=computeActionPlacement({viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,
      panelRect:r,actionsWidth:49,actionsHeight:4*49+3*9});
    actions.style.left=placement.left===undefined?'auto':`${placement.left}px`;
    actions.style.right=placement.right===undefined?'auto':`${placement.right}px`;
    actions.style.bottom=`${placement.bottom}px`;
    actions.classList.toggle('map-actions-horizontal',placement.horizontal);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const observer=new MutationObserver(schedule);
  observer.observe(overview,{attributes:true,attributeFilter:['style','hidden','data-sheet-state','class']});
  observer.observe(app,{attributes:true,attributeFilter:['data-tab','class']});
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
  resizeObserver?.observe(overview);
  window.addEventListener('resize',schedule);
  window.addEventListener('orientationchange',schedule);
  overview.addEventListener('transitionend',schedule);
  const onPointerMove=()=>{if(overview.classList.contains('dragging'))schedule();};
  window.addEventListener('pointermove',onPointerMove,{passive:true});
  schedule();
  return ()=>{observer.disconnect();resizeObserver?.disconnect();window.removeEventListener('resize',schedule);
    window.removeEventListener('orientationchange',schedule);window.removeEventListener('pointermove',onPointerMove);
    overview.removeEventListener('transitionend',schedule);if(frame)cancelAnimationFrame(frame);};
}
