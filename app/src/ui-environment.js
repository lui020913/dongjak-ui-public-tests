// v17.7: 현지 날씨 · 수동/시스템 테마 · 일반 POI 정리
const THEME_KEY='dongjak_safety_color_theme_v1';
const weatherLabels = new Map([
  [0,'맑음'],[1,'대체로 맑음'],[2,'구름 조금'],[3,'흐림'],[45,'안개'],[48,'안개'],
  [51,'이슬비'],[53,'이슬비'],[55,'이슬비'],[61,'비'],[63,'비'],[65,'강한 비'],
  [71,'눈'],[73,'눈'],[75,'많은 눈'],[80,'소나기'],[81,'소나기'],[82,'강한 소나기'],
  [95,'뇌우'],[96,'뇌우'],[99,'뇌우']
]);
function formatWeather(code) { return weatherLabels.get(Number(code)) || '날씨 정보'; }
export async function fetchCurrentWeather({latitude,longitude,signal}={}){
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))throw new Error('날씨 좌표 오류');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',latitude.toFixed(5));
  url.searchParams.set('longitude',longitude.toFixed(5));
  url.searchParams.set('current','temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m');
  url.searchParams.set('timezone','Asia/Seoul');
  url.searchParams.set('forecast_days','1');
  const response=await fetch(url,{signal});
  if(!response.ok)throw new Error(`날씨 서버 ${response.status}`);
  const body=await response.json();
  const now=body.current;
  if(!now||!Number.isFinite(Number(now.temperature_2m))) throw new Error('현재 날씨 정보 없음');
  return {temperature:Number(now.temperature_2m),weather:formatWeather(now.weather_code),
    apparentTemperature:Number(now.apparent_temperature),precipitation:Number(now.precipitation),
    wind:Number(now.wind_speed_10m),time:now.time||''};
}
export function initWeatherWidget({getPosition, onMessage=()=>{}}={}) {
  const label=document.getElementById('weather-label');
  const button=document.getElementById('weather-my-location');
  const title=document.getElementById('weather-title');
  if(!label||!button)return;
  let current={latitude:37.4987,longitude:126.9494,name:'동작구'};
  let controller=null;
  let lastFetchedAt=0,lastReading=null;
  const CACHE_MS=10*60*1000;
  function showWeather(state,reading,message=''){
    const samePlace=reading&&reading.latitude===current.latitude&&reading.longitude===current.longitude;
    const usable=samePlace?reading:null;
    label.dataset.djWeatherState=state;
    label.dataset.djWeatherTemperature=usable?.temperature||'';
    if(title)title.textContent=current.name;
    const suffix=state==='loading'?' · 갱신 중':state==='error'?' · 갱신 실패 (이전 값)':'';
    label.textContent=usable?usable.summary+suffix:state==='error'?'날씨 조회 실패':'날씨 조회 중';
    label.title=message||(usable?.detail||'상세 기상 정보를 불러오는 중입니다.');
  }
  async function refresh({force=false}={}){
    if(!force && lastFetchedAt && Date.now()-lastFetchedAt<CACHE_MS)return;
    controller?.abort();const request=new AbortController();controller=request;
    const place={...current};
    showWeather('loading',lastReading);
    try{
      const w=await fetchCurrentWeather({...place,signal:request.signal});
      if(controller!==request||request.signal.aborted)return;
      lastFetchedAt=Date.now();
      lastReading={...place,temperature:`${w.temperature.toFixed(0)}°`,summary:`${w.temperature.toFixed(0)}° · ${w.weather}`,detail:`체감 ${w.apparentTemperature.toFixed(0)}° · 강수 ${w.precipitation}mm · 풍속 ${w.wind}km/h · ${w.time||'관측시각 미확인'}`};
      showWeather('ready',lastReading);
    }catch(error){
      if(controller!==request||request.signal.aborted||error?.name==='AbortError')return;
      showWeather('error',lastReading,'인터넷 연결 후 다시 시도하세요.'+(lastReading?.latitude===place.latitude&&lastReading?.longitude===place.longitude?' 표시된 온도는 이전 조회값입니다.':''));
    }
  }
  button.addEventListener('click',async()=>{
    button.disabled=true;
    button.textContent='위치 확인 중';
    try{
      // 위치 정보 권한은 버튼을 명시적으로 눌렀을 때만 요청합니다.
      const pos=await getPosition();
      const {latitude,longitude}=pos.coords||{};
      if(!Number.isFinite(latitude)||!Number.isFinite(longitude))throw new Error('위치 좌표 없음');
      current={latitude,longitude,name:'내 위치'};
      // Keep the visible 7-day forecast tied to the same chosen place as
      // the current-temperature widget; otherwise it silently stays in Dongjak.
      window.dispatchEvent(new CustomEvent('dongjak:weather-place-change',{
        detail:{latitude,longitude,name:current.name}
      }));
      await refresh({force:true});
    }catch(error){
      const message=error?.code===1?'위치 권한이 거부되었습니다. 기존 지역 날씨를 유지합니다.':'현재 위치를 확인하지 못했습니다. 기존 지역 날씨를 유지합니다.';
      if(document.getElementById('dj854-weather-sheet')?.hidden!==false)onMessage(message);
      else label.title=message;
    }finally{button.disabled=false;button.textContent='내 위치';}
  });
  // Details opens on click; fetching is never the implicit effect of opening.
  window.addEventListener('dongjak:weather-refresh',()=>void refresh({force:true}));
  void refresh({force:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)void refresh({force:false});
  });
}

