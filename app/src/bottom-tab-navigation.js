/**
 * One mobile bottom-tab transition controller. The existing native navigator
 * remains the authority for app state, map data, and page lifecycles.
 * An opaque temporary surface prevents any intermediate map frame.
 */
export const TAB_TRANSITION=Object.freeze({exit:90,enter:145});
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
 const page=tab=>doc.querySelector('.page-panel[data-page="'+tab+'"]:not([hidden])');
 let pending=null,replaying=false,exitTimer=0,settleTimer=0;
 let outgoing=null,incoming=null,curtain=null,gesture=null,suppressClick=false;
 function ensureCurtain(){
  if(!curtain){
   curtain=doc.createElement('div');
   curtain.id='dj-tab-surface-curtain';
   curtain.setAttribute('aria-hidden','true');
   curtain.hidden=true;app.appendChild(curtain);
  }
  curtain.classList.remove('dj-tab-curtain-out');
  curtain.hidden=false;
 }
 function finishVisual(){
  if(settleTimer)win.clearTimeout(settleTimer);
  settleTimer=0;
  outgoing?.classList.remove('dj-mobile-tab-exit');
  incoming?.classList.remove('dj-mobile-tab-enter');
  outgoing=null;incoming=null;
  if(curtain){curtain.hidden=true;curtain.classList.remove('dj-tab-curtain-out');}
  delete app.dataset.djTabTransition;
 }
 function replay(button){
  if(!button||button.disabled||!button.isConnected)return false;
  replaying=true;
  try{button.click();return true;}finally{replaying=false;}
 }
 function commit(){
  exitTimer=0;
  const target=pending;pending=null;
  outgoing?.classList.remove('dj-mobile-tab-exit');outgoing=null;
  if(!replay(target)){finishVisual();return;}
  incoming=page(target.dataset.tab);
  if(incoming&&!reduced())incoming.classList.add('dj-mobile-tab-enter');
  if(reduced()){finishVisual();return;}
  curtain?.classList.add('dj-tab-curtain-out');
  app.dataset.djTabTransition='enter';
  settleTimer=win.setTimeout(finishVisual,TAB_TRANSITION.enter+22);
 }
 function start(button){
  // Rapid taps coalesce into the final requested page, not parallel motions.
  if(exitTimer){pending=button;return;}
  if(settleTimer)finishVisual();
  pending=button;
  if(reduced()){const target=pending;pending=null;replay(target);return;}
  ensureCurtain();
  outgoing=page(app.dataset.tab);
  app.dataset.djTabTransition='exit';
  if(outgoing)outgoing.classList.add('dj-mobile-tab-exit');
  exitTimer=win.setTimeout(commit,outgoing?TAB_TRANSITION.exit:0);
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
  if(button.dataset.tab===app.dataset.tab&&!exitTimer)return;
  event.preventDefault();event.stopImmediatePropagation();
  start(button);
 }
 function down(event){
  if(!phone()||event.isPrimary===false||event.button!==0)return;
  suppressClick=false;gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
 }
 function up(event){
  const initial=gesture;if(!initial||event.pointerId!==initial.id)return;gesture=null;
  const dx=event.clientX-initial.x,dy=event.clientY-initial.y;
  if(Math.abs(dx)<34||Math.abs(dx)<Math.abs(dy)*1.35)return;
  suppressClick=true;if(event.cancelable)event.preventDefault();
  const buttons=tabs(),current=pending?.dataset.tab||app.dataset.tab;
  const index=buttons.findIndex(b=>b.dataset.tab===current);
  const next=adjacentTabIndex(index,buttons.length,dx,dy);
  if(next!==-1)buttons[next].click();
 }
 const cancel=()=>{gesture=null;};
 win.addEventListener('click',select,true);
 nav.addEventListener('pointerdown',down,{passive:true});
 win.addEventListener('pointerup',up,{capture:true});
 win.addEventListener('pointercancel',cancel,true);
 return ()=>{
  if(exitTimer)win.clearTimeout(exitTimer);exitTimer=0;pending=null;
  finishVisual();curtain?.remove();curtain=null;
  win.removeEventListener('click',select,true);
  nav.removeEventListener('pointerdown',down);
  win.removeEventListener('pointerup',up,true);
  win.removeEventListener('pointercancel',cancel,true);
  delete nav.dataset.djTabNavigation;
 };
}
