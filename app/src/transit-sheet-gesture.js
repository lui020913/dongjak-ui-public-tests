import {bindHeaderDragInput} from './mobile-header-input.js';
import {sheetDragOffset,sheetStageAction} from './mobile-window-motion.js';
import {setMobileSheetExpanded,settleMobileSheetDrag,interruptMobileSheetMotion,clearMobileSheetDrag} from './v889-mobile-sheet-motion.js';
import {cancelSurfaceMotion} from './surface-motion-fallback.js';
// The comparison lives inside V3's shadow root, so the document-wide
// registry cannot see it. Reuse the shared native input, thresholds and FLIP
// expansion rather than attaching a competing swipe controller.
export function bindTransitSheetHeader({doc,win,panel,header,safeTop,onDismiss}){
 let gesture=null;
 const expanded=()=>panel.classList.contains('dj871-sheet-expanded');
 const reset=()=>{gesture=null;interruptMobileSheetMotion(panel);clearMobileSheetDrag(panel);panel.classList.remove('dj871-sheet-expanded');};
 const unbind=bindHeaderDragInput(header,win,{
  down(e){
   if(panel.hidden||e.isPrimary===false||e.button>0||e.target?.closest?.('button,a,input,textarea,select,label,summary,[role="button"]'))return false;
   cancelSurfaceMotion(panel);interruptMobileSheetMotion(panel);
   gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastY:e.clientY,lastTime:win.performance.now(),velocity:0,active:false,limit:Math.max(0,panel.getBoundingClientRect().top-safeTop())};
   if(typeof e.pointerId==='number')try{header.setPointerCapture?.(e.pointerId);}catch{}
   return true;
  },
  move(e){
   const g=gesture;if(!g||g.id!==e.pointerId)return;
   const dy=e.clientY-g.y,dx=e.clientX-g.x,now=win.performance.now();
   g.velocity=(e.clientY-g.lastY)/Math.max(1,now-g.lastTime);g.lastY=e.clientY;g.lastTime=now;
   if(!g.active){if(Math.abs(dy)<4)return;if(Math.abs(dx)>Math.abs(dy)){gesture=null;return;}g.active=true;panel.classList.add('dj-sheet-dragging');}
   const offset=Math.max(-g.limit,sheetDragOffset(dy,g.limit,true));
   panel.style.setProperty('--dj-sheet-drag-y',offset+'px');
   panel.style.setProperty('transition','none','important');
   panel.style.setProperty('translate','0 '+offset+'px','important');
   if(offset>0)panel.style.setProperty('clip-path','inset(0 0 '+offset+'px 0 round 24px)','important');else panel.style.removeProperty('clip-path');
   e.preventDefault?.();
  },
  up(e){
   const g=gesture;if(!g||g.id!==e.pointerId)return;gesture=null;
   if(!g.active)return;
   const action=sheetStageAction(e.clientY-g.y,g.velocity,expanded(),true);
   if(action==='expand'||action==='collapse'){setMobileSheetExpanded(panel,action==='expand',doc,win);return;}
   if(action==='dismiss'){clearMobileSheetDrag(panel);onDismiss();return;}
   settleMobileSheetDrag(panel,win);
  },
  cancel(){gesture=null;settleMobileSheetDrag(panel,win);}
 });
 return {reset,dispose(){unbind();reset();}};
}
