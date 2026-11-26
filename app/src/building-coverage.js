// A bounded spatial grid for conservatively matching native and loaded GIS
// footprints. Never hide an unmatched or unidentifiable native building.
export function buildingFootprintFilter(extruding){
 return extruding?['!=',['get','_render3d'],true]:null;
}
const CELL=.0005;
const polygons=g=>g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
function insideRing(p,ring){
 let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }return hit;
}
function inside(p,polygon){return insideRing(p,polygon[0])&&!polygon.slice(1).some(r=>insideRing(p,r));}
function box(r){let x=Infinity,y=Infinity,X=-Infinity,Y=-Infinity;for(const p of r){x=Math.min(x,p[0]);y=Math.min(y,p[1]);X=Math.max(X,p[0]);Y=Math.max(Y,p[1]);}return [x,y,X,Y];}
function keys(b){const result=[];for(let x=Math.floor(b[0]/CELL);x<=Math.floor(b[2]/CELL);x++)for(let y=Math.floor(b[1]/CELL);y<=Math.floor(b[3]/CELL);y++)result.push(x+':'+y);return result;}
export function createCoverageIndex(features){
 const grid=new Map();
 for(const f of features)for(const polygon of polygons(f.geometry)){
  if(!polygon?.[0]?.length)continue;const bounds=box(polygon[0]);const entry={polygon,bounds};
  for(const k of keys(bounds)){if(!grid.has(k))grid.set(k,[]);grid.get(k).push(entry);}
 }
 return {matches(geometry){
  const parts=polygons(geometry);if(!parts.length)return false;
  return parts.every(part=>{
   const ring=part[0];if(!ring||ring.length<4)return false;
   const b=box(ring),center=[(b[0]+b[2])/2,(b[1]+b[3])/2];
   const candidates=grid.get(Math.floor(center[0]/CELL)+':'+Math.floor(center[1]/CELL))||[];
   // Native vector tiles can be clipped. Use a conservative interior sample
   // and require most of the native bbox to overlap the GIS bbox.
   return candidates.some(({polygon,bounds:c})=>{
    const overlap=Math.max(0,Math.min(b[2],c[2])-Math.max(b[0],c[0]))*Math.max(0,Math.min(b[3],c[3])-Math.max(b[1],c[1]));
    const area=(b[2]-b[0])*(b[3]-b[1]);
    if(area<=0||overlap/area<.85||!inside(center,polygon))return false;
    const samples=ring.slice(0,-1).map(v=>[center[0]+(v[0]-center[0])*.65,center[1]+(v[1]-center[1])*.65]);
    return samples.filter(v=>inside(v,polygon)).length>=Math.ceil(samples.length*.85);
   });
  });
 }};
}
// A single mode owns building rendering. Restore the original 2D layer
// visibility when the actual GIS extrusion mode ends.
export function buildingModeVisibility(extruding){
 return extruding?{plan:'none',extrusion:'visible'}:{plan:'visible',extrusion:'none'};
}
export function createBuildingCoverage(map,layers){
 let extruding=false;
 const original=new Map();
 const sync=()=>{
  for(const id of layers){
   if(!map.getLayer(id))continue;
   const current=map.getLayoutProperty?.(id,'visibility')||'visible';
   if(!original.has(id))original.set(id,current);
   const desired=extruding?'none':original.get(id);
   if(current!==desired)map.setLayoutProperty(id,'visibility',desired);
  }
 };
 map.on('style.load',()=>{original.clear();sync();});
 return {setExtruding(value){extruding=Boolean(value);sync();},setSheet(){sync();},removeSheet(){sync();}};
}
