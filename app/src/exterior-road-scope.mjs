// Only native transportation geometry is affected. Selected routes, safety
// data, GIS roads, rail/water and owned labels keep their own rendering.
const major=['motorway','trunk','primary','secondary','motorway_link','trunk_link','primary_link','secondary_link'];
export function isExteriorDetailRoad(layer={}){
 const id=String(layer.id||'').toLowerCase();
 return ['line','fill'].includes(layer.type)&&layer['source-layer']==='transportation'&&!/rail|metro|subway|tram|ferry|aerialway|ship|water|contour/.test(id)&&/road|highway|street|path|footway|pedestrian|cycleway|steps|motorway|trunk|primary|secondary|tertiary|residential|minor|service|bridge|tunnel|transportation/.test(id);
}
export function exteriorRoadRule(geometry){
 return ['any',['in',['coalesce',['get','class'],''],['literal',major]],['<=',['distance',geometry],0]];
}
export function installExteriorRoadScope(map){
 let geometry=null,transit=false,dirty=false,owned=new Map();
 const signature=v=>JSON.stringify(v??null);
 const apply=()=>{
  if(!geometry)return;
  const rule=exteriorRoadRule(geometry);
  for(const layer of map.getStyle()?.layers||[]){
   if(!isExteriorDetailRoad(layer))continue;
   const id=layer.id,current=map.getFilter(id)||null,previous=owned.get(id);
   // Other style owners may update a base predicate; retain it instead of
   // recursively nesting our own expression.
   const base=previous&&signature(current)===signature(previous.applied)?previous.base:current;
   const next=transit?base:base?['all',base,rule]:rule;
   owned.set(id,{base,applied:next});
   if(signature(current)!==signature(next))map.setFilter(id,next);
  }
 };
 map.on('style.load',()=>{owned=new Map();apply();});
 map.on('styledata',()=>{dirty=true;});
 map.on('idle',()=>{if(dirty){dirty=false;apply();}});
 return {update(next,active){if(!['Polygon','MultiPolygon'].includes(next?.type))return;geometry=next;transit=Boolean(active);apply();}};
}
