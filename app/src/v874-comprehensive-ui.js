/** v8.7.4 UI behavior: keep each feature's data controller as the single owner.
 * This module only coordinates presentation and input, not transport/API state. */
export function installV874UX(doc=document, win=window){
  const app=doc.getElementById('app');
  if(!app||app.dataset.dj874Ready==='1')return ()=>{};
  app.dataset.dj874Ready='1';
  const cleanups=[];
  const listen=(target,type,fn,options)=>{
    if(!target)return;
    target.addEventListener(type,fn,options);
    cleanups.push(()=>target.removeEventListener(type,fn,options));
  };
  const isPhone=()=>win.matchMedia?.('(max-width:699px)')?.matches===true;
  // Use only the single dot navigator for onboarding. The numeric count remains.
  // Retain the progress-bar DOM as an ARIA progressbar for assistive technology.
  const tour=doc.getElementById('dj860-onboarding');
  if(tour)tour.dataset.dj874Navigator='dots';

  // Soft feedback for all active buttons; no programmatic click replay.
  const onPress=e=>{
    const target=e.target?.closest?.('button');
    if(!target||target.disabled)return;
    if(target.id==='weather-label'||target.id==='dj-mobile-weather-trigger'||target.id==='dj-v794-weather'){
      target.classList.add('dj874-weather-pressed');
    }
  };
  const onRelease=()=>{
    for(const b of doc.querySelectorAll('.dj874-weather-pressed'))b.classList.remove('dj874-weather-pressed');
  };
  listen(doc,'pointerdown',onPress,{capture:true,passive:true});
  listen(doc,'pointerup',onRelease,{capture:true,passive:true});
  listen(doc,'pointercancel',onRelease,{capture:true,passive:true});
  listen(win,'blur',onRelease);

  // Unavailable weather data must not repeat the word '날씨' as a temperature.
  const rawWeather=doc.getElementById('weather-label');
  const weatherButtons=()=>[rawWeather,doc.getElementById('dj-mobile-weather-trigger'),doc.getElementById('dj-v794-weather')].filter(Boolean);
  const actualTemperature=()=>{
    const text=String(rawWeather?.textContent||'');
    const number=text.match(/-?\d+(?:\.\d+)?\s*(?:°|℃|도|C)/);
    return number?.[0]?.trim()?.replace(/(?:℃|도|C)$/,'°')||null;
  };
  const setWeatherPlaceholder=()=>{
    const temperature=actualTemperature();
    for(const button of weatherButtons()){
      button.classList.toggle('dj874-weather-unavailable',!temperature);
      button.dataset.dj874WeatherTemperature=temperature||'--°';
      if(!temperature)button.setAttribute('title','온도 정보를 불러오지 못했습니다. 눌러 다시 조회하세요.');
    }
    if(rawWeather&&(!temperature||rawWeather.dataset.djTemperature==='날씨')){
      rawWeather.dataset.djTemperature=temperature||'--°';
    }
  };
  // A lightweight observer reacts to API updates; observing only text prevents
  // a loop when data attributes themselves change.
  const weatherObs=typeof MutationObserver!=='undefined'&&rawWeather
    ?new MutationObserver(setWeatherPlaceholder):null;
  weatherObs?.observe(rawWeather,{subtree:true,childList:true,characterData:true});
  listen(doc,'click',e=>{
    if(e.target?.closest?.('#weather-label,#dj-mobile-weather-trigger,#dj-v794-weather')){
      setWeatherPlaceholder();
    }
  },{capture:false});
  setWeatherPlaceholder();

  // Mobile safety categories act as horizontal tabs, not an append-only list
  // that scrolls every successive category below earlier expanded categories.
  const safety=doc.getElementById('map-safety-controls');
  const safetyNav=safety?.querySelector('.dj-safety-nav');
  const groups=[...(safety?.querySelectorAll(':scope > .dj-safety-group')||[])];
  const activateSafety=(id)=>{
    if(!isPhone()||!groups.some(group=>group.id===id))return;
    safety.dataset.dj874ActiveSafety=id;
    for(const group of groups){
      const active=group.id===id;
      group.open=active;
      group.classList.toggle('dj874-current-safety',active);
    }
    for(const button of safetyNav?.querySelectorAll('[data-dj-safety-target]')||[]){
      const active=button.dataset.djSafetyTarget===id;
      button.classList.toggle('is-current',active);
      button.setAttribute('aria-pressed',String(active));
    }
    // The panel stays on the same viewport position; only its inner content changes.
    const scroll=safety?.querySelector('.djNext-safety-scroll')||safety;
    const panelTop=scroll?.scrollTop||0;
    if(panelTop>60)scroll.scrollTo?.({top:0,behavior:'instant'});
  };
  if(safetyNav){
    listen(safetyNav,'click',e=>{
      if(!isPhone())return;
      const button=e.target.closest('[data-dj-safety-target]');
      if(!button)return;
      e.stopPropagation(); // Prevent the legacy scroll-to-the-lower-section handler.
      activateSafety(button.dataset.djSafetyTarget);
    },false);
    if(isPhone())activateSafety('dj-safety-data');
  }
  const onViewport=()=>{
    if(isPhone()&&!safety?.dataset.dj874ActiveSafety)activateSafety('dj-safety-data');
    if(!isPhone()&&safety){
      delete safety.dataset.dj874ActiveSafety;
      groups.forEach(group=>group.classList.remove('dj874-current-safety'));
    }
  };
  listen(win,'resize',onViewport,{passive:true});

  // Map tips cannot obscure the active facility/transport cards on a phone.
  // Most browsers support :has(), but the dataset fallback covers older shells.
  const tip=doc.getElementById('dj840-map-tip');
  const transport=doc.getElementById('transport-sheet');
  const syncTip=()=>{
    if(!app||!isPhone())return;
    const placeVisible=Boolean(doc.querySelector('#map .dj-place-detail-popup'));
    const panelVisible=Boolean(transport&&!transport.hidden);
    const safetyVisible=Boolean(safety&&!safety.hidden&&app.classList.contains('map-safety-open'));
    app.classList.toggle('dj874-hide-tip',placeVisible||panelVisible||safetyVisible);
  };
  let tipScheduled=false;
  const tipObs=typeof MutationObserver!=='undefined'
    ?new MutationObserver(()=>{if(tipScheduled)return;tipScheduled=true;
      const callback=()=>{tipScheduled=false;syncTip();};
      if(win.requestAnimationFrame)win.requestAnimationFrame(callback);else win.setTimeout(callback,16);
    }):null;
  if(transport)tipObs?.observe(transport,{attributes:true,attributeFilter:['hidden']});
  const map=doc.getElementById('map');
  if(map)tipObs?.observe(map,{childList:true,subtree:true});
  if(safety)tipObs?.observe(safety,{attributes:true,attributeFilter:['hidden']});
  syncTip();
  listen(win,'resize',syncTip,{passive:true});
  // No modifications to app launch, login, navigation data, or existing closes.
  return ()=>{
    cleanups.forEach(stop=>stop());weatherObs?.disconnect();tipObs?.disconnect();
    delete app.dataset.dj874Ready;app.classList.remove('dj874-hide-tip');
    if(tour)delete tour.dataset.dj874Navigator;
    // Do not mutate the original tip visibility owned by its own module.
  };
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
  const boot=()=>installV874UX(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
