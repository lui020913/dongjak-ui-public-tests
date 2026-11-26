import {isGreenProtected} from './green-building-filter.js';
import {isDisplayBuilding,hasNamedBuilding} from './building-display-detail.js';
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
export function createCoverageIndex(features,{strict=false}={}){
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
    if(area<=0||overlap/area<(strict?.99:.85)||!inside(center,polygon))return false;
    const inset=strict?.95:.65;
    const samples=ring.slice(0,-1).map(v=>[center[0]+(v[0]-center[0])*inset,center[1]+(v[1]-center[1])*inset]);
    if(strict){for(let i=0;i<ring.length-1;i++){const a=ring[i],d=ring[i+1];samples.push([center[0]+((a[0]+d[0])/2-center[0])*inset,center[1]+((a[1]+d[1])/2-center[1])*inset]);}}
    return samples.length>0&&samples.filter(v=>inside(v,polygon)).length>=Math.ceil(samples.length*(strict?1:.85));
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
 let extruding=false,dirty=true;
 const original=new Map(),excludedBySheet=new Map(),reviewBySheet=new Map(),retainedBySheet=new Map(),hidden=new Map();
 const clearHidden=()=>{for(const target of hidden.values())try{map.removeFeatureState(target,'djGisCovered');}catch{}hidden.clear();};
 const sync=()=>{
  for(const id of layers){
   if(!map.getLayer(id))continue;
   const current=map.getLayoutProperty?.(id,'visibility')||'visible';
   if(!original.has(id))original.set(id,current);
   const desired=extruding?'none':original.get(id);
   if(current!==desired)map.setLayoutProperty(id,'visibility',desired);
  }
 };
 // Tile geometry may be clipped. Only hide a native feature when a complete
 // GIS footprint independently confirms the small shape, or a reliable
 // explicitly square-metre area is supplied. Never hide from greenery alone.
 const reconcile=()=>{
  if(!dirty||extruding||map.isMoving?.()||!map.queryRenderedFeatures||!map.setFeatureState)return;
  const ids=layers.filter(id=>map.getLayer(id));if(!ids.length)return;
  let features;try{features=map.queryRenderedFeatures({layers:ids});}catch{return;}
  const seen=new Map();
  for(const f of features){
   if(f.id==null||!f.source||!f.sourceLayer)continue;
   const key=JSON.stringify([f.source,f.sourceLayer,f.id]),target={source:f.source,sourceLayer:f.sourceLayer,id:f.id};
   const area=f.properties?.area_m2;
   const explicitlySmall=typeof area==='number'&&Number.isFinite(area)&&area>0&&area<20;
   const matchedSmall=!isDisplayBuilding(f)&&[...excludedBySheet.values()].some(idx=>idx.matches(f.geometry));
   const matchedReview=!isGreenProtected(f)&&[...reviewBySheet.values()].some(idx=>idx.matches(f.geometry));
   // GIS is the displayed owner only once the complete sheet is loaded and
   // fully opaque. A strict match preserves unrelated native buildings.
   const matchedRetained=map.getZoom?.()>=15&&[...retainedBySheet].some(([id,idx])=>{
     const source='dongjak-buildings-data-'+id,layer='dongjak-buildings-footprint-'+id;
     return map.getSource?.(source)&&map.isSourceLoaded?.(source)&&map.getLayer(layer)&&map.getLayoutProperty(layer,'visibility')!=='none'&&idx.matches(f.geometry);
   });
   const hide=!hasNamedBuilding(f)&&(explicitlySmall||matchedSmall||matchedReview||matchedRetained);
   const old=seen.get(key);seen.set(key,{target,hide:hide&&(old?.hide??true)});
  }
  for(const [key,target] of hidden)if(!seen.get(key)?.hide){try{map.removeFeatureState(target,'djGisCovered');}catch{}hidden.delete(key);}
  for(const [key,{target,hide}] of seen)if(hide&&!hidden.has(key)){try{map.setFeatureState(target,{djGisCovered:true});hidden.set(key,target);}catch{}}
  dirty=false;
 };
 map.on('style.load',()=>{clearHidden();original.clear();dirty=true;sync();});
 map.on('moveend',()=>{dirty=true;});map.on('idle',reconcile);
 return {setExtruding(value){const next=Boolean(value);if(extruding!==next){extruding=next;dirty=true;if(next)clearHidden();}sync();},setSheet(id,excluded=[],reviewExcluded=[],retained=[]){excludedBySheet.set(id,createCoverageIndex(excluded));reviewBySheet.set(id,createCoverageIndex(reviewExcluded));retainedBySheet.set(id,createCoverageIndex(retained,{strict:true}));dirty=true;sync();},removeSheet(id){excludedBySheet.delete(id);reviewBySheet.delete(id);retainedBySheet.delete(id);clearHidden();dirty=true;sync();}};
}
