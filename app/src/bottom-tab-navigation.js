/** Bottom navigation: one gesture path and one native click path.
 * The existing navigator remains the owner of data, history, and the map.
 * Only bottom-tab transitions request the shared stationary fade. */
export function adjacentTabIndex(index,count,dx,dy){
 if(count<2||index<0||index>=count||Math.abs(dx)<34||Math.abs(dx)<Math.abs(dy)*1.35)return -1;
 const next=index+(dx<0?1:-1);
 return next>=0&&next<count?next:-1;
}
export function installBottomTabNavigation({doc=document,win=window,app=doc.getElementById('app')}={}){
 const nav=doc.getElementById('bottom-nav');
 if(!nav||!app||nav.dataset.djTabNavigation==='ready')return ()=>{};
 nav.dataset.djTabNavigation='ready';
 const phone=()=>win.matchMedia('(max-width:699px)').matches;
 const tabs=()=>[...nav.querySelectorAll('.nav-tab[data-tab]')];
 let pending=null,replaying=false,closing=null,watchdog=0,gesture=null,suppressClick=false;
 let curtain=null,curtainFade=0,curtainHide=0;
 // Mask the map *below* fullscreen pages during page-to-page replacement.
 // Do not own navigation or block touch events; those remain native.
 function dismissCurtain(){
  if(curtainFade)win.clearTimeout(curtainFade);
  if(curtainHide)win.clearTimeout(curtainHide);
  curtainFade=0;curtainHide=0;
  if(curtain){curtain.hidden=true;curtain.classList.remove('dj-tab-curtain-out');}
 }
 function protectPageTransition(next){
  if(!phone()||!['map','route','participate','news','mine'].includes(next)){
   dismissCurtain();return;
  }
  if(!curtain){
   curtain=doc.createElement('div');
   curtain.id='dj-tab-surface-curtain';
   curtain.setAttribute('aria-hidden','true');
   curtain.hidden=true;
   app.appendChild(curtain);
  }
  dismissCurtain();
  curtain.hidden=false;
  // Stay opaque until the next page has installed its nontransparent base.
  curtainFade=win.setTimeout(()=>{curtainFade=0;curtain?.classList.add('dj-tab-curtain-out');},270);
  curtainHide=win.setTimeout(()=>{curtainHide=0;if(curtain){curtain.hidden=true;curtain.classList.remove('dj-tab-curtain-out');}},525);
 }
 function replay(button){
  if(!button||button.disabled||!button.isConnected)return;
  replaying=true;
  try{button.click();}finally{replaying=false;}
 }
 function clear(){
  if(watchdog)win.clearTimeout(watchdog);
  watchdog=0;pending=null;closing=null;
 }
 function select(event){
  if(!phone()||replaying)return;
  // A swipe across two buttons may synthesize a click on their common nav
  // ancestor rather than either button. Consume it before outside-click cleanup.
  if(suppressClick&&event.isTrusted&&event.target?.closest?.('#bottom-nav')){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();return;}
  const button=event.target?.closest?.('#bottom-nav .nav-tab[data-tab]');
  if(!button){
   if(closing&&event.isTrusted){const current=closing.panel;clear();win.DongjakWindowMotion?.cancel?.(current);}
   return;
  }
  const current=app.dataset.tab;
  if(!closing&&button.dataset.tab===current)return;
  protectPageTransition(button.dataset.tab);
  const motion=win.DongjakWindowMotion;
  const panel=[...doc.querySelectorAll('.page-panel[data-page]:not([hidden])')].find(n=>n.dataset.page===current);

  const reduced=win.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches;
  const animateIncoming=target=>{
   if(reduced||target==='map')return;
   win.requestAnimationFrame?.(()=>{
    const page=doc.querySelector('.page-panel[data-page="'+target+'"]:not([hidden])');
    try{page?.animate?.([{opacity:.04},{opacity:1}],{duration:235,easing:'cubic-bezier(.22,.72,.3,1)'});}catch{}
   });
  };
  if(!panel){animateIncoming(button.dataset.tab);return;}
  // Intercept page -> page AND page -> map. A separate opaque bridge
  // stays over the map until the next screen is fully painted.
  event.preventDefault();event.stopImmediatePropagation();
  pending=button;
  if(closing)return;
  motion?.cancel?.(panel);
  const state={panel,tab:current};closing=state;
  let done=false,animation=null;
  const finish=()=>{
   if(done||closing!==state)return;done=true;
   const next=pending;clear();
   if(app.dataset.tab!==state.tab||next?.dataset.tab===state.tab)return;
   if(state.panel.isConnected)state.panel.hidden=true;
   replay(next);
   animateIncoming(next?.dataset.tab);
  };
  watchdog=win.setTimeout(()=>{try{animation?.cancel();}catch{}finish();},850);
  if(reduced||!panel.animate){finish();return;}
  try{
   animation=panel.animate([{opacity:1},{opacity:0}],{duration:215,easing:'cubic-bezier(.4,0,.8,1)'});
   animation.addEventListener('finish',finish,{once:true});
  }catch{finish();}

 }
 function down(event){
  if(!phone()||event.isPrimary===false||event.button!==0)return;
  suppressClick=false;gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
 }
 function up(event){
  const start=gesture;if(!start||event.pointerId!==start.id)return;gesture=null;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(Math.abs(dx)<34||Math.abs(dx)<Math.abs(dy)*1.35)return;
  suppressClick=true;
  // Stop only the click generated by this swipe, not the next tap.
  if(event.cancelable)event.preventDefault();
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
  const panel=closing?.panel;clear();dismissCurtain();curtain?.remove();curtain=null;if(panel)win.DongjakWindowMotion?.cancel?.(panel);
  win.removeEventListener('click',select,true);nav.removeEventListener('pointerdown',down);
  win.removeEventListener('pointerup',up,true);win.removeEventListener('pointercancel',cancel,true);
  delete nav.dataset.djTabNavigation;
 };
}
