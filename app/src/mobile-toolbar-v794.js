import {fadePanelOut} from './v852-panel-transition.js';
/** v7.9.4 — shared responsive toolbar. Original map/safety/night controls stay
 * connected to the existing app handlers and are clicked through proxies.
 * Never reposition native control nodes: older versions contain fixed-position
 * !important rules that escape flex layouts on iOS.
 */
export function installMobileToolbarV794(doc=document, win=window) {
  const app=doc.getElementById('app');
  if (!app || !win.matchMedia) return ()=>{};
  const media=win.matchMedia('(min-width: 0px)');
  let row=null, observer=null, onOutside=null, onEsc=null;
  const controls=[
    // Map options are intentionally removed from the top shortcut row.
    // The final More control uses the same sliders glyph and opens the
    // existing map-options panel from its dedicated action inside More.
    {id:'dj-v794-safety',label:'보행안전',original:'map-safety-toggle',aria:'aria-expanded',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 20 6v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/></svg>'},
    {id:'dj-v794-night',label:'야간 시야',original:'night-visibility-quick-off',aria:'aria-pressed',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18.2 14.6A8.1 8.1 0 0 1 9.4 4.2a8.5 8.5 0 1 0 8.8 10.4Z"/><path d="M18 2v5M15.5 4.5h5M21 9v3M19.5 10.5h3"/></svg>'}
  ];
  const button=(id,label)=>{
    const node=doc.createElement('button');
    node.id=id;node.type='button';node.className='dj-v794-tool';
    node.setAttribute('aria-label',label);
    return node;
  };
  function sync(){
    if (!row) return;
    const activeId=app.classList.contains('map-controls-open')?'dj-v794-map':
      app.classList.contains('map-safety-open')?'dj-v794-safety':
      app.dataset.sangdoNight==='on'?'dj-v794-night':'';
    for (const c of controls) {
      const n=doc.getElementById(c.id);
      if(!n)continue;
      n.disabled=Boolean(doc.getElementById(c.original)?.disabled);
      const active=c.id===activeId;
      n.dataset.active=active?'true':'false';
      n.setAttribute(c.aria,String(active));
      const caption=n.querySelector('.dj-v794-caption');
      if(caption)caption.textContent=c.id==='dj-v794-night'&&active?'야간 종료':c.label;
    }
    const weather=doc.getElementById('weather-label')?.textContent||'';
    const place=doc.getElementById('weather-title')?.textContent||'';
    const temp=weather.match(/-?\d+(?:\.\d+)?\s*(?:°|℃|도|C)/i);
    const value=temp?.[0]?.match(/-?\d+(?:\.\d+)?/)?.[0];
    const wt=doc.getElementById('dj-v794-weather');
    if(wt){
      const weatherIcon=/눈/.test(weather)?'snow':/뇌우/.test(weather)?'storm':/비|소나기/.test(weather)?'rain':/구름|흐림|안개/.test(weather)?'cloud':/맑|쾌청/.test(weather)?'sun':'unknown';
      const temperature=value? `${value}°`:'날씨';
      const shapes={sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',cloud:'<path d="M6 18a4 4 0 1 1 .5-8A6 6 0 0 1 18 11a3.5 3.5 0 0 1 0 7Z"/>',rain:'<path d="M6 15a4 4 0 1 1 .5-8A6 6 0 0 1 18 8a3.5 3.5 0 0 1 0 7ZM8 18l-1 3m6-3-1 3m6-3-1 3"/>',snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3m-6 16 3-3 3 3"/>',storm:'<path d="M6 14a4 4 0 1 1 .5-8A6 6 0 0 1 18 7a3.5 3.5 0 0 1 0 7M13 13l-4 5h4l-2 4"/>',unknown:'<path d="M5 17a4 4 0 1 1 1-8A6 6 0 0 1 17 10a3.5 3.5 0 0 1 2 6M12 16v1m0 3h.01"/>'};
      let icon=wt.querySelector('.dj910-weather-icon'),caption=wt.querySelector('.dj910-weather-temp');
      if(!icon||!caption){
        wt.replaceChildren();icon=doc.createElement('span');icon.className='dj-v794-icon dj910-weather-icon';icon.setAttribute('aria-hidden','true');
        caption=doc.createElement('span');caption.className='dj910-weather-temp';wt.append(icon,caption);
      }
      if(icon.dataset.dj912WeatherIcon!==weatherIcon){icon.dataset.dj912WeatherIcon=weatherIcon;icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[weatherIcon]}</svg>`;}
      if(caption.textContent!==temperature)caption.textContent=temperature;
      wt.setAttribute('aria-label',`${place} ${weather}`.trim()||'날씨 새로고침');
    }
    const more=doc.getElementById('dj-v794-more');
    if(more){
      const mapOptionsOpen=app.classList.contains('map-controls-open');
      more.dataset.active=mapOptionsOpen?'true':'false';
      more.setAttribute('aria-expanded',String(mapOptionsOpen||!doc.getElementById('dj-mobile-utilities')?.hidden));
    }
  }
  function mount(){
    if(row || !media.matches) return;
    row=doc.createElement('nav');row.id='dj-v794-toolbar';
    row.setAttribute('aria-label','모바일 지도 도구');
    for(const c of controls){
      const n=button(c.id,c.label);
      n.innerHTML=`<span class="dj-v794-icon" aria-hidden="true">${c.icon}</span><span class="dj-v794-caption">${c.label}</span>`;
      n.addEventListener('click',()=>{
        // Use original listeners, avoiding a second source of truth.
        doc.getElementById(c.original)?.click();
        const utilities=doc.getElementById('dj-mobile-utilities');
        if(utilities&&!utilities.hidden)utilities.dispatchEvent(new (win.CustomEvent||CustomEvent)('dongjak:close-more',{detail:{immediate:true}}));
        app.classList.remove('dj-mobile-more-open');
        doc.getElementById('dj-mobile-more-trigger')?.setAttribute('aria-expanded','false');
        queueMicrotask(sync);
      });
      row.appendChild(n);
    }
    const weather=button('dj-v794-weather','날씨 새로고침');
    weather.addEventListener('click',()=>{doc.getElementById('weather-label')?.click();queueMicrotask(sync);});
    const more=button('dj-v794-more','지도 옵션 및 더보기 열기');
    more.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="2" fill="currentColor" stroke="none"/></svg>';
    more.setAttribute('aria-expanded','false');
    more.setAttribute('aria-controls','dj-mobile-utilities');
    more.addEventListener('click',()=>{
      doc.getElementById('dj-mobile-more-trigger')?.click();
      queueMicrotask(sync);
    });
    row.append(weather,more);app.appendChild(row);
    observer=new MutationObserver(sync);
    observer.observe(app,{attributes:true,attributeFilter:['class','data-sangdo-night','data-theme','data-tab']});
    for(const id of ['weather-label','weather-title','night-visibility-quick-off','map-tools-toggle','map-safety-toggle','dj-mobile-utilities']){
      const node=doc.getElementById(id);
      if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden','disabled','aria-pressed','aria-expanded'],childList:true,characterData:true,subtree:true});
    }
    onOutside=(e)=>{if(!row?.contains(e.target))queueMicrotask(sync);};
    onEsc=()=>queueMicrotask(sync);
    doc.addEventListener('pointerdown',onOutside,true);
    doc.addEventListener('keydown',onEsc);
    sync();
  }
  function unmount(){
    observer?.disconnect();observer=null;
    if(onOutside)doc.removeEventListener('pointerdown',onOutside,true);
    if(onEsc)doc.removeEventListener('keydown',onEsc);
    onOutside=null;onEsc=null;row?.remove();row=null;
  }
  const update=()=>media.matches?mount():unmount();
  media.addEventListener?.('change',update);update();
  return ()=>{media.removeEventListener?.('change',update);unmount();};
}
if(typeof document!=='undefined' && typeof window!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installMobileToolbarV794(),{once:true});
  else installMobileToolbarV794();
}
