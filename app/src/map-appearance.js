import {installAdaptiveMapPerformance} from './v7122-map-performance.js';
// v17.9: cartographic decoration (not measurements of grass or trees).
// Decorative grass pattern is applied to existing map polygons only.
export function isVegetationLayer(layer={}) {
  if(layer.type!=='fill')return false;
  const id=String(layer.id||'').toLowerCase();
  return /park|grass|garden|meadow|forest|wood|green_space/.test(id)
    && !/outline|border|casing|water|wetland|contour|label/.test(id);
  // Generic landcover layers contain mixed classes and must NOT be painted green wholesale.
}
function proceduralGrass(isDark){
  const canvas=document.createElement('canvas');
  canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=isDark?'#274333':'#b4cea3';
  ctx.fillRect(0,0,64,64);
  let seed=1789127;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  // Repeating texture represents vegetation decoratively; not individual trees.
  for(let i=0;i<100;i++){
    const x=rand()*64,y=rand()*64;
    const alpha=.10+rand()*.24;
    ctx.strokeStyle=isDark?`rgba(113,173,113,${alpha})`:`rgba(96,151,80,${alpha})`;
    ctx.lineWidth=.6+rand()*.75;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*1.7-.85,y-1.0-rand()*3.4);ctx.stroke();
  }
  for(let i=0;i<9;i++){
    const x=rand()*64,y=rand()*64;
    ctx.fillStyle=isDark?'rgba(58,112,66,.28)':'rgba(65,139,76,.28)';
    ctx.beginPath();ctx.ellipse(x,y,1.2+rand()*1.7,1.2+rand()*1.7,0,0,Math.PI*2);ctx.fill();
  }
  return ctx.getImageData(0,0,64,64);
}
/**
 * 숲·산림은 공원과 같은 녹색 계열이되 약간 더 진하게 유지합니다.
 * OpenFreeMap 스타일의 landcover/landuse 소스에서 실제 forest/wood 유형만 사용합니다.
 */
export const GREEN_PALETTE={
  light:{park:'#a5ca92',forest:'#92bd86'},
  dark:{park:'#34583e',forest:'#305442'}
};
const forestId=(id='')=>/forest|wood|woodland|treecover|scrub/.test(String(id).toLowerCase());
const forestTypes=['forest','wood','woodland','trees','wooded','tree','scrub','natural_wood'];
function isDark(app){return app?.dataset?.theme==='dark';}
function palette(app){return GREEN_PALETTE[isDark(app)?'dark':'light'];}
export function installGrassTexture({map,app}){
  const ids=map.getStyle().layers.filter(isVegetationLayer).map(l=>l.id);
  const paint=()=>{
    const colors=palette(app);
    for(const id of ids){
      if(!map.getLayer(id))continue;
      try{
        map.setPaintProperty(id,'fill-pattern',null);
        map.setPaintProperty(id,'fill-color',forestId(id)?colors.forest:colors.park);
        // 원래 스타일의 희미한 opacity 때문에 산림이 회색으로 보이는 문제를 방지.
        map.setPaintProperty(id,'fill-opacity',['interpolate',['linear'],['zoom'],11,0.88,15,0.82,17,0.66,19,0.56]);
      }catch(error){console.debug('[녹지 색상] 레이어 생략',id,error);}
    }
  };
  paint();
  document.getElementById('theme-toggle')?.addEventListener('click',()=>requestAnimationFrame(paint));
  return ids.length;
}

/**
 * base map에서 넓은 산림을 매우 희미하게 렌더링하는 경우를 보정합니다.
 * 벡터 타일에 class/subclass가 forest/wood로 명시된 폴리곤만 덧칠합니다.
 * 도로·역 라벨은 가리지 않도록 최초 도로 레이어 바로 아래에 배치합니다.
 */
export function installForestShade({map,app}){
  const candidates=new Map();
  const layers=map.getStyle().layers;
  for(const layer of layers){
    const srcLayer=String(layer['source-layer']||'').toLowerCase();
    if(layer.type!=='fill'||!['landcover','landuse'].includes(srcLayer)||!layer.source)continue;
    const key=`${layer.source}/${srcLayer}`;
    if(!candidates.has(key))candidates.set(key,{source:layer.source,'source-layer':layer['source-layer']});
  }
  const firstRoad=layers.find(l=>['line','fill'].includes(l.type)&&/road|transportation|highway|street|bridge/.test(l.id.toLowerCase()))?.id;
  const firstSymbol=layers.find(l=>l.type==='symbol')?.id;
  const before=firstRoad||firstSymbol;
  const ids=[];
  for(const candidate of candidates.values()){
    const id=`dongjak-forest-shade-${ids.length}`;
    try{
      map.addLayer({id,type:'fill',source:candidate.source,'source-layer':candidate['source-layer'],
        filter:['any',
          ['in',['coalesce',['get','class'],''],['literal',forestTypes]],
          ['in',['coalesce',['get','subclass'],''],['literal',forestTypes]],
          ['in',['coalesce',['get','type'],''],['literal',forestTypes]]
        ],
        paint:{'fill-color':palette(app).forest,'fill-opacity':0.85}},before);
      ids.push(id);
    }catch(error){console.warn('[산림 폴리곤] 추가 불가',candidate['source-layer'],error?.message);}
  }
  const recolor=()=>{for(const id of ids)if(map.getLayer(id)){
    try{map.setPaintProperty(id,'fill-color',palette(app).forest);}catch{}
  }};
  document.getElementById('theme-toggle')?.addEventListener('click',()=>requestAnimationFrame(recolor));
  return ids;
}

