/** Seven-day Dongjak forecast, from Open-Meteo; days and temperatures are source observations, not inferred values. */
export function weeklyWeatherUrl(latitude=37.4987,longitude=126.9494){
 const url=new URL('https://api.open-meteo.com/v1/forecast');
 url.searchParams.set('latitude',String(latitude));url.searchParams.set('longitude',String(longitude));
 url.searchParams.set('daily','weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
 url.searchParams.set('timezone','Asia/Seoul');url.searchParams.set('forecast_days','7');
 return url.toString();
}
const weatherCodeLabel=code=>{const n=Number(code);if([0].includes(n))return '맑음';if([1,2].includes(n))return '구름 조금';if([3].includes(n))return '흐림';if([45,48].includes(n))return '안개';if([51,53,55,56,57].includes(n))return '이슬비';if([61,63,65,66,67].includes(n))return '비';if([71,73,75,77,85,86].includes(n))return '눈';if([80,81,82].includes(n))return '소나기';if([95,96,99].includes(n))return '뇌우';return '날씨 미확인';};
export function weeklyWeatherRows(data){
 const d=data?.daily;
 if(!d||!Array.isArray(d.time)||d.time.length<7||!['weather_code','temperature_2m_max','temperature_2m_min'].every(k=>Array.isArray(d[k])&&d[k].length>=7))throw Error('7일 예보 항목이 부족합니다.');
 const weekdays=['일','월','화','수','목','금','토'];
 return d.time.slice(0,7).map((day,i)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('예보 날짜 오류');
  const max=d.temperature_2m_max[i],min=d.temperature_2m_min[i],code=d.weather_code[i];
  if(![max,min,code].every(v=>typeof v==='number'&&Number.isFinite(v)))throw Error('예보 기온/날씨 누락');
  const prob=d.precipitation_probability_max?.[i];
  const dt=new Date(day+'T12:00:00+09:00');
  return {date:day,dayLabel:i===0?'오늘':weekdays[dt.getUTCDay()]+'요일',condition:weatherCodeLabel(code),max:Math.round(max),min:Math.round(min),precipitation:typeof prob==='number'&&Number.isFinite(prob)?Math.max(0,Math.min(100,Math.round(prob))):null};
 });
}

