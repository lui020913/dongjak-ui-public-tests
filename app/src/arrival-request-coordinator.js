/** Share only concurrent requests with the exact same provider/cache key. */
export function createInFlightRequests(){
 const pending=new Map();
 return {
   has:key=>pending.has(key),
   run(key,load){
     if(pending.has(key))return pending.get(key);
     const task=Promise.resolve().then(load);
     pending.set(key,task);
     const clear=()=>{if(pending.get(key)===task)pending.delete(key);};
     task.then(clear,clear);
     return task;
   }
 };
}
