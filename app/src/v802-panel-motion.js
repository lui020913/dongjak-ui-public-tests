/* v8.0.2: replay visible-panel motion when legacy handlers reopen a panel.
   Presentation-only. The DOM remains owned by original map/transport modules. */
const SURFACES=['route-panel','participation-panel','news-panel','mine-panel',
  'overview-sheet','admin-dong-picker','transport-sheet','detail-sheet',
  'entry-sheet','pza-road-sheet','night-visibility-float',
  'dj-app-about','dj-map-settings','version-history-modal'];
function visible(node,win){
  if(!node || node.hidden)return false;
  const cs=win.getComputedStyle(node);
  return cs.display!=='none' && cs.visibility!=='hidden';
}
export function installV802Motion(doc=document,win=window){
  const app=doc.getElementById('app');if(!app)return ()=>{};
  const cache=new Map(), animations=new WeakMap(), observers=new Map();
  const reduce=()=>app.classList.contains('dj-reduced-animation')||
    !!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const targetFor=(node)=>{
    if(node.id==='dj-app-about')return node.querySelector('.dj-about-card')||node;
    if(node.id==='dj-map-settings')return node.querySelector('.dj-map-settings-card')||node;
    if(node.id==='version-history-modal')return node.querySelector('.version-history-dialog')||node;
    return node;
  };
  const replay=(id)=>{
    if(app.dataset.dj806Motion==='on')return;
    const node=doc.getElementById(id);if(!node||!visible(node,win)||reduce())return;
    // Mobile entrance is owned by v8.0.3 coordinator together with the
    // v8.0.0 layout owner; do not stack competing translate animations.
    if(win.matchMedia?.('(max-width:699px)')?.matches)return;
    const target=targetFor(node);if(typeof target.animate!=='function')return;
    animations.get(target)?.cancel();
    const mobile=!!win.matchMedia?.('(max-width:699px)')?.matches;
    const duration=mobile?460:310;
    const from=mobile?'0 36px':'-13px 0';
    const animation=target.animate([
      {opacity:0,translate:from,scale:mobile?'.97':'.99',filter:'blur(3px)'},
      {opacity:1,translate:'0 0',scale:'1',filter:'blur(0px)'}
    ],{duration,easing:'cubic-bezier(.18,.85,.22,1)',fill:'both'});
    animations.set(target,animation);
    animation.addEventListener('finish',()=>{
      if(animations.get(target)===animation){animations.delete(target);animation.cancel();}
    },{once:true});
  };
  let scheduled=false;
  const sync=()=>{
    scheduled=false;
    for(const id of SURFACES){
      const node=doc.getElementById(id);if(!node)continue;
      const next=visible(node,win),before=cache.get(id)||false;
      if(next&&!before)replay(id);
      cache.set(id,next);
    }
  };
  const schedule=()=>{
    if(scheduled)return;scheduled=true;
    win.requestAnimationFrame?win.requestAnimationFrame(sync):Promise.resolve().then(sync);
  };
  const main=new MutationObserver(schedule);
  main.observe(app,{attributes:true,attributeFilter:['class','data-tab'],childList:true,subtree:false});
  const detail=new Map();
  const connect=()=>{
    for(const id of SURFACES){const n=doc.getElementById(id);
      if(n&&!detail.has(id)){
        const o=new MutationObserver(schedule);o.observe(n,{attributes:true,attributeFilter:['hidden','style','class']});detail.set(id,o);
      }
    }
  };
  const additions=new MutationObserver(()=>{connect();schedule();});
  additions.observe(app,{childList:true,subtree:false});
  connect();sync();
  // Tabs change synchronously but some original panels open on later microtasks.
  // The observer above plays on the moment a surface is actually visible.
  return ()=>{main.disconnect();additions.disconnect();for(const o of detail.values())o.disconnect();};
}
if(typeof document!=='undefined'){
 const boot=()=>installV802Motion(document,window);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
