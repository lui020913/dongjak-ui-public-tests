// A building belongs to Dongjak if its actual polygon intersects the district.
// MapLibre distance accepts polygon features; 'within' does not. Zero distance
// excludes fully exterior footprints, while keeping boundary-crossing buildings.
// No change to tile source, native paint, GIS deduplication or transit mode.
export function isDistrictBuildingLayer(layer={}){
 return ['fill','fill-extrusion','line'].includes(layer.type)&&(
  layer['source-layer']==='building'||/^dongjak-buildings-(?:footprint|outline|3d)-/.test(layer.id||''));
}
const stamp=x=>JSON.stringify(x??null);
export function createDistrictBuildingScope(map){
 let geometry=null,clause=null;
 const original=new Map(),applied=new Map();
 const sync=(ids=null)=>{
  if(!clause)return;
  const layers=map.getStyle()?.layers||[];
  for(const layer of layers){
   if(!isDistrictBuildingLayer(layer)||ids&&!ids.includes(layer.id))continue;
   const current=map.getFilter(layer.id)||null;
   const key=stamp(current);
   if(key===applied.get(layer.id))continue;
   // Recreated GIS layers and style reloads can share IDs. Read the actual
   // original filter, not a stale snapshot from a previous source.
   if(!original.has(layer.id)||key!==applied.get(layer.id))original.set(layer.id,current);
   const base=original.get(layer.id);
   const filter=['all',...(base?[base]:[]),clause];
   map.setFilter(layer.id,filter);
   applied.set(layer.id,stamp(filter));
  }
 };
 function update(next){
  if(!['Polygon','MultiPolygon'].includes(next?.type)||!next.coordinates?.length)return false;
  const value={type:next.type,coordinates:next.coordinates};
  if(stamp(value)===stamp(geometry))return true;
  geometry=value;clause=['<=',['distance',geometry],0];
  // Preserve each native/GIS original predicate when the official SGIS
  // geometry replaces the lightweight startup boundary.
  for(const layer of map.getStyle()?.layers||[]){
   if(!isDistrictBuildingLayer(layer))continue;
   const current=map.getFilter(layer.id)||null;
   if(stamp(current)!==applied.get(layer.id))original.set(layer.id,current);
   const base=original.get(layer.id);
   const filter=['all',...(base?[base]:[]),clause];
   map.setFilter(layer.id,filter);applied.set(layer.id,stamp(filter));
  }
  return true;
 }
 map.on?.('style.load',()=>{original.clear();applied.clear();sync();});
 return {sync,update};
}
