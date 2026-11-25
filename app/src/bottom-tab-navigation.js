/**
 * The tab bar updates the real destination synchronously. A browser-level
 * root View Transition is forbidden here: WebGL-backed map snapshots can
 * temporarily paint as white on iOS during the two-snapshot dissolve.
 *
 * All full-screen panel backgrounds appear immediately in the same JS tick.
 * The outgoing opaque page dissolves over the incoming live page.
 * From the map, the incoming page dissolves over the live map. No root snapshot or moving dock.
 */
export const TAB_TRANSITION=Object.freeze({contentReveal:260,mapReturn:220});
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
 const reduced=()=>win.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches===true||app.classList?.contains('dj-reduced-animation')===true;
 const tabs=()=>[...nav.querySelectorAll('.nav-tab[data-tab]')];
 let entering=null,enterTimer=0,enterFrame=0,enterStyles=[],departing=null,departingFrame=0,departingStyles=[],replaying=false,gesture=null,mouseGesture=null,suppressClick=false,swipeGuard=0;
 function clearEntrance(){
  if(enterTimer)win.clearTimeout(enterTimer);
  enterTimer=0;
  if(enterFrame){win.cancelAnimationFrame?.(enterFrame);enterFrame=0;}
  for(const {node,props} of enterStyles)for(const [key,value,priority] of props){if(value)node.style.setProperty(key,value,priority);else node.style.removeProperty(key);}
  enterStyles=[];
  entering?.classList.remove('dj-tab-content-enter');
  entering=null;
  if(departingFrame){win.cancelAnimationFrame?.(departingFrame);departingFrame=0;}
  if(departing){
   const page=departing;
   if(page.id==='dj-route-v3'){if(app.dataset.tab!=='route')page.hidden=true;page.inert=false;}
   else if(page.dataset.page!==app.dataset.tab)page.hidden=true;
   departing.removeAttribute?.('data-dj-tab-outgoing');
   for(const [key,value,priority] of departingStyles){
    // A page may have had inline display:flex!important while active.
    // Never restore that active-only declaration onto a hidden page.
    if(value&&!(page.hidden&&['display','visibility','opacity','pointer-events'].includes(key)))departing.style.setProperty(key,value,priority);
    else departing.style?.removeProperty?.(key);
   }
   departingStyles=[];
   departing=null;
  }
 }
 // Production styles fix opacity/animation with !important, so CSS keyframes
 // alone can be invisible. Paint the real content (including V3's shadow DOM).
 function revealContent(panel,key){
  const route=key==='route'?doc.getElementById('dj-route-v3'):null;
  const nodes=[route||panel].filter(node=>node?.style?.getPropertyValue);
  if(!nodes.length||typeof win.requestAnimationFrame!=='function')return false;
  enterStyles=nodes.map(node=>({node,props:['opacity','animation','transition','will-change'].map(k=>[k,node.style.getPropertyValue?.(k)||'',node.style.getPropertyPriority?.(k)||''])}));
  const paint=alpha=>{for(const node of nodes)node.style.setProperty('opacity',String(alpha),'important');};
  for(const node of nodes){node.style.setProperty('animation','none','important');node.style.setProperty('transition','none','important');node.style.setProperty('will-change','opacity','important');}
  paint(0);
  let last=null,elapsed=0;
  // Map rendering can delay the first frame. Keep the reveal alive until
  // the first actual frame, then bound cleanup separately from startup.
  // This avoids dropping a fresh tab transition before it is ever painted.
  let started=false;
  const step=now=>{
   if(!enterStyles.length)return;
   if(!started){started=true;if(enterTimer)win.clearTimeout(enterTimer);enterTimer=win.setTimeout(clearEntrance,4500);}
   if(last!==null)elapsed+=Math.min(48,Math.max(0,now-last));
   last=now;
   const p=Math.min(1,elapsed/300);
   paint(p*p*(3-2*p));
   if(p<1)enterFrame=win.requestAnimationFrame(step);else clearEntrance();
  };
  enterFrame=win.requestAnimationFrame(step);
  return true;
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
  const routeHost=previousTab==='route'?doc.getElementById('dj-route-v3'):null;
  const previous=routeHost&&!routeHost.hidden?routeHost:doc.querySelector('.page-panel[data-page="'+previousTab+'"]:not([hidden])');
  const destination=button.dataset.tab;
  const toMap=destination==='map';
  // Retain the outgoing live surface for every non-reduced tab dissolve.
  const retain=Boolean(previous&&typeof win.requestAnimationFrame==='function'&&!reduced());
  if(retain)previous.dataset.djTabOutgoing='true';
  if(!replay(button)){previous?.removeAttribute?.('data-dj-tab-outgoing');return;}
  if(retain&&app.dataset.tab===destination){
   departing=previous;
   win.DongjakWindowMotion?.cancel?.(previous);
   departingStyles=['z-index','display','visibility','opacity','pointer-events','animation','transition','will-change'].map(key=>[key,previous.style.getPropertyValue?.(key)||'',previous.style.getPropertyPriority?.(key)||'']);
   previous.hidden=false;
   previous.style.setProperty('animation','none','important');
   previous.style.setProperty('transition','none','important');
   previous.style.setProperty('will-change','opacity','important');
   previous.style.setProperty('display','flex','important');
   previous.style.setProperty('visibility','visible','important');
   previous.style.setProperty('z-index','6999','important');
   previous.style.setProperty('pointer-events','none','important');
   if(previous.id==='dj-route-v3')previous.inert=true;
   // Important opacity is deliberate: historical CSS fixes the page to
   // opacity:1 and filter:none, defeating an ordinary WAAPI fade.
   let last=null,elapsed=0;
   const fade=now=>{
    if(departing!==previous)return;
    if(last!==null)elapsed+=Math.min(48,Math.max(0,now-last));
    last=now;
    const p=Math.min(1,elapsed/TAB_TRANSITION.mapReturn);
    previous.style.setProperty('opacity',String(1-p*p*(3-2*p)),'important');
    if(p<1)departingFrame=win.requestAnimationFrame(fade);
    else clearEntrance();
   };
   previous.style.setProperty('opacity','1','important');
   departingFrame=win.requestAnimationFrame(fade);
  }else previous?.removeAttribute?.('data-dj-tab-outgoing');
  if(retain&&departing){enterTimer=win.setTimeout(clearEntrance,4500);return;}
  if(!reduced()&&!toMap){
   const panel=doc.querySelector('.page-panel[data-page="'+app.dataset.tab+'"]:not([hidden])');
   if(panel){entering=panel;panel.classList.add('dj-tab-content-enter');}
   if(revealContent(panel,app.dataset.tab)){enterTimer=win.setTimeout(clearEntrance,4500);return;}
  }
  if(reduced()){clearEntrance();return;}
  enterTimer=win.setTimeout(clearEntrance,(toMap?TAB_TRANSITION.mapReturn:TAB_TRANSITION.contentReveal)+30);
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
