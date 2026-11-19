/** v807: presentation-only changes. Does not create new transit sources or map state. */
export function installV807Refinement(doc=document,win=window){
  const app=doc.getElementById('app');if(!app)return ()=>{};
  const dispose=[];
  const mobile=win.matchMedia?.('(max-width:699px)');
  const on=(node,event,fn,opts)=>{
    node?.addEventListener?.(event,fn,opts);
    dispose.push(()=>node?.removeEventListener?.(event,fn,opts));
  };
  // User requested pencil-stroke consistency. Preserve PC's native symbols.
  const iconMarkup={
    map:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/></svg>',
    route:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11"/></svg>',
    news:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="3.5" width="15" height="17" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h8"/></svg>'
  };
  const replaced=new Map();
  const syncIcons=()=>{
    for(const [tab,markup] of Object.entries(iconMarkup)){
      const icon=doc.querySelector(`#bottom-nav .nav-tab[data-tab="${tab}"] .nav-icon`);
      if(!icon)continue;
      if(mobile?.matches && !replaced.has(icon)){
        replaced.set(icon,icon.innerHTML);icon.innerHTML=markup;
      }else if(!mobile?.matches && replaced.has(icon)){
        icon.innerHTML=replaced.get(icon);replaced.delete(icon);
      }
    }
  };
  on(mobile,'change',syncIcons);
  syncIcons();

  // Native input placeholder is authoritative. The former extra span
  // (.dj807-search-copy) duplicated text when v829 restored placeholder opacity.
  // Remove stale overlay once, even after hot module reload / cached PWA UI.
  const searchForm=doc.getElementById('map-quick-search-query')?.closest('form');
  searchForm?.querySelectorAll('.dj807-search-copy').forEach(node=>node.remove());
  searchForm?.classList.remove('dj807-has-input');

  // Transfer line selection retains one sheet. Suppress the transient close/reopen
  // motion when the original transport renderer changes a selected line.
  const transport=doc.getElementById('transport-sheet');
  let switchCleanup=null;
  const onLineSwitch=event=>{
    const btn=event.target?.closest?.('#transport-sheet .dj-metro-line-selector');
    if(!btn||!transport||transport.hidden)return;
    transport.dataset.dj807Switching='true';
    // A route-only switch changes the contents, not the sheet visibility.
    // Do not cancel its entrance animation while the user picks another line.
    if(switchCleanup)win.clearTimeout(switchCleanup);
    switchCleanup=win.setTimeout(()=>{
      switchCleanup=null;delete transport.dataset.dj807Switching;
    },240);
  };
  on(doc,'click',onLineSwitch,true);
  return ()=>{
    if(switchCleanup)win.clearTimeout(switchCleanup);
    for(const fn of dispose)fn();
    for(const [icon,html] of replaced)icon.innerHTML=html;
    delete transport?.dataset.dj807Switching;
  };
}
if(typeof document!=='undefined'){
  const boot=()=>installV807Refinement();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
