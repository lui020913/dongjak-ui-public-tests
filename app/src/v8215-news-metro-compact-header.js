/** NEWS subway/bus fixed-chrome refinement. Presentation only.
 * Existing route selection, arrivals, timetable, bookmarks and GPS handlers
 * remain on the exact same DOM nodes. Avoid replacing live data / listeners. */
const TRANSPORT_ACTION_ICONS=Object.freeze({
  start:'<span class="dj-news-transport-label" aria-hidden="true">출발</span>',
  end:'<span class="dj-news-transport-label" aria-hidden="true">도착</span>'
});
export function installNewsMetroCompactHeader(doc=globalThis.document){
  const panel=doc?.getElementById?.('transport-sheet');
  if(!panel)return ()=>{};
  const head=panel.querySelector('.transport-panel-head');
  const title=doc.getElementById('transport-title');
  const close=doc.getElementById('transport-close');
  const tabs=doc.getElementById('transport-mode-tabs');
  const heading=panel.querySelector('.transport-arrivals-title');
  const neighbors=doc.getElementById('transport-neighbors');
  const selectionBox=panel.querySelector('.transport-selection-box');
  const start=doc.getElementById('transport-use-start');
  const end=doc.getElementById('transport-use-end');
  let bookmark=doc.getElementById('transport-save-place');
  let share=doc.getElementById('transport-share-place');
  if(!head||!title||!close||!tabs||!heading||!start||!end)return ()=>{};
  title.parentElement?.classList.add('dj857-transport-title-group');
  let stopped=false;
  let pending=false;
  let priorDirection=null;
  // A narrow, dedicated top-edge handle is separate from the title, route
  // buttons and close control so dragging never steals an ordinary tap.
  let edge=head.querySelector('.dj856-transport-edge-drag');
  if(!edge){
    edge=doc.createElement('span');
    edge.className='dj856-transport-edge-drag';
    edge.setAttribute('aria-hidden','true');
    head.prepend(edge);
  }
  let actionRow=head.querySelector('.dj-news-transport-actions');
  if(!actionRow){
    actionRow=doc.createElement('div');
    actionRow.className='dj-news-transport-actions';
    actionRow.setAttribute('aria-label','출발·도착·즐겨찾기·공유');
    head.insertBefore(actionRow,close);
  }
  for(const [button,key,fullLabel] of [
    [start,'start','여기서 출발'],[end,'end','여기로 도착']]){
    if(!button)continue;
    if(!button.querySelector('.dj-news-transport-label'))
      button.innerHTML=TRANSPORT_ACTION_ICONS[key];
    button.setAttribute('aria-label',fullLabel);
    button.title=fullLabel;
    button.classList.add('dj-news-transport-quick-button');
  }
  // Move, never clone: button event handlers are installed by transport-map.js.
  actionRow.append(start,end);
  if(bookmark){
    actionRow.append(bookmark);
  }
  if(share){
    actionRow.append(share);
    share.classList.add('dj-news-transport-share');
    share.setAttribute('aria-label','교통 장소 공유');share.title='교통 장소 공유';
  }
  // The live/timetable control belongs where the redundant section title was.
  const originalTitle=heading.querySelector(':scope > strong');
  if(originalTitle)originalTitle.classList.add('dj-news-arrivals-caption');
  const updatedActions=heading.querySelector('.transport-updated-actions');
  if(tabs.parentElement!==heading)heading.insertBefore(tabs,updatedActions||null);
  panel.classList.add('dj-news-transit-fixed');

  function updateOffsets(){
    if(stopped||panel.hidden)return;
    const headH=Math.ceil(head.getBoundingClientRect?.().height||head.offsetHeight||0);
    const visibleNeighbors=panel.dataset.kind==='subway' &&
      panel.dataset.transportView!=='hours' && neighbors && neighbors.childElementCount>0;
    const neighborH=visibleNeighbors?Math.ceil(neighbors.getBoundingClientRect?.().height||neighbors.offsetHeight||0):0;
    if(headH>0){
      const value=`${headH}px`;
      if(panel.style.getPropertyValue('--dj-news-head-h')!==value)panel.style.setProperty('--dj-news-head-h',value);
    }
    const value=`${neighborH}px`;
    if(panel.style.getPropertyValue('--dj-news-neighbors-h')!==value)panel.style.setProperty('--dj-news-neighbors-h',value);
  }
  const resizeObserver=typeof ResizeObserver!=='undefined'
    ?new ResizeObserver(()=>updateOffsets()):null;
  for(const node of [head,neighbors,heading])if(node)resizeObserver?.observe(node);
  function update(){
    if(stopped)return;
    const subway=panel.dataset.kind==='subway';
    // The source controller replaces the destination text on every selection;
    // keeping a short visible label prevents wrap on 320px phones.
    for(const [button,key,full] of [[start,'start','여기서 출발'],[end,'end','여기로 도착']]){
      if(!button.querySelector('.dj-news-transport-label'))
        button.innerHTML=TRANSPORT_ACTION_ICONS[key];
      if(button.getAttribute('aria-label')!==full)button.setAttribute('aria-label',full);
      if(button.title!==full)button.title=full;
    }
    bookmark=doc.getElementById('transport-save-place');
    share=doc.getElementById('transport-share-place');
    if(start.parentElement!==actionRow)actionRow.append(start);
    if(end.parentElement!==actionRow)actionRow.append(end);
    if(bookmark&&bookmark.parentElement!==actionRow)actionRow.append(bookmark);
    if(share&&share.parentElement!==actionRow)actionRow.append(share);
    if(tabs.parentElement!==heading)heading.insertBefore(tabs,updatedActions||null);
    if(bookmark){
      bookmark.classList.add('dj-news-transport-bookmark');
      const saved=bookmark.dataset.djSaved==='true';
      if(bookmark.getAttribute('aria-pressed')!==String(saved))bookmark.setAttribute('aria-pressed',String(saved));
      const label=saved?'즐겨찾기 해제':'즐겨찾기 추가';
      if(bookmark.getAttribute('aria-label')!==label)bookmark.setAttribute('aria-label',label);
      if(bookmark.title!==label)bookmark.title=label;
    }
    // Keep route order and existing navigation DOM nodes intact.
    for(const row of panel.querySelectorAll('.metro-neighbor-row')){
      for(const [selector,side] of [['.metro-rail-previous','previous'],['.metro-rail-next','next']]){
        const element=row.querySelector(selector);
        if(!element||element.dataset.djMetroArrow==='yes')continue;
        const station=(element.textContent||'').trim().replace(/^[‹‹〈<]\s*/,'').replace(/\s*[››〉>]$/,'').trim();
        const arrow=doc.createElement('span');arrow.className='dj-news-metro-arrow';
        arrow.setAttribute('aria-hidden','true');
        const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
        for(const [key,value] of Object.entries({viewBox:'0 0 20 20',width:'23',height:'23',fill:'none',stroke:'currentColor','stroke-width':'2.7','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(key,value);
        const path=doc.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',side==='previous'?'M13.5 3.5 7 10l6.5 6.5':'M6.5 3.5 13 10l-6.5 6.5');
        svg.append(path);arrow.append(svg);
        const name=doc.createElement('span');name.className='dj-news-metro-neighbor-name';name.textContent=station;
        element.replaceChildren(...(side==='previous'?[arrow,name]:[name,arrow]));
        element.dataset.djMetroArrow='yes';
      }
    }
    if(subway){
      const badgeCount=title.querySelectorAll('.dj-metro-line-selector').length;
      panel.classList.toggle('dj-news-metro-single-line',badgeCount===1);
      for(const group of panel.querySelectorAll('.metro-arrival-direction-group')){
        const direction=group.querySelector('.metro-direction-heading strong')?.textContent?.trim();
        const theme=direction==='상행'||direction==='내선'?'up':direction==='하행'||direction==='외선'?'down':null;
        if(theme){group.classList.toggle('up',theme==='up');group.classList.toggle('down',theme==='down');}
      }
    }else panel.classList.remove('dj-news-metro-single-line');
    // Do not scroll the sheet when selecting a tab. The fixed chrome is always visible.
    if(priorDirection!==panel.dataset.kind){priorDirection=panel.dataset.kind;panel.scrollTop=0;}
    updateOffsets();
  }
  function schedule(){
    if(pending||stopped)return;
    pending=true;queueMicrotask(()=>{pending=false;update();});
  }
  const observer=typeof MutationObserver!=='undefined'?new MutationObserver(schedule):null;
  observer?.observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-kind','data-transport-view','hidden','aria-pressed']});
  update();
  return ()=>{stopped=true;observer?.disconnect();resizeObserver?.disconnect();};
}
if(typeof document!=='undefined'){
  const begin=()=>installNewsMetroCompactHeader(document);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});
  else begin();
}
