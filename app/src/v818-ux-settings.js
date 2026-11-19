/** v818 – measured panel anchoring and per-device type scaling.
 * No map layer, API or private font assets are modified by this module.
 */
export function desktopPanelPosition(navRect,viewportWidth){
  const left=Math.max(0,Math.round(navRect.right)+14);
  const top=Math.max(60,Math.round(navRect.top));
  return {left,top,maxWidth:Math.max(270,Math.round(viewportWidth-left-18))};
}
export function installBeforePaintRoadWidthAnchor(doc=document,win=window){
  const app=doc.getElementById('app');
  const legend=doc.getElementById('road-width-legend');
  const rail=doc.getElementById('bottom-nav');
  if(!app||!legend||!rail)return ()=>{};
  const desktop=()=>!!win.matchMedia?.('(min-width:1080px)')?.matches;
  const anchor=()=>{
    if(!desktop()||legend.classList.contains('dj-float-user-positioned'))return;
    const rect=rail.getBoundingClientRect();
    const {left,top,maxWidth}=desktopPanelPosition(rect,win.innerWidth);
    // Synchronize legacy and current rail tokens BEFORE the original button
    // click can change legend.hidden. This prevents the first-frame flash at
    // the fallback right edge (no animated transform on this panel).
    app.style.setProperty('--dj800-panel-left',left+'px');
    app.style.setProperty('--dj800-panel-top',top+'px');
    app.style.setProperty('--dj800-panel-max',maxWidth+'px');
    app.style.setProperty('--dj-v724-rail-right',Math.round(rect.right)+'px');
    app.style.setProperty('--dj-v724-rail-top',Math.round(rect.top)+'px');
    legend.dataset.dj818AnchorReady='true';
  };
  const beforeToggle=event=>{
    if(event.target?.closest?.('#toggle-road-width'))anchor();
  };
  // Capture phase runs before the road-width module's click listener.
  doc.addEventListener('click',beforeToggle,true);
  const watcher=typeof MutationObserver!=='undefined'
    ?new MutationObserver(records=>{
      if(records.some(r=>r.attributeName==='hidden'&&!legend.hidden))anchor();
    }):null;
  watcher?.observe(legend,{attributes:true,attributeFilter:['hidden']});
  anchor();
  return ()=>{doc.removeEventListener('click',beforeToggle,true);watcher?.disconnect();};
}

export const TYPE_SIZE_FACTORS=Object.freeze({small:.94,normal:1,large:1.095,xlarge:1.19});
export function readableTypeValue(size,weight,baselineSize,baselineWeight){
  const factor=TYPE_SIZE_FACTORS[size]??1;
  const px=Math.max(9,Math.round(Number(baselineSize)*factor*10)/10);
  const w=Number(baselineWeight)||400;
  return {px,weight:weight==='bold'?Math.min(900,Math.max(w,Math.ceil((w+130)/100)*100)):w};
}
/** Keep the author's original hierarchy: adjust each element's own computed
 * base size rather than flattening every heading and caption to one size.
 * Excludes MapLibre tiles/controls and the map canvas.
 */
