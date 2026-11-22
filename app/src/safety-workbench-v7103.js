import {iconSvgMarkup,SAFETY_ICON_COLORS} from './dongjak-safety-symbols.js';

/** Enhances the native safety drawer only. Does not create an extra panel. */
export function installSafetyWorkbenchUI(root=document){
  const panel=root.getElementById('map-safety-controls');
  if(!panel||panel.dataset.djWorkbenchReady==='true')return ()=>{};
  panel.dataset.djWorkbenchReady='true';
  panel.querySelectorAll('[data-dj-icon]').forEach(el=>{
    const name=el.dataset.djIcon;
    el.style.setProperty('--dj-icon-color',SAFETY_ICON_COLORS[name]||'#4f948d');
    el.innerHTML=iconSvgMarkup(name);
  });

  installReadableTypeOptions(root);
  const watchedButtons=[...panel.querySelectorAll('[data-dj-import], [data-bocha-import], .data-layer-controls>button[aria-pressed], #protection-zone-toggle, #sangdo-speed-toggle, #sangdo-camera-toggle, #night-visibility-toggle, #ped-access-toggle')];
  const update=()=>{
    let total=0;
    for(const button of watchedButtons){
      const on=button.getAttribute('aria-pressed')==='true';
      if(on)total++;
      if(button.matches('[data-dj-import], [data-bocha-import]')){
        const row=button.closest('.dj-import-entry');
        row?.classList.toggle('dj-layer-active',on);
        const state=row?.querySelector('.dj-feature-state');
        if(state)state.textContent=button.disabled?'불러오는 중':on?'켜짐':'꺼짐';
        button.setAttribute('aria-label',`${row?.querySelector('.dj-feature-copy b')?.textContent||'보행안전 자료'} ${button.disabled?'불러오는 중':on?'표시 중':'표시 안 함'}`);
      }
    }
    const clear=panel.querySelector('#dj-safety-clear-imports');
    if(clear){
      const disabled=!watchedButtons.some(button=>button.matches('[data-dj-import], [data-bocha-import]')&&button.getAttribute('aria-pressed')==='true');
      if(clear.disabled!==disabled)clear.disabled=disabled;
    }
    const counter=panel.querySelector('#dj-safety-active-count');
    if(counter)counter.textContent=`표시 ${total}`;
    for(const group of panel.querySelectorAll('.dj-safety-group')){
      const n=watchedButtons.filter(button=>group.contains(button)&&button.getAttribute('aria-pressed')==='true').length;
      const count=group.querySelector('.dj-safety-group-count');
      if(count)count.textContent=n?`${n}개 켜짐`:'선택 안 함';
      group.dataset.active=n?'true':'false';
    }
  };
  const handleClick=event=>{
    const target=event.target.closest?.('[data-dj-safety-target]');
    if(!target||!panel.contains(target))return;
    const group=panel.querySelector(`#${target.dataset.djSafetyTarget}`);
    if(!group)return;
    group.open=true;
    panel.querySelectorAll('[data-dj-safety-target]').forEach(button=>button.classList.toggle('is-current',button===target));
    if(window.matchMedia?.('(min-width:1080px)')?.matches && panel.dataset.dj817ActiveGroup){
      // Desktop category rail switches the right detail pane in-place.
      panel.scrollTop=0;return;
    }
    const top=group.getBoundingClientRect().top-panel.getBoundingClientRect().top;
    panel.scrollBy({top:top-110,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    group.querySelector('summary')?.focus({preventScroll:true});
  };
  const clearImports=panel.querySelector('#dj-safety-clear-imports');
  const clearActiveImports=()=>{
    panel.querySelectorAll('[data-dj-import][aria-pressed="true"]:not(:disabled), [data-bocha-import][aria-pressed="true"]:not(:disabled)').forEach(button=>button.click());
  };
  clearImports?.addEventListener('click',clearActiveImports);
  panel.addEventListener('click',handleClick);
  const observer=new MutationObserver(update);
  observer.observe(panel,{subtree:true,attributes:true,attributeFilter:['aria-pressed','disabled']});
  update();
  return ()=>{observer.disconnect();clearImports?.removeEventListener('click',clearActiveImports);panel.removeEventListener('click',handleClick);delete panel.dataset.djWorkbenchReady;};
}

// Readability preferences are scoped to app controls, not map glyphs.
// Persist locally, without account access or analytics.
const DJ_TYPE_KEY='dongjak-ui-readability-v1';
export function installReadableTypeOptions(root=document){
  const app=root.getElementById('app');
  const scale=root.getElementById('dj-type-scale');
  const weight=root.getElementById('dj-type-weight');
  if(!app||!scale||!weight||scale.dataset.djReady==='true')return;
  const allowedScale=new Set(['small','normal','large','xlarge']);
  const allowedWeight=new Set(['normal','bold']);
  try{
    const saved=JSON.parse(localStorage.getItem(DJ_TYPE_KEY)||'{}');
    if(allowedScale.has(saved.scale))scale.value=saved.scale;
    if(allowedWeight.has(saved.weight))weight.value=saved.weight;
  }catch{}
  const apply=()=>{
    const a=allowedScale.has(scale.value)?scale.value:'normal';
    const b=allowedWeight.has(weight.value)?weight.value:'normal';
    app.dataset.djTypeScale=a;
    app.dataset.djTypeWeight=b;
    // One typography owner also updates non-transport MapLibre place labels.
    // The map label engine currently supports three safe scales; clamp xlarge.
    const mapTextScale=a==='xlarge'?'large':a;
    if(app.dataset.djSettingsText!==mapTextScale){
      app.dataset.djSettingsText=mapTextScale;
      (root.defaultView||globalThis.window)?.dispatchEvent?.(new CustomEvent('dongjak:map-text-scale-change',{detail:{size:mapTextScale}}));
    }
    try{localStorage.setItem(DJ_TYPE_KEY,JSON.stringify({scale:a,weight:b}));}catch{}
  };
  scale.addEventListener('change',apply);
  weight.addEventListener('change',apply);
  scale.dataset.djReady='true';
  apply();
}
