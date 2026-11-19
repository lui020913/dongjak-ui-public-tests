/**
 * 동작(動作)하는 안전지도 - 지도 정보 밀도 / UI / 노량진역 위치 보정 모듈
 * MapLibre GL JS 3.x~5.x 스타일 지도에 연결하는 독립 모듈.
 * 이 파일은 기존 코드베이스를 확인하지 못한 상태에서 작성한 통합용 패치입니다.
 */
export const NORYANGJIN_REFERENCE = {
  type: 'FeatureCollection',
  features: [
    // 1호선 역위치 자료에서 보고된 대략적인 위치. 실제 선로 공간정보와의 일치 여부 검토 필요.
    { type: 'Feature', geometry: { type: 'Point', coordinates: [126.942454, 37.514219] }, properties: { name: '노량진', line: '1', kind: 'station', reference: 'https://yeahyejiee.github.io/geopandas/geopandas-%EB%B6%84%EC%84%9D-%282%29-%EC%A2%8C%ED%91%9C%EB%B3%80%ED%99%98/' } },
    // 9호선 역사 도로명주소 기준 위치. 승강장 중심점과는 다를 수 있음.
    { type: 'Feature', geometry: { type: 'Point', coordinates: [126.94042663878, 37.513367049759] }, properties: { name: '노량진', line: '9', kind: 'station', reference: 'https://jusoga.com/b/1159010100100240001000001/' } },
  ],
};

const ID = {
  bus: 'dj-20261106-bus-stops',
  busDot: 'dj-20261106-bus-stops-points',
  busText: 'dj-20261106-bus-stops-labels',
  building: 'dj-20261106-buildings',
  buildingText: 'dj-20261106-buildings-labels',
  station: 'dj-20261106-stations',
  stationDot: 'dj-20261106-stations-points',
  stationBadge: 'dj-20261106-stations-badges',
  stationText: 'dj-20261106-stations-name',
};

const emptyFC = () => ({ type: 'FeatureCollection', features: [] });
const isFiniteCoord = c => Array.isArray(c) && c.length >= 2 && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])) && Math.abs(Number(c[0])) <= 180 && Math.abs(Number(c[1])) <= 90;
const str = v => v == null ? '' : String(v).trim();
const first = (p, keys) => keys.map(k => str(p?.[k])).find(Boolean) || '';
function toCollection(data) {
  if (!data) return emptyFC();
  if (Array.isArray(data)) return { type: 'FeatureCollection', features: data.map(toFeature).filter(Boolean) };
  if (data.type === 'FeatureCollection') return { type: 'FeatureCollection', features: (data.features || []).filter(f => f?.type === 'Feature' && f.geometry) };
  if (data.type === 'Feature') return { type: 'FeatureCollection', features: [data] };
  return emptyFC();
}
function toFeature(entry) {
  if (entry?.type === 'Feature') return entry;
  const lon = Number(entry?.lng ?? entry?.lon ?? entry?.longitude ?? entry?.x ?? entry?.crdntX ?? entry?.gpsX);
  const lat = Number(entry?.lat ?? entry?.latitude ?? entry?.y ?? entry?.crdntY ?? entry?.gpsY);
  if (!isFiniteCoord([lon, lat])) return null;
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { ...entry } };
}
function normalizeBusStops(data) {
  const seen = new Set();
  const features = toCollection(data).features.map(f => {
    if (f.geometry.type !== 'Point' || !isFiniteCoord(f.geometry.coordinates)) return null;
    const p = f.properties || {};
    const name = first(p, ['name','stNm','sttnNm','stationName','정류소명','정류장명']);
    const number = first(p, ['arsId','arsID','sttnNo','sttn_no','stationNo','정류소번호','정류장번호']);
    const direction = first(p, ['direction','nextStation','nextStNm','방면']);
    const routeText = first(p, ['routes','routeNames','busRoutes','노선']);
    const dedup = [number || first(p,['id','stationId','stId','정류소ID']), ...f.geometry.coordinates.map(Number)].join('|');
    if (seen.has(dedup)) return null;
    seen.add(dedup);
    return { type: 'Feature', geometry: f.geometry, properties: { ...p, dj_name: name, dj_number: number, dj_direction: direction, dj_routes: routeText, dj_label: name ? `${name}${number ? ' · '+number : ''}` : number } };
  }).filter(Boolean);
  return { type: 'FeatureCollection', features };
}
function normalizeBuildings(data) {
  const features = toCollection(data).features.filter(f => ['Polygon','MultiPolygon','Point'].includes(f.geometry?.type)).map(f => {
    const p=f.properties || {};
    const name=first(p,['name:ko','name','building:name','bldg_nm','BLD_NM','건물명','시설명']);
    const address=first(p,['addr:full','address','도로명주소','addr:street']);
    return { ...f, properties: { ...p, dj_name:name, dj_address:address } };
  }).filter(f=>f.properties.dj_name);
  return {type:'FeatureCollection', features};
}
function addLayerIfMissing(map, layer) { if (!map.getLayer(layer.id)) map.addLayer(layer); }
function source(map, id, data) {
  const old = map.getSource(id);
  if (old && typeof old.setData==='function') old.setData(data);
  else if (!old) map.addSource(id, { type: 'geojson', data });
}
const buildNameExpression = ['coalesce',['get','name:ko'],['get','name'],['get','bldg_nm'],['get','BLD_NM'],['get','building:name'],''];

