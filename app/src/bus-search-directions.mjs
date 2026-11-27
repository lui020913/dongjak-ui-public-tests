// Use the official ARS-specific direction records, not proximity guesses.
const cache=new Map(),queue=[];let running=0;
export function busDirectionNames(values){
 return [...new Set(values.flatMap(v=>String(v||'').split(/[,·/]/)).map(v=>v.trim().replace(/\s*방면$/,'')).filter(v=>v&&!/^\d+$|^ARS\b|^(미확인|정보 없음|방면 정보 없음|unknown|undefined|null|-)$/i.test(v)))];
}
export function busDirectionLabel(place){const names=busDirectionNames([place.direction,...(place.directions||[])]);return names.length?names.join(', ')+' 방면':'방면 정보 업데이트 예정';}
function drain(){while(running<2&&queue.length){const job=queue.shift();running++;job().finally(()=>{running--;drain();});}}
export function lookupBusDirections(place,{fetcher=fetch,apiBase='/api/transport'}={}){
 const id=String(place.arsId||'');if(!/^\d{5}$/.test(id))return Promise.resolve([]);
 const key=apiBase+'|'+id,old=cache.get(key);if(old&&Date.now()-old.at<300000)return old.promise;
 const promise=new Promise(resolve=>{queue.push(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{const r=await fetcher(apiBase+'/bus?'+new URLSearchParams({arsId:id}),{signal:controller.signal});if(!r.ok)throw Error('unavailable');
   const data=await r.json();if(String(data.arsId)!==id||!Array.isArray(data.items))throw Error('unverified stop');
   const names=busDirectionNames(data.items.map(x=>x.destination)).filter(n=>n!==place.name);if(!names.length)cache.delete(key);resolve(names);
  }catch{cache.delete(key);resolve([]);}finally{clearTimeout(timer);}
 });});cache.set(key,{at:Date.now(),promise});drain();return promise;
}
export function enhanceBusDirection(place,update,options){
 if(!place?.arsId)return;
 void lookupBusDirections(place,options).then(names=>{if(!names.length)return;place.directions=busDirectionNames([place.direction,...(place.directions||[]),...names]);update(place);});
}