/** v8.5.4 — compact desktop weather trigger with an explicit detail sheet. */
export function installDesktopWeatherSheet(doc=document,win=window){
  const app=doc.getElementById('app'),widget=doc.getElementById('weather-widget');
  const label=doc.getElementById('weather-label'),title=doc.getElementById('weather-title');
  if(!app||!widget||!label||!win.matchMedia)return ()=>{};
  const media=win.matchMedia('(min-width: 0px)');
  let sheet=null,observer=null,dockObserver=null,sheetVisibilityObserver=null,attached=false,refreshing=false,weekController=null,weekCache=null,weekUpdated=0,weekCacheKey='';
  let weekPlace={latitude:37.4987,longitude:126.9494,name:'동작구'};
  const syncMapScale=()=>win.dispatchEvent?.(new Event('dongjak:weather-visibility-changed'));

  const temperature=text=>{
    const match=String(text||'').match(/-?\d+(?:\.\d+)?\s*(?:°|℃|도|C)?/);
    const number=match?.[0]?.match(/-?\d+(?:\.\d+)?/)?.[0];
    return number?`${Number(number)===0?'0':number}°`:'';
  };
  const iconFor=text=>{
    const value=String(text||'');
    if(/눈|강설/.test(value))return '❄';
    if(/비|소나기|강수/.test(value))return '☂';
    if(/맑음|쾌청/.test(value))return '☀';
    if(/흐림|구름/.test(value))return '☁';
    return /실패/.test(value)?'!':'☁';
  };
  const summary=()=>String(label.textContent||'').replace(/\s+/g,' ').replace(/-0(?=°|℃|도)/g,'0').trim();
  function sync(){
    const value=summary();
    label.dataset.djTemperature=label.dataset.djWeatherTemperature||temperature(value)||(/실패/.test(value)?'조회 실패':'조회 중');
    label.dataset.djWeatherIcon=iconFor(value);
    widget.setAttribute('aria-label',[title?.textContent,value].filter(Boolean).join(' · '));
    if(!sheet)return;
    const place=sheet.querySelector('.dj854-weather-place');
    const main=sheet.querySelector('.dj854-weather-main');
    const detail=sheet.querySelector('.dj854-weather-detail');
    if(place)place.textContent=title?.textContent?.trim()||'동작구';
    if(main){const paths={'☀':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>','☁':'<path d="M6 18a4 4 0 1 1 .5-8A6 6 0 0 1 18 11a3.5 3.5 0 0 1 0 7Z"/>','☂':'<path d="M5 13a7 7 0 0 1 14 0M12 13v6a2 2 0 0 0 4 0M4 16h16"/>','❄':'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3"/>','!':'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>'};const icon=doc.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.8');icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');icon.setAttribute('aria-hidden','true');icon.innerHTML=paths[iconFor(value)];const text=doc.createElement('span');text.textContent=value||'날씨 정보를 불러오는 중입니다.';main.replaceChildren(icon,text);delete main.dataset.weatherSymbol;}
    if(detail){const text=(label.getAttribute('title')||'상세 기상 정보가 제공되지 않았습니다.').replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})(?::\d{2})?/g,'$2.$3. $4 기준');const match=text.match(/(?:\s*·\s*|\s+)(\d{1,2}\.\d{1,2}\.\s*\d{2}:\d{2}\s*기준)\s*$/);detail.textContent=match?text.slice(0,match.index).trim():text;const stamp=sheet.querySelector('.dj-weather-observed');if(stamp){stamp.hidden=!match;stamp.textContent=match?.[1]||'';}}
  }
  const keyForPlace=place=>String(place.latitude)+','+String(place.longitude);
  function onWeatherPlaceChange(event){
    const {latitude,longitude,name}=event?.detail||{};
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return;
    const next={latitude,longitude,name:String(name||'내 위치').slice(0,40)};
    if(keyForPlace(next)===keyForPlace(weekPlace))return;
    weekPlace=next;weekController?.abort();weekCache=null;weekCacheKey='';weekUpdated=0;
    if(sheet&&!sheet.hidden)void loadWeek(true);
  }
  async function loadWeek(force=false){
    const target=sheet?.querySelector('.dj9274-weather-week');if(!target)return;
    const list=target.querySelector('ul'),status=target.querySelector('[role="status"]');
    const requestedPlace={...weekPlace},requestedKey=keyForPlace(requestedPlace);
    if(!force&&weekCache&&weekCacheKey===requestedKey&&Date.now()-weekUpdated<20*60*1000){renderWeek(weekCache);return;}
    weekController?.abort();const controller=new AbortController();weekController=controller;
    list.replaceChildren();status.hidden=false;status.textContent='7일 예보를 불러오는 중입니다.';
    try{
      const response=await win.fetch(weeklyWeatherUrl(requestedPlace.latitude,requestedPlace.longitude),{signal:controller.signal});
      if(!response.ok)throw Error('HTTP '+response.status);
      const rows=weeklyWeatherRows(await response.json());
      if(controller!==weekController||controller.signal.aborted||requestedKey!==keyForPlace(weekPlace))return;
      weekCache=rows;weekCacheKey=requestedKey;weekUpdated=Date.now();renderWeek(rows);
    }catch(error){
      if(controller.signal.aborted||controller!==weekController)return;
      list.replaceChildren();status.hidden=false;status.textContent='7일 예보를 불러오지 못했습니다. 다시 조회를 선택해 주세요.';
    }
  }
  function renderWeek(rows){
    const target=sheet?.querySelector('.dj9274-weather-week');if(!target)return;
    const list=target.querySelector('ul'),status=target.querySelector('[role="status"]');
    const source=target.querySelector('.dj9274-week-head small');if(source)source.textContent=weekPlace.name+' 기준 · Open-Meteo';
    const cards=rows.map(row=>{
      const li=doc.createElement('li');li.className='dj9274-weather-day';
      const day=doc.createElement('strong');day.textContent=row.dayLabel;
      const condition=doc.createElement('span');condition.className='dj9274-day-condition';condition.textContent=row.condition;
      const temp=doc.createElement('span');temp.className='dj9274-day-temp';temp.textContent=row.max+'° / '+row.min+'°';
      const rain=doc.createElement('small');rain.textContent=row.precipitation===null?'강수 미확인':'강수 '+row.precipitation+'%';
      li.append(day,condition,temp,rain);return li;
    });
    list.replaceChildren(...cards);status.hidden=true;status.textContent='';
  }
  function close(){if(!sheet||sheet.hidden)return;weekController?.abort();const target=sheet;const finish=()=>{target.hidden=true;syncMapScale();};if(win.DongjakWindowMotion)win.DongjakWindowMotion.close(target,finish);else finish();}
  // Use the ACTUAL shared bottom-tab bounding box. Hardcoded viewport / safe-
  // area offsets caused a large gap under weather on installed iPhone PWAs.
  function syncWeatherDock(){
    if(!sheet || sheet.hidden)return;
    if(!win.matchMedia?.('(max-width:699px)')?.matches){
      sheet.style.removeProperty('--dj-weather-panel-bottom');return;
    }
    const nav=doc.getElementById('bottom-nav');
    if(!nav || nav.hidden)return;
    const rect=nav.getBoundingClientRect();
    if(!Number.isFinite(rect.top)||rect.height<20)return;
    const bottom=Math.max(0,Math.ceil(win.innerHeight-rect.top+8));
    sheet.style.setProperty('--dj-weather-panel-bottom',bottom+'px');
  }
  function open(){if(!sheet)return;sync();win.DongjakWindowLifecycle?.requestOpen(sheet.id);sheet.hidden=false;syncMapScale();syncWeatherDock();win.DongjakWindowMotion?.open(sheet);win.requestAnimationFrame?.(syncWeatherDock);void loadWeek();const legacy=doc.getElementById('dj833-weather-sheet');if(legacy)legacy.hidden=true;}
  function ensureSheet(){
    if(sheet)return;
    sheet=doc.createElement('section');sheet.id='dj854-weather-sheet';sheet.hidden=true;
    sheet.dataset.djFixedSize='true'; // Weather is an information card, not an expandable bottom sheet.
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','현재 날씨');
    sheet.innerHTML=`<header class="dj854-weather-head"><h2>현재 날씨</h2><button type="button" class="dj854-weather-close" aria-label="날씨창 닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
      <p class="dj854-weather-place">동작구</p><strong class="dj854-weather-main">날씨 조회 중</strong>
      <p class="dj854-weather-detail">상세 기상 정보를 불러오는 중입니다.</p><p class="dj-weather-observed" hidden></p><section class="dj9274-weather-week" aria-label="동작구 7일 날씨 예보"><div class="dj9274-week-head"><h3>7일 예보</h3><small>동작구 기준 · Open-Meteo</small></div><ul></ul><p role="status">예보 준비 중</p></section>
      <div class="dj854-weather-actions"><button type="button" data-weather-refresh>날씨 다시 조회</button><button type="button" data-weather-location>내 위치 날씨</button></div>`;
    app.append(sheet);
    // Other window owners may hide this sheet directly. Reconcile the map HUD
    // for every hidden-state change, not only clicks on this close button.
    sheetVisibilityObserver=new MutationObserver(syncMapScale);
    sheetVisibilityObserver.observe(sheet,{attributes:true,attributeFilter:['hidden']});
    sheet.querySelector('.dj854-weather-close')?.addEventListener('click',close);
    sheet.querySelector('[data-weather-refresh]')?.addEventListener('click',()=>{
      refreshing=true;try{win.dispatchEvent(new Event('dongjak:weather-refresh'));void loadWeek(true);}finally{refreshing=false;}sync();
    });
    sheet.querySelector('[data-weather-location]')?.addEventListener('click',()=>{
      const location=doc.getElementById('weather-my-location');
      if(location){location.click();win.setTimeout(sync,150);}
    });
    sheet.addEventListener('click',event=>{if(event.target===sheet)close();});
  }
  function onLabelClick(event){
    if(!media.matches||refreshing)return;
    event.preventDefault();event.stopImmediatePropagation();open();
  }
  function attach(){
    if(attached||!media.matches)return;
    attached=true;ensureSheet();
    label.addEventListener('click',onLabelClick,true);
    observer=new MutationObserver(sync);
    observer.observe(label,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['title']});
    if(title)observer.observe(title,{childList:true,characterData:true,subtree:true});
    sync();
    win.addEventListener?.('dongjak:weather-place-change',onWeatherPlaceChange);
    win.addEventListener?.('resize',syncWeatherDock);
    win.visualViewport?.addEventListener?.('resize',syncWeatherDock);
    const nav=doc.getElementById('bottom-nav');
    if(nav && typeof ResizeObserver!=='undefined'){dockObserver=new ResizeObserver(syncWeatherDock);dockObserver.observe(nav);}
  }
  function detach(){
    if(!attached)return;
    attached=false;weekController?.abort();observer?.disconnect();observer=null;dockObserver?.disconnect();dockObserver=null;sheetVisibilityObserver?.disconnect();sheetVisibilityObserver=null;
    win.removeEventListener?.('dongjak:weather-place-change',onWeatherPlaceChange);
    win.removeEventListener?.('resize',syncWeatherDock);
    win.visualViewport?.removeEventListener?.('resize',syncWeatherDock);
    label.removeEventListener('click',onLabelClick,true);close();sheet?.remove();sheet=null;syncMapScale();
    delete label.dataset.djTemperature;delete label.dataset.djWeatherIcon;
    widget.removeAttribute('aria-label');
  }
  const onMedia=()=>media.matches?attach():detach();
  media.addEventListener?.('change',onMedia);onMedia();
  return ()=>{media.removeEventListener?.('change',onMedia);detach();};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installDesktopWeatherSheet(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
