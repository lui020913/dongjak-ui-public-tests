/** Map HUD collision guard. Geometry only: does not alter layer state,
 * tab routing, positioning, or the existing window lifecycle.
 * A hidden HUD retains its layout rectangle so it can recover without flicker.
 */
export const HUD_TARGETS=[
 '.map-actions > button','#map .maplibregl-ctrl-group > button',
 '#djNext-active-layers .djNext-active-layer-off',
 '#map .maplibregl-ctrl-scale','#dj840-map-tip',
 '[data-dj-collision-hud]'
].join(',');
export const HUD_SURFACES=[
 '#bottom-nav','.topbar','#djNext-toolbar','#dj-v794-toolbar','#map-quick-search',
 '#route-pick-hint','#community-map-hint','#route-transit-confirm',
 '#route-map-card','#nav-live-card','#route-place-search','#dj-route-v3',
 '#overview-sheet','#detail-sheet','#entry-sheet','#admin-dong-picker',
 '#transport-sheet','#dj-bus-route-detail','#ped-tools-panel',
 '#djNext-layer-panel','#dj-pri-legend','#road-width-legend','#pza-road-sheet',
 '#map-advanced-controls','#map-safety-controls','#night-visibility-float',
 '#map-gesture-guide','#dj854-weather-sheet','#dj832-data-sheet',
 '#dj-mobile-utilities','#dj-community-editor-portal','.page-panel',
 '.dj-place-detail-popup','.maplibregl-popup',
 'dialog[open]','[role="dialog"]','[role="alertdialog"]',
 '[data-dj-collision-surface]'
].join(',');
const MARK='data-dj-hud-occluded';
export function overlapsRect(a,b,threshold=1){
 if(!a||!b)return false;
 return Math.min(a.right,b.right)-Math.max(a.left,b.left)>threshold&&
  Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>threshold;
}
export function hudPriority(node){
 if(node.matches('.map-actions > button,#map .maplibregl-ctrl-group > button'))return 0;
 if(node.matches('#djNext-active-layers .djNext-active-layer-off'))return 1;
 if(node.matches('#map .maplibregl-ctrl-scale'))return 2;
 return 3;
}
// Avoid treating a logically hidden surface, zero-sized node, or fading-out
// invisible parent as an obstacle. Only our own visibility marker is ignored
// when measuring targets; never undo another controller's visibility.
function renderedRect(node,win,measuringTarget=false){
 if(!node?.isConnected||!node.getClientRects().length)return null;
 for(let p=node;p&&p.nodeType===1;p=p.parentElement){
  if(p.hidden)return null;
  const style=win.getComputedStyle(p);
  const owned=measuringTarget&&p===node&&p.hasAttribute(MARK);
  if(style.display==='none'||(!owned&&(style.visibility==='hidden'||style.visibility==='collapse'||Number(style.opacity)<=.02)))return null;
 }
 const r=node.getBoundingClientRect();
 if(r.width<=0||r.height<=0)return null;
 return r;
}
const owners=new WeakMap();
export function installMapHudCollisionGuard(doc=document,win=window){
 const app=doc.getElementById('app');if(!app)return ()=>{};
 if(owners.has(app))return owners.get(app);
 let frame=0,disposed=false,burstUntil=0;
 const observed=new Set(),managed=new Set(),removers=[];
 const selector=HUD_TARGETS+','+HUD_SURFACES;
 const relevant=node=>node?.nodeType===1&&(node===app||node.matches(selector)||Boolean(node.closest(selector)));
 const resize=win.ResizeObserver?new win.ResizeObserver(()=>schedule()):null;
 const reconcile=nodes=>{
  const next=new Set(nodes);
  for(const n of observed)if(!next.has(n)){resize?.unobserve(n);observed.delete(n);}
  for(const n of next)if(!observed.has(n)){resize?.observe(n);observed.add(n);}
 };
 const mark=(node,on)=>{
  if(on){if(!node.hasAttribute(MARK))node.setAttribute(MARK,'true');managed.add(node);}
  else{if(node.hasAttribute(MARK))node.removeAttribute(MARK);managed.delete(node);}
 };
 function scan(){
  frame=0;if(disposed)return;
  const targets=[...app.querySelectorAll(HUD_TARGETS)];
  const surfaces=[...doc.querySelectorAll(HUD_SURFACES)];
  reconcile([...targets,...surfaces]);
  for(const n of [...managed])if(!targets.includes(n))mark(n,false);
  // Batch all layout reads before writes. The map canvas and markers are
  // deliberately not included, so map panning does not trigger per-frame work.
  const obstacles=surfaces.map(node=>({node,rect:renderedRect(node,win)})).filter(x=>x.rect);
  const candidates=targets.map(node=>({node,rect:renderedRect(node,win,true),priority:hudPriority(node)})).sort((a,b)=>a.priority-b.priority);
  const occupied=[],decisions=[];
  for(const {node,rect} of candidates){
   const other=x=>x.node!==node&&!x.node.contains(node)&&!node.contains(x.node)&&overlapsRect(rect,x.rect);
   const blocked=Boolean(rect&&(obstacles.some(other)||occupied.some(other)));
   decisions.push([node,blocked]);
   if(rect&&!blocked)occupied.push({node,rect});
  }
  for(const [node,blocked] of decisions)mark(node,blocked);
  if(win.performance.now()<burstUntil)schedule();
 }
 function schedule(){if(!disposed&&!frame)frame=win.requestAnimationFrame(scan);}
 function burst(){burstUntil=Math.max(burstUntil,win.performance.now()+700);schedule();}
 const listen=(target,type,fn,opts)=>{if(!target?.addEventListener)return;target.addEventListener(type,fn,opts);removers.push(()=>target.removeEventListener(type,fn,opts));};
 // Observe actual overlay/control changes, not unrelated map marker updates.
 const observer=win.MutationObserver?new win.MutationObserver(records=>{
  if(records.some(m=>relevant(m.target)||(m.type==='childList'&&[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&(n.matches(selector)||n.querySelector(selector))))))schedule();
 }):null;
 observer?.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style','open','role','data-tab','data-sheet-state','data-dj-collision-surface','data-dj-collision-hud','aria-hidden']});
 for(const [target,type] of [[win,'resize'],[win,'orientationchange'],[win,'pageshow'],[win.visualViewport,'resize'],[win.visualViewport,'scroll']])listen(target,type,schedule,{passive:true});
 for(const type of ['transitionrun','animationstart'])listen(doc,type,e=>{if(relevant(e.target))burst();},true);
 for(const type of ['transitionend','transitioncancel','animationend','animationcancel'])listen(doc,type,e=>{if(relevant(e.target))schedule();},true);
 listen(doc,'scroll',e=>{if(relevant(e.target))schedule();},true);
 let dragging=false;
 listen(doc,'pointerdown',e=>{dragging=relevant(e.target);},true);
 listen(doc,'pointermove',()=>{if(dragging)schedule();},{capture:true,passive:true});
 for(const type of ['pointerup','pointercancel'])listen(doc,type,()=>{if(dragging){dragging=false;schedule();}},true);
 const dispose=()=>{if(disposed)return;disposed=true;observer?.disconnect();resize?.disconnect();if(frame)win.cancelAnimationFrame(frame);for(const n of managed)mark(n,false);for(const fn of removers)fn();owners.delete(app);};
 owners.set(app,dispose);schedule();return dispose;
}
