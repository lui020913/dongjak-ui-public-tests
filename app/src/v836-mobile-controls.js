/** Supplemental no-duplicate DOM controller for the five rebuilt sheets.
 * The sheet close logic remains owned by dj-v8212-sheet-controller.js.
 * Its stylesheet is already linked once from index.html, so no duplicate JS CSS import is needed. */

/** Accessibility: identify the top edge as draggable; the gray grip itself is
 * decorative and does not need to receive a pointer gesture. */
export function verifySheetEdges(doc=document){
  const ids=['route-panel','participation-panel','news-panel','mine-panel','admin-dong-picker'];
  let count=0;
  for(const id of ids){
    const panel=doc.getElementById(id);
    if(!panel)continue;
    const edge=panel.querySelector(':scope > .dj-sheet-chrome > .dj836-edge-drag');
    const body=panel.querySelector(':scope > .dj836-sheet-body');
    if(edge&&body){edge.title='패널 상단을 아래로 당겨 닫기';count++;}
  }
  return count;
}
if(typeof document!=='undefined'){
  const start=()=>verifySheetEdges();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