import {nightOcclusionBuildingPaint,buildingExtrusionAppearance,nativeBuildingFootprintPaint,nativeBuildingFootprint,repaintVegetation} from './map-appearance.js';
import {applyBusStopLabelTheme} from './bus-stop-label-theme.js';
import {createThemeState} from './theme-state-core.mjs';
import {scaleMapLabelSize} from './map-label-text-scale.mjs';

export function getInitialTheme(){
  // The public app is light-only. Night visibility can still apply a temporary
  // dark map theme through setTemporaryTheme; no saved theme is restored.
  return 'light';
}
export function roadColorRole(layer={}){
  if(!['line','fill'].includes(layer.type))return null;
  const id=String(layer.id||'').toLowerCase();
  const src=String(layer['source-layer']||'').toLowerCase();
  // Land-use layers (e.g. landuse_residential) are background land, not roads.
  if(/^(?:landuse|landcover|background|natural)[-_]/.test(id)||src==='landuse')return null;
  if(/rail|metro|subway|tram|contour|path|footway|pedestrian|cycleway|water|river|stream|lake|park/.test(id))return null;
  const road=/road|motorway|highway|street|transportation|trunk|primary|secondary|tertiary|residential|minor|service|bridge/.test(id);
  if(!road && !(/transportation/.test(src) && /road|highway|street|motorway/.test(id)))return null;
  return /outline|casing|border|edge|shadow|tunnel/.test(id)?'edge':'surface';
}
// OpenMapTiles paved-area polygons (e.g. campus plazas) are distinct from
// carriageway centerline strokes. Keep their geometry and use a subdued
// pavement tone rather than the high-contrast white used for linear roads.
export function nativePavedAreaFill(layer={}){
 const source=String(layer['source-layer']||'').toLowerCase();
 const id=String(layer.id||'').toLowerCase();
 return layer.type==='fill'&&source==='transportation'&&!/rail|metro|subway|tram|water|river|lake|pier|ferry|bridge|tunnel|contour/.test(id);
}
export const LIGHT_PAVED_AREA_COLOR='#e5e8e1';
// v17.11: white roads need a slightly darker surrounding land surface.
// Apply only to the base-map style; building, route and safety overlays retain their own colors.
export function lightMapLandRole(layer = {}) {
  if(layer.type==='background')return 'ground';
  if(layer.type!=='fill'||roadColorRole(layer))return null;
  const id=String(layer.id||'').toLowerCase();
  const source=String(layer['source-layer']||'').toLowerCase();
  if(/water|ocean|river|lake|stream|reservoir|wetland/.test(id))return null;
  if(/park|grass|forest|wood|garden|meadow|green|scrub|landcover/.test(id)||source==='landcover')return 'vegetation';
  if(/landuse|land[_-]|residential|industrial|commercial|ground|background/.test(id) || source==='landuse')return 'ground';
  return null;
}

export function districtExteriorThemePaint(theme='light'){
  return theme==='dark'
    ? {'fill-color':'#22272d','fill-opacity':0.34}
    : {'fill-color':'#d8e0e3','fill-opacity':0.65};
}

