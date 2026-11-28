// Bound main-thread preparation, keep original geometry and full-sheet ownership.
export const BUILDING_PREP_BATCH=384;
export const BUILDING_STAGE_GAP_MS=120;
export function yieldBuildingFrame(){return new Promise(resolve=>setTimeout(resolve,0));}
export async function prepareBuildingChunks(input,visit,{batch=BUILDING_PREP_BATCH,yieldFrame=yieldBuildingFrame,canContinue=()=>true}={}){
 const result=[];
 for(let start=0;start<input.length;start+=batch){
  if(!canContinue())return null;
  const end=Math.min(input.length,start+batch);
  for(let i=start;i<end;i++){const item=visit(input[i]);if(item!==undefined&&item!==null&&item!==false)result.push(item);}
  if(end<input.length)await yieldFrame();
 }
 return canContinue()?result:null;
}
export function nextBuildingStage(sheets,{isComplete,isLoading=()=>false,retryAt=()=>0,now=Date.now()}={}){
 return sheets.find(s=>!isComplete(s.sheet)&&!isLoading(s.sheet)&&retryAt(s.sheet)<=now)||null;
}
export function waitForBuildingSource(map,id,{timeout=1200}={}){
 if(!map.getSource?.(id)||map.isSourceLoaded?.(id))return Promise.resolve();
 return new Promise(resolve=>{
  let timer;
  const done=()=>{clearTimeout(timer);map.off?.('sourcedata',check);resolve();};
  const check=e=>{if(e.sourceId===id&&e.isSourceLoaded)done();};
  timer=setTimeout(done,timeout);map.on('sourcedata',check);
  if(map.isSourceLoaded?.(id))done();
 });
}

/** Same-turn source notifications share a single ownership reconciliation.
 * Idle flushes pending work immediately without leaving a redundant microtask.
 */
export function coalesceBuildingOwnership(run,{enqueue=queueMicrotask}={}){
 let pending=false,version=0;
 function flush(){pending=false;version++;run();}
 return {request(){if(pending)return;pending=true;const token=++version;enqueue(()=>{if(pending&&version===token)flush();});},flush};
}
/** Bound parsed sheets and never let a stale failed request evict a newer one. */
export function createBuildingWarmCache(load,{limit=4}={}){
 const entries=new Map();
 const removeIfCurrent=(id,promise)=>{if(entries.get(id)===promise)entries.delete(id);};
 return {has:id=>entries.has(id),delete:id=>entries.delete(id),load(sheet){
  const id=sheet.sheet;
  if(entries.has(id)){
   const current=entries.get(id);entries.delete(id);entries.set(id,current);return current;
  }
  const pending=Promise.resolve().then(()=>load(sheet)).then(result=>{
   if(result.successfulSources!==result.totalSources)removeIfCurrent(id,pending);
   return result;
  },error=>{removeIfCurrent(id,pending);throw error;});
  entries.set(id,pending);
  while(entries.size>limit)entries.delete(entries.keys().next().value);
  return pending;
 }};
}
