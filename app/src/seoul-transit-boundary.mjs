// V-World administrative boundary, 2023-07-29 reference, WGS84; same
// provider as the existing Dongjak boundary. Never substitute a rectangle.
export const SEOUL_BOUNDARY_URL='https://raw.githubusercontent.com/KnellBalm/kr-admin-geojson/main/ctprvn.geojson';
export function extractSeoulBoundary(data){
 const f=data?.type==='Feature'?data:data?.features?.find(f=>String(f?.properties?.CTPRVN_CD)==='11'||f?.properties?.CTP_KOR_NM==='서울특별시');
 if(!f||!(String(f.properties?.CTPRVN_CD)==='11'||f.properties?.CTP_KOR_NM==='서울특별시'))return null;
 const g=f.geometry,polygons=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:null;
 if(!polygons?.length||!polygons.every(p=>p.length&&p.every(r=>r.length>=4&&r.every(c=>c.length===2&&c.every(Number.isFinite)&&c[0]>126&&c[0]<128&&c[1]>37&&c[1]<38))))return null;
 return g;
}
function ringContains(x,y,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [a,b]=ring[i],[c,d]=ring[j];
  const dx=c-a,dy=d-b,len=dx*dx+dy*dy;
  if(len>0&&Math.abs((x-a)*dy-(y-b)*dx)<1e-10&&((x-a)*dx+(y-b)*dy)>=0&&((x-a)*dx+(y-b)*dy)<=len)return true;
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
 }
 return inside;
}
export function pointInSeoulGeometry(g,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!g)return false;
 const p=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
 return p.some(r=>ringContains(x,y,r[0])&&!r.slice(1).some(h=>ringContains(x,y,h)));
}
export async function loadSeoulBoundary(fetcher=fetch){
 for(const url of ['/data/seoul_ctprvn_reference.geojson',SEOUL_BOUNDARY_URL]){
  try{
   const res=await fetcher(url,{signal:AbortSignal.timeout(12000),cache:'force-cache'});
   if(!res.ok)continue;
   const geometry=extractSeoulBoundary(await res.json());
   if(geometry)return geometry;
  }catch{}
 }
 throw Error('서울특별시 행정경계 확인 불가');
}
