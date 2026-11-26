/* Worker-bound route-risk assessment; the ordinary walking router is independent. */
let worker=null,sequence=0;
const pending=new Map();
function start(){
  if(worker)return worker;
  worker=new Worker(new URL('./workers/pri-route-worker.mjs',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
    const item=pending.get(data?.id);
    if(!item)return;
    pending.delete(data.id);item.cleanup();
    if(data.ok)item.resolve(data.comparison);
    else item.reject(new Error(data.error||'PRI 비교 불가'));
  };
  worker.onerror=event=>{
    const error=new Error(event?.message||'PRI 평가 Worker 오류');
    for(const [id,item] of pending){item.cleanup();item.reject(error);pending.delete(id);}
    worker?.terminate();worker=null;
  };
  return worker;
}
export function evaluateCompositePriRouteCandidates(routes,{timeoutMs=20000,factors,signal}={}){
  return new Promise((resolve,reject)=>{
    const aborted=()=>new DOMException('PRI 평가 취소','AbortError');
    if(signal?.aborted){reject(aborted());return;}
    const id=++sequence;
    const stopIdleWorker=()=>{if(!pending.size&&worker){worker.terminate();worker=null;}};
    const cancel=()=>{if(!pending.delete(id))return;cleanup();reject(aborted());stopIdleWorker();};
    const timer=setTimeout(()=>{
      if(!pending.delete(id))return;
      cleanup();reject(new Error('PRI 자료 분석 시간 초과'));stopIdleWorker();
    },timeoutMs);
    const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);};
    pending.set(id,{resolve,reject,cleanup});
    signal?.addEventListener('abort',cancel,{once:true});
    try{start().postMessage({id,routes,factors});}
    catch(error){pending.delete(id);cleanup();reject(error);stopIdleWorker();}
  });
}
