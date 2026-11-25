/** v8.5.6 — final UI completion without modifying protected map/transport cores. */
import './v856-completion.css';

export function installV856UiCompletion({app=document.getElementById('app'),doc=app?.ownerDocument||document,win=window}={}){
  if(!app)return ()=>{};
  const cleanups=[];
  const nav=app.querySelector('#bottom-nav');
  const originalOrder=nav?[...nav.querySelectorAll(':scope > .nav-tab')]:[];
  const mapTab=originalOrder.find(node=>node.dataset.tab==='map');
  const media=win.matchMedia?.('(min-width:1080px)');
  const syncNavOrder=()=>{
    if(!nav||!mapTab)return;
    const rail=nav.querySelector('#dj-desktop-safety-rail');
    if(media?.matches){
      if(nav.firstElementChild!==mapTab)nav.insertBefore(mapTab,originalOrder[0]||rail||null);
      for(const tab of originalOrder){if(tab!==mapTab)nav.insertBefore(tab,rail||null);}
    }else{
      for(const tab of originalOrder)nav.insertBefore(tab,rail||null);
    }
  };
  media?.addEventListener?.('change',syncNavOrder);
  win.addEventListener('resize',syncNavOrder,{passive:true});
  cleanups.push(()=>media?.removeEventListener?.('change',syncNavOrder));
  cleanups.push(()=>win.removeEventListener('resize',syncNavOrder));
  syncNavOrder();

  // Existing metro line badges already update the selected line in the same
  // transport sheet. Suppress only the incidental scroll-to-top and animate
  // the existing content; no close/reopen or map camera movement is performed.
  const transportPanel=doc.getElementById('transport-sheet');
  let lineSwitchToken=0;
  const onLineSelector=(event)=>{
    const button=event.target?.closest?.('#transport-title .dj-metro-line-selector');
    if(!button||!transportPanel||transportPanel.hidden)return;
    const token=++lineSwitchToken;
    const scrollTop=transportPanel.scrollTop;
    const originalScrollTo=transportPanel.scrollTo;
    let patched=false;
    try{transportPanel.scrollTo=()=>{};patched=true;}catch{}
    transportPanel.classList.remove('dj856-line-switching');
    void transportPanel.offsetWidth;
    transportPanel.classList.add('dj856-line-switching');
    const restore=()=>{
      if(patched)transportPanel.scrollTo=originalScrollTo;
      transportPanel.scrollTop=scrollTop;
    };
    if(typeof win.queueMicrotask==='function')win.queueMicrotask(restore);
    else Promise.resolve().then(restore);
    win.setTimeout(()=>{
      if(token===lineSwitchToken)transportPanel.classList.remove('dj856-line-switching');
    },260);
  };
  doc.addEventListener('click',onLineSelector,true);
  cleanups.push(()=>doc.removeEventListener('click',onLineSelector,true));
  return ()=>{lineSwitchToken++;cleanups.forEach(fn=>fn());transportPanel?.classList.remove('dj856-line-switching');};
}

if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installV856UiCompletion(document.getElementById('app')?{app:document.getElementById('app')}:{});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
