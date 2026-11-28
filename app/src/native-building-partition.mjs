import {partitionBuildingTile} from '../server/district-road-tile.mjs';
const abortError=()=>new DOMException('Aborted','AbortError');
const local=(bytes,count)=>partitionBuildingTile(bytes,count).map(p=>p.buffer.slice(p.byteOffset,p.byteOffset+p.byteLength));
// Native vector tile parsing and spatial sorting must not occupy the camera UI
// thread. Preserve every encoded feature and all five existing arrival stages.
// Keep original bytes for a bounded infrastructure fallback; transfer the
// worker input copy and its output buffers without structured-clone copies.
export function createNativeTilePartitioner({makeWorker=()=>new Worker(new URL('./native-building-partition.worker.js',import.meta.url),{type:'module'}),fallback=local,timeoutMs=20000}={}){
 let worker=null,disabled=false,serial=0;
 const pending=new Map();
 const unavailable=Symbol('worker unavailable');
 function finish(id,fn){const job=pending.get(id);if(!job)return;pending.delete(id);clearTimeout(job.timer);job.signal?.removeEventListener('abort',job.abort);fn(job);}
 function disable(){disabled=true;try{worker?.terminate();}catch{}worker=null;for(const id of [...pending.keys()])finish(id,j=>j.reject(unavailable));}
 function getWorker(){
  if(disabled)return null;if(worker)return worker;
  try{worker=makeWorker();worker.onmessage=({data})=>{if(!data)return;finish(data.id,j=>data.error!==undefined?j.reject(new Error(data.error)):j.resolve(data.parts));};worker.onerror=disable;worker.onmessageerror=disable;return worker;}catch{disable();return null;}
 }
 return async function partition(bytes,count,signal){
  if(signal?.aborted)throw abortError();
  const active=getWorker();if(!active)return fallback(bytes,count);
  const id=++serial;
  try{return await new Promise((resolve,reject)=>{
   const abort=()=>finish(id,j=>j.reject(abortError()));
   const timer=setTimeout(disable,timeoutMs);
   pending.set(id,{resolve,reject,timer,signal,abort});signal?.addEventListener('abort',abort,{once:true});
   if(signal?.aborted){abort();return;}
   try{const input=bytes.slice();active.postMessage({id,input,count},[input.buffer]);}catch{disable();}
  });}catch(error){if(error!==unavailable)throw error;if(signal?.aborted)throw abortError();return fallback(bytes,count);}
 };
}
