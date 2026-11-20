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
  let lastFetchedAt=0;
  const CACHE_MS=10*60*1000;
  async function refresh({force=false}={}){
    if(!force && lastFetchedAt && Date.now()-lastFetchedAt<CACHE_MS)return;
    controller?.abort();controller=new AbortController();
    label.textContent='날씨 조회 중';
    try{
      const w=await fetchCurrentWeather({...current,signal:controller.signal});
      lastFetchedAt=Date.now();
      label.textContent=`${w.temperature.toFixed(0)}° · ${w.weather}`;
      if(title)title.textContent=current.name;
      label.title=`체감 ${w.apparentTemperature.toFixed(0)}° · 강수 ${w.precipitation}mm · 풍속 ${w.wind}km/h · ${w.time||'조회'}`;
    }catch(error){
      if(error?.name==='AbortError')return;
      label.textContent='날씨 조회 실패';
      label.title='인터넷 연결 후 다시 시도하세요.';
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
      onMessage('현재 위치를 기준으로 날씨를 조회합니다.');
      await refresh({force:true});
    }catch(error){
      onMessage(error?.code===1?'위치 권한이 거부되었습니다. 동작구 날씨를 유지합니다.':'현재 위치를 확인하지 못했습니다. 동작구 날씨를 유지합니다.');
      await refresh({force:true});
    }finally{button.disabled=false;button.textContent='내 위치';}
  });
  // Details opens on click; fetching is never the implicit effect of opening.
  window.addEventListener('dongjak:weather-refresh',()=>void refresh({force:true}));
  void refresh({force:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)void refresh({force:false});
  });
}

import {nightOcclusionBuildingPaint,buildingExtrusionAppearance,buildingFootprintPaint,nativeBuildingFootprint} from './map-appearance.js';
import {applyBusStopLabelTheme} from './bus-stop-label-theme.js';

function safeStorageGet(k){try{return localStorage.getItem(k);}catch{return null;}}
function safeStorageSet(k,v){try{localStorage.setItem(k,v);}catch{}}
export function getInitialTheme(){
  // First paint in index.html resolves the same setting BEFORE the stylesheet is loaded.
  const firstPaint=typeof document!=='undefined'?document.documentElement?.dataset?.theme:null;
  if(firstPaint==='light'||firstPaint==='dark')return firstPaint;
  const selected=safeStorageGet(THEME_KEY);
  if(selected==='light'||selected==='dark')return selected;
  // New visitors start in light mode. Manual selection and night analysis still work.
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
    ? {'fill-color':'#08171e','fill-opacity':0.76}
    : {'fill-color':'#d8e0e3','fill-opacity':0.65};
}

