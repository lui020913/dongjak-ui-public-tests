import {fadePanelOut} from './v852-panel-transition.js';
/** v8.0.1 — one presentation coordinator for mobile & desktop.
 * No MapLibre imports; original routing, night analysis, transit API and safety
 * listeners are preserved.  Controls continue to activate their original nodes.
 */
const MAJOR_SURFACES = [
  'route-panel','participation-panel','news-panel','mine-panel',
  'overview-sheet','admin-dong-picker','transport-sheet','detail-sheet','entry-sheet',
  'pza-road-sheet','night-visibility-float',
  'dj-map-settings','dj-app-about','version-history-modal','dj800-type-panel'
];
const CLASS_SURFACES = [
  ['map-options','map-controls-open'],
  ['safety-tools','map-safety-open'],
];
const SCOPE_EXCEPTIONS = new Set(['route-place-search','route-search-confirm','route-transit-confirm','route-map-card']);

export function identifyOpenedSurface(before,after) {
  const fresh=after.filter(id=>!before.includes(id));
  return fresh.length ? fresh.at(-1) : null;
}
export function panelLayoutTokens({rail={left:10,right:150,top:92},width=1440}={}) {
  const panelLeft=Math.max(0,Math.round(rail.right)+14);
  const panelTop=Math.max(60,Math.round(rail.top));
  const maxWidth=Math.max(270,Math.round(width-panelLeft-18));
  return {panelLeft,panelTop,maxWidth};
}

