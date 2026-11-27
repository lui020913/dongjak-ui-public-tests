// Scope only building geometry, never transportation or district outlines.
export function isNativeBuildingGeometry(layer={}){
 return ['fill','fill-extrusion','line'].includes(layer.type)&&!String(layer.id||'').startsWith('dongjak-buildings-')&&(layer['source-layer']==='building'||(/building|structure/i.test(layer.id||'')&&!/road|bridge|label|name|district|safety|night/i.test(layer.id||'')));
}
// The district-distance test alone admits polygons touching or overlapping
// the district. Pair it with an exterior-distance guard while preserving the
// original tile layers, paint, zoom expressions and GIS coverage ownership.
export function districtBuildingFilter(geometry){
 const parts=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 const vertices=parts.flatMap(p=>p[0]);
 const w=Math.min(...vertices.map(p=>p[0]))-.25,e=Math.max(...vertices.map(p=>p[0]))+.25;
 const s=Math.min(...vertices.map(p=>p[1]))-.25,n=Math.max(...vertices.map(p=>p[1]))+.25;
 const outer=[[w,s],[e,s],[e,n],[w,n],[w,s]];
 const exterior={type:'MultiPolygon',coordinates:[[outer,...parts.map(p=>p[0])],...parts.flatMap(p=>p.slice(1).map(h=>[h]))]};
 return ['all',['<=',['distance',geometry],0],['>',['distance',exterior],0]];
}
export function installDistrictBuildingScope(map){
 let rule=['==',1,0],key='',original=new Map(),dirty=false;
 const sync=()=>{
  for(const layer of map.getStyle()?.layers||[]){
   if(!isNativeBuildingGeometry(layer))continue;
   const id=layer.id;
   if(!original.has(id))original.set(id,map.getFilter(id)||null);
   const base=original.get(id);
   const next=base?['all',base,rule]:rule;
   if(JSON.stringify(map.getFilter(id)||null)!==JSON.stringify(next))map.setFilter(id,next);
  }
 };
 sync();
 map.on('style.load',()=>{original=new Map();sync();});
 // Late style owners can replace a layer's filter. Reconcile on settled
 // style changes only, never on zoom/pitch/move frames.
 map.on('styledata',()=>{dirty=true;});
 map.on('idle',()=>{if(!dirty)return;dirty=false;sync();});
 return {update(geometry){if(!['Polygon','MultiPolygon'].includes(geometry?.type))return;
  const next=JSON.stringify(geometry);if(next===key)return;
  key=next;rule=districtBuildingFilter(geometry);sync();
 }};
}
export function containsDistrictPoint(geometry,x,y){
 const inside=ring=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }return hit;};
 const polys=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 return Number.isFinite(x)&&Number.isFinite(y)&&polys.some(r=>inside(r[0])&&!r.slice(1).some(inside));
}
