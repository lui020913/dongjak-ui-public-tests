import {dispatchLocalClick} from './v865-close-dispatch.js';
import {bindHeaderDragInput} from './mobile-header-input.js';
import {sheetDragOffset,projectedDrag,sheetStageAction} from './mobile-window-motion.js';
import {
  clearMobileSheetDrag,
  dismissMobileSheet,
  interruptMobileSheetMotion,
  setMobileSheetExpanded,
  settleMobileSheetDrag
} from './v889-mobile-sheet-motion.js';

/** Central owner for mobile floating-sheet gestures and map control visibility.
 * Keeps existing open/close handlers as the single application-state owner.
 * Never mutates map layers, routes, authentication sessions or tab layout. */
export const MOBILE_FLOATING_SHEETS=Object.freeze([
  ['route-panel','.dj836-edge-drag','[data-close-page="route"]','.dj-sheet-chrome'],
  ['participation-panel','.dj836-edge-drag','[data-close-page="participate"]','.dj-sheet-chrome'],
  ['news-panel','.dj836-edge-drag','#news-close-to-map','.dj-sheet-chrome'],
  ['mine-panel','.dj836-edge-drag','[data-close-page="mine"]','.dj-sheet-chrome'],
  ['admin-dong-picker','.dj836-edge-drag','#admin-dong-close','.admin-dong-heading'],
  ['transport-sheet','.dj856-transport-edge-drag','#transport-close','.transport-panel-head'],
  ['detail-sheet','.dj856-detail-edge-drag','#close-detail','.detail-topline'],
  ['entry-sheet','.entry-head','#cancel-add'],
  ['pza-road-sheet','.pza-sheet-head','#pza-road-close'],
  ['night-visibility-float','.night-visibility-float-head','#night-visibility-float-stop'],
  ['road-width-legend','.road-width-legend-head','#road-width-legend-close'],
  ['ped-tools-panel','.ped-tools-panel-head','#ped-tools-close'],
  ['map-advanced-controls','.map-options-heading','#map-options-mobile-close'],
  ['map-safety-controls','.map-safety-head','#map-safety-close'],
  ['map-gesture-guide','.dj856-guide-edge-drag','#map-gesture-guide-close','.map-gesture-guide-head'],
  ['dj-mobile-utilities','.dj856-more-edge-drag','#dj-mobile-utilities-close','.dj854-more-head'],
  ['dj854-weather-sheet','.dj-weather-edge-drag','.dj854-weather-close','.dj854-weather-head'],
]);
const INTERACTIVE='button,a,input,textarea,select,label,summary,[role="button"],[contenteditable="true"]';
const NESTED_HEADERS=[
 ['#version-history-modal .version-history-dialog','.version-history-head','#version-history-close'],
 ['#dj-map-settings .dj-map-settings-card','.dj-map-settings-head','#dj-settings-close'],
 ['#community-form','.community-form-top','#community-compose-close'],
 ['#dj-ai-search-modal','.dj-ai-search-header','.dj-ai-close']
];
export function installNestedHeaderDismiss(doc=document,win=window){
 const attached=new WeakSet(),cleanups=[];
 const connect=()=>{for(const [surfaceSelector,headerSelector,closeSelector] of NESTED_HEADERS){
  const panel=doc.querySelector(surfaceSelector),head=panel?.querySelector(headerSelector);
  if(!head||attached.has(head))continue;
  attached.add(head);head.classList.add('dj-full-header-drag');
  let drag=null;
  const reset=()=>{drag=null;if(panel.dataset.djHeaderDragging){delete panel.dataset.djHeaderDragging;panel.style.removeProperty('translate');panel.style.removeProperty('transition');}};
  cleanups.push(bindHeaderDragInput(head,win,{
   down(e){if(!win.matchMedia('(max-width:699px)').matches||e.isPrimary===false||e.button>0||e.target?.closest?.(INTERACTIVE)||!isSheetOpen(panel,win)||panel.closest('[hidden]'))return false;
     drag={id:e.pointerId,x:e.clientX,y:e.clientY,offset:0,active:false};
     if(typeof e.pointerId==='number')try{head.setPointerCapture?.(e.pointerId)}catch{}return true;},
   move(e){if(!drag||drag.id!==e.pointerId)return;const dy=e.clientY-drag.y,dx=e.clientX-drag.x;if(!drag.active&&Math.abs(dy)<5)return;if(!drag.active&&Math.abs(dx)>Math.abs(dy)){reset();return;}
     drag.active=true;drag.offset=Math.max(0,dy);panel.dataset.djHeaderDragging='true';panel.style.setProperty('transition','none','important');panel.style.setProperty('translate','0 '+drag.offset+'px','important');e.preventDefault?.();},
   up(e){if(!drag||drag.id!==e.pointerId)return;const close=drag.active&&drag.offset>100;const shifted=drag.active;drag=null;
     if(!shifted){reset();return;}
     // The established close handler owns the actual exit; no second dismissal.
     if(close){reset();panel.querySelector(closeSelector)?.click();return;}
     panel.style.setProperty('transition','translate 220ms ease-out','important');panel.style.setProperty('translate','0 0','important');win.setTimeout(reset,240);},
   cancel:reset
  }));
 }};
 connect();const observer=new MutationObserver(connect);observer.observe(doc.body,{subtree:true,childList:true});
 return ()=>{observer.disconnect();for(const fn of cleanups)fn();};
}
export function isSheetOpen(el,win=window){
  if(!el||el.hidden)return false;
  const css=win.getComputedStyle(el);
  return css.display!=='none'&&css.visibility!=='hidden';
}

