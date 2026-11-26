/** Independent full-screen presentation owner.
 * The native navigation callback remains the sole owner of application data,
 * tab selection, route reset and feature lifecycle. This module only holds
 * the actual outgoing surface and fades it over the committed destination.
 * Never clone, reparent, hide or resize the WebGL map.
 */
export const communityNews=key=>key==='participate'||key==='news';
const PRIMARY_PANEL_IDS=Object.freeze({participate:'participation-panel',news:'news-panel',mine:'mine-panel',route:'route-panel'});
// A transient legacy hidden write must not make the committed page unfindable.
export function primaryPanel(doc,key){
 if(key==='route'){const host=doc.getElementById('dj-route-v3');if(host&&!host.hidden)return host;}
 const id=PRIMARY_PANEL_IDS[key];return id?(doc.getElementById(id)||doc.querySelector('.page-panel[data-page="'+key+'"]')):null;
}
export function createPrimarySurfaceTransition({doc,win,app,replay,reduced}){
 // Community/news use a separate, single-owner live compositor. The
 // legacy tab entrance classes and shared opacity loops never run for them.
 let pageCleanup=null;
 function dissolvePrimary(button,previousTab,previous){
  pageCleanup?.();
  const destination=button.dataset.tab,fromMap=previousTab==='map',toMap=destination==='map';
  // The active logical tab owns its real surface even when an earlier layout
  // observer briefly hid it. Never infer the direct-pair mode from visibility.
  previous=previous||primaryPanel(doc,previousTab);
  const directPair=communityNews(previousTab)&&communityNews(destination)&&previousTab!==destination;
  if(!win.requestAnimationFrame||!win.getComputedStyle||reduced())return replay(button);
  const records=new Map();let raf=0,timer=0,finished=false,fade=null;
  const props=['opacity','animation','transition','will-change','display','visibility','z-index','pointer-events'];
  const remember=node=>{if(node?.style?.getPropertyValue&&!records.has(node))records.set(node,props.map(k=>[k,node.style.getPropertyValue(k),node.style.getPropertyPriority(k)]));};
  const write=(node,values)=>{if(!node?.style?.setProperty)return;remember(node);for(const [k,v] of Object.entries(values))node.style.setProperty(k,v,'important');};
  const panelFor=key=>primaryPanel(doc,key);
  const chrome=[doc.getElementById('map'),app.querySelector?.(':scope > .topbar'),doc.getElementById('djNext-toolbar'),doc.getElementById('dj-v794-toolbar')].filter(Boolean);
  const oldChrome=fromMap?chrome.filter(n=>!n.hidden&&win.getComputedStyle(n).display!=='none'&&win.getComputedStyle(n).visibility!=='hidden').map(n=>[n,win.getComputedStyle(n).display]):[];
  const cleanup=()=>{
   if(finished)return;finished=true;
   if(raf)win.cancelAnimationFrame(raf);if(timer)win.clearTimeout(timer);
   if(previous){if(previous.id==='dj-route-v3'){previous.hidden=app.dataset.tab!=='route';previous.inert=false;}else if(previous.dataset.page!==app.dataset.tab)previous.hidden=true;delete previous.dataset.djTabOutgoing;}
   for(const [node,values] of records){delete node.dataset.djPrimaryTransition;for(const [k,v,p] of values){if(v&&!(node.hidden&&['display','visibility','opacity','pointer-events'].includes(k)))node.style.setProperty(k,v,p);else node.style.removeProperty(k);}}
   delete app.dataset.djPrimaryDissolving;
   if(pageCleanup===cleanup)pageCleanup=null;
  };
  pageCleanup=cleanup;app.dataset.djPrimaryDissolving='true';
  if(previous){win.DongjakWindowMotion?.cancel?.(previous);remember(previous);previous.dataset.djTabOutgoing='true';previous.dataset.djPrimaryTransition='outgoing';}
  if(!replay(button)||app.dataset.tab!==destination){cleanup();return;}
  const incoming=toMap?null:panelFor(destination);
  // Community ↔ news: composite the incoming real page OVER the opaque
  // outgoing page. The incoming alpha reveals its content while the old
  // page fades proportionally underneath, with no exposed map/blank frame.
  const revealIncoming=fromMap||directPair||(!previous&&!toMap);
  fade=revealIncoming?incoming:previous;
  if(!fade?.style?.setProperty){cleanup();return;}
  // Keep live map controls beneath the page instead of above its fading
  // footer/header. The common dock remains unchanged above both surfaces.
  if(fromMap||toMap){
   const activeChrome=fromMap?oldChrome:chrome.filter(n=>!n.hidden&&win.getComputedStyle(n).display!=='none').map(n=>[n,win.getComputedStyle(n).display]);
   for(const [node,display] of activeChrome)write(node,{display,visibility:'visible',opacity:'1','pointer-events':'none',...(node.id==='map'?{}:{'z-index':'6498'})});
  }
  if(incoming){win.DongjakWindowMotion?.cancel?.(incoming);incoming.hidden=false;incoming.dataset.djPrimaryTransition='incoming';write(incoming,{animation:'none',transition:'none',opacity:revealIncoming?'0':'1','z-index':directPair?'7001':'7000',visibility:'visible',display:'flex'});}
  if(previous){previous.hidden=false;if(previous.id==='dj-route-v3')previous.inert=true;write(previous,{animation:'none',transition:'none',opacity:'1','z-index':directPair?'7000':'7001',visibility:'visible',display:'flex','pointer-events':'none'});}
  write(fade,{'will-change':'opacity'});
  // Use a delivered-frame clock for this independent compositor. A busy
  // WebGL renderer can skip a wall-clock CSS transition entirely; advance
  // by at most 32ms per rendered frame, never skip the visible dissolve.
  // The prior live surface and destination stay mounted until completion.
  let previousFrame=null,elapsed=0;
  // A stalled remote WebGL renderer must not consume the presentation before
  // the first delivered frame. Bound only a truly unresponsive renderer.
  const armWatchdog=()=>{if(timer)win.clearTimeout(timer);timer=win.setTimeout(cleanup,15000);};
  const paint=now=>{
   if(finished)return;
   // A programmatic navigation or a newly opened modal must win over a
   // stale presentation. Never resurrect an already dismissed destination.
   if(app.dataset.tab!==destination||app.inert||doc.getElementById('dj-community-editor-portal')?.hidden===false){cleanup();return;}
   // The logical destination has not changed. Reconcile stale hidden writes
   // from legacy observers without opening an explicitly dismissed modal.
   if(incoming&&incoming.hidden)incoming.hidden=false;
   // The outgoing page is logically dismissed but must remain painted until
   // this owner releases it. A legacy visibility write cannot skip the fade.
   if(previous&&previous.hidden)previous.hidden=false;
   if(previous)write(previous,{display:'flex',visibility:'visible','pointer-events':'none',...(directPair?{opacity:'1','z-index':'7000',animation:'none',transition:'none'}:{})});
   if(directPair)write(incoming,{display:'flex',visibility:'visible','z-index':'7001',animation:'none',transition:'none'});
   if(previousFrame!==null)elapsed+=Math.min(32,Math.max(0,now-previousFrame));
   previousFrame=now;
   const progress=Math.min(1,elapsed/300),alpha=progress*progress*(3-2*progress);
   write(fade,{opacity:String(revealIncoming?alpha:1-alpha)});
   if(progress<1){armWatchdog();raf=win.requestAnimationFrame(paint);}
   else cleanup();
  };
  armWatchdog();
  raf=win.requestAnimationFrame(paint);
 }

 return {dissolvePrimary,cancel:()=>pageCleanup?.()};
}
