let worker,seq=0;
const pending=new Map();
export function osmWalkRoute(result){
 const coords=result?.geojson?.geometry?.coordinates;
 if(!Array.isArray(coords)||coords.length<2||!Number.isFinite(result.distanceMeters)||!Number.isFinite(result.estimatedMinutes))return null;
 return {coords,kilometers:result.distanceMeters/1000,seconds:Math.round(result.estimatedMinutes*60),maneuvers:[],source:'osm-pedestrian-graph',sourceLabel:'© OpenStreetMap contributors · ODbL · 2026-11-26',snapStartM:result.startSnapMeters,snapEndM:result.endSnapMeters,vehiclePermittedM:result.vehiclePermittedMeters,routeMode:'shortest',warnings:result.warnings};
}
function getWorker(){
 if(worker)return worker;
 worker=new Worker(new URL('./workers/district-osm-walk-worker.mjs',import.meta.url),{type:'module'});
 worker.onmessage=({data})=>{const finish=pending.get(data.id);if(finish)finish(data.ok?osmWalkRoute(data.result):null);};
 worker.onerror=()=>{for(const finish of pending.values())finish(null);worker?.terminate();worker=null;};
 return worker;
}
export function fetchDistrictOsmWalk(from,to,{signal,timeoutMs=4500}={}){
 if(signal?.aborted)return Promise.resolve(null);
 return new Promise(resolve=>{
  const id=++seq;
  let timer;
  const finish=value=>{if(!pending.has(id))return;pending.delete(id);clearTimeout(timer);signal?.removeEventListener('abort',cancel);resolve(value);};
  const cancel=()=>finish(null);
  pending.set(id,finish);timer=setTimeout(cancel,timeoutMs);
  signal?.addEventListener('abort',cancel,{once:true});
  try{getWorker().postMessage({id,start:[from.lng,from.lat],end:[to.lng,to.lat]});}catch{finish(null);}
 });
}
