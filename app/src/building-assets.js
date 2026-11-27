import {loadBuildingTileFeatures as loadLocally} from './building-assets-core.js';

// Keep network parsing, review checksums and geometry trims off the UI thread.
// The worker returns a single structured-clone graph, preserving the feature
// identities used as keys by displayGeometries and reviewCandidates.
export function createBuildingTileLoader({makeWorker=()=>new Worker(new URL('./building-assets.worker.js',import.meta.url),{type:'module'}),local=loadLocally,timeoutMs=45000}={}){
  let worker=null,disabled=false,sequence=0;
  const pending=new Map();
  const finish=(id,callback)=>{
    const entry=pending.get(id);
    if(!entry)return;
    pending.delete(id);clearTimeout(entry.timer);callback(entry);
  };
  const disable=()=>{
    disabled=true;
    try{worker?.terminate();}catch{}
    worker=null;
    for(const id of [...pending.keys()])finish(id,entry=>entry.rejectInfrastructure());
  };
  function getWorker(){
    if(disabled)return null;
    if(worker)return worker;
    try{
      worker=makeWorker();
      worker.onmessage=({data})=>{
        if(!data||!pending.has(data.id))return;
        finish(data.id,entry=>data.error!==undefined?entry.reject(new Error(data.error)):entry.resolve(data.result));
      };
      worker.onerror=disable;
      worker.onmessageerror=disable;
      return worker;
    }catch{disable();return null;}
  }
  return async function load(sheet,fetchFn=globalThis.fetch,trimPack=undefined){
    // Test/custom fetchers and explicit packs remain local, unchanged.
    if(fetchFn!==globalThis.fetch||trimPack!==undefined)return local(sheet,fetchFn,trimPack);
    const active=getWorker();
    if(!active)return local(sheet,fetchFn,trimPack);
    const id=++sequence;
    const unavailable=Symbol('worker unavailable');
    try{
      return await new Promise((resolve,reject)=>{
        const timer=setTimeout(disable,timeoutMs);
        pending.set(id,{resolve,reject,timer,rejectInfrastructure:()=>reject(unavailable)});
        try{active.postMessage({id,sheet});}catch{disable();}
      });
    }catch(error){
      if(error!==unavailable)throw error;
      return local(sheet,fetchFn,trimPack);
    }
  };
}
export const loadBuildingTileFeatures=createBuildingTileLoader();