/** v5.12.6 — Opaque overhead footprints prevent double-shading where native and GIS buildings overlap. */
export const BUILDING_VISUAL_PALETTE=Object.freeze({
  light:Object.freeze({footprint:'#c4d1d0',footprintOpacity:1,obliqueOpacity:0.12,extrusion:'#f1f3f1',nearOpacity:0.38,farOpacity:0.22}),
  dark:Object.freeze({footprint:'#40575d',footprintOpacity:1,obliqueOpacity:0.07,extrusion:'#30464d',nearOpacity:0.88,farOpacity:0.82})
});
export function nativeBuildingFootprint(layer={}){
  if(layer.type!=='fill')return false;
  const id=String(layer.id||'').toLowerCase();
  const sourceLayer=String(layer['source-layer']||'').toLowerCase();
  return (/building/.test(id)||sourceLayer==='building') && !/outline|casing|label|name/.test(id);
}
export function nativeBuildingExtrusion(layer={}){
  if(layer.type!=='fill-extrusion')return false;
  const id=String(layer.id||'').toLowerCase();
  const sourceLayer=String(layer['source-layer']||'').toLowerCase();
  if(id.startsWith('dongjak-buildings-3d-'))return false;
  return (/building|structure/.test(id)||sourceLayer==='building')
    && !/outline|casing|label|name|bridge|tree|canopy|night|safety|district/.test(id);
}
// Native building outline layers are distinct from road outlines and labels.
export function nativeBuildingOutline(layer={}){
  if(layer.type!=='line')return false;
  const id=String(layer.id||'').toLowerCase();
  const sourceLayer=String(layer['source-layer']||'').toLowerCase();
  return (/building|structure/.test(id)||sourceLayer==='building') &&
    !/label|name|road|route|transport|district/.test(id);
}
// Separate overhead GIS footprints from oblique 3D massing. The old
// smoothstep faded the 2D polygons too slowly (7–12% remained at high pitch),
// causing double-shading of roofs and ground footprints beneath extrusions.
export const BUILDING_PLAN_HIDE_PITCH=19;
export function buildingPlanVisibility(pitch=0){
  const p=Math.max(0,Number(pitch)||0);
  if(p<=3)return 1;
  if(p>=BUILDING_PLAN_HIDE_PITCH)return 0;
  const x=(p-3)/(BUILDING_PLAN_HIDE_PITCH-3);
  return Number(Math.pow(1-x,2.2).toFixed(3));
}
export function buildingFootprintPaint(theme='light',pitch=0){
  const p=BUILDING_VISUAL_PALETTE[theme==='dark'?'dark':'light'];
  return {'fill-color':p.footprint,
    // Fully opaque when looking straight down; completely off in 3D view.
    'fill-opacity':buildingPlanVisibility(pitch),
    'fill-antialias':false};
}
export function buildingFootprintOutlinePaint(theme='light',pitch=0){
  return {'line-color':theme==='dark'?'#9cb6b7':'#7c918f',
    'line-opacity':0,
    'line-width':0.4};
}
export function buildingExtrusionAppearance(theme='light',pitch=30,start=10,full=30){
  const p=BUILDING_VISUAL_PALETTE[theme==='dark'?'dark':'light'];
  const fade=Math.max(0,Math.min(1,(pitch-start)/Math.max(1,full-start)));
  return {color:p.extrusion,opacity:Number((p.nearOpacity-(p.nearOpacity-p.farOpacity)*fade).toFixed(3))};
}

/** Night analysis: roads beneath translucent 3D roofs must not appear
 * brighter than the road surface. Near-opaque dark building mass blocks them.
 * Applied only while the night study is enabled; restores ordinary styling off.
 */
export function nightOcclusionBuildingPaint(appearance={},enabled=false){
  return enabled?{...appearance,color:'#192c34',opacity:Math.max(0.91,Number(appearance.opacity)||0)}:appearance;
}

/** Recolor only native footprint polygons; preserve road and night overlays. */
const interactivePerformanceInstalled=new WeakSet();
export function installBaseBuildingPalette({map,app}){
  if(!interactivePerformanceInstalled.has(map)){
    interactivePerformanceInstalled.add(map);
    installAdaptiveMapPerformance({map,app});
  }
  const ids=map.getStyle().layers.filter(nativeBuildingFootprint).map(x=>x.id);
  const outlineIds=map.getStyle().layers.filter(nativeBuildingOutline).map(x=>x.id);
  let previousTheme='',previousOpacity=NaN;
  const paint=()=>{
    const theme=app.dataset.theme;
    const colors=buildingFootprintPaint(theme,map.getPitch?.()??0);
    if(theme===previousTheme && Math.abs(colors['fill-opacity']-previousOpacity)<0.012)return;
    previousTheme=theme;previousOpacity=colors['fill-opacity'];
    for(const id of ids){
      if(!map.getLayer(id))continue;
      try{for(const [key,value] of Object.entries(colors))map.setPaintProperty(id,key,value);}
      catch(error){console.debug('[건물 바닥 색상]',id,error?.message);}
    }
    // Native building outlines would duplicate the extrusion edges in 3D.
    // Keep them hidden in *both* plan and oblique views, leaving road/boundary layers intact.
    for(const id of outlineIds){
      if(!map.getLayer(id))continue;
      try{map.setPaintProperty(id,'line-opacity',0);}
      catch(error){console.debug('[원본 건물 윤곽]',id,error?.message);}
    }
  };
  paint();
  // Basemap footprint fill is continuous from overhead to oblique; extrusions are handled elsewhere.
  map.on?.('pitch',paint);
  document.getElementById('theme-toggle')?.addEventListener('click',()=>requestAnimationFrame(paint));
  return ids;
}
