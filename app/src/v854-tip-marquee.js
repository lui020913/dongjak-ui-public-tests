/** v8.5.4 — measure the mobile TIP sentence and move it only inside its pill. */
export function installTipMarquee(doc=document,win=window){
  const app=doc.getElementById('app');if(!app||!win.matchMedia)return ()=>{};
  const media=win.matchMedia('(max-width:699px)');
  let observer=null,resize=null,raf=0;
  const tip=()=>doc.getElementById('dj840-map-tip');
  function measure(){
    raf=0;const node=tip();if(!node)return;
    const copy=node.querySelector('.dj840-tip-copy')||node.querySelector('span');
    const viewport=copy?.parentElement?.classList.contains('dj840-tip-copy-viewport')?copy.parentElement:node;
    if(!copy||!node.querySelector('strong'))return;
    if(node.hidden||!node.classList.contains('is-visible')||!media.matches){node.classList.remove('dj854-tip-marquee');return;}
    const style=win.getComputedStyle(viewport);
    const padding=(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0);
    const available=Math.max(0,viewport.clientWidth-padding);
    const overflow=Math.max(0,copy.scrollWidth-available);
    const offset=`${-overflow}px`;
    if(node.style.getPropertyValue('--dj854-tip-overflow')!==offset)node.style.setProperty('--dj854-tip-overflow',offset);
    const moving=overflow>10;
    if(node.classList.contains('dj854-tip-marquee')!==moving)node.classList.toggle('dj854-tip-marquee',moving);
    if(moving){
      const duration=`${Math.max(6,Math.min(16,overflow/12))}s`;
      if(node.style.getPropertyValue('--dj854-tip-duration')!==duration)node.style.setProperty('--dj854-tip-duration',duration);
    }else if(node.style.getPropertyValue('--dj854-tip-duration'))node.style.removeProperty('--dj854-tip-duration');
  }
  const schedule=()=>{if(raf)return;raf=(win.requestAnimationFrame||((fn)=>win.setTimeout(fn,16)))(measure);};
  function attach(){
    if(observer)return;
    const node=tip();if(!node)return;
    // Ignore inline style changes made by measure() itself: observing them
    // causes a new animation-frame measurement on every single frame.
    observer=new MutationObserver(schedule);observer.observe(node,{attributes:true,attributeFilter:['hidden','class'],childList:true,characterData:true,subtree:true});
    if(typeof win.ResizeObserver==='function'){resize=new win.ResizeObserver(schedule);resize.observe(node);}
    schedule();
  }
  function detach(){observer?.disconnect();observer=null;resize?.disconnect();resize=null;const node=tip();node?.classList.remove('dj854-tip-marquee');node?.style.removeProperty('--dj854-tip-overflow');}
  const sync=()=>{if(media.matches)attach();else detach();};
  media.addEventListener?.('change',sync);sync();
  const rootObserver=new MutationObserver(()=>{if(media.matches){if(!observer)attach();schedule();}});
  rootObserver.observe(app,{childList:true,subtree:true});
  win.addEventListener('resize',schedule,{passive:true});
  return ()=>{media.removeEventListener?.('change',sync);rootObserver.disconnect();win.removeEventListener('resize',schedule);detach();if(raf)win.cancelAnimationFrame?.(raf);};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installTipMarquee(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
