/** v8.2.3 — Header close controls and route action visibility.
 * Restore header/button geometry without replacing existing click handlers. */
export const PANEL_HEADINGS = Object.freeze(['route-panel','participation-panel','news-panel','mine-panel']);
/** Layout is owned by v829-mobile-layout-system.css rather than inline !important.
 * The guard checks structural invariants without rewriting computed styles.
 * This prevents CSS/JS write races in the iOS bottom sheets. */
export function stabilizePageHeaders(doc=document){
  let valid=0;
  for(const id of PANEL_HEADINGS){
    const panel=doc.getElementById(id);
    const header=panel?.querySelector(':scope > .dj-sheet-chrome, :scope > .page-heading');
    const button=header?.querySelector(':scope > .dj-sheet-chrome-close, :scope > .page-dismiss');
    const title=header?.querySelector(':scope > h2');
    if(header&&button&&title)valid++;
  }
  return valid;
}

export function installRouteHeaderGuard(doc=document){
  stabilizePageHeaders(doc);
  // No DOM observers or imperative inline layout overrides: CSS is the owner.
  return ()=>{};
}

if(typeof document!=='undefined') {
  const boot=()=>installRouteHeaderGuard(document);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
