// Visual-only tab indicator. The existing navigator still owns tab selection.
export function installMobileInteractionFeedback(doc=document,win=window){
 const nav=doc.getElementById('bottom-nav'),app=doc.getElementById('app');
 if(!nav||!app||nav.dataset.djMotionIndicator)return ()=>{};
 const mq=win.matchMedia('(max-width:699px)'),reduced=win.matchMedia('(prefers-reduced-motion:reduce)');
 const indicator=doc.createElement('span');indicator.className='dj-motion-indicator';indicator.setAttribute('aria-hidden','true');
 let frame=0;
 const sync=()=>{
  frame=0;
  if(!mq.matches){delete nav.dataset.djMotionIndicator;indicator.remove();return;}
  const tab=nav.querySelector('.nav-tab[aria-current=page]')||nav.querySelector('.nav-tab.active');
  if(!tab||!nav.getBoundingClientRect().width)return;
  const a=nav.getBoundingClientRect(),b=tab.getBoundingClientRect();
  if(!b.width||!b.height)return;
  const first=!indicator.isConnected;
  if(first){nav.prepend(indicator);indicator.style.transition='none';}
  indicator.style.width=b.width+'px';indicator.style.height=b.height+'px';
  indicator.style.transform=`translate3d(${b.left-a.left-nav.clientLeft}px,${b.top-a.top-nav.clientTop}px,0)`;
  nav.dataset.djMotionIndicator='ready';
  if(first)win.requestAnimationFrame(()=>indicator.style.removeProperty('transition'));
 };
 const schedule=()=>{if(!frame)frame=win.requestAnimationFrame(sync)};
 const observer=new MutationObserver(schedule);observer.observe(nav,{attributes:true,subtree:true,attributeFilter:['class','aria-current','hidden']});
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;resize?.observe(nav);
 win.addEventListener('resize',schedule,{passive:true});mq.addEventListener?.('change',schedule);
 // Location feedback appears only after an actual user action, never during continuous tracking.
 const gps=doc.getElementById('current-location');
 const pulse=()=>{if(reduced.matches||!mq.matches||!gps)return;const ring=doc.createElement('span');ring.className='dj-motion-gps-ring';ring.setAttribute('aria-hidden','true');gps.querySelector('.dj-motion-gps-ring')?.remove();gps.append(ring);win.setTimeout(()=>ring.remove(),2900);};
 gps?.addEventListener('click',pulse);
 sync();
 return ()=>{observer.disconnect();resize?.disconnect();win.removeEventListener('resize',schedule);mq.removeEventListener?.('change',schedule);gps?.removeEventListener('click',pulse);if(frame)win.cancelAnimationFrame(frame);indicator.remove();delete nav.dataset.djMotionIndicator;};
}
if(typeof document!=='undefined'){
 const boot=()=>installMobileInteractionFeedback();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
