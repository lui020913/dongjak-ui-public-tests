import {WINDOW_MOTION} from './mobile-window-motion.js';
/**
 * v8.8.9 — staged, compositor-friendly mobile sheet motion.
 * FLIP uses the independent CSS translate property so legacy centering
 * transforms are preserved and large sheet contents are not repainted per frame.
 */
const activeTransitions=new WeakMap();
const activeSettles=new WeakMap();
const EXPANDED='dj871-sheet-expanded';
const DRAGGING='dj-sheet-dragging';
const TRANSITIONING='dj889-sheet-transitioning';
const PEDESTRIAN_INLINE_BOUNDS=['top','height','max-height','bottom'];
function syncPedestrianExpandedBounds(panel,doc,win){
  if(panel?.id!=='ped-tools-panel')return;
  const search=doc.getElementById('map-quick-search')?.getBoundingClientRect();
  const toolbar=doc.getElementById('djNext-toolbar')?.getBoundingClientRect();
  const top=Math.ceil(Math.max(96,Number(search?.bottom||0)+12,Number(toolbar?.bottom||0)+10));
  const nav=doc.getElementById('bottom-nav')?.getBoundingClientRect();
  const dock=Math.max(72,Math.ceil((Number(win.innerHeight)||700)-Number(nav?.top||0)+10));
  panel.dataset.djSafeExpandedTop=String(top);
  panel.style.setProperty('top',top+'px','important');
  panel.style.setProperty('bottom',dock+'px','important');
  panel.style.setProperty('height','auto','important');
  panel.style.setProperty('max-height',`calc(100dvh - ${top+dock}px)`,'important');
}
function clearPedestrianExpandedBounds(panel){
  if(panel?.id!=='ped-tools-panel')return;
  delete panel.dataset.djSafeExpandedTop;
  for(const property of PEDESTRIAN_INLINE_BOUNDS)panel.style.removeProperty(property);
}

const DURATION=WINDOW_MOTION.open;
const EASING=WINDOW_MOTION.easing;

function syncExpandedRoot(doc,app){
  if(!app)return;
  const any=[...doc.querySelectorAll(`.${EXPANDED}:not([hidden])`)].length>0;
  app.classList.toggle('dj877-any-expanded',any);
  const nav=doc.getElementById('bottom-nav');
  const navStyle=nav?getComputedStyle(nav):null;
  const height=nav&&!nav.hidden&&navStyle?.display!=='none'
    ?Math.ceil(nav.getBoundingClientRect().height):0;
  app.style.setProperty('--dj877-nav-height',`${height}px`);
}

function clearDragStyles(panel){
  if(panel.classList.contains(DRAGGING)){
    panel.style.removeProperty('translate');
    panel.style.removeProperty('transition');
    panel.style.removeProperty('clip-path');
  }
  panel.classList.remove(DRAGGING);
  panel.style.removeProperty('--dj-sheet-drag-y');
  panel.style.removeProperty('--dj-sheet-drag-opacity');
}

function clearMotionStyles(panel){
  panel.classList.remove(TRANSITIONING);
  for(const property of ['transition','translate','opacity','clip-path','will-change']){
    panel.style.removeProperty(property);
  }
}

function cancelActive(panel){
  activeTransitions.get(panel)?.finish();
  activeSettles.get(panel)?.finish();
}

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function rectDelta(from,to){
  return {x:from.left-to.left,y:from.top-to.top};
}
function rectHasArea(rect){return rect&&rect.width>0&&rect.height>0;}

