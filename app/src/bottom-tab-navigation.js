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
 let entering=null,enterTimer=0,replaying=false,gesture=null,suppressClick=false,swipeGuard=0;
 function clearEntrance(){
  if(enterTimer)win.clearTimeout(enterTimer);
  enterTimer=0;
  entering?.classList.remove('dj-tab-content-enter');
  entering=null;
 }
 function replay(button){
  if(!button||button.disabled||!button.isConnected)return false;
  replaying=true;
  try{button.click();return true;}finally{replaying=false;}
 }
 function start(button){
  if(!button||button.disabled||!button.isConnected)return;
  // A new click cancels only the prior CONTENT animation; never defer the
  // destination itself. Rapid taps always resolve to the latest real page.
  clearEntrance();
  if(!replay(button))return;
  if(reduced()||app.dataset.tab==='map')return;
  const panel=doc.querySelector('.page-panel[data-page="'+app.dataset.tab+'"]:not([hidden])');
  if(!panel)return;
  entering=panel;
  panel.classList.add('dj-tab-content-enter');
  enterTimer=win.setTimeout(clearEntrance,TAB_TRANSITION.contentReveal+30);
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
  if(!phone()||event.isPrimary===false||event.button!==0)return;
  // Capture at window level: buttons and their SVG descendants may stop
  // bubbling pointerdown before the dock's own listener receives it.
  // Restrict recognition to gestures starting inside the visible dock.
  const inDock=event.target?.closest?.('#bottom-nav')===nav
    ||event.composedPath?.().includes(nav);
  if(!inDock)return;
  suppressClick=false;gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
 }
 function up(event){
  const initial=gesture;if(!initial||event.pointerId!==initial.id)return;gesture=null;
  const dx=event.clientX-initial.x,dy=event.clientY-initial.y;
  if(Math.abs(dx)<34||Math.abs(dx)<Math.abs(dy)*1.35)return;
  const buttons=tabs(),current=app.dataset.tab;
  const index=buttons.findIndex(b=>b.dataset.tab===current);
  const next=adjacentTabIndex(index,buttons.length,dx,dy);
  if(next===-1)return;
  suppressClick=true;
  if(swipeGuard)win.clearTimeout(swipeGuard);
  swipeGuard=win.setTimeout(()=>{suppressClick=false;swipeGuard=0;},260);
  if(event.cancelable)event.preventDefault();
  buttons[next].click();
 }
 const cancel=()=>{gesture=null;};
 win.addEventListener('click',select,true);
 win.addEventListener('pointerdown',down,true);
 win.addEventListener('pointerup',up,{capture:true});
 win.addEventListener('pointercancel',cancel,true);
 return ()=>{
  clearEntrance();
  if(swipeGuard)win.clearTimeout(swipeGuard);
  swipeGuard=0;gesture=null;suppressClick=false;
  win.removeEventListener('click',select,true);
  win.removeEventListener('pointerdown',down,true);
  win.removeEventListener('pointerup',up,true);
  win.removeEventListener('pointercancel',cancel,true);
  delete nav.dataset.djTabNavigation;
 };
}
