/** Limit the thick white text halo without removing text contrast.
 * Runs on idle so MapLibre vector tile and asynchronously added custom labels
 * are both covered. Idempotent: a second call never changes the same paint.
 */
export const LABEL_HALO_MAX_PX=1.1;
export function slimMapTextHalos(map,{maxWidth=LABEL_HALO_MAX_PX}={}){
  let updated=0;
  for(const layer of map?.getStyle?.()?.layers||[]){
    if(layer.type!=='symbol'||!layer.layout?.['text-field'])continue;
    if(!map.getLayer?.(layer.id))continue;
    try{
      const value=map.getPaintProperty?.(layer.id,'text-halo-width');
      if(typeof value==='number'&&value>maxWidth){
        map.setPaintProperty(layer.id,'text-halo-width',maxWidth);updated++;
      }else if(Array.isArray(value)&&value[0]!=='min'){
        // Preserve interpolated cartographic sizes while capping their halo.
        map.setPaintProperty(layer.id,'text-halo-width',['min',value,maxWidth]);updated++;
      }
    }catch{/* Optional labels from third-party styles may not support this paint. */}
  }
  return updated;
}
