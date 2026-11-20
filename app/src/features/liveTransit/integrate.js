import {METRO_QUOTA_NOTICE} from './quota-state.js';
/** v8.2.7 integration with the EXISTING Dongjak MapLibre map and verified station geometry. */
import {railGeojson,stationsGeojson,FIXED_RAIL_STATION_ORDER} from '../../fixed-rail-data.js';
import {attachLiveTransitOverlay,LIVE_METRO_LAYER,LIVE_BUS_LAYER} from './index.js';
import {railDirectionLabel} from './train-lanes.js';
export const LIVE_PREF_KEY='dongjak_live_vehicle_options_v827';
export function buildDongjakMetroLines(){
  const lines={};
  // The published rail order is geographical, not a guaranteed API direction.
  // Direction is an approximation, never a GPS claim. The Sillim line is intentionally
  // omitted here because Seoul's official realtimePosition feed does not list it.
  // 2호선 local order 대림→방배 is outer; inner travels 방배→대림.
  const forwardUp={1:true,2:false,4:false,7:true,9:false};
  const terminalDirections={7:{석남:'down',온수:'down',부평구청:'down',장암:'up',도봉산:'up'},9:{중앙보훈병원:'down',개화:'up',김포공항:'up'}};
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
    lines[name]={up:upward,down:[...upward].reverse(),geometry:line.geometry,terminalDirections:terminalDirections[code]||{},
      // Fixed segment time is a DISPLAY heuristic; never a published train location.
      segmentTimeSeconds:115};
  }
  return lines;
}
function safeText(el,value){el.textContent=String(value??'');}
const textNode=(doc,tag,cls,text='')=>{const n=doc.createElement(tag);if(cls)n.className=cls;safeText(n,text);return n;};
const stationLabel=s=>s?(String(s).endsWith('역')?String(s):String(s)+'역'):'확인 중';
const destinationLabel=s=>s?(String(s).endsWith('행')?String(s):String(s)+'행'):'미제공';
export function createVehiclePopupTracker(map,maplibregl,doc=globalThis.document){
  let active=null;
  const stopFollowing=e=>{if(e?.originalEvent&&active){active.follow=false;}};
  for(const event of ['dragstart','zoomstart','rotatestart','pitchstart'])map.on?.(event,stopFollowing);
  const close=()=>{const item=active;active=null;item?.popup.remove();};
  const labelStatus={0:'역 진입',1:'역 도착',2:'역 출발',3:'전역 출발'};
  function open(info){
    close();
    if(!info||!Array.isArray(info.coordinates))return;
    const metro=info.mode==='metro';
    if(!metro){
      // Keep the bus card's original presentation and map-click close semantics.
      const root=textNode(doc,'div','dj-live-popup');
      root.append(textNode(doc,'strong','',`${info.name||'버스'} · 운행 차량`),textNode(doc,'p','',info.accuracyText||'버스 위치정보 API 좌표'));
      const date=new Date(info.observedAt||info.receivedAt);root.append(textNode(doc,'small','',Number.isFinite(date.getTime())?`${info.observedAt?'측정':'수신'} 기준 ${date.toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'})} · 위치 갱신 지연 가능`:'수신 시각 미확인'));
      const popup=new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'290px',offset:16}).setLngLat(info.coordinates).setDOMContent(root).addTo(map);
      active={popup,id:info.id,mode:info.mode};popup.on?.('close',()=>{if(active?.popup===popup)active=null;});return;
    }
    const root=textNode(doc,'div','dj-live-popup dj-live-train-card');
    const head=textNode(doc,'div','dj-live-train-head');
    const badge=textNode(doc,'span','dj-live-train-badge');
    const heading=textNode(doc,'strong','dj-live-train-title');head.append(badge,heading);
    const body=textNode(doc,'dl','dj-live-train-details');const values={};
    for(const [key,label] of [['destination','행선지'],['station','기준역'],['state','운행 상태'],['next','이동 방향']]){
      const row=textNode(doc,'div','dj-live-train-row');const dt=textNode(doc,'dt','',label),dd=textNode(doc,'dd','');row.append(dt,dd);body.append(row);values[key]=dd;
    }
    const foot=textNode(doc,'div','dj-live-train-foot');const stamp=textNode(doc,'span','dj-live-train-time'),notice=textNode(doc,'span','dj-live-train-note','역 정보 기반 추정 · GPS 아님');foot.append(stamp,notice);
    root.append(head,body,foot);
    const update=data=>{
      safeText(badge,data.line||'지하철');badge.style.backgroundColor=/^#[0-9a-f]{6}$/i.test(data.color||'')?data.color:'#526d64';
      // White on dark badge colors; dark on the gold/bright cyan lines.
      badge.style.color=['4호선','9호선','신림선'].includes(data.line)?'#112421':'#fff';
      const number=String(data.vehicleLabel||'').replace(/호$/,'');safeText(heading,number?number+'호 열차':'열차 번호 미제공');
      safeText(notice,data.positionSource==='arrival'?'실시간 도착정보 기반 추정 · GPS 아님':'역 정보 기반 추정 · GPS 아님');
      safeText(values.destination,destinationLabel(data.destination));safeText(values.station,stationLabel(data.station));
      safeText(values.state,labelStatus[data.status]||'상태 미확인');
      const direction=railDirectionLabel(data.line,data.travelDirection);
      const next=data.nextStation&&stationLabel(data.nextStation)!==stationLabel(data.station)?stationLabel(data.nextStation)+' 방면':'';
      safeText(values.next,[direction,next].filter(Boolean).join(' · ')||'미확인');
      values.next.parentElement.hidden=false;
      const date=new Date(data.observedAt);safeText(stamp,Number.isFinite(date.getTime())?'수신 '+date.toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}):'수신 시각 미확인');
    };
    update(info);
    const popup=new maplibregl.Popup({className:'dj-live-vehicle-popup',closeButton:true,closeOnClick:false,maxWidth:'min(286px, calc(100vw - 36px))',offset:12})
      .setLngLat(info.coordinates).setDOMContent(root).addTo(map);
    active={popup,id:info.id,mode:info.mode,root,update,lastPosition:info.coordinates.join(','),lastText:null,follow:true};
    map.stop?.();map.jumpTo?.({center:info.coordinates});
    popup.on?.('close',()=>{if(active?.popup===popup)active=null;});
  }
  function render(collection){
    const item=active;if(!item)return;
    if(item.popup.isOpen?.()===false||item.root?.isConnected===false){close();return;}
    const f=(collection?.features||[]).find(x=>x.properties.id===item.id&&x.properties.mode===item.mode);
    if(!f){close();return;}
    if(item.mode!=='metro')return;
    const coord=f.geometry.coordinates,key=coord.join(',');
    if(key!==item.lastPosition){item.popup.setLngLat(coord);if(item.follow)map.jumpTo?.({center:coord});item.lastPosition=key;map.fire?.('dongjak:live-vehicle-popup-move');}
    const p=f.properties,text=JSON.stringify([p.line,p.color,p.vehicleLabel,p.destination,p.station,p.status,p.travelDirection,p.nextStation,p.observedAt]);
    if(text!==item.lastText){item.update(p);item.lastText=text;}
  }
  return {open,render,close,destroy(){close();for(const event of ['dragstart','zoomstart','rotatestart','pitchstart'])map.off?.(event,stopFollowing);}};
}
const installedLiveTransit=new WeakMap();
export function installDongjakLiveTransit({map,maplibregl,app,isDongjak,onNotice=()=>{}}){
  if(installedLiveTransit.has(map))return installedLiveTransit.get(map);
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
  let quotaNotified=false;
  function showQuota(until,announce=true){const active=state.metro&&until>Date.now();if(btnMetro){if(active)btnMetro.dataset.liveQuota='true';else delete btnMetro.dataset.liveQuota;}if(active){if(announce&&!quotaNotified){quotaNotified=true;onNotice(METRO_QUOTA_NOTICE);}return true;}quotaNotified=false;return false;}
  const popupTracker=createVehiclePopupTracker(map,maplibregl);
  const overlay=attachLiveTransitOverlay(map,{
    stationLines:buildDongjakMetroLines(),minZoom:13.2,metroMinZoom:11,intervalMs:60000,maxAgeMs:180000,renderIntervalMs:8,
    withinDistrict:([lng,lat])=>isDongjak(lng,lat)===true,
    onVehicleClick:info=>popupTracker.open(info),
    onVehiclesRendered:collection=>popupTracker.render(collection),
    onVehicleMiss:()=>popupTracker.close(),
    onStatus:info=>{
      const limited=showQuota(info.quotaUntil||overlay.getStatus().metroQuotaUntil);
      if(limited){setStatus(METRO_QUOTA_NOTICE+(state.bus&&info.status==='ok'?` · 버스 ${info.bus}대`:state.bus&&info.status==='error'?' · 버스 위치 조회 실패':''));return;}
      if(info.status==='ok'){
        const line=[];
        if(state.metro)line.push(`지하철 ${info.metro}대`);
        if(state.bus)line.push(`버스 ${info.bus}대`);
        const warnings=(info.warnings||[]).length;
        setStatus(`${line.join(' · ')||'차량 없음'} · 역간 이동은 추정${warnings?' · 일부 API 제한':''}`);
        if(state.bus&&!info.availability?.bus)setStatus('버스 위치 API 키가 등록되지 않았습니다. · 지하철 위치는 추정');
        else if(state.bus&&info.availability?.bus&&info.availability.busRoutes===0)
          setStatus('버스 노선 조회 불가 · API 인증/노선 설정 확인');
        else if(state.bus&&!info.bus)setStatus('현재 동작구 내 수신된 버스 좌표 없음 · 위치 API 및 노선 확인');
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
    if(!state.metro&&!state.bus)setStatus('기본 OFF · 켜면 약 60초마다 공식 API 조회');
    else if(!isMap)setStatus('안전지도 탭에서 차량 위치를 조회합니다.');
    else if(!allowMetro&&!allowBus)setStatus('기본 지도·교통 레이어가 숨겨져 있습니다.');
    else if(showQuota(overlay.getStatus().metroQuotaUntil))setStatus(METRO_QUOTA_NOTICE);
    else if(!overlay.getStatus().lastUpdate)setStatus('실시간 위치정보 조회 중 · 역간 위치는 추정');
    if(!state.metro)showQuota(0,false);
  }
  for(const [button,mode] of [[btnMetro,'metro'],[btnBus,'bus']])button?.addEventListener('click',()=>{
    state[mode]=!state[mode];
    try{localStorage.setItem(LIVE_PREF_KEY,JSON.stringify(state));}catch{}
    sync();void overlay.refresh();
  });
  const observer=new MutationObserver(sync);
  observer.observe(app,{attributes:true,attributeFilter:['data-tab']});
  const onBase=()=>sync();document.addEventListener('dongjak-base-layer-change',onBase);
  sync();
  const handle={overlay,sync,destroy:()=>{observer.disconnect();document.removeEventListener('dongjak-base-layer-change',onBase);popupTracker.destroy();overlay.destroy();installedLiveTransit.delete(map);}};
  installedLiveTransit.set(map,handle);return handle;
}
