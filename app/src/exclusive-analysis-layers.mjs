// One selected analytical overlay; base map controls and internal sublayers are excluded.
const SELECTOR='button[data-dj-import],button[data-bocha-import],#toggle-safety-facilities,#toggle-crosswalks,#toggle-essentials,#toggle-public-facilities,#toggle-station-accessibility,#protection-zone-toggle,#pza3-toggle,#sangdo-speed-toggle,#sangdo-camera-toggle,#toggle-road-width,#night-visibility-toggle,#ped-access-toggle,#dj-sangdo-team-toggle';
export function installExclusiveAnalysisLayers(doc,win,closePri){
 let selected=null,guard=false,stopping=new WeakSet();
 const controls=()=>Array.from(doc.querySelectorAll(SELECTOR));
 const isOn=n=>n.getAttribute('aria-pressed')==='true';
 function stop(n){if(!isOn(n)||n.disabled||stopping.has(n))return;stopping.add(n);guard=true;try{n.click();}finally{guard=false;queueMicrotask(()=>stopping.delete(n));}}
 function reconcile(){for(const n of controls())if(n!==selected)stop(n);}
 function claimPri(){selected='pri';reconcile();}
 function click(e){if(guard)return;const n=e.target.closest?.(SELECTOR);if(!n||n.disabled)return;if(isOn(n)){if(selected===n)selected=null;return;}selected=n;closePri();reconcile();}
 const observer=new win.MutationObserver(records=>{for(const r of records){const n=r.target;if(!n.matches?.(SELECTOR))continue;if(isOn(n)&&!selected&&!stopping.has(n)){selected=n;closePri();}if(isOn(n)&&selected!==n)stop(n);}reconcile();});
 observer.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['aria-pressed','disabled']});
 doc.addEventListener('click',click,true);
 return {claimPri,releasePri(){if(selected==='pri')selected=null;},dispose(){observer.disconnect();doc.removeEventListener('click',click,true);}};
}
