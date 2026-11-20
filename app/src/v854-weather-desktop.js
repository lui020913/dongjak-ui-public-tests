/** v8.5.4 — compact desktop weather trigger with an explicit detail sheet. */
export function installDesktopWeatherSheet(doc=document,win=window){
  const app=doc.getElementById('app'),widget=doc.getElementById('weather-widget');
  const label=doc.getElementById('weather-label'),title=doc.getElementById('weather-title');
  if(!app||!widget||!label||!win.matchMedia)return ()=>{};
  const media=win.matchMedia('(min-width: 0px)');
  let sheet=null,observer=null,attached=false,refreshing=false;
  const temperature=text=>{
    const match=String(text||'').match(/-?\d+(?:\.\d+)?\s*(?:°|℃|도|C)?/);
    const number=match?.[0]?.match(/-?\d+(?:\.\d+)?/)?.[0];
    return number?`${number}°`:'';
  };
  const iconFor=text=>{
    const value=String(text||'');
    if(/눈|강설/.test(value))return '❄';
    if(/비|소나기|강수/.test(value))return '☂';
    if(/맑음|쾌청/.test(value))return '☀';
    if(/흐림|구름/.test(value))return '☁';
    return /실패/.test(value)?'!':'☁';
  };
  const summary=()=>String(label.textContent||'').replace(/\s+/g,' ').trim();
  function sync(){
    const value=summary();
    label.dataset.djTemperature=temperature(value)||(/실패/.test(value)?'조회 실패':'조회 중');
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
  function close(){if(!sheet||sheet.hidden)return;const target=sheet;const finish=()=>{target.hidden=true;};if(win.DongjakWindowMotion)win.DongjakWindowMotion.close(target,finish);else finish();}
  function open(){if(!sheet)return;sync();win.DongjakWindowLifecycle?.requestOpen(sheet.id);sheet.hidden=false;win.DongjakWindowMotion?.open(sheet);const legacy=doc.getElementById('dj833-weather-sheet');if(legacy)legacy.hidden=true;}
  function ensureSheet(){
    if(sheet)return;
    sheet=doc.createElement('section');sheet.id='dj854-weather-sheet';sheet.hidden=true;
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','현재 날씨');
    sheet.innerHTML=`<header class="dj854-weather-head"><span class="dj-weather-edge-drag" aria-hidden="true"></span><h2>현재 날씨</h2><button type="button" class="dj854-weather-close" aria-label="날씨창 닫기">×</button></header>
      <p class="dj854-weather-place">동작구</p><strong class="dj854-weather-main">날씨 조회 중</strong>
      <p class="dj854-weather-detail">상세 기상 정보를 불러오는 중입니다.</p><p class="dj-weather-observed" hidden></p>
      <div class="dj854-weather-actions"><button type="button" data-weather-refresh>날씨 다시 조회</button><button type="button" data-weather-location>내 위치 날씨</button></div>`;
    app.append(sheet);
    sheet.querySelector('.dj854-weather-close')?.addEventListener('click',close);
    sheet.querySelector('[data-weather-refresh]')?.addEventListener('click',()=>{
      refreshing=true;try{win.dispatchEvent(new Event('dongjak:weather-refresh'));}finally{refreshing=false;}sync();
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
  }
  function detach(){
    if(!attached)return;
    attached=false;observer?.disconnect();observer=null;
    label.removeEventListener('click',onLabelClick,true);close();sheet?.remove();sheet=null;
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