export function initTheme({map,app}){
  const toggle=document.getElementById('theme-toggle');
  if(toggle){toggle.hidden=true;toggle.disabled=true;toggle.style.setProperty('display','none','important');}
  try{localStorage.removeItem(THEME_KEY);}catch{}
  const baseline=new Map();
  // Dynamically injected labels arrive after initial MapLibre load (park names,
  // nearby POIs, bus/rail stops). Preserve original paint for light restoration.
  const supplementalLabelBaseline=new Map();
  const themeState=createThemeState(getInitialTheme());
  app.dataset.theme=themeState.value;
  app.dataset.djPreferredTheme=themeState.preference;
  document.documentElement.dataset.theme=themeState.value;
  const browserThemeColor=document.querySelector('meta[name="theme-color"]');
  // Theme updates are repaint-only. Never create a full-screen transition mask.
  if(browserThemeColor)browserThemeColor.content=themeState.value==='dark'?'#22282e':'#edf3ef';
  if(toggle)toggle.textContent=themeState.value==='dark'?'라이트 모드':'다크 모드';
  toggle?.setAttribute('aria-label',themeState.value==='dark'?'라이트 모드로 전환':'다크 모드로 전환');
  // background base style only; dynamically added route, road width and safety layers are not modified.
  function saveBaseLayers(){
    for(const layer of map.getStyle().layers){
      if(baseline.has(layer.id))continue;
      const read=(property)=>{try{return map.getPaintProperty(layer.id,property);}catch{return undefined;}};
      baseline.set(layer.id,{
        type:layer.type,id:layer.id,roadRole:roadColorRole(layer),landRole:lightMapLandRole(layer),buildingFootprint:nativeBuildingFootprint(layer),pavedArea:nativePavedAreaFill(layer),
        background:layer.type==='background'?read('background-color'):undefined,
        fill:layer.type==='fill'?read('fill-color'):undefined,
        line:layer.type==='line'?read('line-color'):undefined,
        text:layer.type==='symbol'?read('text-color'):undefined,
        halo:layer.type==='symbol'?read('text-halo-color'):undefined,
        haloWidth:layer.type==='symbol'?read('text-halo-width'):undefined,
        size:layer.type==='symbol'?map.getLayoutProperty?.(layer.id,'text-size'):undefined
      });
    }
  }
  const mapLabelTextPaint=Object.freeze({color:'#f1f4f6',halo:'rgba(18,25,32,0.97)',width:1.6});
  const mapLabelLightPaint=Object.freeze({color:'#26352f',halo:'rgba(255,255,255,0.97)',width:1.6});
  const semanticSymbolPattern=/(?:train[-_]?vehicle|route[-_]?badge|line[-_]?badge|dj-pri-(?:line|point))/i;
  function syncMapLabelContrast(){
    const layers=map.getStyle?.()?.layers;
    if(!Array.isArray(layers))return;
    for(const layer of layers){
      // No text-field means icon-only; preserve safety/transit pictograms.
      if(layer.type!=='symbol'||!layer.layout?.['text-field']||semanticSymbolPattern.test(layer.id))continue;
      const id=layer.id;
      try{
        const read=key=>map.getPaintProperty(id,key);
        if(!supplementalLabelBaseline.has(id)){
          supplementalLabelBaseline.set(id,{
            text:baseline.get(id)?.text??read('text-color'),
            halo:baseline.get(id)?.halo??read('text-halo-color'),
            width:baseline.get(id)?.haloWidth??read('text-halo-width'),
            size:baseline.get(id)?.size??map.getLayoutProperty?.(id,'text-size')
          });
        }
        const original=supplementalLabelBaseline.get(id);
        const desired=themeState.value==='dark'
          ? {'text-color':mapLabelTextPaint.color,'text-halo-color':mapLabelTextPaint.halo,'text-halo-width':mapLabelTextPaint.width}
          : {'text-color':mapLabelLightPaint.color,'text-halo-color':mapLabelLightPaint.halo,'text-halo-width':mapLabelLightPaint.width};
        for(const [key,value] of Object.entries(desired)){
          const current=read(key);
          if(JSON.stringify(current)!==JSON.stringify(value))map.setPaintProperty(id,key,value);
        }
        if(typeof map.getLayoutProperty==='function'&&typeof map.setLayoutProperty==='function'&&original.size!=null){
          const textSize=scaleMapLabelSize(original.size,app.dataset.djSettingsText||'normal');
          if(JSON.stringify(map.getLayoutProperty(id,'text-size'))!==JSON.stringify(textSize))map.setLayoutProperty(id,'text-size',textSize);
        }
      }catch{/* A style reload can temporarily remove an individual label layer. */}
    }
  }
  let labelSyncScheduled=false;
  function scheduleMapLabelContrast(){
    if(labelSyncScheduled)return;
    labelSyncScheduled=true;
    const run=()=>{labelSyncScheduled=false;syncMapLabelContrast();};
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);
    else Promise.resolve().then(run);
  }
  map.on('styledata',scheduleMapLabelContrast);
  window.addEventListener?.('dongjak:map-text-scale-change',scheduleMapLabelContrast);
  function applyTheme(){
    if(!map.isStyleLoaded()){map.once?.('idle',applyTheme);return;}
    for(const entry of baseline.values()){
      if(!map.getLayer(entry.id))continue;
      const id=entry.id.toLowerCase();
      const set=(property,value)=>{try{map.setPaintProperty(entry.id,property,value??null);}catch{}};
      if(entry.buildingFootprint){
        const colors=nativeBuildingFootprintPaint(themeState.value);
        for(const [property,value] of Object.entries(colors))set(property,value);
        continue;
      }
      if(themeState.value==='light'){
        if(entry.type==='background')set('background-color',entry.landRole==='ground'?'#e2e4dc':entry.background);
        if(entry.type==='fill')set('fill-color',entry.pavedArea?LIGHT_PAVED_AREA_COLOR:entry.roadRole ? (entry.roadRole==='edge'?'#d0d8d3':'#ffffff') : entry.landRole==='vegetation'?'#a5ca92':entry.landRole==='ground'?'#e1e4dc':entry.fill);
        if(entry.type==='line')set('line-color',entry.roadRole ? (entry.roadRole==='edge'?'#cbd4d0':'#ffffff') : entry.line);
        if(entry.type==='symbol') {set('text-color',entry.text);set('text-halo-color',entry.halo);set('text-halo-width',entry.haloWidth);}
      }else{
        const water=/water|ocean|river|lake|stream/.test(id);
        const green=/park|grass|wood|landcover|forest|green|garden/.test(id);
        const road=/road|motorway|street|transportation|bridge|tunnel|highway/.test(id);
        // Balanced dark basemap: distinguish ground, roads, parks and water.
        // Only the original style baseline is recolored: semantic PRI, route
        // geometry, transit lines and warning layers keep their own colors.
        if(entry.type==='background')set('background-color','#22272d');
        if(entry.type==='fill')set('fill-color',water?'#273741':green?'#303c34':entry.roadRole?'#424952':road?'#39434a':'#2b3138');
        if(entry.type==='line')set('line-color',water?'#425765':entry.roadRole?(entry.roadRole==='edge'?'#333b44':'#4c5864'):road?'#525e68':'#424a53');
        if(entry.type==='symbol'){
          set('text-color',mapLabelTextPaint.color);set('text-halo-color',mapLabelTextPaint.halo);set('text-halo-width',mapLabelTextPaint.width);
        }
      }
    }
    // 동작구 밖 시각적 마스크는 기본 베이스맵보다 늦게 생성됩니다.
    // 토글할 때마다 현재 존재하는 레이어의 색상과 불투명도를 별도로 갱신합니다.
    if(map.getLayer('district-exterior-fade')){
      const maskPaint=districtExteriorThemePaint(themeState.value);
      if(app.dataset.djTransitExterior==='true')maskPaint['fill-opacity']=0;
      for(const [key,value] of Object.entries(maskPaint)){
        try{map.setPaintProperty('district-exterior-fade',key,value);}catch(error){console.warn('[외부지역 마스크] 테마 전환 실패:',error);}
      }
    }
    // Added overlays are not part of the original style baseline and must be
    // recolored on every switch, or map labels remain dark-on-dark.
    for(const id of ['dj-metro-summary-name','dj-metro-detail-name','dj-metro-detail-name-very-close','dj-nearby-place-names','dongjak-zoom-commercial-names']){
      if(!map.getLayer(id))continue;
      try{
        // Light map names use dark glyphs with a light halo; dark mode reverses the contrast.
        map.setPaintProperty(id,'text-color',themeState.value==='dark'?'#e9f0f3':mapLabelLightPaint.color);
        map.setPaintProperty(id,'text-halo-color',themeState.value==='dark'?'rgba(34,39,45,0.95)':mapLabelLightPaint.halo);
      }catch{}
    }
    // Keep official and fallback bus-stop names readable even in initial night mode.
    applyBusStopLabelTheme(map,themeState.value);
    repaintVegetation(map,app); // Include forest shade installed after baseline capture.
    syncMapLabelContrast(); // Base and late map labels share the same theme contrast.
    // existing building polygons are handled separately when each tile is loaded.
    for(const layer of map.getStyle().layers){
      if(layer.id.startsWith('dongjak-buildings-3d-') && layer.type==='fill-extrusion'){
        try{
          const appearance=nightOcclusionBuildingPaint(
            buildingExtrusionAppearance(themeState.value,map.getPitch?.()??30),
            themeState.value==='dark'&&app.dataset.sangdoNight==='on');
          map.setPaintProperty(layer.id,'fill-extrusion-color',appearance.color);
          map.setPaintProperty(layer.id,'fill-extrusion-opacity',appearance.opacity);
        }catch{}
      }
    }
  }
  map.on('load',()=>{saveBaseLayers();applyTheme();});
  const displayTheme=({notify=false}={})=>{
    const next=themeState.value;
    const changed=app.dataset.theme!==next;
    app.dataset.theme=next;
    app.dataset.djPreferredTheme=themeState.preference;
    app.dataset.djThemeSource=themeState.temporary?'night':'user';
    document.documentElement.dataset.theme=next;
    if(browserThemeColor)browserThemeColor.content=next==='dark'?'#22282e':'#edf3ef';
    if(toggle){
      if(themeState.temporary){
        toggle.textContent='야간 시야 중 · 종료 후 '+(themeState.preference==='dark'?'다크':'라이트');
        toggle.setAttribute('aria-label','야간 시야 종료 후 '+(themeState.preference==='dark'?'다크':'라이트')+' 테마 적용');
      }else{
        toggle.textContent=next==='dark'?'라이트 모드':'다크 모드';
        toggle.setAttribute('aria-label',next==='dark'?'라이트 모드로 전환':'다크 모드로 전환');
      }
    }
    if(changed)applyTheme();
    if(notify&&typeof window.CustomEvent==='function'){
      window.dispatchEvent(new CustomEvent('dongjak:manual-theme-change',
        {detail:{theme:next,preference:themeState.preference}}));
    }
  };
  // Only the night-visibility controller may request a temporary theme.
  const setTemporaryTheme=next=>{
    if(!themeState.override(next))return;
    displayTheme();
  };
  return {currentTheme:()=>themeState.value,
    preferredTheme:()=>themeState.preference,
    refresh:applyTheme,setTemporaryTheme};
}

