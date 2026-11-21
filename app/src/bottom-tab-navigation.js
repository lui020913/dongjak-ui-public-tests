/**
 * The bottom-tab navigation changes its real DOM only once per destination.
 * Use browser View Transitions to crossfade actual old/new page snapshots.
 * Do NOT render a white/opaque mask: it produces a visible blank flash and
 * hides the map even when the active screen itself is already usable.
 * If View Transitions are unsupported, switch immediately with no white frame.
 */
export const TAB_TRANSITION=Object.freeze({crossfade:170});
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
 let activeTransition=null,queued=null,replaying=false,gesture=null,suppressClick=false,swipeGuard=0;
 function replay(button){
  if(!button||button.disabled||!button.isConnected)return false;
  replaying=true;
  try{button.click();return true;}finally{replaying=false;}
 }
 function start(button){
  if(!button||button.disabled||!button.isConnected)return;
  if(activeTransition){
   // The last requested destination wins; never stack animations.
   queued=button;
   activeTransition.skipTransition?.();
   return;
  }
  if(reduced()||typeof doc.startViewTransition!=='function'){
   replay(button);
   return;
  }
  app.dataset.djTabTransition='active';
  try{
   const transition=doc.startViewTransition(()=>{replay(button);});
   activeTransition=transition;
   Promise.resolve(transition.finished).catch(()=>{}).finally(()=>{
    if(activeTransition!==transition)return;
    activeTransition=null;
    delete app.dataset.djTabTransition;
    const next=queued;queued=null;
    if(next&&next.dataset.tab!==app.dataset.tab)start(next);
   });
  }catch{
   delete app.dataset.djTabTransition;
   activeTransition=null;
   replay(button);
  }
 }
 function select(event){
  if(!phone()||replaying)return;
  // A swipe may create a native click after the synthetic adjacent-tab click.
  // Block that one incidental click, but reset the guard on a short timeout.
  if(suppressClick&&event.isTrusted&&event.target?.closest?.('#bottom-nav')){
   suppressClick=false;event.preventDefault();event.stopImmediatePropagation();return;
  }
  let button=event.target?.closest?.('#bottom-nav .nav-tab[data-tab]');
  if(!button&&event.target?.closest?.('.page-panel [data-close-page],#news-close-to-map')){
   if(app.dataset.tab==='map')return;
   button=nav.querySelector('.nav-tab[data-tab="map"]');
  }
  if(!button||button.disabled)return;
  if(button.dataset.tab===app.dataset.tab&&!activeTransition)return;
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
  const buttons=tabs(),current=queued?.dataset.tab||app.dataset.tab;
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
 nav.addEventListener('pointerdown',down,{passive:true});
 win.addEventListener('pointerup',up,{capture:true});
 win.addEventListener('pointercancel',cancel,true);
 return ()=>{
  activeTransition?.skipTransition?.();
  activeTransition=null;queued=null;
  if(swipeGuard)win.clearTimeout(swipeGuard);
  swipeGuard=0;gesture=null;suppressClick=false;
  delete app.dataset.djTabTransition;
  win.removeEventListener('click',select,true);
  nav.removeEventListener('pointerdown',down);
  win.removeEventListener('pointerup',up,true);
  win.removeEventListener('pointercancel',cancel,true);
  delete nav.dataset.djTabNavigation;
 };
}
