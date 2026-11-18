/** Metro heading presentation only: station name above centered transfer badges.
 * Does not touch arrivals, selected line, neighbor clicks, or map camera. */
export function normalizeMetroTitle(title){
  if(!title?.classList?.contains('subway-title'))return false;
  if(title.querySelector?.('.dj-metro-station-name'))return false;
  const textNodes=[...title.childNodes].filter(node=>node.nodeType===3&&node.textContent.trim());
  const badges=[...title.children].filter(node=>node.matches?.('.dj-metro-line-selector'));
  if(!textNodes.length)return false;
  const name=title.ownerDocument.createElement('span');
  name.className='dj-metro-station-name';
  name.textContent=textNodes.map(n=>n.textContent).join('').trim();
  const row=title.ownerDocument.createElement('span');row.className='dj-metro-badge-row';
  row.append(...badges);title.replaceChildren(name,row);
  return true;
}
export function installMetroHeadingAlignment(doc=globalThis.document){
  const title=doc?.getElementById?.('transport-title');
  if(!title||typeof MutationObserver==='undefined')return ()=>{};
  let scheduled=false;
  const apply=()=>{scheduled=false;normalizeMetroTitle(title);};
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;queueMicrotask(apply);
  });
  observer.observe(title,{childList:true});apply();
  return ()=>observer.disconnect();
}
if(typeof document!=='undefined'){
  const boot=()=>installMetroHeadingAlignment(document);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
