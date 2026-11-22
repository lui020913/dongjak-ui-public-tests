/**
 * The tab bar updates the real destination synchronously. A browser-level
 * root View Transition is forbidden here: WebGL-backed map snapshots can
 * temporarily paint as white on iOS during the two-snapshot dissolve.
 *
 * All full-screen panel backgrounds appear immediately in the same JS tick.
 * Only the contents of the incoming non-map page receive a light opacity
 * reveal. No curtain, duplicate page, root fade, or delayed map exposure.
 */
export const TAB_TRANSITION=Object.freeze({contentReveal:140});
export function adjacentTabIndex(index,count,dx,dy){
 if(count<2||index<0||index>=count||Math.abs(dx)<34||Math.abs(dx)<Math.abs(dy)*1.35)return -1;
 const next=index+(dx<0?1:-1);
 return next>=0&&next<count?next:-1;
}
export function installBottomTabNavigation({doc=document,win=window,app=doc.getElementById('app')}={}){
 const nav=doc.getElementById('bottom-nav');
 if(!nav||!app||nav.dataset.djTabNavigation==='ready')return ()=>{};
 nav.dataset.djTabNavigation='ready';
 const phone=()=>win.matchMedia?.('(max-width:699px)')?.matches===true;
 const reduced=()=>win.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches===true;
 const tabs=()=>[...nav.querySelectorAll('.nav-tab[data-tab]')];
 let entering=null,enterTimer=0,departing=null,departingAnimation=null,replaying=false,gesture=null,mouseGesture=null,suppressClick=false,swipeGuard=0;
 function clearEntrance(){
  if(enterTimer)win.clearTimeout(enterTimer);
  enterTimer=0;
  entering?.classList.remove('dj-tab-content-enter');
  entering=null;
  if(departingAnimation){departingAnimation.cancel?.();departingAnimation=null;}
  if(departing){
   departing.hidden=true;
   departing.removeAttribute('data-dj-tab-outgoing');
   departing.style.removeProperty('z-index');
   departing.style.removeProperty('filter');
   departing=null;
  }
 }
 function replay(button){
  if(!button||button.disabled||!button.isConnected)return false;
  replaying=true;
  try{button.click();return true;}finally{replaying=false;}
 }
 function start(button){
  if(!button||button.disabled||!button.isConnected)return;
  clearEntrance();
  const previousTab=app.dataset.tab;
  const previous=doc.querySelector('.page-panel[data-page="'+previousTab+'"]:not([hidden])');
  // Preserve the outgoing opaque screen through the synchronous navigate.
  // The incoming panel is already fully opaque underneath it: no map flash.
  if(previous&&!reduced())previous.dataset.djTabOutgoing='true';
  if(!replay(button)){
   previous?.removeAttribute('data-dj-tab-outgoing');return;
  }
  if(previous&&previous.dataset.djTabOutgoing==='true'&&previousTab!==app.dataset.tab){
   departing=previous;
   previous.style.setProperty('z-index','7000','important');
   if(typeof previous.animate==='function'){
    try{departingAnimation=previous.animate([{filter:'opacity(1)'},{filter:'opacity(0)'}],{
      duration:190,easing:'cubic-bezier(.25,.15,.35,1)',fill:'forwards'
    });}catch{/* A non-animated opaque handoff remains safe. */}
   }
  }else previous?.removeAttribute('data-dj-tab-outgoing');
  // The navigation dock itself never fades, scales or shifts.
  if(!reduced()&&app.dataset.tab!=='map'){
   const panel=doc.querySelector('.page-panel[data-page="'+app.dataset.tab+'"]:not([hidden])');
   if(panel){entering=panel;panel.classList.add('dj-tab-content-enter');}
  }
  enterTimer=win.setTimeout(clearEntrance,215);
 }
 function select(event){
  if(!phone()||replaying)return;
  if(suppressClick&&event.isTrusted&&event.target?.closest?.('#bottom-nav')){
   suppressClick=false;event.preventDefault();event.stopImmediatePropagation();return;
  }
  let button=event.target?.closest?.('#bottom-nav .nav-tab[data-tab]');
  if(!button&&event.target?.closest?.('.page-panel [data-close-page],#news-close-to-map')){
   if(app.dataset.tab==='map')return;
   button=nav.querySelector('.nav-tab[data-tab="map"]');
  }
  if(!button||button.disabled)return;
  if(button.dataset.tab===app.dataset.tab)return;
  event.preventDefault();event.stopImmediatePropagation();
  start(button);
 }
 function down(event){
  if(!phone()||(event.pointerType==='mouse'&&event.button!==0))return;
  // Capture at window level: buttons and their SVG descendants may stop
  // bubbling pointerdown before the dock's own listener receives it.
  // Restrict recognition to gestures starting inside the visible dock.
  const inDock=event.target?.closest?.('#bottom-nav')===nav
    ||event.composedPath?.().includes(nav);
  if(!inDock)return;
  suppressClick=false;gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
 }
 function isInsideDock(event){
  return event.target?.closest?.('#bottom-nav')===nav
    ||event.composedPath?.().includes(nav);
 }
 function mouseDown(event){
  if(!phone()||event.button!==0||!isInsideDock(event))return;
  mouseGesture={x:event.clientX,y:event.clientY};
 }
 function switchAdjacent(dx,dy,event){
  if(Math.abs(dx)<34||Math.abs(dx)<Math.abs(dy)*1.35)return false;
  const buttons=tabs(),index=buttons.findIndex(b=>b.dataset.tab===app.dataset.tab);
  const next=adjacentTabIndex(index,buttons.length,dx,dy);
  if(next===-1)return false;
  // Select through the same owner as a tap. The transient click event is
  // synthetic and does not interfere with the next real user gesture.
  suppressClick=true;
  if(swipeGuard)win.clearTimeout(swipeGuard);
  swipeGuard=win.setTimeout(()=>{suppressClick=false;swipeGuard=0;},2200);
  if(event.cancelable)event.preventDefault();
  start(buttons[next]);
  mouseGesture=null;
  return true;
 }
 function up(event){
  const initial=gesture;
  if(!initial||event.pointerId!==initial.id)return;
  gesture=null;
  switchAdjacent(event.clientX-initial.x,event.clientY-initial.y,event);
 }
 function mouseUp(event){
  const initial=mouseGesture;
  if(!initial||event.button!==0)return;
  mouseGesture=null;
  // Some phone emulations swallow pointer gestures starting on HOME SVGs.
  // Only use mouseup as a fallback if pointerup did not already switch tabs.
  switchAdjacent(event.clientX-initial.x,event.clientY-initial.y,event);
 }
 const cancel=()=>{gesture=null;};
 win.addEventListener('click',select,true);
 win.addEventListener('pointerdown',down,true);
 win.addEventListener('pointerup',up,{capture:true});
 win.addEventListener('pointercancel',cancel,true);
 win.addEventListener('mousedown',mouseDown,true);
 win.addEventListener('mouseup',mouseUp,true);
 return ()=>{
  clearEntrance();
  if(swipeGuard)win.clearTimeout(swipeGuard);
  swipeGuard=0;gesture=null;mouseGesture=null;suppressClick=false;
  win.removeEventListener('click',select,true);
  win.removeEventListener('pointerdown',down,true);
  win.removeEventListener('pointerup',up,true);
  win.removeEventListener('pointercancel',cancel,true);
  win.removeEventListener('mousedown',mouseDown,true);
  win.removeEventListener('mouseup',mouseUp,true);
  delete nav.dataset.djTabNavigation;
 };
}
