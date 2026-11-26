/** v8.5.4 — measure the mobile TIP sentence and move it only inside its pill. */
export function installTipMarquee(doc=document,win=window){
  const app=doc.getElementById('app');if(!app||!win.matchMedia)return ()=>{};
  const media=win.matchMedia('(max-width:699px)');
  let observer=null,resize=null,raf=0,lastKey='';
  const tip=()=>doc.getElementById('dj840-map-tip');
  function measure(){
    raf=0;const node=tip();if(!node)return;
    const copy=node.querySelector('.dj840-tip-copy')||node.querySelector('span');
    const viewport=copy?.parentElement?.classList.contains('dj840-tip-copy-viewport')?copy.parentElement:node;
    if(!copy||!node.querySelector('strong'))return;
    if(node.hidden||!node.classList.contains('is-visible')||!media.matches){node.classList.remove('dj854-tip-marquee');lastKey='';delete node.dataset.djTipReadUntil;return;}
    // The separate X control may overlap the text lane on narrow phones.
    const close=doc.getElementById('dj-user-tip-close');
    const lane=viewport.getBoundingClientRect(), x=close?.getBoundingClientRect();
    const oldReserve=parseFloat(node.style.getPropertyValue('--dj-tip-close-reserve'))||0;
    const reserve=x&&x.width&&x.height&&x.bottom>lane.top&&x.top<lane.bottom?Math.max(0,Math.ceil(lane.right+oldReserve-x.left+6)):0;
    if(reserve!==oldReserve)node.style.setProperty('--dj-tip-close-reserve',reserve+'px');
    const style=win.getComputedStyle(viewport);
    const padding=(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0);
    const available=Math.max(0,viewport.clientWidth-padding);
    const overflow=Math.max(0,Math.ceil(copy.getBoundingClientRect().width-available));
    const offset=`${-overflow}px`;
    if(node.style.getPropertyValue('--dj854-tip-overflow')!==offset)node.style.setProperty('--dj854-tip-overflow',offset);
    const moving=overflow>0;
    const durationSeconds=Math.max(6,overflow/12);
    const key=[copy.textContent,available,overflow].join('|');
    if(key!==lastKey){
      lastKey=key;
      // Restart at the first character on every new message or lane resize.
      node.classList.remove('dj854-tip-marquee');
      void copy.offsetWidth;
      node.dataset.djTipReadUntil=String(Date.now()+Math.max(10000,moving?(durationSeconds+2)*1000:10000));
    }
    if(node.classList.contains('dj854-tip-marquee')!==moving)node.classList.toggle('dj854-tip-marquee',moving);
    if(moving){
      const duration=`${durationSeconds}s`;
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
    if(typeof win.ResizeObserver==='function'){resize=new win.ResizeObserver(schedule);resize.observe(node);const lane=node.querySelector('.dj840-tip-copy-viewport');if(lane)resize.observe(lane);}
    schedule();
  }
  function detach(){observer?.disconnect();observer=null;resize?.disconnect();resize=null;const node=tip();node?.classList.remove('dj854-tip-marquee');node?.style.removeProperty('--dj854-tip-overflow');node?.style.removeProperty('--dj-tip-close-reserve');if(node)delete node.dataset.djTipReadUntil;lastKey='';}
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
