// Shared render scope, independent of walking/transit UI state.
export function isBuildingGeometryLayer(layer={}){
 const id=String(layer.id||''),kind=String(layer['source-layer']||'');
 return ['fill','fill-extrusion','line'].includes(layer.type)&&
  (id.startsWith('dongjak-buildings-')||kind==='building'||(/building|structure/i.test(id)&&!(/road|route|bridge|tree|canopy|label|name|district|night|safety/i.test(id))));
}
// MapLibre "within" only evaluates point/line features, not polygons.
// Polygon distance is evaluated in tile workers; exclude footprints that
// touch/cross the district boundary as well as completely outside buildings.
export function districtBuildingClause(geometry){
 if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type))return ['==',1,0];
 const rings=geometry.type==='Polygon'?geometry.coordinates:geometry.coordinates.flat();
 return ['all',['==',['distance',geometry],0],['>',['distance',{type:'MultiLineString',coordinates:rings}],0]];
}
export function createDistrictBuildingScope(map){
 let geometry=null,signature='',clause=districtBuildingClause(null);
 const originals=new Map(),applied=new Map();
 function apply(){
  for(const layer of map.getStyle()?.layers||[]){
   if(!isBuildingGeometryLayer(layer))continue;
   const id=layer.id,current=map.getFilter(id)||null,key=JSON.stringify(current);
   if(key===applied.get(id)&&originals.has(id))continue;
   if(!originals.has(id)||key!==applied.get(id))originals.set(id,current);
   const base=originals.get(id),filter=base?['all',base,clause]:clause;
   map.setFilter(id,filter);applied.set(id,JSON.stringify(filter));
  }
 }
 function setBoundary(next){
  const key=JSON.stringify(next);
  if(key===signature)return;
  // Restore the original predicates before replacing our own predicate.
  // Never stack a stale district filter on top of the authoritative boundary.
  for(const [id,base] of originals)if(map.getLayer(id))map.setFilter(id,base);
  applied.clear();geometry=next;signature=key;clause=districtBuildingClause(geometry);apply();
 }
 function forget(ids){for(const id of ids){originals.delete(id);applied.delete(id);}}
 return {apply,setBoundary,forget};
}
