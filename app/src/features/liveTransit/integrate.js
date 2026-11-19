/** v8.2.7 integration with the EXISTING Dongjak MapLibre map and verified station geometry. */
import {railGeojson,stationsGeojson,FIXED_RAIL_STATION_ORDER} from '../../fixed-rail-data.js';
import {attachLiveTransitOverlay,LIVE_METRO_LAYER,LIVE_BUS_LAYER} from './index.js';
export const LIVE_PREF_KEY='dongjak_live_vehicle_options_v827';
export function buildDongjakMetroLines(){
  const lines={};
  // The published rail order is geographical, not a guaranteed API direction.
  // Direction is an approximation, never a GPS claim. The Sillim line is intentionally
  // omitted here because Seoul's official realtimePosition feed does not list it.
  const forwardUp={1:true,2:true,4:false,7:true,9:false};
  for(const [code,names] of Object.entries(FIXED_RAIL_STATION_ORDER)){
    if(!Object.prototype.hasOwnProperty.call(forwardUp,code))continue;
    const name=`${code}호선`;
    const line=railGeojson.features.find(f=>f.properties.line===code);
    if(!line?.geometry?.coordinates?.length)continue;
    const stations=names.map(station=>{
      const feature=stationsGeojson.features.find(f=>f.properties.line===code&&f.properties.name===`${station}역`);
      return feature?{name:station,lngLat:feature.geometry.coordinates}:null;
    });
    if(stations.some(x=>!x))continue;
    const upward=forwardUp[code]?stations:[...stations].reverse();
    lines[name]={up:upward,down:[...upward].reverse(),geometry:line.geometry,
      // Fixed segment time is a DISPLAY heuristic; never a published train location.
      segmentTimeSeconds:115};
  }
  return lines;
}
function safeText(el,value){el.textContent=String(value??'');}
function vehiclePopup(map,maplibregl,info){
  const root=document.createElement('div');root.className='dj-live-popup';
  const heading=document.createElement('strong');
  safeText(heading,info.mode==='metro'?`${info.line||'지하철'} · ${info.vehicleLabel||'열차'}호`:
    `${info.name||'버스'} · 운행 차량`);
  const desc=document.createElement('p');
  safeText(desc,info.mode==='metro'?
    `${info.station||'확인된 역'} 기준 · ${info.destination?info.destination+'행 · ':''}${info.accuracyText||'역간 위치 추정'}`:
    info.accuracyText||'버스 위치정보 API 좌표');
  const stamp=document.createElement('small');
  const date=new Date(info.observedAt);
  safeText(stamp,Number.isFinite(date.getTime())?`수신 기준 ${date.toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'})} · ${info.mode==='metro'?'정확한 GPS 위치 아님':'위치 갱신 지연 가능'}`:'수신 시각 미확인');
  root.append(heading,desc,stamp);
  new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'290px',offset:16})
    .setLngLat(info.coordinates).setDOMContent(root).addTo(map);
}
export function installDongjakLiveTransit({map,maplibregl,app,isDongjak}){
  const controls=document.getElementById('dj-live-vehicle-controls');
  if(!controls)return null;
  const btnMetro=controls.querySelector('[data-live-vehicle="metro"]');
  const btnBus=controls.querySelector('[data-live-vehicle="bus"]');
  const message=controls.querySelector('#dj-live-vehicle-status');
  let saved={metro:false,bus:false};
  try{const v=JSON.parse(localStorage.getItem(LIVE_PREF_KEY)||'null');
    for(const mode of ['metro','bus'])if(typeof v?.[mode]==='boolean')saved[mode]=v[mode];
  }catch{}
  const state={...saved};
  const setStatus=value=>safeText(message,value);
  const overlay=attachLiveTransitOverlay(map,{
    stationLines:buildDongjakMetroLines(),minZoom:13.2,intervalMs:25000,renderIntervalMs:260,
    withinDistrict:([lng,lat])=>isDongjak(lng,lat)===true,
    onVehicleClick:info=>vehiclePopup(map,maplibregl,info),
    onStatus:info=>{
      if(info.status==='ok'){
        const line=[];
        if(state.metro)line.push(`지하철 ${info.metro}대`);
        if(state.bus)line.push(`버스 ${info.bus}대`);
        const warnings=(info.warnings||[]).length;
        setStatus(`${line.join(' · ')||'차량 없음'} · 역간 이동은 추정${warnings?' · 일부 API 제한':''}`);
        if(state.bus&&!info.availability?.bus)setStatus('버스 위치 API 키가 등록되지 않았습니다. · 지하철 위치는 추정');
        else if(state.bus&&info.availability?.bus&&info.availability.busRoutes===0)
          setStatus('버스 노선 조회 불가 · API 인증/노선 설정 확인');
      }else if(info.status==='error')setStatus(`위치정보 조회 실패: ${info.error||'API 상태 확인 필요'}`);
      else if(info.status==='render_error')setStatus('지도 차량 레이어 렌더링 오류');
    }
  });
  function sync(){
    const isMap=app.dataset.tab==='map';
    const active=isMap&&(state.metro||state.bus);
    const allowMetro=state.metro&&app.dataset.baseMetro!=='off';
    const allowBus=state.bus&&app.dataset.baseBus!=='off';
    btnMetro?.setAttribute('aria-pressed',String(state.metro));
    btnBus?.setAttribute('aria-pressed',String(state.bus));
    overlay.setVisible('metro',allowMetro);
    overlay.setVisible('bus',allowBus);
    if(active&&(allowMetro||allowBus))overlay.start();else overlay.stop();
    if(!state.metro&&!state.bus)setStatus('기본 OFF · 켜면 약 25초마다 공식 API 조회');
    else if(!isMap)setStatus('안전지도 탭에서 차량 위치를 조회합니다.');
    else if(!allowMetro&&!allowBus)setStatus('기본 지도·교통 레이어가 숨겨져 있습니다.');
    else if(!overlay.getStatus().lastUpdate)setStatus('실시간 위치정보 조회 중 · 역간 위치는 추정');
  }
  for(const [button,mode] of [[btnMetro,'metro'],[btnBus,'bus']])button?.addEventListener('click',()=>{
    state[mode]=!state[mode];
    try{localStorage.setItem(LIVE_PREF_KEY,JSON.stringify(state));}catch{}
    sync();
  });
  const observer=new MutationObserver(sync);
  observer.observe(app,{attributes:true,attributeFilter:['data-tab']});
  const onBase=()=>sync();document.addEventListener('dongjak-base-layer-change',onBase);
  sync();
  return {overlay,sync,destroy:()=>{observer.disconnect();document.removeEventListener('dongjak-base-layer-change',onBase);overlay.destroy();}};
}
