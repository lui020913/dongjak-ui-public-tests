import {installDongjakLiveTransit} from './features/liveTransit/integrate.js';
import {insideBoundary} from './fixed-rail-lines.js';
/**
 * Base-map display preferences. Does not fetch data, remove sources, or change
 * pedestrian routes or public API settings.
 */
export const BASE_LAYER_STORAGE_KEY='dongjak_basemap_layers_v1';
export const BASE_LAYER_DEFAULTS=Object.freeze({metro:true,bus:true,buildings:true,boundary:true});

export const BASE_LAYER_IDS=Object.freeze({
  metro:[
    'transport-schematic-subway-casing','transport-schematic-subway',
    'transport-real-rail-overview-casing','transport-real-rail-overview',
    'transport-platform-area','transport-platform-outline','transport-platform-surface',
    'dj-metro-summary-mobile-hubs-icon','dj-metro-summary-icon','dj-metro-summary-name',
    'dj-metro-detail-icon','dj-metro-detail-name','dj-metro-detail-name-very-close'
  ],
  bus:['transport-bus-stop','transport-bus-names','transport-bus-names-close','dj-transport-bus-pictogram','dj-basemap-bus-pictogram'],
  boundary:['district-border-halo','district-border']
});

export function normalizeBaseLayerSettings(raw){
  if(!raw||typeof raw!=='object')return {...BASE_LAYER_DEFAULTS};
  return Object.fromEntries(Object.entries(BASE_LAYER_DEFAULTS).map(([key,defaultValue])=>
    [key,typeof raw[key]==='boolean'?raw[key]:defaultValue]));
}

export function applyBaseLayerVisibility(map,settings){
  const normalized=normalizeBaseLayerSettings(settings);
  for(const key of ['metro','bus','boundary']){
    const desired=normalized[key]?'visible':'none';
    for(const id of BASE_LAYER_IDS[key]){
      try{
        if(!map.getLayer(id))continue;
        const current=map.getLayoutProperty(id,'visibility')||'visible';
        if(current!==desired)map.setLayoutProperty(id,'visibility',desired);
      }catch(error){console.debug(`[지도 표시 설정] ${id} 제외`,error);}
    }
  }
  return normalized;
}

export function installBaseLayerControls({map,app,onBuildingsChange=()=>{}}){
  const wrapper=document.getElementById('base-layer-controls');
  const buttons=[...wrapper?.querySelectorAll('[data-base-layer]')||[]];
  let stored=null;
  try{stored=JSON.parse(localStorage.getItem(BASE_LAYER_STORAGE_KEY)||'null');}catch{}
  const state=normalizeBaseLayerSettings(stored);
  const sync=()=>{
    app.dataset.baseMetro=state.metro?'on':'off';
    app.dataset.baseBus=state.bus?'on':'off';
    app.dataset.baseBoundary=state.boundary?'on':'off';
    app.dataset.baseBuildings=state.buildings?'on':'off';
    for(const btn of buttons){
      const key=btn.dataset.baseLayer;
      btn.setAttribute('aria-pressed',String(state[key]));
      btn.title=`${btn.textContent.trim()} ${state[key]?'숨기기':'표시하기'}`;
    }
    applyBaseLayerVisibility(map,state);
    onBuildingsChange(state.buildings);
    // Basemap POI transit filter is managed independently from the native rail/stop layer.
    document.dispatchEvent(new Event('dongjak-base-layer-change'));
  };
  for(const btn of buttons){
    btn.addEventListener('click',()=>{
      const key=btn.dataset.baseLayer;
      if(!Object.hasOwn(BASE_LAYER_DEFAULTS,key))return;
      state[key]=!state[key];
      try{localStorage.setItem(BASE_LAYER_STORAGE_KEY,JSON.stringify(state));}catch{}
      sync();
    });
  }
  sync();
  // v8.2.7: opt-in isolated live vehicles. This is the EXISTING map instance.
  // Do not edit the SHA-protected src/main.js or the established transport renderer.
  const status=document.getElementById('dj-live-vehicle-status');
  if(status){
    let elapsed=0,booted=false,boundary=null,boundaryFailed=false;
    const boundaryTask=fetch('https://raw.githubusercontent.com/KnellBalm/kr-admin-geojson/main/sig.geojson',
      {cache:'force-cache',signal:AbortSignal.timeout(12500)})
      .then(response=>{if(!response.ok)throw new Error('boundary HTTP '+response.status);return response.json();})
      .then(data=>{
        boundary=data?.features?.find(f=>f?.properties?.SIG_KOR_NM==='동작구'||f?.properties?.FULL_NM==='서울특별시 동작구')?.geometry;
        if(!boundary)throw new Error('Dongjak boundary missing');
      }).catch(error=>{boundaryFailed=true;console.warn('[실시간 차량] 공식 경계 불러오기 실패:',error.message);});
    const interval=setInterval(()=>{
      elapsed+=500;
      if(!map.getSource?.('transport-metro-geographic-markers')&&!boundaryFailed&&elapsed<24000)return;
      if(booted)return;
      if(!boundary&&!boundaryFailed)return;
      booted=true;clearInterval(interval);
      if(boundaryFailed){status.textContent='공식 동작구 경계 확인 실패 · 차량 표시 보류';return;}
      // Load on demand only after MapLibre's native transport renderer is ready.
      void Promise.all([import('maplibre-gl'),import('./features/liveTransit/live-transit.css')])
        .then(([maplibregl])=>installDongjakLiveTransit({map,maplibregl,app,
          isDongjak:(lng,lat)=>insideBoundary([lng,lat],boundary)}))
        .catch(error=>{status.textContent='실시간 차량 모듈 불러오기 실패';console.warn(error);});
    },500);
    // Keep boundaryTask observed; it runs once and never modifies existing layers.
    void boundaryTask;
  }
  return {sync,apply:()=>applyBaseLayerVisibility(map,state),settings:()=>({...state})};
}
