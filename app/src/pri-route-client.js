/* Worker-bound route-risk assessment; the ordinary walking router is independent. */
let worker=null,sequence=0;
const pending=new Map();
function start(){
  if(worker)return worker;
  worker=new Worker(new URL('./workers/pri-route-worker.mjs',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
    const item=pending.get(data?.id);
    if(!item)return;
    pending.delete(data.id);clearTimeout(item.timer);
    if(data.ok)item.resolve(data.comparison);
    else item.reject(new Error(data.error||'PRI 비교 불가'));
  };
  worker.onerror=event=>{
    const error=new Error(event?.message||'PRI 평가 Worker 오류');
    for(const [id,item] of pending){clearTimeout(item.timer);item.reject(error);pending.delete(id);}
    worker?.terminate();worker=null;
  };
  return worker;
}
export function evaluateCompositePriRouteCandidates(routes,{timeoutMs=20000,factors}={}){
  return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{
      if(!pending.has(id))return;
      pending.delete(id);reject(new Error('PRI 자료 분석 시간 초과'));
    },timeoutMs);
    pending.set(id,{resolve,reject,timer});
    try{start().postMessage({id,routes,factors});}
    catch(error){pending.delete(id);clearTimeout(timer);reject(error);}
  });
}