function animateGeometry(panel,{fromRect,compactRect,expandedRect,fromOpacity,collapsing,doc,win}){
  const app=doc.getElementById('app');
  const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  if(reduced||!rectHasArea(fromRect)||!rectHasArea(compactRect)||!rectHasArea(expandedRect)){
    if(collapsing){panel.classList.remove(EXPANDED);clearPedestrianExpandedBounds(panel);}
    clearMotionStyles(panel);
    syncExpandedRoot(doc,app);
    return true;
  }

  const compactDelta=rectDelta(compactRect,expandedRect);
  const startDelta=rectDelta(fromRect,expandedRect);
  const endDelta=collapsing?compactDelta:{x:0,y:0};
  // During an upward drag the old frame may already be translated above the
  // phone's search field. FLIP must NEVER reproduce that offscreen y-position:
  // clamp both its initial and terminal visual frames to the measured safe top.
  if(panel.id==='ped-tools-panel'){
    const safeTop=Number(panel.dataset.djSafeExpandedTop);
    if(Number.isFinite(safeTop)&&safeTop>0){
      const minDelta=safeTop-expandedRect.top;
      startDelta.y=Math.max(startDelta.y,minDelta);
      endDelta.y=Math.max(endDelta.y,minDelta);
    }
  }
  const startOpacity=1;
  const clipped=Math.max(0,expandedRect.height-compactRect.height);
  // Both edges must begin at the finger's last visible position, not at
  // the unshifted expanded rectangle. Keep the lower edge docked.
  const dockBottom=collapsing?expandedRect.bottom:compactRect.bottom;
  const startClip=clamp(expandedRect.bottom+startDelta.y-dockBottom,0,expandedRect.height);
  const endClip=collapsing?clipped:0;
  const token=(Number(panel.dataset.dj889MotionToken)||0)+1;
  panel.dataset.dj889MotionToken=String(token);
  let timer=null,rafTimer=null,started=false,finished=false;

  const finish=()=>{
    if(finished||panel.dataset.dj889MotionToken!==String(token))return;
    finished=true;
    panel.removeEventListener('transitionend',onEnd);
    if(timer!==null)win.clearTimeout(timer);
    if(rafTimer!==null)win.clearTimeout(rafTimer);
    if(collapsing){panel.classList.remove(EXPANDED);clearPedestrianExpandedBounds(panel);}
    syncExpandedRoot(doc,app);
    clearMotionStyles(panel);
    activeTransitions.delete(panel);
  };
  const onEnd=event=>{
    if(event.target===panel&&event.propertyName==='translate')finish();
  };
  const begin=()=>{
    if(started||finished||panel.dataset.dj889MotionToken!==String(token))return;
    started=true;
    if(rafTimer!==null){win.clearTimeout(rafTimer);rafTimer=null;}
    panel.style.setProperty('transition',`translate ${DURATION}ms ${EASING}, clip-path ${DURATION}ms ${EASING}`,'important');
    panel.style.setProperty('translate',`${endDelta.x}px ${endDelta.y}px`,'important');
    panel.style.setProperty('clip-path',`inset(0 0 ${endClip}px 0 round 24px)`,'important');
    panel.style.setProperty('opacity','1','important');
    timer=win.setTimeout(finish,DURATION+180);
  };

  panel.classList.add(TRANSITIONING);
  panel.style.setProperty('will-change','translate,clip-path','important');
  panel.style.setProperty('transition','none','important');
  panel.style.setProperty('translate',`${startDelta.x}px ${startDelta.y}px`,'important');
  panel.style.setProperty('clip-path',`inset(0 0 ${startClip}px 0 round 24px)`,'important');
  panel.style.setProperty('opacity',String(startOpacity),'important');
  void panel.offsetHeight;
  panel.addEventListener('transitionend',onEnd);
  activeTransitions.set(panel,{finish});
  if(typeof win.requestAnimationFrame==='function')win.requestAnimationFrame(begin);
  // Fallback for iOS PWA and background-tab frame suspension.
  rafTimer=win.setTimeout(begin,80);
  return true;
}

export function setMobileSheetExpanded(panel,expanded,doc=document,win=window){
  if(!panel||panel.hidden)return false;
  cancelActive(panel);
  const next=Boolean(expanded);
  const current=panel.classList.contains(EXPANDED);
  if(current===next){clearDragStyles(panel);return false;}

  const fromRect=panel.getBoundingClientRect();
  const fromOpacity=getComputedStyle(panel).opacity;
  clearDragStyles(panel);
  const app=doc.getElementById('app');
  let compactRect,expandedRect;

  if(next){
    for(const sibling of doc.querySelectorAll(`.${EXPANDED}`)){
      if(sibling!==panel)sibling.classList.remove(EXPANDED);
    }
    compactRect=panel.getBoundingClientRect();
    panel.classList.add(EXPANDED);
    syncPedestrianExpandedBounds(panel,doc,win);
    syncExpandedRoot(doc,app);
    expandedRect=panel.getBoundingClientRect();
  }else{
    panel.classList.remove(EXPANDED);
    clearPedestrianExpandedBounds(panel);
    syncExpandedRoot(doc,app);
    compactRect=panel.getBoundingClientRect();
    panel.classList.add(EXPANDED);
    syncPedestrianExpandedBounds(panel,doc,win);
    syncExpandedRoot(doc,app);
    expandedRect=panel.getBoundingClientRect();
  }

  if(!rectHasArea(compactRect)||!rectHasArea(expandedRect)){
    if(!next){panel.classList.remove(EXPANDED);clearPedestrianExpandedBounds(panel);}
    syncExpandedRoot(doc,app);
    clearMotionStyles(panel);
    return true;
  }
  return animateGeometry(panel,{
    fromRect,compactRect,expandedRect,fromOpacity,
    collapsing:!next,doc,win
  });
}

