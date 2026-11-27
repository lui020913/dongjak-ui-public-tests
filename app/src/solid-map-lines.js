/** One style-event owner keeps all map line layers solid, including late
 * additions and release-time adapters. Color/width/geometry are unchanged. */
export function solidifyMapLines(map){
 let changed=0;
 for(const layer of map.getStyle()?.layers||[]){
  if(layer.type!=='line'||layer.paint?.['line-dasharray']==null)continue;
  if(/^(dj815-transit-walk|dj-transit-multi-walk|dj-transit-comparison-route-walk)-line$/.test(layer.id))continue;
  try{map.setPaintProperty(layer.id,'line-dasharray',null);changed++;}catch{/* Style is being replaced. Next styledata retries. */}
 }
 return changed;
}
export function installSolidMapLines(map){
 let queued=false,disposed=false;
 const schedule=()=>{
  if(queued||disposed)return;queued=true;
  // Yield to rendering and input; styledata can fire again on each paint write.
  const run=()=>{if(!disposed)solidifyMapLines(map);queued=false;};
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else setTimeout(run,0);
 };
 map.on('styledata',schedule);map.on('load',schedule);schedule();
 return ()=>{disposed=true;map.off('styledata',schedule);map.off('load',schedule);};
}
