/**
 * v8.8.1 — tablet tool rail.
 * Preserve native handlers on the original map buttons. Desktop/phone remain
 * untouched: generated controls only have a visible layout at tablet widths.
 * The feature controls are NOT clones of business logic; clicks forward to
 * the pre-existing app action, and accessibility state is mirrored.
 */
const FEATURES = [
  {
    source:'map-tools-toggle', label:'지도 옵션',short:'지도 옵션',key:'options',
    svg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="2" fill="currentColor" stroke="none"/></svg>'
  },
  {
    source:'map-safety-toggle',label:'보행안전 도구',short:'보행안전',key:'safety',
    svg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 8 3v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5l8-3Z"/><path d="m8 12 2.6 2.6L16 9"/></svg>'
  },
  {
    source:'night-visibility-quick-off',label:'야간 시야 전환',short:'야간 시야',key:'night',
    svg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 15.5A8.2 8.2 0 0 1 8.5 4.6 8.3 8.3 0 1 0 19.4 15.5Z"/></svg>'
  }
];

const tabletQuery='(min-width:700px) and (max-width:1079px), (min-width:1080px) and (max-width:1366px) and (pointer:coarse)';

function initTabletTools(doc=document) {
  const rail=doc.getElementById('bottom-nav');
  if(!rail||doc.getElementById('dj-tablet-utility-group'))return;
  const panel=doc.createElement('div');
  panel.id='dj-tablet-utility-group';
  panel.className='dj-tablet-utility-group';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','태블릿 지도 도구');
  const label=doc.createElement('strong');
  label.className='dj-tablet-utility-heading';
  label.textContent='지도 도구';
  panel.append(label);
  const observers=[];
  const media=window.matchMedia(tabletQuery);
  const updatePresentation=()=>{
    panel.hidden=!media.matches;
    for(const child of panel.querySelectorAll('button'))child.tabIndex=media.matches&&!child.hidden?0:-1;
  };
  for(const feature of FEATURES){
    const original=doc.getElementById(feature.source);
    if(!original)continue;
    const button=doc.createElement('button');
    button.type='button';
    button.id='dj-tablet-tool-'+feature.key;
    button.className='dj-tablet-utility-button';
    button.dataset.source=feature.source;
    button.setAttribute('aria-label',feature.label);
    button.title=feature.label;
    button.innerHTML=feature.svg+'<span>'+feature.short+'</span>';
    panel.append(button);
    const sync=()=>{
      const on=original.getAttribute('aria-expanded');
      const pressed=original.getAttribute('aria-pressed');
      if(on!==null)button.setAttribute('aria-expanded',on);
      else button.removeAttribute('aria-expanded');
      if(pressed!==null)button.setAttribute('aria-pressed',pressed);
      else button.removeAttribute('aria-pressed');
      button.disabled=Boolean(original.disabled);
      button.hidden=(feature.key==='night'&&original.hidden);
      updatePresentation();
    };
    button.addEventListener('click',()=>{
      if(!media.matches||button.disabled||button.hidden)return;
      original.click();
      requestAnimationFrame(sync);
    });
    const observer=new MutationObserver(sync);
    observer.observe(original,{attributes:true,attributeFilter:['hidden','disabled','aria-expanded','aria-pressed']});
    observers.push(observer);
    sync();
  }
  rail.append(panel);
  media.addEventListener?.('change',updatePresentation);
  updatePresentation();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>initTabletTools(),{once:true});
}else initTabletTools();
