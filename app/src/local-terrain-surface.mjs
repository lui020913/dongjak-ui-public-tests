// Presentation-only localized DEM repair; retain raw elevations outside masks.
const X=88300,Y=111320;
const DEM_CACHE='dj-corrected-terrain-v1';
const correctedMemory=new Map();
async function correctedCache(){try{return await globalThis.caches?.open(DEM_CACHE);}catch{return null;}}
function rememberTile(key,bytes){correctedMemory.set(key,bytes.slice(0));while(correctedMemory.size>12)correctedMemory.delete(correctedMemory.keys().next().value);}
export const LOCAL_TERRAIN_URL='dj-local-terrain://{z}/{x}/{y}.png';
export const STATION_AREAS=[
 {center:[126.926382,37.513342],along:350,across:135,angle:-17,level:10,blend:110},
 {center:[126.941005,37.513534],along:420,across:140,angle:-10,level:10,blend:110}
];
// Approximate island display mask, not a surveyed boundary.
export const YEOUIDO_RING=[[126.9118,37.5303],[126.9155,37.5364],[126.9222,37.5358],[126.9335,37.5315],[126.9434,37.5253],[126.9411,37.5197],[126.9333,37.5169],[126.9279,37.5174],[126.9221,37.5197],[126.9162,37.5242],[126.9118,37.5303]];
function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
function islandWeight(lng,lat){
 let inside=false,nearest=Infinity;
 for(let i=1;i<YEOUIDO_RING.length;i++){
  const a=YEOUIDO_RING[i-1],b=YEOUIDO_RING[i];
  if((a[1]>lat)!==(b[1]>lat)&&lng<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  const ax=(a[0]-lng)*X,ay=(a[1]-lat)*Y,dx=(b[0]-a[0])*X,dy=(b[1]-a[1])*Y;
  const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  nearest=Math.min(nearest,Math.hypot(ax+t*dx,ay+t*dy));
 }
 return inside?1:1-smooth(nearest/85);
}
export function correctElevation(lng,lat,h){
 let weight=0,target=h;
 for(const a of STATION_AREAS){
  const dx=(lng-a.center[0])*X,dy=(lat-a.center[1])*Y,r=Math.max(a.along,a.across)+a.blend;
  if(Math.abs(dx)>r||Math.abs(dy)>r)continue;
  const t=a.angle*Math.PI/180;
  const u=dx*Math.cos(t)+dy*Math.sin(t),v=-dx*Math.sin(t)+dy*Math.cos(t);
  const inner=Math.hypot(u/a.along,v/a.across),outer=Math.hypot(u/(a.along+a.blend),v/(a.across+a.blend));
  const w=inner<=1?1:outer>=1?0:smooth((1-outer)/(inner-outer));
  if(w>weight){weight=w;target=a.level;}
 }
 if(lng>=126.9107&&lng<=126.9445&&lat>=37.5161&&lat<=37.5372){
  const w=islandWeight(lng,lat);if(w>weight){weight=w;target=12;}
 }
 return weight===0?h:h+(target-h)*weight;
}
export function pixelCoordinates(z,x,y,px,py,w=256,h=256){
 const n=2**z;return [(x+px/w)/n*360-180,Math.atan(Math.sinh(Math.PI*(1-2*(y+py/h)/n)))*180/Math.PI];
}
export function affectedTile(z,x,y){
 const [w,n]=pixelCoordinates(z,x,y,0,0),[e,s]=pixelCoordinates(z,x,y,256,256);
 return (w<=126.9445&&e>=126.9107&&s<=37.5372&&n>=37.5161)||STATION_AREAS.some(a=>{
  const r=Math.max(a.along,a.across)+a.blend;return w<=a.center[0]+r/X&&e>=a.center[0]-r/X&&s<=a.center[1]+r/Y&&n>=a.center[1]-r/Y;
 });
}
export function correctPixels(data,w,h,z,x,y){
 let changed=0;const xs=Array.from({length:w},(_,i)=>pixelCoordinates(z,x,y,i+.5,0,w,h)[0]);
 for(let j=0;j<h;j++){const lat=pixelCoordinates(z,x,y,0,j+.5,w,h)[1];for(let i=0;i<w;i++){
  const k=(j*w+i)*4;if(!data[k+3])continue;
  const old=data[k]*256+data[k+1]+data[k+2]/256-32768,v=correctElevation(xs[i],lat,old);
  if(v===old)continue;const a=Math.max(0,Math.min(16777215,Math.round((v+32768)*256)));
  data[k]=(a>>16)&255;data[k+1]=(a>>8)&255;data[k+2]=a&255;changed++;
 }}
 return changed;
}
async function imageFrom(blob){
 if(typeof createImageBitmap==='function'){try{return await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'});}catch{}}
 const url=URL.createObjectURL(blob);try{return await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url;});}finally{URL.revokeObjectURL(url);}
}
async function correctPng(original,z,x,y){
 const im=await imageFrom(new Blob([original],{type:'image/png'}));
 try{
  const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(im.width,im.height):document.createElement('canvas');
  canvas.width=im.width;canvas.height=im.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return original;
  ctx.drawImage(im,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  if(!correctPixels(pixels.data,canvas.width,canvas.height,z,x,y))return original;
  ctx.putImageData(pixels,0,0);const blob=canvas.convertToBlob?await canvas.convertToBlob({type:'image/png'}):await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('DEM encode')),'image/png'));
  return await blob.arrayBuffer();
 }finally{im.close?.();}
}
let registered=false;
export function registerLocalTerrainProtocol(maplibre){
 if(registered)return;
 maplibre.addProtocol('dj-local-terrain',async(request,controller)=>{
  const m=/^dj-local-terrain:\/\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(request.url);if(!m)throw Error('invalid DEM tile');
  const [z,x,y]=m.slice(1).map(Number),signal=controller?.signal;
  const url='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+z+'/'+x+'/'+y+'.png',affected=affectedTile(z,x,y);
  const key=url+'?dongjak-terrain-correction=v1';
  if(affected&&correctedMemory.has(key))return {data:correctedMemory.get(key).slice(0)};
  const cache=affected?await correctedCache():null;
  if(cache)try{const hit=await cache.match(key);if(hit){const data=await hit.arrayBuffer();rememberTile(key,data);return {data};}}catch{}
  const response=await fetch(url,{signal,cache:'force-cache'});
  if(!response.ok)throw Error('DEM HTTP '+response.status);const original=await response.arrayBuffer();
  if(!affected)return {data:original};
  try{const data=await correctPng(original,z,x,y);if(signal?.aborted)throw new DOMException('Aborted','AbortError');rememberTile(key,data);if(cache)void cache.put(key,new Response(data.slice(0),{headers:{'content-type':'image/png'}})).catch(()=>{});return {data};}
  catch(e){if(signal?.aborted)throw e;console.warn('[국소 지형 보정] 원본 유지',e?.message);return {data:original};}
 });registered=true;
}
