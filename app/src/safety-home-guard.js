/** v8.7.3: mobile Safety Map is a navigation action, not a district-picker opener. */
export function installSafetyHomeGuard({doc=document,win=window,app,onHome}={}){
  const home=doc.querySelector('#bottom-nav .nav-tab[data-tab="map"]');
  if(!home||!app||typeof onHome!=='function')return ()=>{};
  // The v8.3.3 double-tap home handler must not compete with this owner.
  app.dataset.djHomeGuardActive='1';
  const picker=()=>doc.getElementById('admin-dong-picker');
  const overview=()=>doc.getElementById('overview-sheet');
  const mobile=()=>win.matchMedia?.('(max-width:699px)')?.matches===true;
  let openingExplicitly=false,closedByHome=false;
  const hidePicker=()=>{
    const node=picker();if(!node)return;
    if(!node.hidden)node.hidden=true;
    node.classList.remove('dj-sheet-dragging','dj833-sheet-dismissing');
    node.style.removeProperty('--dj-sheet-drag-y');
    app.classList.remove('dj-admin-dongs-open');
    delete app.dataset.djActiveSheet;
  };
  const click=(event)=>{
    if(!mobile())return;
    const tab=event.target?.closest?.('#bottom-nav .nav-tab[data-tab="map"]');
    if(tab===home){
      event.preventDefault();event.stopImmediatePropagation();
      openingExplicitly=false;closedByHome=true;
      // No dispatching another synthetic click: use the real native navigator.
      onHome();
      hidePicker();
      const ov=overview();if(ov)ov.hidden=true;
      win.queueMicrotask?.(hidePicker);
      win.requestAnimationFrame?.(hidePicker);
      return;
    }
    if(event.target?.closest?.('#open-admin-dongs-from-options,#open-admin-dongs')){
      // The district selector is only permitted through its dedicated button.
      openingExplicitly=true;closedByHome=false;
    }
    // Leaving HOME does not count as a district-selection request.
    else if(event.target?.closest?.('#bottom-nav .nav-tab[data-tab]')){
      openingExplicitly=false;
    }
  };
  win.addEventListener('click',click,true);
  const NodeObserver=win.MutationObserver;
  const node=picker();
  const observer=NodeObserver&&node?new NodeObserver(()=>{
    if(mobile()&&closedByHome&&!openingExplicitly&&app.dataset.tab==='map'&&!node.hidden){
      hidePicker();
    }
  }):null;
  observer?.observe(node,{attributes:true,attributeFilter:['hidden','class','style']});
  return ()=>{win.removeEventListener('click',click,true);observer?.disconnect();delete app.dataset.djHomeGuardActive;};
}
