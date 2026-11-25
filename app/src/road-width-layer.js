import {createDataLayerFader} from './map-layer-fade-v815.js';
import {claimRoadLayer,announcePilotLayer} from './pilot-layer-selection.js';
/**
 * 동작구 실폭도로 기반 대표 도로폭 시각화 (2026-10).
 * 실제 측량이 아닌 폴리곤 형상 기반 추정치. 안전등급 아님.
 * 상도1동 시범구역에 한정된 표시 자료를 사용한다.
 */
const SOURCE_ID = 'dongjak-roadwidth-source';
const FILL_ID = 'dongjak-roadwidth-fill';
const OUTLINE_ID = 'dongjak-roadwidth-outline';
const ROAD_DATA = '/data/sangdo1-analysis-view/roadwidth.geojson'; // Original Dongjak-wide file retained in /data

export function widthPresentation(properties = {}) {
  const width = Number(properties.width_est_m);
  const isValid = properties.width_est_m !== null && properties.width_est_m !== undefined && properties.width_est_m !== '' && Number.isFinite(width) && width > 0;
  const category = !isValid ? '미판정' : width < 4 ? '4m 미만' : width < 8 ? '4~8m 미만' : '8m 이상';
  return {width: isValid ? width : null, category, reliability: String(properties.reliability || '미확인')};
}

function addText(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}

function popupContent(properties = {}) {
  const info = widthPresentation(properties);
  const panel = document.createElement('div');
  panel.className = 'roadwidth-popup';
  addText(panel, 'strong', '실폭도로 도로폭 추정');
  addText(panel, 'div', info.width === null ? '추정 불가' : `${info.width.toFixed(1)} m`, 'roadwidth-value');
  addText(panel, 'div', `폭원 분류: ${info.category}`);
  addText(panel, 'div', `검토 상태: ${info.reliability}`);
  const p10 = Number(properties.width_p10_m), p90 = Number(properties.width_p90_m);
  if (properties.width_p10_m != null && properties.width_p90_m != null && Number.isFinite(p10) && Number.isFinite(p90)) {
    addText(panel, 'div', `폭원 분포(10~90백분위): ${p10.toFixed(1)}~${p90.toFixed(1)} m`);
  }
  addText(panel, 'small', '2026년 10월 서울시 실폭도로의 공간자료 기반 추정치로, 측량값이나 보행안전등급이 아닙니다. 교차로·좁은 연결부는 현장 확인이 필요합니다.');
  return panel;
}

export function installRoadWidthLayer({map, maplibregl, app, canOpen = () => true, onError = () => {}}) {
  const toggle = document.getElementById('toggle-road-width');
  const legend = document.getElementById('road-width-legend');
  if (!toggle || !legend) return;
  const visibility = 'none';
  try {
    map.addSource(SOURCE_ID, {type: 'geojson', data: ROAD_DATA});
    const firstLabel = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id;
    const isReliable = ['in', ['get','reliability'], ['literal',['상대적 양호(추정치)','보통(추정치)']]];
    map.addLayer({
      id: FILL_ID, type: 'fill', source: SOURCE_ID,
      layout: {visibility},
      paint: {
        'fill-color': ['match', ['get','width_class'], '4m 미만', '#D94B45', '4~8m 미만', '#F2A23A', '8m 이상', '#299D78', '#94A3B8'],
        'fill-opacity': ['case', isReliable, 0.56, 0.28],
        'fill-antialias': true
      }
    }, firstLabel);
    map.addLayer({id: OUTLINE_ID, type:'line', source: SOURCE_ID, layout:{visibility}, paint:{'line-color':'#6d7874','line-opacity':0.21,'line-width':0.45}}, firstLabel);
  } catch(error) {
    console.error('[roadwidth] 지도 레이어 생성 실패',error);
    toggle.disabled = true;
    onError();
    return;
  }
  const layerFader=createDataLayerFader(map);
  let shown = false,roadLease=null;
  let activePopup = null;
  const setShown=next=>{
    const changed=shown!==Boolean(next);
    if(next)roadLease=claimRoadLayer('width',()=>setShown(false));else{roadLease?.release();roadLease=null;activePopup?.remove();activePopup=null;}
    shown=Boolean(next);
    toggle.setAttribute('aria-pressed',String(shown));
    toggle.title=shown?'도로폭 표시 끄기':'추정 도로폭 보기';
    legend.hidden=!shown;
    app?.classList?.toggle?.('dj-road-width-open',shown);
    for(const id of [FILL_ID,OUTLINE_ID])if(map.getLayer(id))layerFader.apply(id,shown);
    if(shown&&changed)announcePilotLayer('width');
  };
  toggle.addEventListener('click', () => {
    // The final responsive stylesheet docks this summary with all other
    // floating panels. Do not force a position from the button's old coords.
    for(const property of ['top','right','bottom','left','transform'])
      legend.style?.removeProperty?.(property);
    setShown(!shown);
  });
  map.on('click', FILL_ID, (event) => {
    if (!shown || !canOpen()) return;
    try {
      if (map.getLayer('registered-points-click') && map.queryRenderedFeatures(event.point,{layers:['registered-points-click']}).length) return;
      const feature = event.features?.[0];
      if(!feature) return;
      activePopup?.remove();
      activePopup = new maplibregl.Popup({closeButton:true, maxWidth:'280px'})
        .setLngLat(event.lngLat)
        .setDOMContent(popupContent(feature.properties))
        .addTo(map);
    } catch(error) { console.warn('[roadwidth] 상세정보 팝업 오류',error); }
  });
  document.getElementById('road-width-legend-close')?.addEventListener('click',()=>setShown(false));
  map.on('mouseenter', FILL_ID, () => { if(shown && canOpen()) map.getCanvas().style.cursor='pointer'; });
  map.on('mouseleave', FILL_ID, () => { map.getCanvas().style.cursor=''; });
}