function existingTextFont(map, bold=false) {
  // 기존 스타일이 실제로 쓰고 있는 폰트 조합을 우선 사용합니다.
  const symbols=(map.getStyle()?.layers||[]).filter(l=>l.type==='symbol');
  const preferred=symbols.find(l=>JSON.stringify(l.layout?.['text-font']||[]).toLowerCase().includes(bold?'bold':'regular'));
  const first=preferred || symbols.find(l=>Array.isArray(l.layout?.['text-font']));
  const font=first?.layout?.['text-font'];
  return Array.isArray(font) && font.length ? font : (bold ? ['Noto Sans Bold','Arial Unicode MS Bold'] : ['Noto Sans Regular','Arial Unicode MS Regular']);
}

/**
 * @param {Object} options
 * @param {Object} options.map MapLibre GL JS map instance
 * @param {Object} options.maplibregl optional MapLibre namespace for Popup
 * @param {Object|Array} options.busStops official location dataset; GeoJSON or array of {lng,lat,name,arsId}
 * @param {Object|Array} options.buildings optional named building GeoJSON
 * @param {boolean} options.useBaseBuildingSource true -> reuse building vector-tile features from current style
 * @param {boolean} options.noryangjinFix show reference coordinates (NOT final surveyed station positions)
 * @param {string[]} options.replaceStationLayerIds original station marker/label layer IDs to filter by name
 * @param {string} options.stationNameProperty original station GeoJSON name property, default 'name'
 * @param {Function} options.onBusClick optional handler({properties,coordinates})
 * @param {Function} options.onBuildingClick optional handler({properties,coordinates})
 * @returns {Function} cleanup
 */