export function keepRegularMapText(map){
  for(const layer of map.getStyle().layers){
    if(layer.type!=='symbol')continue;
    try{
      const fonts=map.getLayoutProperty(layer.id,'text-font');
      if(Array.isArray(fonts) && fonts.every(x=>typeof x==='string')){
        const replacement=fonts.map(x=>x.replace(/(?:Italic|Oblique)/gi,'Regular'));
        if(replacement.some((x,i)=>x!==fonts[i]))map.setLayoutProperty(layer.id,'text-font',replacement);
      }
      if(!/oneway|one-way|direction-arrow|road-arrow|arrow.*road/.test(String(layer.id||'').toLowerCase()))
        map.setLayoutProperty(layer.id,'text-rotate',0);
    }catch(error){console.warn('[기본 폰트] 일부 레이블 조정 생략:',layer.id,error?.message);}
  }
}

export function filterCommercialPOI(map){
  let count=0;
  for(const layer of map.getStyle().layers){
    if(layer.type!=='symbol')continue;
    const source=String(layer['source-layer']||'').toLowerCase();
    const id=String(layer.id||'').toLowerCase();
    // OSM POI의 일반 상업시설은 숨기고 교통/안전 관련 분류만 유지합니다.
    if(source==='poi' && id!=='dongjak-park-names'){
      try{
        const old=map.getFilter(layer.id);
        const allowed=['bus','rail','emergency'];
        map.setFilter(layer.id,['all',...(old?[old]:[]),['in',['get','class'],['literal',allowed]]]);
        count++;
      }catch(error){console.warn('[POI 정리] 필터 오류',layer.id,error);}
    }else if(/^(poi[_-])?(shop|food|restaurants?|cafes?|hotels?|leisure|retail)/i.test(id)){
      try{map.setLayoutProperty(layer.id,'visibility','none');count++;}catch{}
    }
  }
  // The previous code removed all shops at every zoom. Display documented
  // Korean names as a separate high-zoom overlay, keeping the wide view clean.
  const poiBase=map.getStyle().layers.find(l=>l['source-layer']==='poi'&&l.source);
  if(poiBase&&!map.getLayer('dongjak-zoom-commercial-names')){
    try{map.addLayer({id:'dongjak-zoom-commercial-names',type:'symbol',source:poiBase.source,
      'source-layer':'poi',minzoom:17.5,
      filter:['in',['get','class'],['literal',['shop','food','cafe','restaurant','commercial','service','lodging','bank','retail']]],
      layout:{'text-field':['coalesce',['get','name:ko'],['get','name_ko'],''],
        'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':11,
        'text-max-width':12,'text-offset':[0,0.9],
        'text-allow-overlap':false},
      paint:{'text-color':'#42524b','text-halo-color':'#fff','text-halo-width':1.5}});}
    catch(error){console.warn('[상호명] 고배율 레이어 생성 불가',error);}
  }
  if(poiBase&&!map.getLayer('dongjak-zoom-busstop-names')){
    try{map.addLayer({id:'dongjak-zoom-busstop-names',type:'symbol',source:poiBase.source,
      'source-layer':'poi',minzoom:17.0,
      filter:['all',['any',
        ['in',['get','class'],['literal',['bus','bus_stop','bus_station']]],
        ['in',['get','subclass'],['literal',['bus_stop','bus_station']]]],
        ['!=',['coalesce',['get','name:nonlatin'],['get','name:ko'],['get','name_ko'],['get','name'],''],'']],
      layout:{'visibility':'none',
        // Tile names are shown only by the filtered fallback pictogram layer.
        'text-field':['coalesce',['get','name:nonlatin'],['get','name:ko'],['get','name_ko'],['get','name'],''],
        'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':11.5,
        'text-allow-overlap':false,'text-anchor':'top','text-offset':[0,1.1],
        'text-max-width':13},
      paint:{'text-color':'#165d91','text-halo-color':'#ffffff','text-halo-width':1.5}});}
    catch(error){console.warn('[버스정류장명] 고배율 보완 실패',error);}
  }
  console.info(`[v17.7] 일반 상업시설 레이어 ${count}개 필터 적용`);
}

