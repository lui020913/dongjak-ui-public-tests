/** Keep road direction symbols attached to geographic road geometry (not the viewport). */
export function isRoadDirectionSymbolLayer(layer={}){
  if(layer.type!=='symbol')return false;
  const id=String(layer.id||'').toLowerCase();
  const source=String(layer['source-layer']||'').toLowerCase();
  const icon=JSON.stringify(layer.layout?.['icon-image']||'').toLowerCase();
  return /oneway|one-way|direction-arrow|road-arrow|arrow.*road/.test(id)
    || (/oneway|one-way|arrow/.test(icon)&&/transportation|road|street|highway/.test(source));
}

