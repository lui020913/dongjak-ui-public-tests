import {priOverlayAnchor,priCoveredByMapLayer} from './pri-map-layer-order.mjs';
const DATA_URL = '/data/sangdo1-analysis-view/bocha-mixed-roads.geojson';
const SOURCE_ID = 'sangdo1-bocha-road-source';
const CASING_LAYER_ID = 'sangdo1-bocha-road-casing';
const LINE_LAYER_ID = 'sangdo1-bocha-road-line';
const isCoordinate = p => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
const validLine = line => Array.isArray(line) && line.length >= 2 && line.every(isCoordinate);
function validLineCoordinates(g) {
  return g?.type === 'LineString' ? validLine(g.coordinates) : g?.type === 'MultiLineString' && Array.isArray(g.coordinates) && g.coordinates.length > 0 && g.coordinates.every(validLine);
}
export function normalizeBochaRoadGeoJSON(input) {
  if (input?.type !== 'FeatureCollection' || !Array.isArray(input.features)) throw new Error('보차혼용도로 자료가 올바른 GeoJSON FeatureCollection 형식이 아닙니다.');
  const features = input.features.filter(f => f?.type === 'Feature' && validLineCoordinates(f.geometry));
  if (!features.length) throw new Error('표시할 수 있는 보차혼용도로 선형이 없습니다.');
  return {...input, features};
}
export function summarizeBochaRoadGeoJSON(input) {
  const {features} = normalizeBochaRoadGeoJSON(input);
  const scoredCount = features.filter(f => f.properties?.score != null && f.properties.score !== '' && Number.isFinite(Number(f.properties.score))).length;
  return {featureCount:features.length, scoredCount, unscoredCount:features.length-scoredCount, approximateLengthM:Math.round(features.reduce((s,f)=>s+(Number(f.properties?.approx_length_m)||0),0)*10)/10};
}
function popupContent(p={}) {
  const root=document.createElement('section'); root.className='bocha-road-popup';
  const title=document.createElement('h3'); title.textContent='보차혼용도로·이면도로 표시 구간'; root.append(title);
  const dl=document.createElement('dl');
  for (const [label,value] of [['구간 ID',p.segment_id||'미부여'],['자료 출처','상도1동 팀 현황자료'],['평가 상태','미평가'],['평가 점수','미연동'],['좌표 정확도',p.position_accuracy||'PDF 지도 기반 좌표화(근사)'],['표시선 길이',p.approx_length_m!=null&&Number.isFinite(Number(p.approx_length_m))?'약 '+Math.round(Number(p.approx_length_m))+'m':'확인 불가']]) {
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);
  }
  root.append(dl);
  const note=document.createElement('p');note.className='bocha-road-popup__note';note.textContent='실제 상도1동 현황자료의 표시 구간을 지도 이미지 PDF에서 추출·좌표화한 데이터입니다. 도로 구간은 원자료에 근거하지만, 화면 선형의 정확한 위치는 PDF 지리참조 오차가 있을 수 있습니다. 법정 도로분류·보도 유효폭·위험등급·현장 실측값을 의미하지 않습니다.';root.append(note);
  const caution=document.createElement('p');caution.className='bocha-road-popup__caution';caution.textContent='보행 시 차량 접근과 실제 보행공간 분리 여부를 확인하며 이동하세요.';root.append(caution);
  return root;
}
// Opt-in source-data overlay only. Never changes routing or assigns risk scores.
export function installBochaRoadLayer({map,maplibregl,app}={}) {
  const button=document.getElementById('sangdo-bocha-toggle'), status=document.getElementById('sangdo-bocha-status');
  if (!map||!maplibregl||!button||button.dataset.bochaLayerReady==='true') return null;
  button.dataset.bochaLayerReady='true';
  let data=null, loadPromise=null, enabled=false, loading=false, destroyed=false, handlersReady=false, activePopup=null;
  const setStatus=message=>{if(status)status.textContent=message;};
  function setState(value) {
    enabled=Boolean(value);button.setAttribute('aria-pressed',enabled?'true':'false');
    button.closest('.dj-import-entry')?.classList.toggle('dj-layer-active',enabled);
    const state=button.querySelector('.dj-feature-state');if(state) state.textContent=enabled?'켜짐':'꺼짐';
    if(!enabled)activePopup?.remove?.();
  }
  function setVisibility(value) {
    for(const id of [CASING_LAYER_ID,LINE_LAYER_ID])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',value?'visible':'none');
  }
  function onLineClick(e) {
    if(!enabled||(app?.dataset?.tab&&app.dataset.tab!=='map')||!e.features?.length)return;
    if(['route-picking','route-preview','route-guiding','adding'].some(name=>app?.classList?.contains(name)))return;
    activePopup?.remove?.();
    activePopup=new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'320px'}).setLngLat(e.lngLat).setDOMContent(popupContent(e.features[0].properties||{})).addTo(map);
  }
  const onLineEnter=()=>{if(enabled)map.getCanvas().style.cursor='pointer';};
  const onLineLeave=()=>{map.getCanvas().style.cursor='';};
  function ensureLayers() {
    if(destroyed||!data||!Array.isArray(map.getStyle?.()?.layers))return false;
    if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data});
    const layers=map.getStyle()?.layers?.filter(l=>![CASING_LAYER_ID,LINE_LAYER_ID].includes(l.id));const anchor=priOverlayAnchor(layers);
    for(const def of [
      {id:CASING_LAYER_ID,type:'line',source:SOURCE_ID,minzoom:12.5,layout:{'line-cap':'round','line-join':'round',visibility:enabled?'visible':'none'},paint:{'line-color':'#f7f1e7','line-width':['interpolate',['linear'],['zoom'],12.5,4,17,7.2],'line-opacity':0.92}},
      {id:LINE_LAYER_ID,type:'line',source:SOURCE_ID,minzoom:12.5,layout:{'line-cap':'round','line-join':'round',visibility:enabled?'visible':'none'},paint:{'line-color':'#c98945','line-width':['interpolate',['linear'],['zoom'],12.5,2.1,17,4.1],'line-opacity':0.96,'line-dasharray':[1.5,1.1]}}
    ])if(!map.getLayer(def.id)){if(anchor)map.addLayer(def,anchor);else map.addLayer(def);}
    for(const id of [CASING_LAYER_ID,LINE_LAYER_ID])if(priCoveredByMapLayer(map.getStyle()?.layers,id))map.moveLayer(id,anchor);
    if(!handlersReady){map.on('click',LINE_LAYER_ID,onLineClick);map.on('mouseenter',LINE_LAYER_ID,onLineEnter);map.on('mouseleave',LINE_LAYER_ID,onLineLeave);handlersReady=true;}
    setVisibility(enabled);return true;
  }
  async function loadData() {
    if(data)return data;
    if(!loadPromise)loadPromise=fetch(DATA_URL).then(r=>{if(!r.ok)throw new Error('자료 파일을 불러오지 못했습니다(HTTP '+r.status+').');return r.json();}).then(normalizeBochaRoadGeoJSON).then(result=>(data=result)).catch(e=>{loadPromise=null;throw e;});
    return loadPromise;
  }
  async function waitForStyle() {
    if(Array.isArray(map.getStyle?.()?.layers))return;
    await new Promise((resolve,reject)=>{
      const onIdle=()=>{clearTimeout(timer);resolve();};
      const timer=setTimeout(()=>{map.off('idle',onIdle);reject(new Error('지도 준비시간 초과. 다시 시도하세요.'));},12000);
      map.once('idle',onIdle);
    });
    if(!Array.isArray(map.getStyle?.()?.layers))throw new Error('지도 스타일이 준비되지 않았습니다. 다시 시도하세요.');
  }
  const activeMessage=()=>data.features.length+'개 구간 표시 · 평가점수 미연동';
  function disable(){setState(false);setVisibility(false);setStatus('표시 꺼짐');}
  async function toggle() {
    if(destroyed||loading)return;
    if(enabled){disable();return;}
    loading=true;button.disabled=true;setStatus('보차혼용도로 현황자료 불러오는 중…');
    try{await loadData();await waitForStyle();if(destroyed)return;if(!ensureLayers())throw new Error('지도 레이어를 준비하지 못했습니다.');setState(true);setVisibility(true);setStatus(activeMessage());}
    catch(e){if(!destroyed){setState(false);setVisibility(false);setStatus(e?.message||'보차혼용도로 자료를 표시하지 못했습니다.');}}
    finally{loading=false;button.disabled=false;}
  }
  const onStyleLoad=()=>{if(destroyed||!data)return;try{if(ensureLayers())setStatus(enabled?activeMessage():'표시 꺼짐');}catch(e){setState(false);setVisibility(false);setStatus('레이어 복구 실패 · 다시 켜 주세요.');}};
  const onIdle=()=>{if(enabled&&(!map.getLayer(LINE_LAYER_ID)||!map.getLayer(CASING_LAYER_ID)||priCoveredByMapLayer(map.getStyle()?.layers,LINE_LAYER_ID)||priCoveredByMapLayer(map.getStyle()?.layers,CASING_LAYER_ID)))onStyleLoad();};
  button.addEventListener('click',toggle);map.on('style.load',onStyleLoad);map.on('idle',onIdle);
  setStatus('선택하면 상도1동 보차혼용도로·이면도로 현황자료를 표시합니다.');
  return {enable:async()=>{if(!enabled)await toggle();},disable:()=>{if(enabled)disable();},destroy:()=>{
    destroyed=true;button.removeEventListener('click',toggle);map.off('style.load',onStyleLoad);map.off('idle',onIdle);
    if(handlersReady){map.off('click',LINE_LAYER_ID,onLineClick);map.off('mouseenter',LINE_LAYER_ID,onLineEnter);map.off('mouseleave',LINE_LAYER_ID,onLineLeave);}
    disable();for(const id of [LINE_LAYER_ID,CASING_LAYER_ID])if(map.getLayer(id))map.removeLayer(id);
    if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);delete button.dataset.bochaLayerReady;
  }};
}
