/**
 * Content-sized compact transport cards. The existing expand/collapse and
 * dismissal controllers remain the only owners of sheet state and movement.
 * Only the CSS height variable is updated; expanded sheets do not use it.
 */
export function compactTransportHeight({header=0,grip=0,body=0,viewport=0}={}){
  const v=Math.max(320,Number(viewport)||320);
  const natural=Math.ceil(Math.max(0,header)+Math.max(0,grip)+Math.max(0,body)+12);
  // Show the live arrival section on first open. The former 196px minimum
  // could leave only the station title/actions visible on an iPhone.
  // Keep the remainder internally scrollable, never force a 100vh sheet.
  const minimum=Math.min(Math.floor(v*.68),Math.max(196,Math.floor(v*.56)));
  return Math.round(Math.min(Math.floor(v*.68),Math.max(minimum,natural)));
}

/**
 * A scroll container's scrollHeight includes its *forced flex height* when
 * there are few rows. Measuring visible children avoids a self-locking 52dvh
 * sheet that never shrinks even though the actual content is short.
 */
export function measureFlowContent(node,win=globalThis.window){
  if(!node)return 0;
  const base=win?.getComputedStyle?.(node);
  const pad=(parseFloat(base?.paddingTop)||0)+(parseFloat(base?.paddingBottom)||0);
  const children=[...node.children].filter(el=>{
    if(el.hidden)return false;
    const cs=win?.getComputedStyle?.(el);
    return cs?.display!=='none'&&cs?.position!=='absolute'&&cs?.position!=='fixed';
  });
  const gap=(parseFloat(base?.rowGap)||0)*Math.max(0,children.length-1);
  const content=children.reduce((sum,el)=>{
    const cs=win?.getComputedStyle?.(el);
    const margin=(parseFloat(cs?.marginTop)||0)+(parseFloat(cs?.marginBottom)||0);
    return sum+Math.max(el.getBoundingClientRect?.().height||0,el.scrollHeight||0)+margin;
  },0);
  return Math.ceil(pad+gap+content);
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
      body:measureFlowContent(body,win)
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

/** Facility popups use the same content-first compact sizing policy. */
export function compactFacilityHeight({header=0,body=0,viewport=0}={}){
  const v=Math.max(320,Number(viewport)||320);
  return Math.round(Math.max(210,Math.min(Math.floor(v*.56),
    Math.ceil(Math.max(0,header)+Math.max(0,body)+12))));
}

export function installCompactFacilityPopups(doc=globalThis.document,win=globalThis.window){
  const map=doc?.getElementById?.('map');
  if(!map||!win)return ()=>{};
  let scheduled=0,disposed=false;
  function sync(){
    scheduled=0;
    if(disposed||!win.matchMedia?.('(max-width:699px)')?.matches)return;
    for(const popup of map.querySelectorAll('.dj-place-detail-popup')){
      if(popup.classList.contains('dj871-place-expanded')||popup.classList.contains('dj871-sheet-expanded'))continue;
      const head=popup.querySelector('.dj-place-header');
      const body=popup.querySelector('.dj-place-body');
      if(!head||!body)continue;
      const style=win.getComputedStyle?.(body);
      const visible=[...body.children].filter(node=>!node.hidden&&win.getComputedStyle(node).display!=='none');
      const gap=parseFloat(style?.rowGap)||0;
      const padding=(parseFloat(style?.paddingTop)||0)+(parseFloat(style?.paddingBottom)||0);
      const naturalBody=visible.reduce((total,node)=>total+node.getBoundingClientRect().height,0)
        +Math.max(0,visible.length-1)*gap+padding;
      const viewport=win.visualViewport?.height||win.innerHeight;
      const height=compactFacilityHeight({
        header:head.getBoundingClientRect().height,body:naturalBody,viewport
      })+'px';
      if(popup.style.getPropertyValue('--dj9251-facility-content-height')!==height)
        popup.style.setProperty('--dj9251-facility-content-height',height);
    }
  }
  const request=()=>{
    if(disposed||scheduled)return;
    scheduled=win.requestAnimationFrame?win.requestAnimationFrame(sync):win.setTimeout(sync,0);
  };
  const observer=typeof MutationObserver==='function'?new MutationObserver(request):null;
  observer?.observe(map,{subtree:true,childList:true,characterData:true,
    attributes:true,attributeFilter:['class','hidden']});
  win.addEventListener?.('resize',request,{passive:true});
  win.visualViewport?.addEventListener?.('resize',request,{passive:true});
  request();
  return ()=>{
    disposed=true;
    if(scheduled){win.cancelAnimationFrame?.(scheduled);win.clearTimeout?.(scheduled);}
    observer?.disconnect();
    win.removeEventListener?.('resize',request);
    win.visualViewport?.removeEventListener?.('resize',request);
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>{installCompactTransportSheet(document,window);installCompactFacilityPopups(document,window);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
