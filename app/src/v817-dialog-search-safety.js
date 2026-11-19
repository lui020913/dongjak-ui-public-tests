/** v8.0.3 follow-up — close affordance, safety drawer and search coordination.
 * The native map, transport and GIS ownership remains in its original modules.
 */
export const CLOSE_BUTTON_SELECTORS=Object.freeze([
  '#map-options-mobile-close','#map-options-desktop-close','#map-safety-close',
  '#road-width-legend-close','#version-history-close','#map-quick-search-close',
  '#transport-close','#admin-dong-close','#map-gesture-guide-close',
  '#dj-settings-close','.dj-about-close','#overview-sheet-close','#close-detail',
  '#route-search-close','#community-compose-close','#ped-tools-close',
  '#pza-road-close','#cancel-add','#route-transit-confirm-close',
  '#dj800-type-panel .dj800-type-close','.page-dismiss'
]);

/** Vector close glyph: CSS pseudo crosses are disabled by the final stylesheet. */
export function makeCloseGlyph(doc){
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');svg.classList.add('dj817-x-svg');
  const path=doc.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d','M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5');
  svg.append(path);return svg;
}
export function installUnifiedCloseGlyphs(doc=document){
  const selector=CLOSE_BUTTON_SELECTORS.join(',');
  const update=()=>{
    for(const button of doc.querySelectorAll(selector)){
      if(button.dataset.dj817Close==='on')continue;
      button.replaceChildren(makeCloseGlyph(doc));
      button.dataset.dj817Close='on';
      button.classList.add('dj817-close-button');
    }
  };
  update();
  const root=doc.getElementById('app');
  let observer;
  if(root&&typeof MutationObserver!=='undefined'){
    observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.type==='childList'&&m.addedNodes.length))update();
    });
    observer.observe(root,{childList:true,subtree:true});
  }
  return ()=>observer?.disconnect();
}

export const SAFETY_GROUP_IDS=Object.freeze([
  'dj-safety-data','dj-safety-facilities','dj-safety-traffic',
  'dj-safety-night','dj-safety-actions'
]);
/** Left-side category selection, right-side existing details (desktop only). */
export function installSafetyCategoryLayout(doc=document,win=window){
  const panel=doc.getElementById('map-safety-controls');
  if(!panel)return ()=>{};
  const media=win.matchMedia?.('(min-width:1080px)');
  const nav=panel.querySelector('.dj-safety-nav');
  let selected=SAFETY_GROUP_IDS.includes(panel.dataset.dj817ActiveGroup)
    ?panel.dataset.dj817ActiveGroup:SAFETY_GROUP_IDS[0];
  const paint=()=>{
    panel.dataset.dj817ActiveGroup=selected;
    nav?.querySelectorAll('[data-dj-safety-target]').forEach(button=>{
      const active=button.dataset.djSafetyTarget===selected;
      button.classList.toggle('is-current',active);
      button.setAttribute('aria-pressed',String(active));
    });
    if(media?.matches){
      for(const id of SAFETY_GROUP_IDS){
        const group=doc.getElementById(id);if(!group)continue;
        if(id===selected)group.open=true;
        else group.open=false;
      }
    }
  };
  const select=(e)=>{
    const button=e.target?.closest?.('[data-dj-safety-target]');
    if(!button || !nav?.contains(button) || !media?.matches)return;
    const id=button.dataset.djSafetyTarget;
    if(!SAFETY_GROUP_IDS.includes(id))return;
    selected=id;paint();
    // Existing safety-workbench listener still invokes this item's real group.
  };
  nav?.addEventListener('click',select,true);
  media?.addEventListener?.('change',paint);
  paint();
  return ()=>{nav?.removeEventListener('click',select,true);media?.removeEventListener?.('change',paint);};
}

export function installV817DialogFixes(doc=document,win=window){
  const uninstallClose=installUnifiedCloseGlyphs(doc);
  const uninstallSafety=installSafetyCategoryLayout(doc,win);
  return ()=>{uninstallClose();uninstallSafety();};
}
if(typeof document!=='undefined'){
  const boot=()=>installV817DialogFixes();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
