import {bindHeaderDragInput} from './mobile-header-input.js';
import {setMobileSheetExpanded} from './v889-mobile-sheet-motion.js';

/**
 * The generic delegated sheet gesture sometimes misses a pointer sequence when
 * MapLibre/browser chrome changes the compositor. Bind the nearby header
 * directly as a narrowly scoped fallback; the shared sheet still owns motion.
 * If the shared controller already transitioned the sheet this is a no-op.
 */
export function installNearbyHeaderFallback({panel,header,close,doc=document,win=window}={}){
 if(!panel||!header||!win?.matchMedia?.('(max-width:699px)')?.matches)return ()=>{};
 let drag=null,pending=null;
 const interactive='button,a,input,textarea,select,label,summary,[role="button"]';
 const down=e=>{
  if(panel.hidden||e.isPrimary===false||(e.button!==undefined&&e.button!==0)
    ||e.target?.closest?.(interactive))return false;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,expanded:panel.classList.contains('dj871-sheet-expanded'),moved:false};
  return true;
 };
 const move=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx))drag.moved=true;
 };
 const up=e=>{
  const current=drag;
  if(!current||e.pointerId!==current.id)return;
  drag=null;
  const dy=e.clientY-current.y;
  if(!current.moved||Math.abs(dy)<45)return;
  // Run after the generic controller's pointerup, so a working generic
  // gesture wins and is never reverted by the fallback on the same event.
  if(pending!==null)win.clearTimeout(pending);
  pending=win.setTimeout(()=>{
    pending=null;
    if(panel.hidden)return;
    if(dy<0&&!current.expanded&&!panel.classList.contains('dj871-sheet-expanded')){
      setMobileSheetExpanded(panel,true,doc,win);
    }else if(dy>0&&current.expanded&&panel.classList.contains('dj871-sheet-expanded')){
      setMobileSheetExpanded(panel,false,doc,win);
    }else if(dy>95&&!current.expanded&&!panel.classList.contains('dj871-sheet-expanded')){
      close?.click?.();
    }
  },0);
 };
 const cancel=()=>{drag=null;};
 const dispose=bindHeaderDragInput(header,win,{down,move,up,cancel});
 return ()=>{drag=null;if(pending!==null)win.clearTimeout(pending);pending=null;dispose();};
}
