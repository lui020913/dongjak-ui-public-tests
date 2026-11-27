// Suppress only upstream decorative geometry. Dongjak's owned outline and
// actual road centerlines, station labels and selected routes are not touched.
export function quietNativeLine(layer={}){
 const src=String(layer['source-layer']||'').toLowerCase();
 const id=String(layer.id||'').toLowerCase();
 return layer.type==='line'&&Boolean(layer.source)&&(
  src==='boundary'||src==='waterway'&&/river|waterway/.test(id)||
  src==='transportation'&&/(^|[-_])ferry($|[-_])/.test(id)
 );
}
export function nativeVehicleArea(layer={}){
 return layer.type==='fill'&&layer['source-layer']==='transportation'&&
  /highway|road|transportation/.test(layer.id||'')&&!/rail|bridge|tunnel|pier/.test(layer.id||'');
}
export function installQuietBasemap(map){
 const originals=new Map();
 const apply=()=>{
  for(const layer of map.getStyle()?.layers||[]){
   if(quietNativeLine(layer)){
    if(map.getLayoutProperty(layer.id,'visibility')!=='none')map.setLayoutProperty(layer.id,'visibility','none');
   }else if(nativeVehicleArea(layer)){
    if(!originals.has(layer.id))originals.set(layer.id,map.getFilter(layer.id)||null);
    const base=originals.get(layer.id),rule=['in',['coalesce',['get','class'],''],['literal',['path','pedestrian','footway','cycleway','steps']]];
    const next=base?['all',base,rule]:rule;
    if(JSON.stringify(map.getFilter(layer.id)||null)!==JSON.stringify(next))map.setFilter(layer.id,next);
   }
  }
 };
 map.on('style.load',()=>{originals.clear();apply();});map.on('load',apply);
}
