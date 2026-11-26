export const MIN_BUILDING_AREA_M2=20;
export function hasNamedBuilding(feature){
 const p=feature?.properties||{};
 return ['name','name:ko','building_name','buildingName'].some(key=>typeof p[key]==='string'&&p[key].trim()!==''&&!/^(건물|building|yes|unknown|미등록)$/i.test(p[key].trim()));
}
function ringMetrics(ring){
 if(!Array.isArray(ring)||ring.length<4||!ring.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])))return null;
 const origin=ring[0],sx=111320*Math.cos(origin[1]*Math.PI/180),sy=111320;
 const points=ring.map(([x,y])=>[(x-origin[0])*sx,(y-origin[1])*sy]);
 let twice=0,x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
 for(let i=0;i<points.length;i++){const [x,y]=points[i],[a,b]=points[(i+1)%points.length];twice+=x*b-a*y;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const area=Math.abs(twice)/2;
 return {area,shortSide:Math.min(x1-x0,y1-y0)};
}
export function buildingFootprintMetrics(geometry){
 const polygons=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 let area=0,shortSide=0;
 for(const polygon of polygons||[]){
  const outer=ringMetrics(polygon?.[0]);if(!outer)continue;
  const holes=polygon.slice(1).reduce((sum,r)=>sum+(ringMetrics(r)?.area||0),0);
  area+=Math.max(0,outer.area-holes);shortSide=Math.max(shortSide,outer.shortSide);
 }
 return {area,shortSide};
}
export function isDisplayBuilding(feature){
 const {area,shortSide}=buildingFootprintMetrics(feature?.geometry);
 if(area<=0)return false;
 if(hasNamedBuilding(feature))return true;
 return area>=MIN_BUILDING_AREA_M2&&!(area<28&&shortSide<2.5);
}
export function partitionDisplayBuildings(features){
 const visible=[],excluded=[];
 for(const f of features)(isDisplayBuilding(f)?visible:excluded).push(f);
 return {visible,excluded};
}
