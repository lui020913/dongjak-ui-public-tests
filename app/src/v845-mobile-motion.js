/** v8.4.5: restores the floating shortcuts using an opacity-only reveal.
 * No copies of toolbar buttons; existing map/route/account owners stay intact. */
import {hasOpenMapWindow} from './v840-ui-core.js';
import './v845-mobile-motion.css';

export function mapShortcutsShouldBeVisible(doc,app){
  return Boolean(app && app.dataset.tab==='map' && app.dataset.searchOpen!=='true' &&
    !hasOpenMapWindow(doc,app) && doc.getElementById('map-startup-overlay')?.hidden!==false &&
    doc.getElementById('dj840-theme-confirm')?.hidden!==false);
}
export function installV845ToolbarFade(doc=document,win=window){
  const app=doc.getElementById('app');
  const toolbar=doc.getElementById('dj-v794-toolbar');
  if(!app || !toolbar || !win.matchMedia || app.dataset.dj845ToolbarInstalled==='true')return ()=>{};
  app.dataset.dj845ToolbarInstalled='true';
  const mobile=()=>win.matchMedia('(max-width:699px)').matches;
  const reduced=()=>win.matchMedia('(prefers-reduced-motion: reduce)').matches||app.classList.contains('dj-reduced-animation');
  const original={value:toolbar.style.getPropertyValue('opacity'),priority:toolbar.style.getPropertyPriority('opacity')};
  const restore=()=>{
    if(original.value)toolbar.style.setProperty('opacity',original.value,original.priority);
    else toolbar.style.removeProperty('opacity');
  };
  let ready=false, priorClear=false,frame=0,requested=0,disposed=false;
  const primaryOwnsPaint=()=>app.dataset.djPrimaryDissolving==='true';
  let wasPrimaryOwned=false;
  const fade=()=>{
    if(!mobile()||reduced())return;
    if(frame)win.cancelAnimationFrame(frame);
    const from=win.performance?.now?.()||0;
    const total=320;
    const update=now=>{
      if(disposed)return;
      if(primaryOwnsPaint()){frame=0;return;}
      if(!mapShortcutsShouldBeVisible(doc,app)||!mobile()){
        frame=0;restore();return;
      }
      const k=Math.max(0,Math.min(1,(now-from)/total));
      const alpha=k*k*(3-2*k);
      // Earlier mobile CSS fixes opacity at 1!important; inline important is
      // intentional so a visible fade can actually override those old rules.
      toolbar.style.setProperty('opacity',String(alpha),'important');
      if(k<1)frame=win.requestAnimationFrame(update);
      else{frame=0;restore();}
    };
    toolbar.style.setProperty('opacity','0','important');
    frame=win.requestAnimationFrame(update);
  };
  const sync=()=>{
    requested=0;
    if(disposed)return;
    if(primaryOwnsPaint()){
      if(frame){win.cancelAnimationFrame(frame);frame=0;}
      wasPrimaryOwned=true;return;
    }
    const clear=mobile()&&mapShortcutsShouldBeVisible(doc,app);
    if(wasPrimaryOwned){wasPrimaryOwned=false;priorClear=clear;ready=true;return;}
    if(ready&&!priorClear&&clear)fade();
    if(!clear && frame){win.cancelAnimationFrame(frame);frame=0;restore();}
    priorClear=clear;ready=true;
  };
  const schedule=()=>{
    if(requested||disposed)return;
    requested=win.requestAnimationFrame(sync);
  };
  const observers=[];
  const observed=new WeakSet();
  const observe=node=>{
    if(!node||observed.has(node))return;
    observed.add(node);
    const ob=new MutationObserver(schedule);
    ob.observe(node,{attributes:true,attributeFilter:['hidden','class','data-tab','data-search-open','data-dj810-animating','data-dj-primary-dissolving']});
    observers.push(ob);
  };
  observe(app);
  const watchIds=['route-panel','participation-panel','news-panel','mine-panel',
    'overview-sheet','transport-sheet','detail-sheet','entry-sheet',
    'map-safety-controls','map-advanced-controls','dj-mobile-utilities',
    'dj832-data-sheet','dj833-weather-sheet','dj833-night-modal',
    'dj832-info-sheet','dj832-feature-sheet','map-quick-search-dropdown','djNext-layer-panel','night-visibility-float',
    'map-gesture-guide','dj-map-settings','dj-app-about','version-history-modal',
    'map-startup-overlay','dj840-theme-confirm','dj-transit-signin-prompt'];
  for(const id of watchIds)observe(doc.getElementById(id));
  const click=()=>{schedule();win.setTimeout(schedule,0);};
  doc.addEventListener('click',click,{passive:true});
  const resize=()=>schedule();win.addEventListener('resize',resize,{passive:true});
  // MapLibre place details are injected dynamically; catch arrival and removal.
  const popupHost=doc.querySelector('.maplibregl-popup')?.parentElement||doc.getElementById('map');
  const popupObserver=popupHost?new MutationObserver(schedule):null;
  popupObserver?.observe(popupHost,{childList:true,subtree:false});
  sync();
  return ()=>{
    disposed=true;if(requested)win.cancelAnimationFrame(requested);
    if(frame)win.cancelAnimationFrame(frame);
    restore();observers.forEach(ob=>ob.disconnect());popupObserver?.disconnect();
    doc.removeEventListener('click',click);win.removeEventListener('resize',resize);
    delete app.dataset.dj845ToolbarInstalled;
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installV845ToolbarFade();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
