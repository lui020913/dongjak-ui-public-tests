// v17.9: cartographic decoration (not measurements of grass or trees).
// Decorative grass pattern is applied to existing map polygons only.
export function isVegetationLayer(layer={}) {
  if(layer.type!=='fill')return false;
  const id=String(layer.id||'').toLowerCase();
  return /park|grass|garden|meadow|forest|wood|green_space/.test(id)
    && !/outline|border|casing|water|wetland|contour|label/.test(id);
  // Generic landcover layers contain mixed classes and must NOT be painted green wholesale.
}
/**
 * 숲·산림은 공원과 같은 녹색 계열이되 약간 더 진하게 유지합니다.
 * OpenFreeMap 스타일의 landcover/landuse 소스에서 실제 forest/wood 유형만 사용합니다.
 */
export const GREEN_PALETTE={
  light:{park:'#a5ca92',forest:'#92bd86'}
};
const forestId=(id='')=>/forest|wood|woodland|treecover|scrub/.test(String(id).toLowerCase());
const forestTypes=['forest','wood','woodland','trees','wooded','tree','scrub','natural_wood'];
export function vegetationPalette(){return GREEN_PALETTE.light;}
function palette(app){return vegetationPalette(app);}
/** Apply the light palette to late-installed forest polygons too.
 * This is cartographic styling only; never change the lighting data or lines. */
export function repaintVegetation(map,app){
 const colors=vegetationPalette(app);
 for(const layer of map.getStyle()?.layers||[]){
  if(!isVegetationLayer(layer))continue;
  const color=forestId(layer.id)?colors.forest:colors.park;
  try{if(map.getPaintProperty(layer.id,'fill-color')!==color)map.setPaintProperty(layer.id,'fill-color',color);}catch{}
 }
}
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
  return ids;
}

/** Native footprints share a zoom-faded paint model with the GIS building overlays. */
export const BUILDING_VISUAL_PALETTE=Object.freeze({
  light:Object.freeze({footprint:'#fafafa',footprintOpacity:1,obliqueOpacity:0.12,extrusion:'#f1f3f1',nearOpacity:0.38,farOpacity:0.22})
});
export function buildingVisualPalette(){return BUILDING_VISUAL_PALETTE.light;}
export function nativeBuildingFootprint(layer={}){
  if(layer.type!=='fill'||String(layer.id||'').startsWith('dongjak-buildings-'))return false;
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
/** Fade building mass with map zoom; MapLibre evaluates this continuously while pinch-zooming. */
export const BUILDING_ZOOM_FADE_START=13.0;
export const BUILDING_ZOOM_FADE_END=15.0;
export function buildingZoomOpacityExpression(maxOpacity=1){
  const opacity=Math.max(0,Math.min(1,Number(maxOpacity)||0));
  return ['interpolate',['linear'],['zoom'],BUILDING_ZOOM_FADE_START,0,BUILDING_ZOOM_FADE_END,opacity];
}
export function buildingFootprintPaint(theme='light',pitch=0){
  const p=buildingVisualPalette(theme);
  return {'fill-color':p.footprint,
    'fill-outline-color':'#e2e2e2',
    // Overhead footprints fade out in 3D view.
    'fill-opacity':Number((p.footprintOpacity*buildingPlanVisibility(pitch)).toFixed(3)),
    'fill-antialias':true};
}
export function buildingFootprintOutlinePaint(theme='light',pitch=0){
  return {'line-color':'#7c918f',
    'line-opacity':0,
    'line-width':0.4};
}
export function buildingExtrusionAppearance(theme='light',pitch=30,start=10,full=30){
  const p=buildingVisualPalette(theme);
  const fade=Math.max(0,Math.min(1,(pitch-start)/Math.max(1,full-start)));
  return {color:p.extrusion,opacity:Number((p.nearOpacity-(p.nearOpacity-p.farOpacity)*fade).toFixed(3))};
}

/** Keep unmatched base buildings in both views; matched GIS polygons own the footprint. */
export function nativeBuildingFootprintPaint(theme='light'){
 const colors=buildingFootprintPaint(theme,0),opacity=colors['fill-opacity'];
 return {...colors,'fill-opacity':['interpolate',['linear'],['zoom'],BUILDING_ZOOM_FADE_START,0,BUILDING_ZOOM_FADE_END,['case',['boolean',['feature-state','djGisCovered'],false],0,opacity]]};
}
/** Recolor only native footprint polygons; preserve road and night overlays. */
export function installBaseBuildingPalette({map,app}){
  // The main building-mode owner is authoritative. No secondary performance
  // controller may toggle extrusion visibility during a drag.
  const ids=map.getStyle().layers.filter(nativeBuildingFootprint).map(x=>x.id);
  const outlineIds=map.getStyle().layers.filter(nativeBuildingOutline).map(x=>x.id);
  const extrusionIds=map.getStyle().layers.filter(nativeBuildingExtrusion).map(x=>x.id);
  const originalExtrusions=new Map(extrusionIds.map(id=>[id,{
    color:map.getPaintProperty?.(id,'fill-extrusion-color'),
    opacity:map.getPaintProperty?.(id,'fill-extrusion-opacity')
  }]));
  let previousTheme='',previousOpacity=NaN;
  const paint=()=>{
    const theme='light';
    const colors=buildingFootprintPaint(theme,0);
    // Zoom interpolation belongs to the paint expression, not a discrete zoomend repaint.
    const blended=nativeBuildingFootprintPaint(theme);
    if(theme===previousTheme && Math.abs(colors['fill-opacity']-previousOpacity)<0.012)return;
    previousTheme=theme;previousOpacity=colors['fill-opacity'];
    for(const id of ids){
      if(!map.getLayer(id))continue;
      try{for(const [key,value] of Object.entries(blended))map.setPaintProperty(id,key,value);}
      catch(error){console.debug('[건물 바닥 색상]',id,error?.message);}
    }
    // Native vector extrusions need the same fade as locally loaded GIS buildings.
    // Restore their original style on light mode; do not recolor route or safety overlays.
    for(const id of extrusionIds){
      if(!map.getLayer(id))continue;
      try{
        const original=originalExtrusions.get(id)||{};
        const c=original.color??null;
        const opacity=original.opacity??null;
        map.setPaintProperty(id,'fill-extrusion-color',c);
        map.setPaintProperty(id,'fill-extrusion-opacity',opacity);
      }catch(error){console.debug('[기본지도 3D 건물]',id,error?.message);}
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
  return ids;
}
