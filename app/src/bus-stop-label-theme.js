/** Consistent bus-stop labels for official, close-zoom and native-tile fallback sources. */
export const BUS_STOP_LABEL_IDS=Object.freeze([
  'transport-bus-names','transport-bus-names-close',
  'dj-basemap-bus-pictogram','dongjak-zoom-busstop-names'
]);
export const BUS_LABEL_FONT=['Noto Sans Bold','Noto Sans Regular','Open Sans Semibold','Open Sans Regular'];
export const BUS_LABEL_SIZE=['interpolate',['linear'],['zoom'],13.3,10,16,11.6,17.15,11.7,20,11.7];
export function busStopLabelPalette(theme='light'){
  return theme==='dark'
    ? {text:'#EEF7FB',halo:'#10252E',width:1.05}
    : {text:'#18508E',halo:'#F8FBFD',width:1.05};
}
export function applyBusStopLabelTheme(map,theme='light'){
  const colors=busStopLabelPalette(theme);
  // The stop pictogram appears at zoom 16.4. Reveal the nearby stop name at
  // roughly the same street-level scale, with MapLibre collision detection.
  // Missing/older styles simply ignore this optional zoom-range adjustment.
  if(map?.getLayer?.('transport-bus-names') && typeof map.setLayerZoomRange==='function'){
    try{map.setLayerZoomRange('transport-bus-names',16.0,17.8);}catch{}
  }
  let updated=0;
  for(const id of BUS_STOP_LABEL_IDS){
    if(!map?.getLayer?.(id))continue;
    try{
      if(map.setLayoutProperty&&map.getLayoutProperty){for(const [key,value] of [['text-font',BUS_LABEL_FONT],['text-size',BUS_LABEL_SIZE],['text-offset',[0,1.4]],['text-anchor','top'],['text-max-width',14]])if(JSON.stringify(map.getLayoutProperty(id,key))!==JSON.stringify(value))map.setLayoutProperty(id,key,value);}
      map.setPaintProperty(id,'text-color',colors.text);
      map.setPaintProperty(id,'text-halo-color',colors.halo);
      map.setPaintProperty(id,'text-halo-width',colors.width);
      updated++;
    }catch{/* Optional map layers may be absent while the style loads. */}
  }
  return updated;
}
