// Scope only building geometry, never transportation or district outlines.
export function isNativeBuildingGeometry(layer={}){
 return ['fill','fill-extrusion','line'].includes(layer.type)&&!String(layer.id||'').startsWith('dongjak-buildings-')&&(layer['source-layer']==='building'||(/building|structure/i.test(layer.id||'')&&!/road|bridge|label|name|district|safety|night/i.test(layer.id||'')));
}
// Native tile polygons can be cut or quantized differently at each zoom.
// Disable their rendering entirely; the district-owned GIS tiles are the
// only building geometry source. No camera-dependent visibility mutations.
const NO_NATIVE_BUILDINGS=['==',1,0];
export function installDistrictBuildingScope(map){
 let geometry=null,scope=null;
 const sync=()=>{
  for(const layer of map.getStyle()?.layers||[]){
   if(!isNativeBuildingGeometry(layer))continue;
   if(JSON.stringify(map.getFilter(layer.id))!==JSON.stringify(NO_NATIVE_BUILDINGS))map.setFilter(layer.id,NO_NATIVE_BUILDINGS);
   if(map.getLayoutProperty?.(layer.id,'visibility')!=='none')map.setLayoutProperty?.(layer.id,'visibility','none');
  }
 };
 sync();map.on('style.load',sync);
 return {update(next){if(!['Polygon','MultiPolygon'].includes(next?.type))return;
  if(geometry!==next){geometry=next;scope=createDistrictFootprintScope(next);}
  sync();
 },contains(footprint){return scope?.contains(footprint)===true;}};
}
// Strict, conservative full footprint inclusion. An indexed district boundary
// is built once; a footprint touching an edge's bounding box is omitted rather
// than leaving part of a roof outside. No per-frame geometry work.
export function createDistrictFootprintScope(geometry){
 const polygons=g=>g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
 const district=polygons(geometry),rows=new Map(),cell=.001;
 for(const rings of district)for(const ring of rings)for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],edge=[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1]),a,b];
  for(let y=Math.floor(edge[1]/cell);y<=Math.floor(edge[3]/cell);y++){if(!rows.has(y))rows.set(y,[]);rows.get(y).push(edge);}
 }
 const inside=(x,y)=>{
  let hit=false;
  for(const e of rows.get(Math.floor(y/cell))||[]){const a=e[4],b=e[5];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}
  return hit;
 };
 return {contains(footprint){
  const parts=polygons(footprint);if(!parts.length||!district.length)return false;
  return parts.every(part=>{
   const ring=part[0];if(!Array.isArray(ring)||ring.length<4)return false;
   let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;
   for(const p of ring){if(!Number.isFinite(p?.[0])||!Number.isFinite(p?.[1]))return false;w=Math.min(w,p[0]);s=Math.min(s,p[1]);e=Math.max(e,p[0]);n=Math.max(n,p[1]);}
   if(!inside(ring[0][0],ring[0][1]))return false;
   for(let y=Math.floor(s/cell);y<=Math.floor(n/cell);y++)for(const edge of rows.get(y)||[]){
    if(edge[0]<=e&&edge[2]>=w&&edge[1]<=n&&edge[3]>=s)return false;
   }
   return true;
  });
 }};
}
export function containsDistrictPoint(geometry,x,y){
 const inside=ring=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }return hit;};
 const polys=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 return Number.isFinite(x)&&Number.isFinite(y)&&polys.some(r=>inside(r[0])&&!r.slice(1).some(inside));
}
