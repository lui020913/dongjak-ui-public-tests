/** Dongjak v8.0.3 source-based UI hotfix (2026-11-13).
 * Changes presentation only. Core MapLibre/transit and public data remain untouched.
 */
const TEXT_KEY='dongjak-ui-readability-v1';
const PREF_KEY='dongjak_map_preferences_v7120';

/** Preserve actual station badge buttons and their click handlers, but give
 * the name and line markers distinct rows, on desktop and phone. */
export function organizeTransportTitle(title){
  if(!title)return false;
  const badges=[...title.children].filter(n=>n.classList?.contains('dj-metro-line-selector'));
  if(!badges.length || title.querySelector(':scope > .dj804-station-name'))return false;
  const name=[...title.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
  if(!name)return false;
  const label=document.createElement('span');label.className='dj804-station-name';label.textContent=name;
  const lineRow=document.createElement('span');lineRow.className='dj804-station-lines';
  for(const n of badges)lineRow.append(n); // Move nodes; existing handlers remain attached.
  title.replaceChildren(label,lineRow);
  return true;
}

export function installV804UI(doc=document,win=window){
  const app=doc.getElementById('app');if(!app)return ()=>{};
  const cleaners=[];
  const on=(el,event,handler)=>{if(!el)return;el.addEventListener(event,handler);cleaners.push(()=>el.removeEventListener(event,handler));};
  const title=doc.getElementById('transport-title');
  let titleScheduled=false;
  const updateTitle=()=>{
    titleScheduled=false;
    if(title?.closest('#transport-sheet')?.dataset.kind==='subway')organizeTransportTitle(title);
  };
  const scheduleTitle=()=>{
    if(titleScheduled)return;titleScheduled=true;
    win.requestAnimationFrame ? win.requestAnimationFrame(updateTitle):Promise.resolve().then(updateTitle);
  };
  if(title){
    const observer=new MutationObserver(scheduleTitle);
    observer.observe(title,{childList:true});cleaners.push(()=>observer.disconnect());
    scheduleTitle();
  }

  const realScale=doc.getElementById('dj-type-scale');
  const mobileScale=doc.getElementById('dj800-type-size');
  const syncScale=()=>{
    if(!realScale)return;
    const valid=new Set(['small','normal','large','xlarge']);
    const size=valid.has(realScale.value)?realScale.value:'normal';
    app.dataset.djTypeScale=size;
    app.dataset.djSettingsText=size==='xlarge'?'large':size;
    if(mobileScale && mobileScale.value!==size)mobileScale.value=size;
    try{
      // Both controls are views onto one value; next settings dialog must not
      // silently revert a mobile '작게' choice to '기본'.
      const previous=JSON.parse(win.localStorage.getItem(PREF_KEY)||'{}');
      previous.text=size==='xlarge'?'large':size;
      win.localStorage.setItem(PREF_KEY,JSON.stringify(previous));
    }catch{}
  };
  if(realScale){on(realScale,'change',syncScale);syncScale();}
  if(mobileScale){on(mobileScale,'change',()=>{if(realScale){realScale.value=mobileScale.value;realScale.dispatchEvent(new Event('change',{bubbles:true}));}});}

  // Animate newly visible floating surfaces without changing their positions,
  // dragging logic or data. Existing panels still own opening and closing.
  const selectors=['transport-sheet','road-width-legend','map-safety-controls','map-advanced-controls','dj800-type-panel','dj-app-about','dj-map-settings','version-history-modal'];
  const observed=new Map(), status=new Map(), active=new WeakMap();
  const mobile=()=>win.matchMedia?.('(max-width:699px)')?.matches;
  const reduced=()=>app.classList.contains('dj-reduced-animation')||win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const isVisible=node=>node&&!node.hidden&&win.getComputedStyle(node).display!=='none'&&win.getComputedStyle(node).visibility!=='hidden';
  const targetFor=node=>node?.id==='dj-app-about'?node.querySelector('.dj-about-card')||node:
    node?.id==='dj-map-settings'?node.querySelector('.dj-map-settings-card')||node:
    node?.id==='version-history-modal'?node.querySelector('.version-history-dialog')||node:node;
  function animate(node){
    if(app.dataset.dj806Motion==='on')return;
    if(!mobile()||reduced()||typeof node?.animate!=='function')return;
    active.get(node)?.cancel?.();
    const effect=node.animate([
      {opacity:0,clipPath:'inset(14% 0 0 0 round 22px)',filter:'blur(3px)'},
      {opacity:1,clipPath:'inset(0 0 0 0 round 22px)',filter:'blur(0px)'}
    ],{duration:350,easing:'cubic-bezier(.19,.82,.23,1)',fill:'none'});
    active.set(node,effect);
  }
  let scheduled=false;
  const sync=()=>{
    scheduled=false;
    for(const id of selectors){
      const el=doc.getElementById(id);if(!el)continue;
      const shown=id==='map-safety-controls'?app.classList.contains('map-safety-open')&&isVisible(el):
        id==='map-advanced-controls'?app.classList.contains('map-controls-open')&&isVisible(el):isVisible(el);
      if(shown&&!status.get(id))animate(targetFor(el));
      status.set(id,shown);
    }
  };
  const schedule=()=>{if(scheduled)return;scheduled=true;
    (win.requestAnimationFrame||((fn)=>Promise.resolve().then(fn)))(sync);
  };
  const watching=new MutationObserver(schedule);
  watching.observe(app,{attributes:true,attributeFilter:['class','data-tab'],childList:true,subtree:false});
  cleaners.push(()=>watching.disconnect());
  function hook(){
    for(const id of selectors){const el=doc.getElementById(id);if(!el||observed.has(id))continue;
      const obs=new MutationObserver(schedule);
      obs.observe(el,{attributes:true,attributeFilter:['hidden','style','class']});observed.set(id,obs);
    }
  }
  const additions=new MutationObserver(()=>{hook();schedule();});
  additions.observe(app,{childList:true,subtree:false});
  cleaners.push(()=>additions.disconnect());
  hook();sync();
  return ()=>{for(const obs of observed.values())obs.disconnect();for(const fn of cleaners)fn();};
}
if(typeof document!=='undefined'){
  const boot=()=>installV804UI();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
