import {fetchCurrentWeather} from './ui-environment.js';
/** Informational weather context, not an official weather alert or route risk score. */
export function pedestrianWeatherAdvice(data){
  const t=Number(data?.temperature), felt=Number(data?.apparentTemperature);
  const rain=Number(data?.precipitation),wind=Number(data?.wind);
  if(![t,felt,rain,wind].every(Number.isFinite))return {level:'unknown',title:'측정값 확인 필요',items:['날씨 자료가 완전하지 않습니다.'],reason:'측정값 일부 없음'};
  const items=[];
  if(rain>=1)items.push('강수 관측: 미끄러짐·시야 저하에 주의하세요.');
  else if(rain>0)items.push('약한 강수가 관측됩니다. 보행면 상태를 확인하세요.');
  if(felt>=33)items.push('높은 체감기온: 그늘과 휴식 장소를 확인하세요.');
  if(felt<=-5)items.push('낮은 체감기온: 결빙과 한랭 노출에 주의하세요.');
  if(wind>=35)items.push('강한 바람: 낙하물과 보행 균형에 주의하세요.');
  if(!items.length)items.push('추가 날씨 주의 조건이 감지되지 않았습니다. 실제 보행환경은 현장에서 확인하세요.');
  return {level:items.length>1||rain>=1||felt>=33||felt<=-5?'caution':'normal',
    title:rain>=1?'강수 보행 주의':felt>=33?'폭염 관련 주의':felt<=-5?'한랭 관련 주의':wind>=35?'강풍 관련 주의':'기상 보행정보',
    items,reason:'관측 기반 참고 조건 · 공식 기상특보/안전등급 아님'};
}
export function initWeatherSafety(doc=document,win=window){
  const target=doc.getElementById('dj804-weather-safety');if(!target)return ()=>{};
  const toggle=target.querySelector('#dj804-weather-toggle');const status=target.querySelector('#dj804-weather-status');const detail=target.querySelector('#dj804-weather-detail');
  const refresh=target.querySelector('#dj804-weather-refresh');const sensors=target.querySelector('#dj804-weather-sensors');
  let active=false,controller=null,lastFetchAt=0, timer=null,closed=false;
  const position={latitude:37.4987,longitude:126.9494};
  const format=(num,digits=0)=>Number.isFinite(num)?Number(num).toFixed(digits):'미확인';
  const load=async({force=false}={})=>{
    if(!active||closed)return;
    if(!force&&Date.now()-lastFetchAt<14*60000)return;
    controller?.abort();controller=new AbortController();refresh.disabled=true;status.textContent='동작구 현재 기상정보 조회 중…';
    try{
      const w=await fetchCurrentWeather({...position,signal:controller.signal});
      if(closed||!active)return;
      const when=w.time?new Date(w.time+'+09:00'):null;
      const stale=!when||isNaN(+when)||Math.abs(Date.now()-Number(when))>2*3600*1000;
      const advice=pedestrianWeatherAdvice(w);lastFetchAt=Date.now();
      status.textContent=`${format(w.temperature)}° · 체감 ${format(w.apparentTemperature)}° · ${w.weather} · ${w.time||'관측시각 미확인'}${stale?' · 시각 지연/미확인':''}`;
      const items=advice.items.map(item=>{const li=doc.createElement('li');li.textContent=item;return li;});
      const box=doc.createElement('div');box.className='dj804-weather-advice';
      const heading=doc.createElement('strong');heading.textContent=stale?'현재 정보로 판단 보류':advice.title;
      box.append(heading);
      if(!stale){const ul=doc.createElement('ul');ul.append(...items);box.append(ul);}
      else{const p=doc.createElement('p');p.textContent='관측시각이 충분히 최신인지 확인되지 않아 주의정보를 표시하지 않습니다.';box.append(p);}
      const foot=doc.createElement('small');foot.textContent=`강수 ${format(w.precipitation,1)}mm · 풍속 ${format(w.wind)}km/h · Open-Meteo 동작구 대표 좌표 · 공식 특보 아님`;box.append(foot);
      detail.replaceChildren(box);
      target.dataset.weatherLevel=stale?'unknown':advice.level;
    }catch(error){if(error?.name==='AbortError')return;status.textContent='실시간 날씨 조회 실패 · 연결 확인';detail.textContent='마지막 관측값을 현재 정보처럼 재사용하지 않습니다.';target.dataset.weatherLevel='unknown';}
    finally{refresh.disabled=false;}
  };
  const change=()=>{
    active=!active;toggle.setAttribute('aria-pressed',String(active));toggle.textContent=active?'날씨 보행정보 끄기':'날씨 보행정보 켜기';
    detail.hidden=!active;refresh.hidden=!active;sensors.hidden=!active;
    if(active){lastFetchAt=0;void load({force:true});timer=win.setInterval(()=>{if(!doc.hidden)void load();},5*60000);}
    else{controller?.abort();win.clearInterval(timer);timer=null;status.textContent='표시 꺼짐';target.dataset.weatherLevel='idle';}
  };
  const showSensors=()=>{
    const el=doc.querySelector('[data-dj-import="sdot-environment"]');
    if(!el){status.textContent='환경센서 레이어를 찾을 수 없습니다.';return;}
    el.click();status.textContent='S-DoT 관측 레이어 전환 요청됨 · 센서 위치와 관측시각을 확인하세요.';
  };
  const onRefresh=()=>{lastFetchAt=0;void load({force:true});};
  toggle.addEventListener('click',change);refresh.addEventListener('click',onRefresh);sensors.addEventListener('click',showSensors);
  return ()=>{closed=true;controller?.abort();win.clearInterval(timer);toggle.removeEventListener('click',change);refresh.removeEventListener('click',onRefresh);sensors.removeEventListener('click',showSensors);};
}