// 지도 전체를 없애지 않고 경계 내부의 라벨만 남기기 위한 filter expression.
// 지도 타일 라벨 중 폴리곤·선형 피처는 경계와 교차할 때 일부 누락될 수 있습니다.
const districtLabelOriginals=new WeakMap();
export function clipBasemapLabelsToDistrict(map, geometry){
  if(!geometry)return;
  const within=['within',{type:geometry.type,coordinates:geometry.coordinates}];
  let done=0;
  let originals=districtLabelOriginals.get(map);if(!originals){originals=new Map();districtLabelOriginals.set(map,originals);}
  for(const layer of map.getStyle().layers){
    if(layer.type!=='symbol'||layer.id.startsWith('transport-'))continue;
    // Hangang bridge labels are deliberately north of the district boundary.
    // Do not clip these five named crossings with the Dongjak-only POI filter.
    if(layer.id.startsWith('dongjak-')||layer.id.startsWith('dj-hangang-bridge-'))continue;
    try{
      if(!originals.has(layer.id))originals.set(layer.id,map.getFilter(layer.id)||null);
      const original=originals.get(layer.id);
      map.setFilter(layer.id,['all',...(original?[original]:[]),within]);
      done++;
    }catch(error){console.warn('[경계 라벨] 필터 적용 생략',layer.id,error);}
  }
  console.info(`[v17.7] 동작구 경계 내부 라벨만 ${done}개 레이어에 적용`);
}

/** Restore only the base symbols previously clipped by the district policy. */
export function restoreBasemapLabelsOutsideDistrict(map){
 for(const [id,filter] of districtLabelOriginals.get(map)||[]){if(map.getLayer(id))try{map.setFilter(id,filter);}catch{}}
}
