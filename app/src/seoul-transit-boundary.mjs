import {routeWithinDistrict} from './route-district-guard.mjs';
let geometry=null,promise=null;
export function setSeoulBoundary(g){
 if(!g||!['Polygon','MultiPolygon'].includes(g.type)||!g.coordinates?.length)throw Error('서울시 경계 없음');
 geometry=g;return g;
}
export const getSeoulBoundary=()=>geometry;
export function loadSeoulBoundary(){
 if(geometry)return Promise.resolve(geometry);
 if(!promise)promise=import('admdongkor').then(pkg=>pkg.get('20261001','sido')).then(data=>{
  const f=data.features?.find(x=>x.properties?.sidonm==='서울특별시'||String(x.properties?.sidocd)==='11');
  return setSeoulBoundary(f?.geometry);
 }).catch(e=>{promise=null;throw e;});
 return promise;
}
function inRing(x,y,r){
 let inside=false;
 for(let i=0,j=r.length-1;i<r.length;j=i++){
  const [a,b]=r[i],[c,d]=r[j],dx=c-a,dy=d-b;
  if((dx||dy)&&Math.abs((x-a)*dy-(y-b)*dx)<1e-12&&x>=Math.min(a,c)-1e-10&&x<=Math.max(a,c)+1e-10&&y>=Math.min(b,d)-1e-10&&y<=Math.max(b,d)+1e-10)return true;
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
 }
 return inside;
}
export function inSeoul(lng,lat,g=geometry){
 if(!g||!Number.isFinite(lng)||!Number.isFinite(lat))return false;
 const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 return polygons.some(r=>inRing(lng,lat,r[0])&&!r.slice(1).some(h=>inRing(lng,lat,h)));
}
export function routeInSeoul(coords){return routeWithinDistrict(coords,geometry,inSeoul);}