export function installUIArchitecture(doc=document, win=window){
  const app=doc.getElementById('app');
  if(!app)return ()=>{};
  const mq=win.matchMedia?.('(max-width:699px)');
  const mediaMobile=()=>!!mq?.matches;
  const el=id=>doc.getElementById(id);
  const cleanup=[];
  const listen=(node,type,fn,opts)=>{node?.addEventListener?.(type,fn,opts);cleanup.push(()=>node?.removeEventListener?.(type,fn,opts));};
  const primary=(id)=>id==='map-options' ? app.classList.contains('map-controls-open')
    :id==='safety-tools' ? app.classList.contains('map-safety-open')
    :!!(el(id) && !el(id).hidden);
  const ids=[...MAJOR_SURFACES,...CLASS_SURFACES.map(x=>x[0])];
  let previous=ids.filter(primary),syncQueued=false,muted=false;
  // A fresh panel gets a real Web Animations entrance, not just a CSS rule
  // competing with legacy fixed-position and transform overrides.
  const animatedEntrances=new WeakMap();
  function surfaceTarget(id){
    if(id==='map-options')return el('map-advanced-controls');
    if(id==='safety-tools')return el('map-safety-controls');
    const parent=el(id);
    if(!parent)return null;
    if(id==='dj-map-settings')return parent.querySelector('.dj-map-settings-card')||parent;
    if(id==='dj-app-about')return parent.querySelector('.dj-about-card')||parent;
    if(id==='version-history-modal')return parent.querySelector('.version-history-dialog')||parent;
    return parent;
  }
  function animateEntrance(id){
    if(app.dataset.dj806Motion==='on')return;
    const target=surfaceTarget(id);
    if(!target || typeof target.animate!=='function')return;
    if(app.classList.contains('dj-reduced-animation') || win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
    animatedEntrances.get(target)?.cancel?.();
    const touch=mediaMobile();
    const animation=target.animate([
      {opacity:0,translate:touch?'0 26px':'-10px 0',scale:'.985'},
      {opacity:1,translate:'0 0',scale:'1'}
    ],{duration:touch?340:250,easing:'cubic-bezier(.18,.84,.25,1)',fill:'both'});
    animatedEntrances.set(target,animation);
    // Do not keep an animation fill permanently; other CSS owns layout.
    animation.addEventListener?.('finish',()=>{
      if(animatedEntrances.get(target)===animation){animatedEntrances.delete(target);animation.cancel();}
    },{once:true});
  }

  function dismiss(id){
    if(id==='map-options'){app.classList.remove('map-controls-open');return;}
    if(id==='safety-tools'){app.classList.remove('map-safety-open');return;}
    const node=el(id);if(!node)return;
    // Preserve original DOM and event-bound children; only dismiss the surface.
    node.hidden=true;
  }
  function syncOpenPanels(){
    syncQueued=false;if(muted)return;
    let current=ids.filter(primary);
    const fresh=identifyOpenedSurface(previous,current);
    if(current.length>1 && app.dataset.dj806Exclusive!=='on'){
      // Only the most recently opened surface is allowed to be visible. This
      // avoids two independent panels on top of each other when async transport
      // data arrives after the user has selected a tab or an admin district.
      const winner=fresh||current.at(-1);
      muted=true;
      for(const other of current){if(other!==winner)dismiss(other);}
      muted=false;
      current=ids.filter(primary);
    }
    previous=current;
    const active=current.at(-1)||'';
    app.dataset.dj800ActiveSurface=active;
    app.classList.toggle('dj800-surface-open',!!active);
    if(fresh && active===fresh){
      if(typeof win.requestAnimationFrame==='function')win.requestAnimationFrame(()=>animateEntrance(fresh));
      else animateEntrance(fresh);
    }
    if(active){
      const more=el('dj-mobile-utilities');
      if(more && !more.hidden){fadePanelOut(more,win,190);el('dj-mobile-more-trigger')?.setAttribute('aria-expanded','false');}
    }
  }
  const schedule=()=>{if(!syncQueued){syncQueued=true;win.queueMicrotask?win.queueMicrotask(syncOpenPanels):Promise.resolve().then(syncOpenPanels);}};
  const observer=new MutationObserver(schedule);
  for(const id of MAJOR_SURFACES){const node=el(id);if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});}
  observer.observe(app,{attributes:true,attributeFilter:['class','data-tab']});
  // App info, preferences and version history are created by later modules;
  // watch only first-level additions so map label updates do not enter this loop.
  observer.observe(app,{childList:true,subtree:false});
  let seenNodes=new Set(MAJOR_SURFACES.filter(id=>el(id)));
  function observeAdded(){
    for(const id of MAJOR_SURFACES){
      if(seenNodes.has(id))continue;
      const node=el(id);if(!node)continue;
      seenNodes.add(id);
      observer.observe(node,{attributes:true,attributeFilter:['hidden']});
    }
  }
  const additions=new MutationObserver(()=>{observeAdded();schedule();});
  additions.observe(app,{childList:true,subtree:false});
  // Close stale surfaces immediately before a tab changes. The app's own tab
  // handler then opens the destination without an intermediate overlap.
  listen(doc,'click',event=>{
    const tab=event.target?.closest?.('#bottom-nav .nav-tab[data-tab]');
    if(tab){
      const chosen=tab.dataset.tab;
      if(chosen){
        for(const id of MAJOR_SURFACES){
          if(id===({route:'route-panel',participate:'participation-panel',news:'news-panel',mine:'mine-panel'}[chosen]))continue;
          if(primary(id))dismiss(id);
        }
        app.classList.remove('map-controls-open','map-safety-open');
      }
    }
  },true);
  function measure(){
    const nav=el('bottom-nav');if(!nav)return;
    if(mediaMobile()){
      const rect=nav.getBoundingClientRect();
      const vh=win.visualViewport?.height||win.innerHeight;
      const navTop=rect.top;
      const bottom=Math.max(70,Math.round(vh-navTop+10));
      app.style.setProperty('--dj800-panel-bottom',bottom+'px');
    }
    if(!mediaMobile()){
      const rect=nav.getBoundingClientRect();
      const metrics=panelLayoutTokens({rail:rect,width:win.innerWidth});
      app.style.setProperty('--dj800-panel-left',metrics.panelLeft+'px');
      app.style.setProperty('--dj800-panel-top',metrics.panelTop+'px');
      app.style.setProperty('--dj800-panel-max',metrics.maxWidth+'px');
      app.style.setProperty('--dj800-rail-width',Math.round(rect.width)+'px');
    }
    const theme=el('theme-toggle');
    if(mediaMobile() && theme){
      const height=Math.round(theme.getBoundingClientRect().height);
      if(height>=38 && height<=85)app.style.setProperty('--dj800-logo-size',Math.min(height+6,70)+'px');
    }
  }
  let sizeWatcher=null;
  if(typeof ResizeObserver!=='undefined'){
    sizeWatcher=new ResizeObserver(measure);
    const nav=el('bottom-nav');const theme=el('theme-toggle');
    if(nav)sizeWatcher.observe(nav);if(theme)sizeWatcher.observe(theme);
  }
  listen(win,'resize',measure,{passive:true});
  listen(win,'orientationchange',measure,{passive:true});
  win.requestAnimationFrame(measure);

  // Existing two select inputs continue to own accessibility preferences.
  // A single additional mobile icon proxies their change events.
  let typeButton=null,typePanel=null;
  function installTypeTool(){
    const toolbar=el('dj-v794-toolbar');if(!toolbar || typeButton)return;
    typeButton=doc.createElement('button');
    typeButton.type='button';typeButton.id='dj800-type-trigger';typeButton.className='dj-v794-tool';
    typeButton.setAttribute('aria-haspopup','dialog');typeButton.setAttribute('aria-controls','dj800-type-panel');
    typeButton.setAttribute('aria-label','글자 크기와 굵기 조절');
    typeButton.innerHTML='<span class="dj800-type-icon" aria-hidden="true"><b>가</b><small>가</small></span>';
    const before=el('dj-v794-weather')||el('dj-v794-more');
    toolbar.insertBefore(typeButton,before);
    typePanel=doc.createElement('section');typePanel.id='dj800-type-panel';typePanel.hidden=true;
    typePanel.setAttribute('role','dialog');typePanel.setAttribute('aria-modal','true');typePanel.setAttribute('aria-labelledby','dj800-type-title');
    typePanel.innerHTML=`<div class="dj800-type-head"><div><span>ACCESSIBILITY</span><h2 id="dj800-type-title">글자 가독성</h2><p>이 기기의 메뉴와 정보창에 적용됩니다.</p></div><button type="button" class="dj800-type-close" aria-label="글자 설정 닫기">×</button></div>
      <div class="dj800-type-options"><label>글자 크기<select id="dj800-type-size"><option value="small">작게</option><option value="normal">기본</option><option value="large">크게</option><option value="xlarge">더 크게</option></select></label><label>글자 굵기<select id="dj800-type-weight"><option value="normal">기본</option><option value="bold">굵게</option></select></label></div>
      <button type="button" class="dj800-type-done">적용 완료</button>`;
    app.appendChild(typePanel);
    const scale=el('dj-type-scale'),weight=el('dj-type-weight');
    const syncTypes=()=>{
      el('dj800-type-size').value=scale?.value||'normal';
      el('dj800-type-weight').value=weight?.value||'normal';
    };
    const close=()=>{typePanel.hidden=true;typeButton?.setAttribute('aria-expanded','false');};
    const open=()=>{syncTypes();typePanel.hidden=false;typeButton.setAttribute('aria-expanded','true');};
    listen(typeButton,'click',()=>{
      if(mediaMobile()){
        // v886: exactly one typography surface. A mobile More control must
        // not first open the legacy dialog, animate its dismissal, then open
        // My Info. That race left an invisible hit-blocking sheet on iOS.
        if(!typePanel.hidden)close();
        const more=el('dj-mobile-utilities');
        if(more&&!more.hidden){
          more.hidden=true;
          app.classList.remove('dj-mobile-more-open');
          el('dj-mobile-more-trigger')?.setAttribute('aria-expanded','false');
        }
        const mine=doc.querySelector('#bottom-nav .nav-tab[data-tab="mine"]');
        if(mine)mine.click();
        // Schedule a non-animated subview transition AFTER the tab handler.
        // setTimeout has no dependency on a stalled WebKit rAF/completion.
        win.setTimeout(()=>{
          const panel=el('mine-panel');
          if(app.dataset.tab!=='mine'||panel?.hidden)return;
          panel.querySelector('.dj834-my-home [data-dj834-action="type"]')?.click();
        },0);
        return;
      }
      typePanel.hidden?open():close();
    });
    listen(typePanel.querySelector('.dj800-type-close'),'click',close);
    listen(typePanel.querySelector('.dj800-type-done'),'click',close);
    listen(el('dj800-type-size'),'change',event=>{if(scale){scale.value=event.target.value;scale.dispatchEvent(new Event('change',{bubbles:true}));}});
    listen(el('dj800-type-weight'),'change',event=>{if(weight){weight.value=event.target.value;weight.dispatchEvent(new Event('change',{bubbles:true}));}});
    listen(doc,'keydown',event=>{if(event.key==='Escape'&&!typePanel.hidden)close();});
  }
  installTypeTool();
  // The original v7.9 toolbar is initialized separately; do not poll or add
  // global timers. If it mounts after us, one child-list observation installs.
  const toolbarObserver=new MutationObserver(()=>{if(!typeButton)installTypeTool();});
  toolbarObserver.observe(app,{childList:true,subtree:false});

  // Both PC and mobile compass views use ONE authoritative bearing. The
  // mobile icon is a click proxy, not a second source of compass state.
  const compass=el('map-compass');
  let compassSyncQueued=false;
  const updateIcon=()=>{
    compassSyncQueued=false;
    if(!compass)return;
    const main=compass.querySelector('.compass-direction');
    const mobile=doc.querySelector('#dj-mobile-map-actions button[data-for="map-compass"] .compass-direction');
    if(!main||!mobile)return;
    if(mobile.innerHTML!==main.innerHTML)mobile.innerHTML=main.innerHTML;
    const bearingTransform=main.style.transform||'';
    if(mobile.style.transform!==bearingTransform)mobile.style.transform=bearingTransform;
    mobile.parentElement?.setAttribute('aria-label',compass.getAttribute('aria-label')||'북쪽 정렬');
  };
  const onCompass=()=>{if(!compassSyncQueued){compassSyncQueued=true;win.requestAnimationFrame(updateIcon);}};
  const compassObserver=new MutationObserver(onCompass);
  if(compass)compassObserver.observe(compass,{attributes:true,subtree:true,childList:true,attributeFilter:['style','class','aria-label']});
  const mapControlsObserver=new MutationObserver(onCompass);
  mapControlsObserver.observe(app,{childList:true,subtree:false});
  onCompass();
  observeAdded();schedule();
  return ()=>{observer.disconnect();additions.disconnect();toolbarObserver.disconnect();compassObserver.disconnect();mapControlsObserver.disconnect();sizeWatcher?.disconnect();cleanup.forEach(f=>f());typeButton?.remove();typePanel?.remove();};
}
if(typeof document!=='undefined'){
 const boot=()=>installUIArchitecture(document,window);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
