// Original user-provided train grid, cropped to 12 transparent sprites.
// Atlas contains no labels, one 72×32 cell per supplied facing.
export const TRAIN_ATLAS_CELLS=Object.freeze({
 '1호선':{left:[0,0],right:[1,0]},'9호선':{left:[2,0],right:[3,0]},
 '신림선':{left:[0,1],right:[1,1]},'2호선':{left:[2,1],right:[3,1]},
 '4호선':{left:[0,2],right:[1,2]},'7호선':{left:[2,2],right:[3,2]}
});
const W=72,H=32,SIZE=96;
export function extractTrainAtlas(image,doc=globalThis.document){
 if((image.naturalWidth??image.width)!==W*4||(image.naturalHeight??image.height)!==H*3)throw Error('Unexpected train atlas dimensions');
 const canvas=doc.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Train icon canvas unavailable');
 const sprites=new Map();
 for(const [line,facings] of Object.entries(TRAIN_ATLAS_CELLS))for(const [facing,[x,y]] of Object.entries(facings)){
  ctx.clearRect(0,0,SIZE,SIZE);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,x*W,y*H,W,H,3,28,90,40);
  const data=new Uint8Array(ctx.getImageData(0,0,SIZE,SIZE).data);
  let opaque=0,transparent=0;for(let i=3;i<data.length;i+=4){if(data[i]>=128)opaque++;if(data[i]===0)transparent++;}
  if(opaque<200||transparent<200)throw Error('Train crop missing opaque artwork or transparency: '+line+':'+facing);
  sprites.set(line+':'+facing,{width:SIZE,height:SIZE,data});
 }
 return sprites;
}
let pending;
export function loadTrainAtlas(doc=globalThis.document,ImageClass=globalThis.Image){
 if(!doc||!ImageClass)return Promise.resolve(null);
 if(!pending)pending=new Promise((resolve,reject)=>{
  const image=new ImageClass();const timer=setTimeout(()=>reject(Error('Train atlas decode timeout')),8000);
  image.onload=()=>{clearTimeout(timer);try{resolve(extractTrainAtlas(image,doc));}catch(e){reject(e);}};
  image.onerror=()=>{clearTimeout(timer);reject(Error('Train atlas failed to load'));};
  image.src=new URL('./train-atlas.webp',import.meta.url).href;
 }).catch(()=>{pending=null;return null;});
 return pending;
}