export function initTheme({map,app}){
  const toggle=document.getElementById('theme-toggle');
  const baseline=new Map();
  const themeState={value:getInitialTheme()};
  let suppressPreferenceSave=false;
  app.dataset.theme=themeState.value;
  document.documentElement.dataset.theme=themeState.value;
  const browserThemeColor=document.querySelector('meta[name="theme-color"]');
  const themeFlash=document.createElement('div');
  themeFlash.className='dj-theme-switch-flash';
  themeFlash.setAttribute('aria-hidden','true');
  themeFlash.hidden=true;
  app.append(themeFlash);
  let themeFlashTimer=null;
  let mobileThemeMinimumTimer=null;
  let mobileThemeIdleListener=null;
  let themeFlashSequence=0;
  const stopMobileThemeTimers=()=>{
    if(themeFlashTimer)clearTimeout(themeFlashTimer);
    if(mobileThemeMinimumTimer)clearTimeout(mobileThemeMinimumTimer);
    if(mobileThemeIdleListener){map.off?.('idle',mobileThemeIdleListener);mobileThemeIdleListener=null;}
    themeFlashTimer=null;mobileThemeMinimumTimer=null;
  };
  const showThemeTransition=()=>{
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
    stopMobileThemeTimers();
    const sequence=++themeFlashSequence;
    const isPhone=Boolean(window.matchMedia?.('(max-width: 699px)')?.matches);
    themeFlash.hidden=false;
    themeFlash.style.animation='none';
    if(!isPhone){
      void themeFlash.offsetWidth; // original desktop transition behavior
      themeFlash.style.removeProperty('animation');
      themeFlashTimer=setTimeout(()=>{if(sequence===themeFlashSequence){themeFlash.hidden=true;themeFlashTimer=null;}},180);
      return;
    }
    // UI changes immediately; a brief fade covers the next rendered frame.
    // Tile downloads must never keep the interface behind a transition mask.
    themeFlashTimer=setTimeout(()=>{
      if(sequence!==themeFlashSequence)return;
      stopMobileThemeTimers();themeFlash.hidden=true;
      themeFlash.style.removeProperty('animation');
    },180);
  };
  if(browserThemeColor)browserThemeColor.content=themeState.value==='dark'?'#151619':'#f3f7f5';
  if(toggle)toggle.textContent=themeState.value==='dark'?'라이트 모드':'다크 모드';
  toggle?.setAttribute('aria-label',themeState.value==='dark'?'라이트 모드로 전환':'다크 모드로 전환');
  // background base style only; dynamically added route, road width and safety layers are not modified.
  function saveBaseLayers(){
    for(const layer of map.getStyle().layers){
      if(baseline.has(layer.id))continue;
      const read=(property)=>{try{return map.getPaintProperty(layer.id,property);}catch{return undefined;}};
      baseline.set(layer.id,{
        type:layer.type,id:layer.id,roadRole:roadColorRole(layer),landRole:lightMapLandRole(layer),buildingFootprint:nativeBuildingFootprint(layer),
        background:layer.type==='background'?read('background-color'):undefined,
        fill:layer.type==='fill'?read('fill-color'):undefined,
        line:layer.type==='line'?read('line-color'):undefined,
        text:layer.type==='symbol'?read('text-color'):undefined,
        halo:layer.type==='symbol'?read('text-halo-color'):undefined
      });
    }
  }
  function applyTheme(){
    if(!map.isStyleLoaded()){map.once?.('idle',applyTheme);return;}
    for(const entry of baseline.values()){
      if(!map.getLayer(entry.id))continue;
      const id=entry.id.toLowerCase();
      const set=(property,value)=>{try{map.setPaintProperty(entry.id,property,value??null);}catch{}};
      if(entry.buildingFootprint){
        const colors=buildingFootprintPaint(themeState.value,map.getPitch?.()??0);
        for(const [property,value] of Object.entries(colors))set(property,value);
        continue;
      }
      if(themeState.value==='light'){
        if(entry.type==='background')set('background-color',entry.landRole==='ground'?'#e2e4dc':entry.background);
        if(entry.type==='fill')set('fill-color',entry.roadRole ? (entry.roadRole==='edge'?'#d0d8d3':'#ffffff') : entry.landRole==='vegetation'?'#a5ca92':entry.landRole==='ground'?'#e1e4dc':entry.fill);
        if(entry.type==='line')set('line-color',entry.roadRole ? (entry.roadRole==='edge'?'#cbd4d0':'#ffffff') : entry.line);
        if(entry.type==='symbol') {set('text-color',entry.text);set('text-halo-color',entry.halo);}
      }else{
        const water=/water|ocean|river|lake|stream/.test(id);
        const green=/park|grass|wood|landcover|forest|green|garden/.test(id);
        const road=/road|motorway|street|transportation|bridge|tunnel|highway/.test(id);
        if(entry.type==='background')set('background-color','#131416');
        if(entry.type==='fill')set('fill-color',water?'#1c242a':green?'#282e29':entry.roadRole?'#3d4145':road?'#303438':'#24272b');
        if(entry.type==='line')set('line-color',water?'#36444d':entry.roadRole?(entry.roadRole==='edge'?'#303438':'#61666b'):road?'#4b5056':'#3d4442');
        if(entry.type==='symbol'){
          set('text-color','#e5e7eb');set('text-halo-color','#181a1e');
        }
      }
    }
    // 동작구 밖 시각적 마스크는 기본 베이스맵보다 늦게 생성됩니다.
    // 토글할 때마다 현재 존재하는 레이어의 색상과 불투명도를 별도로 갱신합니다.
    if(map.getLayer('district-exterior-fade')){
      const maskPaint=districtExteriorThemePaint(themeState.value);
      for(const [key,value] of Object.entries(maskPaint)){
        try{map.setPaintProperty('district-exterior-fade',key,value);}catch(error){console.warn('[외부지역 마스크] 테마 전환 실패:',error);}
      }
    }
    // Added overlays are not part of the original style baseline and must be
    // recolored on every switch, or map labels remain dark-on-dark.
    for(const id of ['dj-metro-summary-name','dj-metro-detail-name','dj-metro-detail-name-very-close','dj-nearby-place-names','dongjak-zoom-commercial-names']){
      if(!map.getLayer(id))continue;
      try{
        map.setPaintProperty(id,'text-color',themeState.value==='dark'?'#e6f3ed':id==='dj-nearby-place-names'?'#536e74':'#21483c');
        map.setPaintProperty(id,'text-halo-color',themeState.value==='dark'?'rgba(13,31,37,0.96)':'rgba(255,255,255,0.97)');
      }catch{}
    }
    // Keep official and fallback bus-stop names readable even in initial night mode.
    applyBusStopLabelTheme(map,themeState.value);
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
  toggle?.addEventListener('click',()=>{
    if(!suppressPreferenceSave)showThemeTransition();
    themeState.value=themeState.value==='dark'?'light':'dark';
    app.dataset.theme=themeState.value;
    document.documentElement.dataset.theme=themeState.value;
    if(browserThemeColor)browserThemeColor.content=themeState.value==='dark'?'#151619':'#f3f7f5';
    toggle.textContent=themeState.value==='dark'?'라이트 모드':'다크 모드';
  toggle?.setAttribute('aria-label',themeState.value==='dark'?'라이트 모드로 전환':'다크 모드로 전환');
    if(!suppressPreferenceSave)safeStorageSet(THEME_KEY,themeState.value);
    applyTheme();
    if(!suppressPreferenceSave&&typeof window.CustomEvent==='function')window.dispatchEvent(new CustomEvent('dongjak:manual-theme-change',{detail:{theme:themeState.value}}));
  });
  // Night vision uses the normal theme toggle pipeline (including listeners
  // installed by other map layers) but never overwrites the user preference.
  const setTemporaryTheme=next=>{
    if(next!=='light'&&next!=='dark')return;
    if(next===themeState.value)return;
    if(!toggle)return;
    suppressPreferenceSave=true;
    try{toggle.click();}finally{suppressPreferenceSave=false;}
  };
  return {currentTheme:()=>themeState.value,refresh:applyTheme,setTemporaryTheme};
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
        const allowed=['bus','rail','hospital','clinic','pharmacy','police','fire_station','emergency'];
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
export function clipBasemapLabelsToDistrict(map, geometry){
  if(!geometry)return;
  const within=['within',{type:geometry.type,coordinates:geometry.coordinates}];
  let done=0;
  for(const layer of map.getStyle().layers){
    if(layer.type!=='symbol'||layer.id.startsWith('transport-'))continue;
    // Hangang bridge labels are deliberately north of the district boundary.
    // Do not clip these five named crossings with the Dongjak-only POI filter.
    if(layer.id.startsWith('dongjak-')||layer.id.startsWith('dj-hangang-bridge-'))continue;
    try{
      const original=map.getFilter(layer.id);
      map.setFilter(layer.id,['all',...(original?[original]:[]),within]);
      done++;
    }catch(error){console.warn('[경계 라벨] 필터 적용 생략',layer.id,error);}
  }
  console.info(`[v17.7] 동작구 경계 내부 라벨만 ${done}개 레이어에 적용`);
}
