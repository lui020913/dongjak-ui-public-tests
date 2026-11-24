/** Keep line colors and widths unchanged; normalize all dashed map strokes. */
export function normalizeSolidMapLines(map){
 let changed=0;
 for(const layer of map.getStyle?.()?.layers||[]){
  if(layer.type!=='line'||layer.paint?.['line-dasharray']==null)continue;
  try{map.setPaintProperty(layer.id,'line-dasharray',null);changed++;}catch{/* layer may have been replaced */}
 }
 return changed;
}
export function installSolidMapLines(map){
 let scheduled=false,busy=false;
 const apply=()=>{scheduled=false;if(busy)return;busy=true;try{normalizeSolidMapLines(map);}finally{busy=false;}};
 const schedule=()=>{if(scheduled||busy)return;scheduled=true;queueMicrotask(apply);};
 map.on('styledata',schedule);map.on('load',schedule);schedule();
 return ()=>{map.off('styledata',schedule);map.off('load',schedule);};
}
