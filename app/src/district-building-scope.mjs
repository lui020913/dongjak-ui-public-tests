// Shared building-only filter. Do not change roads, land cover, POIs or route layers.
export function isNativeBuildingGeometry(layer={}){
 const id=String(layer.id||'');
 return layer['source-layer']==='building'&&['fill','fill-extrusion','line'].includes(layer.type)&&!id.startsWith('dongjak-buildings-');
}
export function createDistrictBuildingScope(map){
 const base=new Map();let geometry=null,last=new Map();
 const sync=()=>{
  const clause=geometry?['==',['distance',geometry],0]:['==',1,0];
  for(const l of map.getStyle()?.layers||[]){
   if(!isNativeBuildingGeometry(l))continue;
   if(!base.has(l.id))base.set(l.id,map.getFilter(l.id)||null);
   const original=base.get(l.id);
   const filter=original?['all',original,clause]:clause;
   const signature=JSON.stringify(filter);
   if(last.get(l.id)===signature&&JSON.stringify(map.getFilter(l.id))===signature)continue;
   map.setFilter(l.id,filter);last.set(l.id,signature);
  }
 };
 map.on('style.load',()=>{base.clear();last.clear();sync();});
 return {setBoundary(value){geometry=value;sync();},sync};
}
