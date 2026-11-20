/**
 * Content-sized compact transport cards. The existing expand/collapse and
 * dismissal controllers remain the only owners of sheet state and movement.
 * Only the CSS height variable is updated; expanded sheets do not use it.
 */
export function compactTransportHeight({header=0,grip=0,body=0,viewport=0}={}){
  const v=Math.max(320,Number(viewport)||320);
  const natural=Math.ceil(Math.max(0,header)+Math.max(0,grip)+Math.max(0,body)+12);
  return Math.round(Math.max(196,Math.min(Math.floor(v*.52),natural)));
}

export function installCompactTransportSheet(doc=globalThis.document,win=globalThis.window){
  const panel=doc?.getElementById?.('transport-sheet');
  if(!panel||!win||panel.dataset.djCompactSizing==='active')return ()=>{};
  panel.dataset.djCompactSizing='active';
  const body=panel.querySelector('.dj875-transit-scroll');
  const header=panel.querySelector('.transport-panel-head');
  const grip=panel.querySelector(':scope > .handle');
  let raf=0,disposed=false;
  const sync=()=>{
    raf=0;
    if(disposed)return;
    if(panel.hidden||panel.classList.contains('dj871-sheet-expanded'))return;
    const viewport=win.visualViewport?.height||win.innerHeight;
    const size=compactTransportHeight({
      viewport,header:header?.getBoundingClientRect().height||0,
      grip:grip?.getBoundingClientRect().height||0,
      body:body?.scrollHeight||0
    });
    const value=size+'px';
    if(panel.style.getPropertyValue('--dj9251-transport-content-height')!==value)
      panel.style.setProperty('--dj9251-transport-content-height',value);
  };
  const schedule=()=>{
    if(disposed||raf)return;
    raf=typeof win.requestAnimationFrame==='function'
      ?win.requestAnimationFrame(sync):win.setTimeout(sync,0);
  };
  const observer=typeof MutationObserver==='function'?new MutationObserver(schedule):null;
  observer?.observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,
    attributeFilter:['hidden','class','data-kind','data-loading-line']});
  const resize=()=>schedule();
  win.addEventListener?.('resize',resize,{passive:true});
  win.visualViewport?.addEventListener?.('resize',resize,{passive:true});
  // Font decoding and late arrival updates can change content after opening.
  if(typeof ResizeObserver==='function'){
    const watcher=new ResizeObserver(schedule);
    if(header)watcher.observe(header);
    // Do not observe the scroll viewport: resizing it could recursively trigger
    // this updater. Text/arrival changes are observed by the mutation listener.
    panel._djCompactResizeObserver=watcher;
  }
  schedule();
  return ()=>{
    disposed=true;
    if(raf){win.cancelAnimationFrame?.(raf);win.clearTimeout?.(raf);}
    observer?.disconnect();panel._djCompactResizeObserver?.disconnect();
    delete panel._djCompactResizeObserver;
    win.removeEventListener?.('resize',resize);
    win.visualViewport?.removeEventListener?.('resize',resize);
    panel.style.removeProperty('--dj9251-transport-content-height');
    delete panel.dataset.djCompactSizing;
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installCompactTransportSheet(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
