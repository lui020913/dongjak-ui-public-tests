/** v8.1.1 — Navigation state is derived from the active page, never from initial HTML styling. */
export const MAIN_TABS=Object.freeze(['map','route','participate','news','mine']);
export function synchronizeMainTabs(app,buttons=app?.querySelectorAll?.('#bottom-nav > .nav-tab')||[]){
  if(!app)return null;
  const selected=MAIN_TABS.includes(app.dataset.tab)?app.dataset.tab:'map';
  for(const button of buttons){
    const active=button.dataset.tab===selected;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
    button.setAttribute('aria-pressed',String(active));
    if(active)button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  }
  return selected;
}
export function installMainTabReconciliation(app){
  if(!app||typeof MutationObserver==='undefined')return ()=>{};
  synchronizeMainTabs(app);
  const observer=new MutationObserver(()=>synchronizeMainTabs(app));
  observer.observe(app,{attributes:true,attributeFilter:['data-tab']});
  return ()=>observer.disconnect();
}

/* Preserve original map/navigation source hashes. Reconcile after native page switches. */
if(typeof document!=='undefined'){
  const start=()=>installMainTabReconciliation(document.getElementById('app'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