export function installDongjakMapPatch(options = {}) {
  const {map, maplibregl, busStops, buildings, useBaseBuildingSource=true, noryangjinFix=true,
    replaceStationLayerIds=[], stationNameProperty='name', onBusClick, onBuildingClick} = options;
  if (!map || typeof map.addLayer !== 'function') throw new Error('MapLibre 지도 객체(map)가 필요합니다.');
  const originalFilters = new Map();
  const busData = normalizeBusStops(busStops);
  const buildingData = normalizeBuildings(buildings);
  let configured = false;
  let destroyed = false;

  function apply() {
    if (destroyed || !map.getStyle?.()) return;
    configured = true;
    const regularFont=existingTextFont(map);
    const boldFont=existingTextFont(map,true);
    if (busData.features.length) {
      source(map,ID.bus,busData);
      addLayerIfMissing(map,{id:ID.busDot,type:'circle',source:ID.bus,minzoom:13.5,
        paint:{'circle-color':'#177CC5','circle-stroke-color':'#FFFFFF','circle-stroke-width':1.5,
          'circle-radius':['interpolate',['linear'],['zoom'],13.5,3,15.5,5,17.5,7,19,9]}});
      addLayerIfMissing(map,{id:ID.busText,type:'symbol',source:ID.bus,minzoom:16.1,
        filter:['!=',['get','dj_label'],''],
        layout:{'text-field':['get','dj_label'],'text-size':['interpolate',['linear'],['zoom'],16,10,19,12],
          'text-font':regularFont,
          'text-anchor':'top','text-offset':[0,1.1],'text-max-width':12,
          'text-allow-overlap':false,'symbol-sort-key':1},
        paint:{'text-color':'#185580','text-halo-color':'#ffffff','text-halo-width':1.5}});
    }
    if (buildingData.features.length) {
      source(map,ID.building,buildingData);
      addLayerIfMissing(map,{id:ID.buildingText,type:'symbol',source:ID.building,minzoom:17,
        layout:{'text-field':['get','dj_name'],
          'text-size':['interpolate',['linear'],['zoom'],17,10,19,12],
          'text-font':regularFont,
          'text-max-width':12,'text-allow-overlap':false,'text-variable-anchor':['center','top','bottom']},
        paint:{'text-color':'#51636a','text-halo-color':'#ffffff','text-halo-width':1.5}});
    } else if (useBaseBuildingSource) {
      const base = (map.getStyle()?.layers||[]).find(l =>
        l.id!==ID.buildingText && ['fill','fill-extrusion'].includes(l.type) &&
        /(building|건물)/i.test(`${l.id} ${l['source-layer'] || ''}`) && l.source && l['source-layer']);
      if (base) addLayerIfMissing(map,{id:ID.buildingText,type:'symbol',source:base.source,'source-layer':base['source-layer'],minzoom:17,
        filter:['any',['has','name'],['has','name:ko'],['has','bldg_nm'],['has','BLD_NM'],['has','building:name']],
        layout:{'text-field':buildNameExpression,'text-size':['interpolate',['linear'],['zoom'],17,10,19,12],
          'text-font':regularFont,'text-max-width':12,'text-allow-overlap':false},
        paint:{'text-color':'#51636a','text-halo-color':'#ffffff','text-halo-width':1.5}});
    }
    if (noryangjinFix) {
      source(map,ID.station,NORYANGJIN_REFERENCE);
      addLayerIfMissing(map,{id:ID.stationDot,type:'circle',source:ID.station,minzoom:14,
        paint:{'circle-color':['match',['get','line'],'1','#07549f','9','#b69823','#6a8298'],
          'circle-radius':['interpolate',['linear'],['zoom'],14,8,17,15,19,18],
          'circle-stroke-color':'#ffffff','circle-stroke-width':2}});
      addLayerIfMissing(map,{id:ID.stationBadge,type:'symbol',source:ID.station,minzoom:14,
        layout:{'text-field':['get','line'],'text-size':['interpolate',['linear'],['zoom'],14,10,17,15,19,17],
          'text-font':boldFont, 'text-allow-overlap':true},
        paint:{'text-color':'#ffffff'}});
      addLayerIfMissing(map,{id:ID.stationText,type:'symbol',source:ID.station,minzoom:15.8,
        filter:['==',['get','line'],'1'],
        layout:{'text-field':'노량진 · 1·9호선 환승','text-font':regularFont,
          'text-size':['interpolate',['linear'],['zoom'],15.8,10,18,13],
          'text-offset':[0,2.3],'text-anchor':'top','text-allow-overlap':false,'text-max-width':13},
        paint:{'text-color':'#233b48','text-halo-color':'#ffffff','text-halo-width':2}});
      // For known original station layers, exclude only Noryangjin labels while retaining other stations.
      for (const id of replaceStationLayerIds) {
        if (!map.getLayer(id)) continue;
        if (!originalFilters.has(id)) originalFilters.set(id, map.getFilter(id) || null);
        const baseFilter = originalFilters.get(id);
        const exclude = ['!', ['in',['coalesce',['get',stationNameProperty],''], ['literal',['노량진','노량진역','Noryangjin']]]];
        map.setFilter(id, baseFilter ? ['all',baseFilter,exclude] : exclude);
      }
    }
  }
  function showPopup(label, sub, coordinates, event) {
    if (!maplibregl?.Popup || !coordinates) return;
    const div = document.createElement('div');
    div.style.cssText='font-family:Pretendard,sans-serif;min-width:130px;line-height:1.5';
    const title=document.createElement('strong'); title.textContent=label || '정보 없음'; div.append(title);
    if (sub) { const detail=document.createElement('div');detail.textContent=sub;div.append(detail); }
    new maplibregl.Popup({offset:12,closeButton:true}).setLngLat(coordinates).setDOMContent(div).addTo(map);
    event?.preventDefault?.();
  }
  const busClick=e=>{
    const f=e.features?.[0]; if (!f) return;
    const p=f.properties||{}, xy=f.geometry?.coordinates;
    const details=[p.dj_number ? `정류장 번호: ${p.dj_number}` : '', p.dj_direction ? `방면: ${p.dj_direction}` : '',p.dj_routes ? `노선: ${p.dj_routes}`:''].filter(Boolean).join(' / ');
    if (onBusClick) onBusClick({properties:p,coordinates:xy});
    else showPopup(p.dj_name || `버스정류장 ${p.dj_number||''}`,details,xy,e);
  };
  const buildingClick=e=>{
    const f=e.features?.[0]; if (!f) return;
    const p=f.properties||{};
    const xy=e.lngLat ? [e.lngLat.lng,e.lngLat.lat] : f.geometry?.coordinates;
    if (onBuildingClick) onBuildingClick({properties:p,coordinates:xy});
    else showPopup(p.dj_name || p.name || p['name:ko'] || '건물',p.dj_address || p['addr:full'] || p.address || '',xy,e);
  };
  const setCursor=e=>{map.getCanvas().style.cursor='pointer';};
  const clearCursor=e=>{map.getCanvas().style.cursor='';};
  map.on('style.load',apply);
  if (map.isStyleLoaded?.()) apply();
  // MapLibre's on(layer) delegates remain registered even if the style is reloaded.
  map.on('click',ID.busDot,busClick);
  map.on('mouseenter',ID.busDot,setCursor);
  map.on('mouseleave',ID.busDot,clearCursor);
  map.on('click',ID.buildingText,buildingClick);
  return function cleanup(){
    destroyed=true;
    map.off('style.load',apply);
    map.off('click',ID.busDot,busClick);
    map.off('mouseenter',ID.busDot,setCursor);
    map.off('mouseleave',ID.busDot,clearCursor);
    map.off('click',ID.buildingText,buildingClick);
    for(const [id,original] of originalFilters) if(map.getLayer(id)) map.setFilter(id,original);
    for(const id of [ID.stationText,ID.stationBadge,ID.stationDot,ID.busText,ID.busDot,ID.buildingText]) {
      if(map.getLayer(id))map.removeLayer(id);
    }
    for(const id of [ID.station,ID.bus,ID.building]) if(map.getSource(id))map.removeSource(id);
  };
}

/** Attach persistent UI classes to existing DOM nodes without moving/unmounting them. */
export function installDongjakPersistentUI({map, header, search, sideNavigation, rightControls, scale, bottomCard, root=document.documentElement}={}) {
  const bindings = [[header,'header'],[search,'search'],[sideNavigation,'side-navigation'],[rightControls,'right-controls'],[bottomCard,'bottom-card']];
  const tagged=[];
  for (const [el,role] of bindings) if(el) {el.setAttribute('data-dj-role',role);tagged.push(el);}
  let scaleDock = scale || map?.getContainer?.()?.querySelector('.maplibregl-ctrl-bottom-left');
  if(scaleDock){scaleDock.setAttribute('data-dj-role','scale-dock');tagged.push(scaleDock);}
  root.classList.add('dj-always-visible');
  return ()=>{for(const el of tagged)el.removeAttribute('data-dj-role');root.classList.remove('dj-always-visible');};
}

export {normalizeBusStops, normalizeBuildings};
