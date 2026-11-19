/** Desktop-only bounded dragging of existing floating information cards.
 * On phones the original bottom-sheet gestures and CSS docking are preserved.
 * Buttons/links never initiate a drag; no map pan handlers are replaced.
 */
export const DRAGGABLE_PANELS=[
  ['night-visibility-float','.night-visibility-float-head'],
  ['transport-sheet','.transport-panel-head'],
  ['ped-tools-panel','.ped-tools-panel-head'],
  ['pza-road-sheet','.pza-sheet-head'],
  ['map-gesture-guide','.map-gesture-guide-head'],
  ['road-width-legend','.road-width-legend-head']
];
const clamp=(n,lo,hi)=>Math.min(Math.max(n,lo),Math.max(lo,hi));
export function boundedFloatPosition(x,y,w,h,viewportW,viewportH){
  return {x:Math.round(clamp(x,6,viewportW-w-6)),y:Math.round(clamp(y,6,viewportH-h-6))};
}
export function installFloatingPanelUX(){
  if(typeof document==='undefined'||typeof window==='undefined')return;
  const isDesktop=()=>window.matchMedia?.('(min-width: 1080px)')?.matches===true;
  for(const [id,headerSelector] of DRAGGABLE_PANELS){
    const panel=document.getElementById(id);
    const header=panel?.querySelector(headerSelector);
    if(!panel||!header||panel.dataset.draggableInstalled==='true')continue;
    panel.dataset.draggableInstalled='true';
    header.classList.add('dj-float-drag-handle');
    header.title='PC에서 이 제목 부분을 끌어 창 이동';
    let drag=null;
    header.addEventListener('pointerdown',event=>{
      if(!isDesktop()||event.button!==0||event.target?.closest?.('button,a,input,select,textarea,summary,[role="button"]'))return;
      const rect=panel.getBoundingClientRect();
      drag={pointer:event.pointerId,x:rect.left,y:rect.top,startX:event.clientX,startY:event.clientY,w:rect.width,h:rect.height};
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove',event=>{
      if(!drag||drag.pointer!==event.pointerId||!isDesktop())return;
      const pos=boundedFloatPosition(drag.x+event.clientX-drag.startX,drag.y+event.clientY-drag.startY,
        drag.w,drag.h,window.innerWidth,window.innerHeight);
      panel.classList.add('dj-float-user-positioned');
      panel.style.setProperty('position','fixed','important');
      panel.style.setProperty('top',`${pos.y}px`,'important');
      panel.style.setProperty('left',`${pos.x}px`,'important');
      panel.style.setProperty('right','auto','important');
      panel.style.setProperty('bottom','auto','important');
      panel.style.setProperty('transform','none','important');
      event.preventDefault();
    });
    const stop=event=>{if(drag?.pointer===event.pointerId)drag=null;};
    header.addEventListener('pointerup',stop);
    header.addEventListener('pointercancel',stop);
    // Double click the heading to restore its original location.
    header.addEventListener('dblclick',event=>{
      if(event.target?.closest?.('button,a'))return;
      panel.classList.remove('dj-float-user-positioned');
      for(const key of ['position','top','left','right','bottom','transform'])panel.style.removeProperty(key);
    });
  }
  const widthClose=document.getElementById('road-width-legend-close');
  widthClose?.addEventListener('click',()=>{
    const toggle=document.getElementById('toggle-road-width');
    if(toggle?.getAttribute('aria-pressed')==='true')toggle.click();
  });
}
/** MapLibre popups must stay attached to their selected real-world feature.
 * Move the anchored popup by changing its pixel offset, not its geo-coordinates.
 */
export function enableAnchoredPopupDragging(popup,grip){
  if(!popup?.setOffset||!grip||typeof window==='undefined')return;
  let gesture=null,dx=0,dy=24;
  grip.classList.add('dj-float-drag-handle');
  grip.addEventListener('pointerdown',event=>{
    if(event.button!==0||!window.matchMedia?.('(min-width: 1080px)')?.matches)return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dx,dy};
    grip.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
  });
  grip.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    dx=clamp(gesture.dx+event.clientX-gesture.x,-320,320);
    dy=clamp(gesture.dy+event.clientY-gesture.y,-260,280);
    popup.setOffset([dx,dy]);
    event.preventDefault();event.stopPropagation();
  });
  const finish=event=>{if(gesture?.id===event.pointerId)gesture=null;};
  grip.addEventListener('pointerup',finish);
  grip.addEventListener('pointercancel',finish);
  grip.addEventListener('dblclick',()=>{dx=0;dy=24;popup.setOffset([dx,dy]);});
}