export function installWholeUIReadability(doc=document,win=window){
  const app=doc.getElementById('app');if(!app)return ()=>{};
  // iOS WebKit: never enumerate and synchronously restyle every nested text
  // node when My Info opens. The mobile visual scale is CSS/data-attribute
  // driven (v885); desktop retains the per-element measured implementation.
  if(win.matchMedia?.('(max-width:699px)')?.matches===true){
    app.dataset.dj885TypeEngine='css';
    return ()=>{delete app.dataset.dj885TypeEngine;};
  }
  const selector='#app .topbar,#app #bottom-nav,#app #transport-sheet,'+
    '#app #map-safety-controls,#app #map-advanced-controls,'+
    '#app #route-panel,#app #participation-panel,#app #news-panel,'+
    '#app #mine-panel,#app #road-width-legend,#app #map-gesture-guide,'+
    '#app #dj-map-settings,#app #dj-app-about,#app #version-history-modal,'+
    '#app #admin-dong-picker,#app #dj800-type-panel,#app #overview-sheet,'+
    '#app #map-quick-search-dropdown';
  const textSelector='h1,h2,h3,h4,p,small,label,button,input,select,textarea,'+
    'strong,b,em,span,li,dt,dd,summary,td,th';
  const base=new WeakMap(),changed=new Set();
  let disposed=false,scheduled=false,lastSetting='';
  const readSettings=()=>{
    let size=app.dataset.djTypeScale||app.dataset.djSettingsText||'normal';
    const weight=app.dataset.djTypeWeight||'normal';
    return {size:TYPE_SIZE_FACTORS[size]!==undefined?size:'normal',weight};
  };
  function restore(){
    for(const node of changed){
      const saved=base.get(node);if(!saved||!node.isConnected)continue;
      if(saved.inlineSize)node.style.setProperty('font-size',saved.inlineSize,saved.inlineSizePriority);
      else node.style.removeProperty('font-size');
      if(saved.inlineWeight)node.style.setProperty('font-weight',saved.inlineWeight,saved.inlineWeightPriority);
      else node.style.removeProperty('font-weight');
    }
  }
  const paint=()=>{
    scheduled=false;if(disposed)return;
    const {size,weight}=readSettings();
    const settingsKey=size+':'+weight;
    const settingsChanged=lastSetting!==settingsKey;
    lastSetting=settingsKey;
    if(size==='normal'&&weight==='normal'){
      if(settingsChanged){restore();changed.clear();}
      return;
    }
    const nodes=new Set();
    for(const root of doc.querySelectorAll(selector)){
      if(root.matches?.(textSelector))nodes.add(root);
      for(const node of root.querySelectorAll(textSelector))nodes.add(node);
    }
    // Read ALL original computed styles before writing ANY inline styles.
    // Interleaving getComputedStyle() and style.setProperty() for hundreds
    // of nodes made iOS Safari perform repeated synchronous layout passes.
    const pending=[];
    for(const node of nodes){
      if(!node.isConnected||node.closest?.('.maplibregl-control-container,.maplibregl-canvas-container,.maplibregl-popup'))continue;
      if(!settingsChanged&&changed.has(node))continue;
      let saved=base.get(node);
      if(!saved){
        const style=win.getComputedStyle?.(node);if(!style)continue;
        saved={baselineSize:parseFloat(style.fontSize),baselineWeight:parseInt(style.fontWeight,10)||400,
          inlineSize:node.style.getPropertyValue('font-size'),
          inlineSizePriority:node.style.getPropertyPriority('font-size'),
          inlineWeight:node.style.getPropertyValue('font-weight'),
          inlineWeightPriority:node.style.getPropertyPriority('font-weight')};
        base.set(node,saved);
      }
      if(Number.isFinite(saved.baselineSize))pending.push([node,saved]);
    }
    for(const [node,saved] of pending){
      const values=readableTypeValue(size,weight,saved.baselineSize,saved.baselineWeight);
      if(size!=='normal')node.style.setProperty('font-size',values.px+'px','important');
      else if(saved.inlineSize)node.style.setProperty('font-size',saved.inlineSize,saved.inlineSizePriority);
      else node.style.removeProperty('font-size');
      if(weight==='bold')node.style.setProperty('font-weight',String(values.weight),'important');
      else if(saved.inlineWeight)node.style.setProperty('font-weight',saved.inlineWeight,saved.inlineWeightPriority);
      else node.style.removeProperty('font-weight');
      changed.add(node);
    }
    // Do not retain detached transit result elements between API refreshes.
    for(const node of changed)if(!node.isConnected)changed.delete(node);
  };
  const schedule=()=>{
    if(scheduled||disposed)return;scheduled=true;
    (win.requestAnimationFrame||((fn)=>Promise.resolve().then(fn)))(paint);
  };
  // Style attribute mutations are deliberately not observed; otherwise the
  // controls would trigger their own infinite resize/repaint loop.
  const appObserver=new MutationObserver(schedule);
  appObserver.observe(app,{attributes:true,attributeFilter:['data-dj-type-scale','data-dj-type-weight','data-dj-settings-text']});
  // Newly rendered route cards and asynchronous transport results.
  const contentObservers=[];
  for(const root of doc.querySelectorAll(selector)){
    const observer=new MutationObserver(schedule);
    observer.observe(root,{childList:true,subtree:true});
    contentObservers.push(observer);
  }
  win.addEventListener('resize',schedule,{passive:true});
  schedule();
  return ()=>{disposed=true;appObserver.disconnect();contentObservers.forEach(o=>o.disconnect());win.removeEventListener('resize',schedule);restore();};
}

export function installV818UX(doc=document,win=window){
  const stopRoad=installBeforePaintRoadWidthAnchor(doc,win);
  const stopReadability=installWholeUIReadability(doc,win);
  return ()=>{stopRoad();stopReadability();};
}
if(typeof document!=='undefined'){
  const boot=()=>installV818UX();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
