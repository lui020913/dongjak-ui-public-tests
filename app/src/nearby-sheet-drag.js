import {bindHeaderDragInput} from './mobile-header-input.js';
import {sheetStageAction,WINDOW_MOTION} from './mobile-window-motion.js';

/** Utility cards are deliberately separate from full-screen page sheets:
 * opening this card must NOT hide the map search or turn the pill nav into
 * an edge-to-edge bar. Only the card's height follows the header gesture.
 */
export function nearbyExpandedHeight({viewportHeight=700,topOfTools=150,navTop=620}={}){
  const room=Number(navTop)-Number(topOfTools)-18;
  return Math.max(180,Math.min(Math.round(Number(viewportHeight)*.76),Math.floor(room)));
}

export function installNearbySheetDrag({panel,header,close,doc=document,win=window}={}){
  if(!panel||!header||!win?.matchMedia?.('(max-width:699px)')?.matches)return ()=>{};
  let gesture=null,compact=0,frame=0,finishTimer=0,blockedUntil=0;
  const reduced=()=>win.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches===true;
  const set=(name,value)=>panel.style.setProperty(name,value,'important');
  const clearTimers=()=>{if(frame){win.cancelAnimationFrame?.(frame);frame=0}if(finishTimer){win.clearTimeout(finishTimer);finishTimer=0}};
  const targetHeight=()=>{
    const toolbar=doc.getElementById('djNext-toolbar');
    const topbar=doc.querySelector('#app .topbar');
    const top=Math.max(toolbar?.getBoundingClientRect().bottom||0,topbar?.getBoundingClientRect().bottom||0);
    const nav=doc.getElementById('bottom-nav');
    const navTop=nav?.getBoundingClientRect().top||win.innerHeight-88;
    return nearbyExpandedHeight({viewportHeight:win.visualViewport?.height||win.innerHeight,
      topOfTools:top,navTop});
  };
  const reset=()=>{
    clearTimers();gesture=null;compact=0;
    panel.classList.remove('dj-ped-expanded','dj-sheet-dragging');
    delete panel.dataset.djPedExpanded;
    for(const key of ['height','max-height','transition','translate'])panel.style.removeProperty(key);
  };
  const animateTo=expanded=>{
    if(panel.hidden){reset();return}
    clearTimers();
    const from=Math.ceil(panel.getBoundingClientRect().height);
    if(!compact)compact=from;
    const to=expanded?Math.max(compact,targetHeight()):compact;
    panel.classList.toggle('dj-ped-expanded',expanded);
    panel.dataset.djPedExpanded=String(expanded);
    panel.classList.remove('dj-sheet-dragging');
    set('translate','0 0');
    set('max-height','none');
    set('height',from+'px');set('transition','none');
    void panel.offsetHeight;
    if(reduced()||Math.abs(from-to)<2){
      if(expanded)set('height',to+'px');else{panel.style.removeProperty('height');panel.style.removeProperty('max-height')}
      panel.style.removeProperty('transition');panel.style.removeProperty('translate');return;
    }
    const done=()=>{
      finishTimer=0;
      panel.style.removeProperty('transition');panel.style.removeProperty('translate');
      if(!expanded){panel.style.removeProperty('height');panel.style.removeProperty('max-height')}
    };
    set('transition',`height ${WINDOW_MOTION.open}ms ${WINDOW_MOTION.easing}`);
    const begin=()=>{frame=0;if(!panel.hidden)set('height',to+'px')};
    frame=win.requestAnimationFrame?.(begin)||0;
    if(!frame)begin();
    finishTimer=win.setTimeout(done,WINDOW_MOTION.open+75);
  };
  const down=e=>{
    if(panel.hidden||e.isPrimary===false||(e.button!==undefined&&e.button!==0)
      ||e.target?.closest?.('button,a,input,textarea,select,label,[role="button"]'))return false;
    clearTimers();
    const h=Math.ceil(panel.getBoundingClientRect().height);
    const expanded=panel.classList.contains('dj-ped-expanded');
    if(!expanded)compact=h;
    set('max-height','none');set('height',h+'px');set('transition','none');
    gesture={pointerId:e.pointerId,y:e.clientY,x:e.clientX,height:h,expanded,moved:false};
    return true;
  };
  const move=e=>{
    const g=gesture;
    if(!g||e.pointerId!==g.pointerId)return;
    const dy=e.clientY-g.y,dx=e.clientX-g.x;
    if(!g.moved){if(Math.abs(dy)<6)return;if(Math.abs(dx)>Math.abs(dy))return;g.moved=true;}
    panel.classList.add('dj-sheet-dragging');
    const next=Math.max(compact,Math.min(Math.max(compact,targetHeight()),g.height-dy));
    set('height',Math.round(next)+'px');
    if(e.cancelable)e.preventDefault();
  };
  const up=(e,cancelled=false)=>{
    const g=gesture;
    if(!g||e.pointerId!==g.pointerId)return;
    gesture=null;
    const dy=e.clientY-g.y;
    const action=cancelled||!g.moved?'settle':sheetStageAction(dy,0,g.expanded);
    if(g.moved)blockedUntil=win.performance?.now?.()+330||0;
    if(action==='dismiss'&&!g.expanded){reset();close?.click?.();return}
    animateTo(action==='expand'?true:action==='collapse'?false:g.expanded);
  };
  const disposeInput=bindHeaderDragInput(header,win,{
    down,move,up:e=>up(e),cancel:e=>up(e,true)
  });
  const onResize=()=>{if(!panel.hidden&&panel.classList.contains('dj-ped-expanded'))animateTo(true)};
  win.addEventListener('resize',onResize,{passive:true});
  win.visualViewport?.addEventListener?.('resize',onResize,{passive:true});
  const observer=typeof MutationObserver==='function'
    ?new MutationObserver(()=>{if(panel.hidden)reset()}):null;
  observer?.observe(panel,{attributes:true,attributeFilter:['hidden']});
  const suppressClick=e=>{
    if(win.performance?.now?.()<blockedUntil&&!e.target?.closest?.('button,a,input,select,textarea')){
      e.preventDefault();e.stopImmediatePropagation();
    }
  };
  header.addEventListener('click',suppressClick,true);
  return ()=>{disposeInput();observer?.disconnect();clearTimers();reset();
    win.removeEventListener('resize',onResize);
    win.visualViewport?.removeEventListener?.('resize',onResize);
    header.removeEventListener('click',suppressClick,true)};
}
