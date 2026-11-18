import './v857-requested-ux.css';
/**
 * v8.5.7 — requested PC/mobile UI corrections.
 * Keeps existing app actions and map state; only normalizes their entry points,
 * sheet gestures, search geometry and obsolete shortcut cleanup.
 */
const SLIDERS_ICON='<svg data-dj857-sliders="true" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="2" fill="currentColor" stroke="none"/></svg>';

export function installV857RequestedUX(doc=document,win=window){
  const app=doc.getElementById('app');if(!app)return ()=>{};
  const cleanups=[];
  const removeLegacy=()=>{
    doc.getElementById('dj-r2-history-shortcut')?.remove();
    doc.getElementById('dj-v794-map')?.remove();
  };
  removeLegacy();
  const legacyObserver=new MutationObserver(removeLegacy);
  legacyObserver.observe(app,{childList:true,subtree:true});
  cleanups.push(()=>legacyObserver.disconnect());

  const syncMoreIcon=()=>{
    const more=doc.getElementById('dj-v794-more');
    if(more){
      if(!more.querySelector('svg[data-dj857-sliders]'))more.innerHTML=SLIDERS_ICON;
      more.setAttribute('aria-label','지도 옵션 및 더보기 열기');more.title='지도 옵션 및 더보기';
    }
    const original=doc.getElementById('dj-mobile-more-trigger');
    if(original){original.setAttribute('aria-label','지도 옵션 및 더보기 열기');}
  };
  syncMoreIcon();
  const ObserverCtor=win.MutationObserver||globalThis.MutationObserver;
  const toolbarObserver=typeof ObserverCtor==='function'?new ObserverCtor(syncMoreIcon):null;
  // The v7.9.4 toolbar can be mounted one animation frame after this module.
  // Observe the app, not just a toolbar that may not exist yet. The callback
  // is idempotent: it writes the sliders SVG only when the old icon is present.
  if(toolbarObserver)toolbarObserver.observe(app,{childList:true,subtree:true});
  cleanups.push(()=>toolbarObserver?.disconnect());

  // The Safety Map tab is navigation only. It never opens the district picker.
  const closeAdmin=event=>{
    const tab=event.target?.closest?.('#bottom-nav .nav-tab[data-tab="map"]');
    if(!tab)return;
    const picker=doc.getElementById('admin-dong-picker');
    if(picker&&!picker.hidden){
      picker.hidden=true;
      picker.classList.remove('dj-sheet-dragging','dj833-sheet-dismissing');
      picker.style.removeProperty('--dj-sheet-drag-y');
      app.classList.remove('dj-admin-dongs-open');
      delete app.dataset.djActiveSheet;
    }
  };
  // Window capture runs before document-level legacy handlers. This matters
  // because the existing map-tab home handler may stop propagation on an
  // already-selected tab; the picker must still be closed first.
  win.addEventListener('click',closeAdmin,true);
  cleanups.push(()=>win.removeEventListener('click',closeAdmin,true));

  // iPhone search results use the full available width and stay below the
  // search field even when the visual viewport shrinks for the native keyboard.
  const form=doc.querySelector('.topbar .map-quick-search-form');
  const dropdown=doc.getElementById('map-quick-search-dropdown');
  let frame=0;
  const updateSearch=()=>{
    frame=0;if(!form||!dropdown||!win.matchMedia?.('(max-width:699px)').matches)return;
    const rect=form.getBoundingClientRect();
    const vv=win.visualViewport;
    const viewportTop=vv?.offsetTop||0;
    const viewportBottom=viewportTop+(vv?.height||win.innerHeight||0);
    const top=Math.max(viewportTop+8,Math.ceil(rect.bottom+8));
    const maxHeight=Math.max(140,Math.floor(viewportBottom-top-16));
    dropdown.style.setProperty('--dj857-search-top',`${top}px`);
    dropdown.style.setProperty('--dj857-search-max-height',`${maxHeight}px`);
  };
  const raf=typeof win.requestAnimationFrame==='function'?win.requestAnimationFrame.bind(win):(fn)=>win.setTimeout(fn,16);
  const scheduleSearch=()=>{
    if(frame)return;
    frame=raf(updateSearch);
  };
  if(form&&dropdown){
    form.addEventListener('focusin',scheduleSearch);
    form.addEventListener('input',scheduleSearch);
    win.addEventListener('resize',scheduleSearch,{passive:true});
    win.visualViewport?.addEventListener('resize',scheduleSearch,{passive:true});
    win.visualViewport?.addEventListener('scroll',scheduleSearch,{passive:true});
    const ro=typeof win.ResizeObserver==='function'?new win.ResizeObserver(scheduleSearch):null;
    ro?.observe(form);
    cleanups.push(()=>{
      form.removeEventListener('focusin',scheduleSearch);form.removeEventListener('input',scheduleSearch);
      win.removeEventListener('resize',scheduleSearch);
      win.visualViewport?.removeEventListener('resize',scheduleSearch);
      win.visualViewport?.removeEventListener('scroll',scheduleSearch);
      ro?.disconnect();if(frame)win.cancelAnimationFrame?.(frame);
    });
  }
  // Clear stale drag transforms if a sheet is closed by a normal X/tap action.
  const clearClosedSheetState=()=>{
    for(const id of ['route-panel','participation-panel','news-panel','mine-panel','transport-sheet','detail-sheet','map-gesture-guide','dj-mobile-utilities']){
      const panel=doc.getElementById(id);
      if(panel?.hidden){
        panel.classList.remove('dj-sheet-dragging','dj833-sheet-dismissing');
        panel.style.removeProperty('--dj-sheet-drag-y');
        panel.style.removeProperty('--dj-sheet-drag-opacity');
      }
    }
  };
  const stateObserver=new MutationObserver(clearClosedSheetState);
  stateObserver.observe(app,{subtree:true,attributes:true,attributeFilter:['hidden']});
  cleanups.push(()=>stateObserver.disconnect());

  scheduleSearch();
  return ()=>cleanups.forEach(fn=>fn());
}

if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installV857RequestedUX(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
