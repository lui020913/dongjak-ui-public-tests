/** Mobile TIP: measure rendered text, keep the viewport fixed and move only the copy. */
export function installTipMarquee(doc=document,win=window){
  const app=doc.getElementById('app');if(!app||!win.matchMedia)return ()=>{};
  const media=win.matchMedia('(max-width:699px)'),reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  let observer=null,resize=null,raf=0,motion=0,lastKey='',disposed=false,tracked=null;
  const tip=()=>doc.getElementById('dj840-map-tip');
  const stop=()=>{
    if(motion)win.cancelAnimationFrame(motion);motion=0;
    tracked?.style.removeProperty('transform');tracked=null;
  };
  function measure(){
    raf=0;const node=tip();if(!node||disposed)return;
    const copy=node.querySelector('.dj840-tip-copy'),viewport=node.querySelector('.dj840-tip-copy-viewport');
    if(!copy||!viewport||!node.querySelector('strong'))return;
    if(doc.hidden||node.hidden||!node.classList.contains('is-visible')||!media.matches||!node.getClientRects().length||win.getComputedStyle(node).visibility==='hidden'){
      stop();node.classList.remove('dj854-tip-marquee');lastKey='';delete node.dataset.djTipReadUntil;return;
    }
    const close=doc.getElementById('dj-user-tip-close');
    const lane=viewport.getBoundingClientRect(),x=close?.getBoundingClientRect();
    const oldReserve=parseFloat(node.style.getPropertyValue('--dj-tip-close-reserve'))||0;
    const reserve=x&&x.width&&x.height&&x.bottom>lane.top&&x.top<lane.bottom?Math.max(0,Math.ceil(lane.right+oldReserve-x.left+8)):0;
    if(reserve!==oldReserve)node.style.setProperty('--dj-tip-close-reserve',reserve+'px');
    const style=win.getComputedStyle(viewport);
    const padding=(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0);
    const available=Math.max(0,viewport.clientWidth-padding);
    if(available<=0){stop();lastKey='';return;}
    const range=doc.createRange();range.selectNodeContents(copy);
    const textWidth=Math.max(copy.scrollWidth,copy.getBoundingClientRect().width,range.getBoundingClientRect().width);
    const overflow=Math.max(0,copy.scrollWidth-available,Math.ceil(textWidth-available));
    const moving=overflow>0&&!reduced.matches&&!app.classList.contains('dj-reduced-animation');
    const key=[copy.textContent,available,overflow,moving].join('|');
    if(key===lastKey)return;
    lastKey=key;stop();tracked=copy;
    node.classList.toggle('dj854-tip-marquee',moving);
    const offset=`${-overflow}px`;
    if(node.style.getPropertyValue('--dj854-tip-overflow')!==offset)node.style.setProperty('--dj854-tip-overflow',offset);
    const travelSeconds=Math.max(1.8,overflow/24);
    const durationSeconds=travelSeconds*2+2;
    node.dataset.djTipReadUntil=String(Date.now()+Math.max(10000,moving?(durationSeconds+2)*1000:10000));
    if(!moving)return;
    copy.style.setProperty('transform','translate3d(0,0,0)','important');
    const start=win.performance.now();
    // Important transform is intentional: older production styles override CSS
    // animation transforms. Only the text itself moves, never the TIP/X/lane.
    const frame=now=>{
      motion=0;
      if(disposed||doc.hidden||node.hidden||!node.classList.contains('is-visible')||tracked!==copy){stop();lastKey='';return;}
      const t=(now-start)/1000;
      let progress=0;
      if(t>=1&&t<1+travelSeconds)progress=(t-1)/travelSeconds;
      else if(t>=1+travelSeconds&&t<2+travelSeconds)progress=1;
      else if(t>=2+travelSeconds&&t<durationSeconds)progress=1-(t-2-travelSeconds)/travelSeconds;
      copy.style.setProperty('transform',`translate3d(${(-overflow*Math.max(0,Math.min(1,progress))).toFixed(2)}px,0,0)`,'important');
      if(t<durationSeconds)motion=win.requestAnimationFrame(frame);
    };
    motion=win.requestAnimationFrame(frame);
  }
  const schedule=()=>{if(disposed||raf)return;raf=win.requestAnimationFrame(measure);};
  function attach(){
    if(observer)return;
    const node=tip();if(!node)return;
    observer=new win.MutationObserver(schedule);observer.observe(node,{attributes:true,attributeFilter:['hidden','class'],childList:true,characterData:true,subtree:true});
    if(typeof win.ResizeObserver==='function'){resize=new win.ResizeObserver(schedule);resize.observe(node);const lane=node.querySelector('.dj840-tip-copy-viewport'),copy=node.querySelector('.dj840-tip-copy');if(lane)resize.observe(lane);if(copy)resize.observe(copy);}
    schedule();
  }
  const rootObserver=new win.MutationObserver(()=>{attach();schedule();});
  rootObserver.observe(app,{childList:true,subtree:true});
  const stateObserver=new win.MutationObserver(schedule);
  stateObserver.observe(app,{attributes:true,attributeFilter:['data-tab','data-search-open','data-dj-pri-visible','class']});
  media.addEventListener?.('change',schedule);reduced.addEventListener?.('change',schedule);
  doc.addEventListener('visibilitychange',schedule);win.addEventListener('resize',schedule,{passive:true});
  doc.fonts?.ready?.then(schedule);attach();
  return ()=>{disposed=true;media.removeEventListener?.('change',schedule);reduced.removeEventListener?.('change',schedule);doc.removeEventListener('visibilitychange',schedule);win.removeEventListener('resize',schedule);rootObserver.disconnect();stateObserver.disconnect();observer?.disconnect();resize?.disconnect();if(raf)win.cancelAnimationFrame(raf);stop();const node=tip();node?.classList.remove('dj854-tip-marquee');node?.style.removeProperty('--dj854-tip-overflow');node?.style.removeProperty('--dj-tip-close-reserve');if(node)delete node.dataset.djTipReadUntil;};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installTipMarquee(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