export function installMobileFloatingSheetController(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app||!win.matchMedia||app.dataset.djSheetController==='active')return ()=>{};
  app.dataset.djSheetController='active';
  const isMobile=()=>win.matchMedia('(max-width:1079px)').matches;
  const installed=new WeakSet(), cleanups=[];
  const sync=()=>{
    const admin=doc.getElementById('admin-dong-picker');
    const active=isMobile()&&isSheetOpen(admin,win)?'admin-dong-picker':'';
    if(active)app.dataset.djActiveSheet=active;
    else delete app.dataset.djActiveSheet;
  };
  const registerSheets=()=>{for(const [id,handles,closeSelector,headerSelector] of MOBILE_FLOATING_SHEETS){
    const panel=doc.getElementById(id);
    if(!panel||installed.has(panel)||(id==='map-gesture-guide'&&win.matchMedia('(max-width:699px)').matches))continue;
    let handleNodes=[...panel.querySelectorAll(handles)];
    // Transport gets the whole visible header as a drag surface. The pointer
    // handler still ignores buttons/links/inputs, so route actions and X taps
    // retain their native click behavior. A small visual grabber stays at top.
    if(headerSelector){
      const header=panel.querySelector(headerSelector);
      if(header){
        let edge=header.querySelector(handles);
        if(!edge){
          edge=doc.createElement('span');
          edge.className=handles.replace(/^\./,'');
          edge.setAttribute('aria-hidden','true');
          header.prepend(edge);
        }
        handleNodes=[header];
      }
    }else if(!handleNodes.length&&headerSelector){
      const header=panel.querySelector(headerSelector);
      if(header){
        const edge=doc.createElement('span');
        edge.className=handles.replace(/^\./,'');
        edge.setAttribute('aria-hidden','true');
        header.prepend(edge);
        handleNodes=[edge];
      }
    }
    // The transport sheet has a separate fixed top grip above its header.
    // Route both surfaces through this controller so they share the same staged
    // expand → collapse → dismiss lifecycle.
    if(id==='transport-sheet'){
      const grip=panel.querySelector(':scope > .handle');
      if(grip&&!handleNodes.includes(grip))handleNodes.push(grip);
    }
    if(!handleNodes.length)continue;
    installed.add(panel);
    // Every non-interactive part of the visible header is a swipe zone.
    // Body scrolling and form controls remain native and are never hijacked.
    for(const handle of handleNodes)handle.classList.add('dj-sheet-swipe-zone');
    let gesture=null,closing=false,suppressNextClick=false,suppressClickTimer=null;
    const reset=()=>clearMobileSheetDrag(panel);
    // A completed drag can synthesize a click on the header or the map beneath
    // it. Suppress only that immediate post-drag click; ordinary taps still work.
    const suppressPostDragClick=event=>{
      if(!suppressNextClick)return;
      suppressNextClick=false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    doc.addEventListener('click',suppressPostDragClick,true);
    const down=event=>{
      if(closing||panel.classList.contains('dj833-sheet-dismissing'))return;
      if(!isMobile()||!isSheetOpen(panel,win)||event.isPrimary===false)return;
      if(event.button!=null&&event.button!==0&&event.pointerType==='mouse')return;
      if(event.target.closest?.(INTERACTIVE))return;
      // Delegate on the persistent panel so regenerated headers remain draggable.
      // Accept only the complete visible header (and any standalone grip), never the scroll body.
      const surface=event.target.closest?.(headerSelector?`${headerSelector},${handles}${id==='transport-sheet'?',.handle':''}`:handles);
      if(!surface||!panel.contains(surface))return;
      // A new finger gesture takes ownership immediately. Do not leave an
      // earlier expand/collapse transition competing with pointer movement.
      win.DongjakWindowMotion?.cancel(panel);
      if(panel.classList.contains('dj889-sheet-transitioning')){
        interruptMobileSheetMotion(panel);
      }
      gesture={pointer:event.pointerId,y:event.clientY,x:event.clientX,upLimit:Math.max(0,panel.getBoundingClientRect().top-16),lastY:event.clientY,lastTime:performance.now(),velocity:0,dragging:false};
      if(typeof event.pointerId==='number')try{surface.setPointerCapture?.(event.pointerId);}catch{}
      return true;
    };
    const move=event=>{
      const g=gesture;if(!g||event.pointerId!==g.pointer)return;
      const dx=event.clientX-g.x,dy=event.clientY-g.y;
      const now=performance.now();g.velocity=(event.clientY-g.lastY)/Math.max(1,now-g.lastTime);
      g.lastY=event.clientY;g.lastTime=now;
      if(!g.dragging){
        if(Math.abs(dy)<4)return;
        if(Math.abs(dx)>Math.abs(dy)){gesture=null;return;}
        g.dragging=true;panel.classList.add('dj-sheet-dragging');
      }
      const expandable=['route-panel','participation-panel','news-panel','mine-panel',
        'admin-dong-picker','transport-sheet','dj-mobile-utilities','map-gesture-guide','ped-tools-panel'].includes(id);
      const offset=sheetDragOffset(dy,g.upLimit,expandable);
      panel.style.setProperty('--dj-sheet-drag-y',`${offset}px`);
      panel.style.setProperty('translate',`0 ${offset}px`,'important');
      panel.style.setProperty('transition','none','important');
      // Downward motion is clipped at the dock instead of sliding across it.
      if(expandable&&offset>0)panel.style.setProperty('clip-path',`inset(0 0 ${offset}px 0 round 24px)`,'important');
      else panel.style.removeProperty('clip-path');
      panel.style.setProperty('--dj-sheet-drag-opacity','1');
      if(event.cancelable)event.preventDefault();
    };
    const up=event=>{
      const g=gesture;if(!g||event.pointerId!==g.pointer)return;
      gesture=null;
      const delta=event.clientY-g.y;
      const projected=projectedDrag(delta,g.velocity);
      if(g.dragging){
        suppressNextClick=true;
        if(suppressClickTimer!==null)win.clearTimeout(suppressClickTimer);
        suppressClickTimer=win.setTimeout(()=>{
          suppressNextClick=false;suppressClickTimer=null;
        },0);
      }
      const expandable=['route-panel','participation-panel','news-panel','mine-panel',
        'admin-dong-picker','transport-sheet','dj-mobile-utilities','map-gesture-guide','ped-tools-panel'].includes(id);
      if(id==='map-safety-controls'&&app.classList.contains('dj-safety-peek')&&g.dragging){
        settleMobileSheetDrag(panel,win,()=>{if(projected<-30||delta<-25)app.classList.remove('dj-safety-peek');});return;
      }
      // Expansion and collapse are two distinct, deliberate stops. A downward
      // gesture from the expanded state first returns to compact; a second
      // downward gesture closes the sheet.
      const action=g.dragging?sheetStageAction(delta,g.velocity,panel.classList.contains('dj871-sheet-expanded'),expandable):'settle';
      if(action==='expand'){
        setMobileSheetExpanded(panel,true,doc,win);
        return;
      }
      if(action==='collapse'){
        setMobileSheetExpanded(panel,false,doc,win);
        return;
      }
      // Safety layers remain active while the tool drawer is lowered for map inspection.
      if(id==='map-safety-controls'&&g.dragging){
        settleMobileSheetDrag(panel,win,()=>{if(projected>65||delta>45)app.classList.add('dj-safety-peek');});return;
      }
      const close=action==='dismiss';
      if(!close){settleMobileSheetDrag(panel,win);return;}
      if(closing)return;
      closing=true;
      // v8.8.9 owns the exit motion through the independent translate property.
      // Do not add the legacy v8.3.3 transform-based dismiss class here: running
      // both transitions at once cancels the staged finger-follow exit motion.
      dismissMobileSheet(panel,doc,win,()=>{
        closing=false;
        panel.classList.remove('dj833-sheet-dismissing');
        const btn=panel.querySelector(closeSelector)||doc.querySelector(closeSelector);
        // Share the exact same lifecycle as button X and automatic closure.
        win.DongjakWindowLifecycle?.dismiss(id);
        panel.dataset.djSwipeDismissed='true';
        try{if(btn)dispatchLocalClick(btn,win);else panel.hidden=true;}finally{delete panel.dataset.djSwipeDismissed;}
      });
    };
    const cancel=()=>{if(closing)return;gesture=null;settleMobileSheetDrag(panel,win);};
    // Nearby sheet uses the same single gesture owner, but binds directly
    // to the actual visible header: a delegated pointerdown from the entire
    // panel can be lost under Safari/MapLibre's nested scroll compositor.
    const inputSurface=id==='ped-tools-panel'?handleNodes[0]:panel;
    const unbind=[bindHeaderDragInput(inputSurface,win,{down,move,up,cancel})];
    cleanups.push(()=>{
      cancel();
      if(suppressClickTimer!==null)win.clearTimeout(suppressClickTimer);
      doc.removeEventListener('click',suppressPostDragClick,true);
      panel.classList.remove('dj833-sheet-dismissing','dj871-sheet-expanded');
      for(const remove of unbind)remove();
      for(const handle of handleNodes)handle.classList.remove('dj-sheet-swipe-zone');
    });
  }
  };
  registerSheets();
  cleanups.push(installNestedHeaderDismiss(doc,win));
  // Weather and other late-created sheets must receive the same header listener.
  const registrationObserver=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))registerSheets();});
  registrationObserver.observe(app,{childList:true,subtree:true});
  cleanups.push(()=>registrationObserver.disconnect());
  const observer=new MutationObserver(sync);
  const admin=doc.getElementById('admin-dong-picker');
  if(admin)observer.observe(admin,{attributes:true,attributeFilter:['hidden','class']});
  observer.observe(app,{attributes:true,attributeFilter:['data-tab']});
  cleanups.push(()=>observer.disconnect());
  const onResize=()=>sync();win.addEventListener('resize',onResize,{passive:true});
  cleanups.push(()=>win.removeEventListener('resize',onResize));
  // Selecting the Safety Map tab must never surface the administrative
  // district picker. It is an optional desktop/map-options tool only.
  const closeAdminOnMapTab=event=>{
    const tab=event.target?.closest?.('#bottom-nav .nav-tab[data-tab="map"]');
    if(!tab)return;
    const admin=doc.getElementById('admin-dong-picker');
    if(admin&&!admin.hidden){
      admin.hidden=true;
      admin.classList.remove('dj-sheet-dragging','dj833-sheet-dismissing');
      admin.style.removeProperty('--dj-sheet-drag-y');
      app.classList.remove('dj-admin-dongs-open');
    }
  };
  doc.addEventListener('click',closeAdminOnMapTab,true);
  cleanups.push(()=>doc.removeEventListener('click',closeAdminOnMapTab,true));
  const adminAtStart=doc.getElementById('admin-dong-picker');
  if(app.dataset.tab==='map'&&adminAtStart)adminAtStart.hidden=true;
  sync();
  return ()=>{for(const fn of cleanups)fn();delete app.dataset.djActiveSheet;delete app.dataset.djSheetController;};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installMobileFloatingSheetController(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
