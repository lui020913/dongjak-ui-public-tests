/** v8.0.3: a single visible-opening notification for mobile panel animation.
 * No map data, API or routing state is modified. Uses clip-path/opacity, not
 * top/left/transform, avoiding old fixed-position layout collisions. */
const SURFACES=[
  'route-panel','participation-panel','news-panel','mine-panel','transport-sheet',
  'overview-sheet','admin-dong-picker','detail-sheet','entry-sheet',
  'pza-road-sheet','night-visibility-float','dj-app-about','dj-map-settings',
  'dj800-type-panel','version-history-modal',
];
export function installV803UI(doc=document,win=window){
  const app=doc.getElementById('app');if(!app)return ()=>{};
  const isPhone=()=>!!win.matchMedia?.('(max-width:699px)')?.matches;
  const reduced=()=>app.classList.contains('dj-reduced-animation')||
    !!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const showing=node=>{
    if(!node || node.hidden)return false;
    const st=win.getComputedStyle(node);
    return st.display!=='none'&&st.visibility!=='hidden';
  };
  const target=id=>{
    const node=doc.getElementById(id);if(!node)return null;
    if(id==='dj-app-about')return node.querySelector('.dj-about-card')||node;
    if(id==='dj-map-settings')return node.querySelector('.dj-map-settings-card')||node;
    if(id==='version-history-modal')return node.querySelector('.version-history-dialog')||node;
    return node;
  };
  const states=new Map();const observers=[];const active=new WeakMap();
  function appear(node){
    if(app.dataset.dj806Motion==='on'||!node||reduced()||(!isPhone()&&node.id!=='pza-road-sheet')||typeof node.animate!=='function')return;
    try{active.get(node)?.cancel();}catch{}
    // Mask and fade produce a visible upward reveal even when a legacy layer
    // has 'transform:none!important' on the original fixed panel.
    const anim=node.animate([
      {clipPath:'inset(25% 0 0 0 round 24px)'},
      {clipPath:'inset(1% 0 0 0 round 24px)',offset:.78},
      {clipPath:'inset(0 0 0 0 round 24px)'}
    ],{duration:isPhone()?420:300,easing:'cubic-bezier(.16,.88,.28,1)',fill:'none'});
    active.set(node,anim);
    anim.addEventListener?.('finish',()=>{if(active.get(node)===anim)active.delete(node);},{once:true});
  }
  function sync(){
    if(app.dataset.dj806Motion==='on')return;
    for(const id of SURFACES){
      const n=doc.getElementById(id);const now=showing(n);
      if(now&&!states.get(id)){
        const surface=target(id);
        if(surface)win.requestAnimationFrame?.(()=>{if(showing(n))appear(surface);});
      }
      states.set(id,now);
    }
    for(const [id,className] of [['map-advanced-controls','map-controls-open'],['map-safety-controls','map-safety-open']]){
      const now=app.classList.contains(className);
      if(now&&!states.get(id))win.requestAnimationFrame?.(()=>appear(doc.getElementById(id)));
      states.set(id,now);
    }
  }
  let queued=false;
  const schedule=()=>{
    if(queued)return;queued=true;
    (win.requestAnimationFrame||((cb)=>Promise.resolve().then(cb)))(()=>{queued=false;sync();});
  };
  const main=new MutationObserver(schedule);
  main.observe(app,{attributes:true,attributeFilter:['class','data-tab'],childList:true,subtree:false});
  observers.push(main);
  const attached=new Set();
  function attach(){
    for(const id of [...SURFACES,'map-advanced-controls','map-safety-controls']){
      const n=doc.getElementById(id);if(!n||attached.has(n))continue;attached.add(n);
      const o=new MutationObserver(schedule);
      o.observe(n,{attributes:true,attributeFilter:['hidden','style','class']});observers.push(o);
    }
  }
  const listener=new MutationObserver(()=>{attach();schedule();});
  listener.observe(app,{childList:true,subtree:false});observers.push(listener);
  attach();sync();
  // The settings overlay can be dismissed without a class toggle; tracking
  // the hidden attribute allows every subsequent opening to animate again.
  return ()=>observers.forEach(o=>o.disconnect());
}
if(typeof document!=='undefined'){
  const boot=()=>installV803UI();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
