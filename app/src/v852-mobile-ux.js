/**
 * v8.5.2 final mobile polish controller.
 * The search shortcut row only fades in when it was actually hidden and
 * becomes visible; closing unrelated sheets never replays its entrance.
 */
export function installToolbarReveal(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app)return ()=>{};
  let toolbar=null,observer=null,previous=null,frame=0,cleanupTimer=null;
  const intendedVisible=()=>{
    if(!toolbar||toolbar.hidden||app.dataset.searchOpen==='true')return false;
    const style=win.getComputedStyle(toolbar);
    return style.display!=='none'&&style.visibility!=='hidden'
      &&!app.classList.contains('map-immersive');
  };
  const animateReveal=()=>{
    if(!toolbar||win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
    toolbar.style.setProperty('opacity','0','important');
    toolbar.style.setProperty('visibility','visible','important');
    toolbar.style.setProperty('translate','0 -5px','important');
    if(frame)win.cancelAnimationFrame(frame);
    frame=win.requestAnimationFrame(()=>{
      frame=0;
      if(!intendedVisible())return;
      toolbar.style.setProperty('opacity','1','important');
      toolbar.style.setProperty('translate','0 0','important');
      if(cleanupTimer!==null)win.clearTimeout(cleanupTimer);
      cleanupTimer=win.setTimeout(()=>{
        toolbar?.style.removeProperty('opacity');
        toolbar?.style.removeProperty('visibility');
        toolbar?.style.removeProperty('translate');
        cleanupTimer=null;
      },290);
    });
  };
  const bind=()=>{
    const next=doc.getElementById('dj-v794-toolbar');
    if(next===toolbar)return;
    observer?.disconnect();toolbar=next;previous=toolbar?intendedVisible():null;
    if(toolbar){
      observer=new MutationObserver(sync);
      observer.observe(toolbar,{attributes:true,attributeFilter:['hidden','class','style']});
    }
  };
  const sync=()=>{
    if(!toolbar)bind();
    const current=intendedVisible();
    if(previous===false&&current)animateReveal();
    previous=current;
  };
  const root=new MutationObserver(()=>{bind();sync();});
  root.observe(app,{attributes:true,attributeFilter:['data-search-open','data-tab','class'],childList:true});
  bind();sync();
  return ()=>{
    root.disconnect();observer?.disconnect();
    if(frame)win.cancelAnimationFrame(frame);
    if(cleanupTimer!==null)win.clearTimeout(cleanupTimer);
    toolbar?.style.removeProperty('opacity');toolbar?.style.removeProperty('visibility');toolbar?.style.removeProperty('translate');
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installToolbarReveal(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
