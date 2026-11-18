/** v809 — presentation-only menu/icon patch; no new map instance or network calls. */
export function installV809Polish(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app)return ()=>{};
  const cleanup=[];
  const on=(node,type,callback,options)=>{
    node?.addEventListener?.(type,callback,options);
    cleanup.push(()=>node?.removeEventListener?.(type,callback,options));
  };
  // The Help popup is instructions, not a redundant path into release history.
  const releaseButton=doc.getElementById('dj-guide-release-details');
  if(releaseButton)releaseButton.remove();
  // PC native text glyphs varied in optical size; use vector icons matching
  // the same 24x24 viewport / 2.35px stroke as the existing pencil.
  const icons={
    map:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1.25"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/></svg>',
    route:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11"/></svg>',
    news:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="3.5" width="15" height="17" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h8"/></svg>'
  };
  const original=new Map();
  const media=win.matchMedia?.('(min-width:1080px)');
  const sync=()=>{
    const desktop=!!media?.matches;
    for(const [tab,markup] of Object.entries(icons)){
      const icon=doc.querySelector(`#bottom-nav .nav-tab[data-tab="${tab}"] .nav-icon`);
      if(!icon)continue;
      if(desktop&&!original.has(icon)){
        original.set(icon,icon.innerHTML);
        icon.innerHTML=markup;
      }else if(!desktop&&original.has(icon)){
        icon.innerHTML=original.get(icon);
        original.delete(icon);
      }
    }
  };
  on(media,'change',sync);
  sync();
  return ()=>{
    for(const fn of cleanup)fn();
    for(const [node,markup] of original)node.innerHTML=markup;
    original.clear();
  };
}
if(typeof document!=='undefined'){
  const start=()=>installV809Polish();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
