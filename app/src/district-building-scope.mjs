// Scope only building geometry, never transportation or district outlines.
export function isNativeBuildingGeometry(layer={}){
 return ['fill','fill-extrusion','line'].includes(layer.type)&&!String(layer.id||'').startsWith('dongjak-buildings-')&&(layer['source-layer']==='building'||(/building|structure/i.test(layer.id||'')&&!/road|bridge|label|name|district|safety|night/i.test(layer.id||'')));
}
export function installDistrictBuildingScope(map){
 let boundary=null,key='',original=new Map();
 const sync=()=>{
  for(const layer of map.getStyle()?.layers||[]){
   if(!isNativeBuildingGeometry(layer))continue;
   const id=layer.id;
   if(!original.has(id))original.set(id,map.getFilter(id)||null);
   const base=original.get(id);
   const rule=boundary?['<=',['distance',boundary],0]:['==',1,0];
   const next=base?['all',base,rule]:rule;
   if(JSON.stringify(map.getFilter(id)||null)!==JSON.stringify(next))map.setFilter(id,next);
  }
 };
 sync();
 map.on('style.load',()=>{original=new Map();sync();});
 return {update(geometry){if(!['Polygon','MultiPolygon'].includes(geometry?.type))return;
  const next=JSON.stringify(geometry);if(next===key)return;
  key=next;boundary=geometry;sync();
 }};
}
export function containsDistrictPoint(geometry,x,y){
 const inside=ring=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }return hit;};
 const polys=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 return Number.isFinite(x)&&Number.isFinite(y)&&polys.some(r=>inside(r[0])&&!r.slice(1).some(inside));
}