export function settleMobileSheetDrag(panel,win=window,changeLayout=()=>{}){
  if(!panel||!panel.classList.contains(DRAGGING))return;
  cancelActive(panel);
  const fromRect=panel.getBoundingClientRect();
  const fromOpacity=1;
  clearDragStyles(panel);
  changeLayout();
  const toRect=panel.getBoundingClientRect();
  const delta=rectDelta(fromRect,toRect);
  const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  if(reduced||(Math.abs(delta.x)<.5&&Math.abs(delta.y)<.5&&fromOpacity>.995)){
    clearMotionStyles(panel);
    return;
  }

  const token=(Number(panel.dataset.dj889SettleToken)||0)+1;
  panel.dataset.dj889SettleToken=String(token);
  let timer=null,startFallback=null,started=false,finished=false;
  const finish=()=>{
    if(finished||panel.dataset.dj889SettleToken!==String(token))return;
    finished=true;
    panel.removeEventListener('transitionend',onEnd);
    if(timer!==null)win.clearTimeout(timer);
    if(startFallback!==null)win.clearTimeout(startFallback);
    clearMotionStyles(panel);
    activeSettles.delete(panel);
  };
  const onEnd=event=>{
    if(event.target===panel&&(event.propertyName==='translate'||event.propertyName==='opacity'))finish();
  };
  panel.classList.add(TRANSITIONING);
  panel.style.setProperty('will-change','translate,opacity','important');
  panel.style.setProperty('transition','none','important');
  panel.style.setProperty('translate',`${delta.x}px ${delta.y}px`,'important');
  panel.style.setProperty('opacity',String(fromOpacity),'important');
  void panel.offsetHeight;
  panel.addEventListener('transitionend',onEnd);
  activeSettles.set(panel,{finish});
  const begin=()=>{
    if(started||finished||panel.dataset.dj889SettleToken!==String(token))return;
    started=true;
    if(startFallback!==null)win.clearTimeout(startFallback);
    panel.style.setProperty('transition',`translate ${WINDOW_MOTION.close}ms ${EASING}`,'important');
    panel.style.setProperty('translate','0px 0px','important');
    panel.style.setProperty('opacity','1','important');
    timer=win.setTimeout(finish,WINDOW_MOTION.close+180);
  };
  if(typeof win.requestAnimationFrame==='function')win.requestAnimationFrame(begin);
  startFallback=win.setTimeout(begin,80);
}

/** Animate a dismissed sheet from its current finger position instead of snapping it home. */
export function dismissMobileSheet(panel,doc=document,win=window,onComplete=()=>{}){
  if(!panel){onComplete?.();return false;}
  cancelActive(panel);
  const dragY=Number.parseFloat(panel.style.getPropertyValue('--dj-sheet-drag-y'))||0;
  const dragOpacity=clamp(
    Number.parseFloat(panel.style.getPropertyValue('--dj-sheet-drag-opacity'))||1,
    .55,1
  );
  clearDragStyles(panel);
  const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const startRect=panel.getBoundingClientRect();
  if(reduced||!rectHasArea(startRect)){
    clearMotionStyles(panel);
    onComplete?.();
    return true;
  }

  const token=(Number(panel.dataset.dj889DismissToken)||0)+1;
  panel.dataset.dj889DismissToken=String(token);
  let timer=null,rafTimer=null,started=false,finished=false;
  const finish=()=>{
    if(finished||panel.dataset.dj889DismissToken!==String(token))return;
    finished=true;
    panel.removeEventListener('transitionend',onEnd);
    if(timer!==null)win.clearTimeout(timer);
    if(rafTimer!==null)win.clearTimeout(rafTimer);
    activeTransitions.delete(panel);
    try{onComplete?.();}finally{clearMotionStyles(panel);}
  };
  const onEnd=event=>{
    if(event.target===panel&&event.propertyName==='translate')finish();
  };
  const begin=()=>{
    if(started||finished||panel.dataset.dj889DismissToken!==String(token))return;
    started=true;
    if(rafTimer!==null){win.clearTimeout(rafTimer);rafTimer=null;}
    const distance=Math.max(100,win.innerHeight-startRect.top+24);
    panel.style.setProperty(
      'transition',
      `translate ${WINDOW_MOTION.close}ms ${EASING}`,
      'important'
    );
    panel.style.setProperty('translate',`0px ${dragY+distance}px`,'important');
    panel.style.setProperty('opacity','1','important');
    timer=win.setTimeout(finish,WINDOW_MOTION.close+180);
  };

  panel.classList.add(TRANSITIONING);
  panel.style.setProperty('will-change','translate,opacity','important');
  panel.style.setProperty('transition','none','important');
  panel.style.setProperty('translate',`0px ${dragY}px`,'important');
  panel.style.setProperty('opacity','1','important');
  void panel.offsetHeight;
  panel.addEventListener('transitionend',onEnd);
  activeTransitions.set(panel,{finish});
  if(typeof win.requestAnimationFrame==='function')win.requestAnimationFrame(begin);
  // Fallback for iOS PWA and background-tab frame suspension.
  rafTimer=win.setTimeout(begin,80);
  return true;
}

/** Stop an in-flight motion before a new finger gesture takes ownership. */
export function interruptMobileSheetMotion(panel){
  if(!panel)return;
  cancelActive(panel);
  clearMotionStyles(panel);
}

export function clearMobileSheetDrag(panel){
  if(!panel)return;
  clearDragStyles(panel);
  clearMotionStyles(panel);
}
