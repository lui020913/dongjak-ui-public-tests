// Shared district/city viewport streaming. Coordinates are WGS84.
export const GRID_STEP=0.01;
export const GRID_ORIGIN=[126.7,37.4];
export const GRID_WIDTH=55,GRID_HEIGHT=32;
export function cellKey(lng,lat){return Math.floor((lng-GRID_ORIGIN[0])/GRID_STEP)+'_'+Math.floor((lat-GRID_ORIGIN[1])/GRID_STEP);}
export function kindsAtZoom(z){return z>=16.4?['rail','bus']:z>=12.2?['rail']:[];}
export function cellsForBounds(b,pad=1,direction={x:0,y:0}){
 if(!b||![b.west,b.east,b.south,b.north].every(Number.isFinite))return [];
 const [w,s]=cellKey(b.west,b.south).split('_').map(Number),[e,n]=cellKey(b.east,b.north).split('_').map(Number);
 const out=[],cx=(w+e)/2,cy=(s+n)/2;
 for(let x=Math.max(0,w-pad);x<=Math.min(GRID_WIDTH-1,e+pad);x++)for(let y=Math.max(0,s-pad);y<=Math.min(GRID_HEIGHT-1,n+pad);y++)out.push({key:x+'_'+y,d:(x-cx)**2+(y-cy)**2-.75*((x-cx)*(direction.x||0)+(y-cy)*(direction.y||0)),visible:x>=w&&x<=e&&y>=s&&y<=n});
 return out.sort((a,b)=>Number(b.visible)-Number(a.visible)||a.d-b.d).map(x=>x.key);
}
export function viewportKeys(bounds,zoom,preferences={},direction){
 return cellsForBounds(bounds,1,direction).flatMap(key=>kindsAtZoom(zoom).filter(kind=>preferences[kind]!==false).map(kind=>kind+'_'+key));
}
export function createTransitCellStream({load,onChange,limit=160,concurrency=6}){
 const cache=new Map(),inflight=new Map(),failed=new Set();
 let desired=new Set(),signature='',disposed=false,publishTimer=null;
 function publish(){if(disposed)return;onChange([...desired].flatMap(k=>cache.get(k)||[]),{pending:[...desired].filter(k=>!cache.has(k)&&!failed.has(k)).length,failed:[...desired].filter(k=>failed.has(k)).length});}
 function schedulePublish(){if(disposed||publishTimer!==null)return;publishTimer=setTimeout(()=>{publishTimer=null;publish();},45);}
 function trim(){for(const key of cache.keys()){if(cache.size<=limit)break;if(!desired.has(key))cache.delete(key);}}
 function pump(){
  if(disposed)return;
  for(const key of desired){
   if(inflight.size>=concurrency)break;
   if(cache.has(key)||inflight.has(key)||failed.has(key))continue;
   const controller=new AbortController();inflight.set(key,controller);
   Promise.resolve().then(()=>load(key,controller.signal)).then(rows=>{
    if(controller.signal.aborted||disposed)return;
    if(!Array.isArray(rows))throw Error('invalid cell');
    cache.set(key,rows);trim();
   }).catch(()=>{if(!controller.signal.aborted)failed.add(key);}).finally(()=>{
    if(inflight.get(key)===controller)inflight.delete(key);
    if(!disposed){schedulePublish();pump();}
   });
  }
 }
 function update(keys){
  if(disposed)return;
  const next=new Set(keys),sig=[...next].sort().join('|');
  if(sig===signature){desired=next;pump();return;}
  signature=sig;desired=next;failed.clear();
  for(const [key,c] of inflight)if(!desired.has(key)){c.abort();inflight.delete(key);}
  for(const key of desired)if(cache.has(key)){const rows=cache.get(key);cache.delete(key);cache.set(key,rows);}
  trim();if(publishTimer!==null){clearTimeout(publishTimer);publishTimer=null;}publish();pump();
 }
 return {update,retry(){failed.clear();pump();},dispose(){disposed=true;if(publishTimer!==null)clearTimeout(publishTimer);for(const c of inflight.values())c.abort();inflight.clear();cache.clear();desired.clear();}};
}
