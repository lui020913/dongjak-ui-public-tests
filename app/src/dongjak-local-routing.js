// The Seoul City Dongjak-gu pedestrian graph is used preferentially.
// A Web Worker keeps graph search and geographic snapping off the main UI thread.
let worker=null,seq=0;
const pending=new Map();
function toAppRoute(result,kind){
  const coords=result.geojson?.geometry?.coordinates||[];
  if(coords.length<2)throw new Error('보행 네트워크에서 경로 선형을 찾지 못했습니다.');
  return {
    coords,seconds:Math.round(result.estimatedMinutes*60),kilometers:result.distanceMeters/1000,
    maneuvers:[],source:'seoul-pedestrian-graph',sourceLabel:'서울시 동작구 도보 네트워크 (2026-11-11 수집)',
    slopeAscentM:result.estimatedTerrainAscentM,slopeDescentM:result.estimatedTerrainDescentM,
    slopeUncertainM:result.estimatedTerrainUncertainMeters,snapStartM:result.startSnapMeters,
    snapEndM:result.endSnapMeters,vehiclePermittedM:result.vehiclePermittedMeters,
    routeMode:kind, warnings:result.warnings,
    priEvidence:result.priEvidence??null
  };
}
function getWorker(){
  if(worker)return worker;
  worker=new Worker(new URL('./workers/dongjak-walk-worker.mjs',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
    const task=pending.get(data.id);if(!task)return;
    pending.delete(data.id);clearTimeout(task.timer);
    if(data.ok){
      try {
        const result={standard:toAppRoute(data.routes.standard,'shortest'),gentle:toAppRoute(data.routes.gentle,'gentle')};
        task.resolve(result);
        if(typeof window!=='undefined' && typeof CustomEvent==='function')
          window.dispatchEvent(new CustomEvent('dongjak:route-variants-ready',{detail:result}));
      }
      catch(error){task.reject(error);}
    }else task.reject(new Error(data.error||'도보 네트워크 계산 실패'));
  };
  worker.onerror=(event)=>{
    const err=new Error(event?.message||'보행 네트워크 Worker 오류');
    for(const [id,task] of pending){clearTimeout(task.timer);task.reject(err);pending.delete(id);}
    worker?.terminate();worker=null;
  };
  return worker;
}
export function fetchDongjakPedestrianVariants(from,to,{signal,timeoutMs=18000}={}){
  if(signal?.aborted)return Promise.reject(new DOMException('요청이 취소됐습니다.','AbortError'));
  return new Promise((resolve,reject)=>{
    const id=++seq;let aborted=false;
    const complete={resolve:result=>{signal?.removeEventListener('abort',cancel);resolve(result);},reject:error=>{signal?.removeEventListener('abort',cancel);reject(error);}};
    const cancel=()=>{aborted=true;const task=pending.get(id);if(!task)return;clearTimeout(task.timer);pending.delete(id);reject(new DOMException('요청이 취소됐습니다.','AbortError'));};
    signal?.addEventListener('abort',cancel,{once:true});
    const timer=setTimeout(()=>{
      if(!pending.has(id))return;pending.delete(id);signal?.removeEventListener('abort',cancel);
      reject(new Error('보행 네트워크 계산 제한시간을 초과했습니다.'));
    },timeoutMs);
    pending.set(id,{...complete,timer});
    try{getWorker().postMessage({id,start:[from.lng,from.lat],end:[to.lng,to.lat]});}
    catch(error){clearTimeout(timer);pending.delete(id);signal?.removeEventListener('abort',cancel);reject(error);}
  });
}
