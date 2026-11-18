/* v8.6.1 presentation refinements. Existing feature modules retain ownership
   of authentication, transport actions, map state and sheet visibility. */
import './v861-requested-ux.css';
import './v863-onboarding-flow.css';

export function installV861RequestedUX(doc=document,win=window){
  const form=doc.querySelector('.topbar .map-quick-search-form');
  const dropdown=doc.getElementById('map-quick-search-dropdown');
  if(!form||!dropdown)return ()=>{};

  // Mobile already uses the visual-viewport-aware v8.5.7 positioning owner.
  // For tablet/desktop, center the wider recommendation surface in the
  // viewport (not in the 560px search column) and anchor it below the form.
  const isPhone=()=>Boolean(win.matchMedia?.('(max-width:699px)').matches);
  let frame=0;
  const update=()=>{
    frame=0;
    if(isPhone())return;
    const rect=form.getBoundingClientRect();
    const viewport=win.visualViewport;
    const viewportTop=viewport?.offsetTop||0;
    const viewportBottom=viewportTop+(viewport?.height||win.innerHeight||0);
    const top=Math.max(viewportTop+8,Math.ceil(rect.bottom+8));
    const maxHeight=Math.max(180,Math.floor(viewportBottom-top-12));
    dropdown.style.setProperty('--dj861-search-top',`${top}px`);
    dropdown.style.setProperty('--dj861-search-max-height',`${Math.min(620,maxHeight)}px`);
  };
  const raf=typeof win.requestAnimationFrame==='function'
    ?win.requestAnimationFrame.bind(win)
    :(callback)=>win.setTimeout(callback,16);
  const schedule=()=>{if(!frame)frame=raf(update);};
  const resizeObserver=typeof win.ResizeObserver==='function'
    ?new win.ResizeObserver(schedule):null;
  form.addEventListener('focusin',schedule);
  form.addEventListener('input',schedule);
  form.addEventListener('pointerdown',schedule,{passive:true});
  win.addEventListener('resize',schedule,{passive:true});
  win.visualViewport?.addEventListener('resize',schedule,{passive:true});
  win.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  resizeObserver?.observe(form);
  schedule();

  return ()=>{
    form.removeEventListener('focusin',schedule);
    form.removeEventListener('input',schedule);
    form.removeEventListener('pointerdown',schedule);
    win.removeEventListener('resize',schedule);
    win.visualViewport?.removeEventListener('resize',schedule);
    win.visualViewport?.removeEventListener('scroll',schedule);
    resizeObserver?.disconnect();
    if(frame)win.cancelAnimationFrame?.(frame);
  };
}

if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installV861RequestedUX(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
