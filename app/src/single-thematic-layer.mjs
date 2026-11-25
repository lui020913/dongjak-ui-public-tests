/** One selected thematic overlay; base map, transit, route and GPS are independent. */
export const THEMATIC_BUTTONS=['button[data-dj-import]','#sangdo-bocha-toggle','#toggle-road-width','#toggle-safety-facilities','#toggle-crosswalks','#toggle-essentials','#toggle-public-facilities','#toggle-station-accessibility','#protection-zone-toggle','#pza3-toggle','#sangdo-speed-toggle','#sangdo-camera-toggle','#dj-sangdo-team-toggle'].join(',');
export function installSingleThematicLayer({doc,win,disablePri}){
 let selected=null,suppress=false;
 const key=button=>button?.id==='dj-sangdo-team-toggle'||button?.dataset?.djImport==='accidents'?'accident-review':button?.id||button?.dataset?.djImport;
 const on=button=>button?.getAttribute('aria-pressed')==='true';
 const buttons=()=>Array.from(doc.querySelectorAll?.(THEMATIC_BUTTONS)||[]);
 const reconcile=()=>{
  if(suppress)return;
  suppress=true;
  try{
   // Turn nested review off before its parent accident overlay.
   for(const button of buttons().sort((a,b)=>Number(b.id==='dj-sangdo-team-toggle')-Number(a.id==='dj-sangdo-team-toggle'))){
    if(on(button)&&key(button)!==selected&&!button.disabled)button.click();
   }
  }finally{suppress=false;}
 };
 const claim=next=>{selected=next;if(next!=='pri')disablePri();reconcile();};
 doc.addEventListener('click',event=>{
  if(suppress)return;
  const button=event.target?.closest?.(THEMATIC_BUTTONS);
  if(!button||button.disabled)return;
  if(!on(button))claim(key(button));
  else if(selected!==key(button))reconcile();
 },true);
 const Observer=win.MutationObserver;
 if(Observer&&doc.documentElement)new Observer(records=>{
  const relevant=records.filter(r=>r.target?.matches?.(THEMATIC_BUTTONS));
  if(!relevant.length||suppress)return;
  // Catch late async completions after a different layer was selected.
  if(selected===null){const active=buttons().find(on);if(active)selected=key(active);}
  reconcile();
 }).observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['aria-pressed','disabled']});
 return {claimPri:()=>claim('pri'),releasePri:()=>{if(selected==='pri')selected=null;}};
}
