/** v8.5.4 — compact desktop weather trigger with an explicit detail sheet. */
export function installDesktopWeatherSheet(doc=document,win=window){
  const app=doc.getElementById('app'),widget=doc.getElementById('weather-widget');
  const label=doc.getElementById('weather-label'),title=doc.getElementById('weather-title');
  if(!app||!widget||!label||!win.matchMedia)return ()=>{};
  const media=win.matchMedia('(min-width:700px)');
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
    if(main)main.textContent=value||'날씨 정보를 불러오는 중입니다.';
    if(detail)detail.textContent=label.getAttribute('title')||'상세 기상 정보가 제공되지 않았습니다.';
  }
  function close(){if(sheet)sheet.hidden=true;}
  function open(){if(!sheet)return;sync();sheet.hidden=false;}
  function ensureSheet(){
    if(sheet)return;
    sheet=doc.createElement('section');sheet.id='dj854-weather-sheet';sheet.hidden=true;
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','현재 날씨');
    sheet.innerHTML=`<header class="dj854-weather-head"><h2>현재 날씨</h2><button type="button" class="dj854-weather-close" aria-label="날씨창 닫기">×</button></header>
      <p class="dj854-weather-place">동작구</p><strong class="dj854-weather-main">날씨 조회 중</strong>
      <p class="dj854-weather-detail">상세 기상 정보를 불러오는 중입니다.</p>
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
