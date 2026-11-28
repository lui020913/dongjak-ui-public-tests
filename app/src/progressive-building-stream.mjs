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
