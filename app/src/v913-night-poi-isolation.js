/** Isolate ordinary POI symbols while the night analysis owns the map.
 * Do not alter sources, analytical layers, transport, or user safety overlays.
 * Snapshot visibility once, including late arrivals; no paint-loop writes. */
const nightOwners=new WeakSet();
export const nightOwnsLayerOrder=map=>!!map&&nightOwners.has(map);
export function conflictsWithNight(layer){
 const id=String(layer?.id||'').toLowerCase(),source=String(layer?.['source-layer']||'').toLowerCase();
 if(!layer||!['symbol','circle'].includes(layer.type)||/^dj-night-|^dongjak-night-/.test(id))return false;
 if(/bus|subway|metro|rail|transit|transport|platform/.test(id)||/^(dj-safety|dj-import|dj-official-data|dj-pza|dj-route|dj-gps)/.test(id))return false;
 return /^(?:dj-(?:civic-poi-|seoul-official-|nearby-place-|featured-place-|priority-place-|nodeulseom-detail-|nodeulseom-label-|landmark-|education-)|dongjak-featured-place-)/.test(id)||source==='poi'||/^(?:dongjak-)?(?:poi|facility|landmark|place-label)/.test(id);
}
export function createNightPoiIsolation(map){
 let active=false;const saved=new Map();
 function reconcile(){
  if(!active)return;
  let layers=[];try{layers=map.getStyle?.()?.layers||[];}catch{return;}
  for(const layer of layers){
   // Style swaps can remove a layer between snapshot and mutation. Never block night activation.
   try{
    if(!conflictsWithNight(layer)||!map.getLayer?.(layer.id))continue;
    const old=map.getLayoutProperty?.(layer.id,'visibility')??'visible';
    if(!saved.has(layer.id))saved.set(layer.id,old);
    if(old!=='none')map.setLayoutProperty(layer.id,'visibility','none');
   }catch{/* Retry on the next settled map idle. */}
  }
 }
 function set(next){
  if(next){active=true;nightOwners.add(map);reconcile();return;}
  active=false;nightOwners.delete(map);
  for(const [id,old] of saved){
   try{if(map.getLayer?.(id)&&map.getLayoutProperty?.(id,'visibility')!==old)map.setLayoutProperty(id,'visibility',old);}catch{/* Style replacement may already have restored the defaults. */}
  }
  saved.clear();
 }
 map.on?.('style.load',()=>{if(active){saved.clear();reconcile();}});
 map.on?.('idle',reconcile);
 return {set,reconcile,isActive:()=>active};
}
