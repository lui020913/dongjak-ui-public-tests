/* v8.6.4 — disclosure animations and stable guide/transit UI interactions. */
import './v864-refinements.css';

export function installV864Refinements(doc=document,win=window){
  const cleanups=[];
  const guide=doc.getElementById('map-gesture-guide');
  const raf=win.requestAnimationFrame?.bind(win)||((fn)=>win.setTimeout(fn,16));

  // Native <details> keeps its semantics and keyboard support; only its
  // content visibility is animated by intercepting the summary disclosure.
  const installDetailsMotion=details=>{
    if(!details||details.dataset.dj864Motion==='ready')return;
    const summary=details.querySelector(':scope > summary');
    const content=details.querySelector(':scope > .dj864-accordion-content');
    if(!summary||!content)return;
    details.dataset.dj864Motion='ready';
    const onSummaryClick=event=>{
      event.preventDefault();event.stopImmediatePropagation();
      if(details.dataset.dj864Animating==='true')return;
      const opening=!details.open;
      details.dataset.dj864Animating='true';
      if(opening){
        details.open=true;summary.setAttribute('aria-expanded','true');
        content.style.transition='none';content.style.overflow='hidden';
        content.style.maxHeight='0px';content.style.opacity='0';
        void content.offsetHeight;content.style.transition='';
        raf(()=>{
          content.style.maxHeight=`${content.scrollHeight}px`;
          content.style.opacity='1';
        });
        win.setTimeout(()=>{
          if(details.open){content.style.maxHeight='none';content.style.overflow='visible';}
          delete details.dataset.dj864Animating;
        },270);
      }else{
        summary.setAttribute('aria-expanded','false');
        content.style.overflow='hidden';content.style.maxHeight=`${content.scrollHeight}px`;
        content.style.opacity='1';void content.offsetHeight;
        raf(()=>{content.style.maxHeight='0px';content.style.opacity='0';});
        win.setTimeout(()=>{
          details.open=false;
          content.style.removeProperty('max-height');content.style.removeProperty('opacity');
          content.style.removeProperty('overflow');
          delete details.dataset.dj864Animating;
        },260);
      }
    };
    summary.addEventListener('click',onSummaryClick,true);
    summary.setAttribute('aria-expanded',String(details.open));
    cleanups.push(()=>summary.removeEventListener('click',onSummaryClick,true));
  };
  doc.querySelectorAll('#map-gesture-guide details.dj803-ios-install-help').forEach(installDetailsMotion);

  // The TIP list is a button-controlled disclosure rather than <details>.
  // Stop the earlier instant toggle and animate the same existing list node.
  const installTipMotion=()=>{
    if(!guide)return false;
    const toggle=guide.querySelector('#dj841-guide-tips .dj852-tip-toggle');
    const list=guide.querySelector('#dj841-guide-tip-list');
    const section=guide.querySelector('#dj841-guide-tips');
    if(!toggle||!list||!section||toggle.dataset.dj864Motion==='ready')return false;
    toggle.dataset.dj864Motion='ready';
    const onToggle=event=>{
      event.preventDefault();event.stopImmediatePropagation();
      if(section.dataset.dj864Animating==='true')return;
      const opening=list.hidden;
      section.dataset.dj864Animating='true';
      toggle.setAttribute('aria-expanded',String(opening));
      if(opening){
        list.hidden=false;section.classList.remove('is-collapsed');
        list.style.transition='none';list.style.overflow='hidden';list.style.maxHeight='0px';list.style.opacity='0';
        void list.offsetHeight;list.style.transition='';
        raf(()=>{list.style.maxHeight=`${list.scrollHeight}px`;list.style.opacity='1';});
        win.setTimeout(()=>{
          if(!list.hidden){list.style.maxHeight='none';list.style.overflow='visible';}
          delete section.dataset.dj864Animating;
        },270);
      }else{
        list.style.overflow='hidden';list.style.maxHeight=`${list.scrollHeight}px`;list.style.opacity='1';
        void list.offsetHeight;
        raf(()=>{list.style.maxHeight='0px';list.style.opacity='0';});
        win.setTimeout(()=>{
          list.hidden=true;section.classList.add('is-collapsed');
          list.style.removeProperty('max-height');list.style.removeProperty('opacity');list.style.removeProperty('overflow');
          delete section.dataset.dj864Animating;
        },260);
      }
    };
    toggle.addEventListener('click',onToggle,true);
    cleanups.push(()=>toggle.removeEventListener('click',onToggle,true));
    return true;
  };
  installTipMotion();
  const guideObserver=guide&&typeof MutationObserver!=='undefined'?new MutationObserver(installTipMotion):null;
  guideObserver?.observe(guide,{childList:true,subtree:true});
  cleanups.push(()=>guideObserver?.disconnect());

  // Keep the first-run guide from being reopened by a stale delayed timer.
  // The map-control owner handles actual visibility; this only marks a close
  // as a completed initial presentation when the X is pressed.
  const close=doc.getElementById('map-gesture-guide-close');
  const onGuideClose=()=>{
    try{win.sessionStorage.setItem('dj-map-guide-initial-shown-v7121','1');}catch{}
  };
  close?.addEventListener('click',onGuideClose,true);
  cleanups.push(()=>close?.removeEventListener('click',onGuideClose,true));

  return ()=>cleanups.forEach(fn=>fn());
}

if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installV864Refinements(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
