import {nightOwnsLayerOrder} from './v913-night-poi-isolation.js';
/**
 * v6.0.11 — Keep names anchored to the terrain, not raised 25–95 metres.
 * Layer order below, rather than symbol-height-offset, gives labels priority
 * over later-loaded 3D buildings. No DOM/canvas overlay is involved.
 */
export function labelHeightAtPitch(_pitch=0){
  // MapLibre measures this in actual metres above ground. 95m caused
  // 장승배기역/행정동 names to float in front of the horizon at oblique angles.
  return 0;
}
export function isReadablePointLabelLayer(layer){
  if(layer?.type!=='symbol')return false;
  if(!layer.layout?.['text-field'])return false;
  if(layer.layout?.['symbol-placement']&&layer.layout['symbol-placement']!=='point')return false;
  return /(name|label|poi|place|district|admin|school|station|bus|civic|bridge|featured|park|neighbor|dong)/i.test(layer.id||'');
}

// These are priority labels, not a blanket "allow-overlap" policy for all OSM POIs.
// Keep the same ending as featured-place-labels.js::bringToFront so that the two
// installers do not continuously move layers back and forth on every idle event.
export const FRONT_LABEL_ORDER = Object.freeze([
  'neighbor-district-names',
  'dj-nearby-place-names',
  'dj-nodeulseom-detail-pin',
  'dj-nodeulseom-detail-name',
  'dongjak-park-names',
  'dongjak-admin-dong-labels',
  'dj-civic-poi-school',
  'dj-civic-poi-civic',
  'dj-civic-poi-sports',
  'transport-subway-names',
  'dj-metro-summary-name',
  'dj-metro-detail-name',
  'dj-metro-detail-name-very-close',
  'dj-basemap-bus-stop-names',
  'transport-bus-names',
  'transport-bus-names-close',
  'dongjak-zoom-busstop-names',
  'dongjak-featured-place-dots',
  'dongjak-featured-place-logos',
  'dongjak-featured-place-names',
  // Exit badges remain above ordinary facilities; bridges retain their final slots.
  'metro-access-elevator',
  'metro-access-escalator',
  'metro-access-stairs',
  'metro-access-exits',
  'metro-access-exit-labels',
  'dj-hangang-bridge-geometry-labels',
  'dj-hangang-bridge-osm-labels'
]);

function lastLayersMatch(actual,desired){
  return desired.length===0 || actual.slice(-desired.length).every((id,index)=>id===desired[index]);
}

/**
 * Reorder only if the actual map style differs; a map.moveLayer call raises
 * styledata and can otherwise cause an expensive perpetual repaint loop.
 * Keep extrusions below the first symbol (the MapLibre documented 3D recipe),
 * then lift a small set of verified user-facing names above other features.
 * These layer changes do NOT change symbol elevation or screen position.
 */
const promotingMaps=new WeakSet();
export function promoteReadable3DLabelLayers(map){
  if(!map?.getStyle||!map?.moveLayer||map.isMoving?.()||nightOwnsLayerOrder(map)||promotingMaps.has(map))return false;
  promotingMaps.add(map);
  try {return applyReadableLayerOrder(map);}finally{promotingMaps.delete(map);}
}
function applyReadableLayerOrder(map){
  const style=map.getStyle();
  const layers=style?.layers||[];
  const firstTextOrIcon=layers.find(layer=>layer.type==='symbol')?.id;
  let moved=false;
  if(firstTextOrIcon){
    const firstIndex=layers.findIndex(layer=>layer.id===firstTextOrIcon);
    // A newly loaded 3D sheet must not be inserted over a district/POI label.
    for(const layer of layers.slice(firstIndex+1)){
      if(layer.type!=='fill-extrusion')continue;
      try{map.moveLayer(layer.id,firstTextOrIcon);moved=true;}catch{}
    }
  }
  const ids=(map.getStyle()?.layers||[]).map(layer=>layer.id);
  // Featured-place installer only promotes bridge labels if both layers exist.
  // Match that condition to prevent an idle-event reorder cycle during partial loads.
  const hasBothBridges=ids.includes('dj-hangang-bridge-geometry-labels')&&ids.includes('dj-hangang-bridge-osm-labels');
  const desired=FRONT_LABEL_ORDER.filter(id=>ids.includes(id)&&(hasBothBridges||!id.startsWith('dj-hangang-bridge-')));
  if(!lastLayersMatch(ids,desired)){
    // Move each managed symbol once; unrelated basemap labels keep their order.
    for(const id of desired){
      try{map.moveLayer(id);moved=true;}catch{}
    }
  }
  return moved;
}

export function installReadable3DLabels({map,app}={}){
  if(!map?.getStyle||!map?.setLayoutProperty)return ()=>{};
  let removed=false,pending=false,updating=false,lastOrder='';
  function update(){
    pending=false;
    if(app?.dataset?.djTransitExterior==='true'||removed||updating||map.isMoving?.()||nightOwnsLayerOrder(map))return;
    const order=(map.getStyle()?.layers||[]).map(l=>l.id).join('|');
    if(order===lastOrder)return;
    updating=true;
    try{
      const height=labelHeightAtPitch(map.getPitch?.()??0);
      for(const layer of map.getStyle()?.layers||[]){
        const isText=isReadablePointLabelLayer(layer);
        const isFeaturedIcon=layer.id==='dongjak-featured-place-logos';
        if(!isText&&!isFeaturedIcon)continue;
        try{
          if(map.getLayoutProperty?.(layer.id,'symbol-height-offset')!==height){
            map.setLayoutProperty(layer.id,'symbol-height-offset',height);
          }
        }catch{/* Some external styles reject this property. Other labels remain intact. */}
      }
      promoteReadable3DLabelLayers(map);
      lastOrder=(map.getStyle()?.layers||[]).map(l=>l.id).join('|');
    }finally{updating=false;}
  }
  function schedule(){
    if(app?.dataset?.djTransitExterior==='true'||pending||removed||updating||map.isMoving?.())return;
    pending=true;
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(update);
    else update();
  }
  // idle also covers late-added building sheets, transit layers and admin labels.
  map.on?.('pitchend',schedule);
  map.on?.('styledata',schedule);
  map.on?.('idle',schedule);
  const resetOrder=()=>{lastOrder='';schedule();};
  map.on?.('moveend',schedule);
  map.on?.('style.load',resetOrder);
  schedule();
  return ()=>{
    removed=true;
    map.off?.('pitchend',schedule);
    map.off?.('styledata',schedule);
    map.off?.('idle',schedule);
    map.off?.('moveend',schedule);
    map.off?.('style.load',resetOrder);
  };
}
