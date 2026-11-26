/** Search-only mobile toolbar dissolve. No clones, layout shifts or duplicate actions. */
export function createSearchToolbarCrossfade(app,actions,win=window){
  const doc=app.ownerDocument;
  let progress=0,target=0,frame=0,activeToolbar=null;
  const duration=210;
  const toolbar=()=>doc.getElementById('djNext-toolbar')||doc.getElementById('dj-v794-toolbar');
  const clear=()=>{
    if(frame)win.cancelAnimationFrame(frame);frame=0;
    activeToolbar?.style.removeProperty('opacity');activeToolbar=null;
    actions.style.removeProperty('opacity');
    delete app.dataset.djSearchCrossfade;
  };
  const paint=()=>{
    actions.style.setProperty('opacity',String(progress),'important');
    activeToolbar?.style.setProperty('opacity',String(1-progress),'important');
  };
  const finish=()=>{
    clear();progress=target;actions.hidden=target===0;
  };
  return function sync(visible,enabled=true){
    const next=visible?1:0;
    const reduce=win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||app.classList.contains('dj-reduced-animation');
    if(!enabled||reduce||doc.hidden||!toolbar()){
      target=next;finish();return;
    }
    if(next===target){
      if(!frame)actions.hidden=!visible;
      return;
    }
    if(frame)win.cancelAnimationFrame(frame);
    activeToolbar?.style.removeProperty('opacity');
    activeToolbar=toolbar();target=next;
    app.dataset.djSearchCrossfade=target?'enter':'exit';
    actions.hidden=false;
    const from=progress,start=win.performance.now();
    paint();
    const step=now=>{
      frame=0;
      const t=Math.max(0,Math.min(1,(now-start)/duration));
      progress=from+(target-from)*t;paint();
      if(t<1)frame=win.requestAnimationFrame(step);else finish();
    };
    frame=win.requestAnimationFrame(step);
  };
}
