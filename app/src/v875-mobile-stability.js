/** v8.7.5 mobile interaction stability. Desktop layout/data untouched.
 * Existing buttons remain the only owners of their underlying feature actions. */
export function installV875MobileStability(doc=document,win=window){
  const app=doc.getElementById('app');if(!app||app.dataset.dj875Ready==='1')return ()=>{};
  app.dataset.dj875Ready='1';
  const phone=()=>win.matchMedia?.('(max-width:1079px)')?.matches===true;
  const stops=[];
  function on(node,type,fn,opts){node?.addEventListener(type,fn,opts);stops.push(()=>node?.removeEventListener(type,fn,opts));}
  const panel=doc.getElementById('transport-sheet');
  // Static chrome and grabber are NEVER part of the scrolling data area.
  // Move the actual existing nodes: their event listeners and IDs remain intact.
  let scrollArea=null;
  if(panel&&phone()){
    scrollArea=doc.createElement('div');scrollArea.className='dj875-transit-scroll';
    scrollArea.setAttribute('aria-label','교통정보 상세 내용 스크롤');
    for(const child of [...panel.children]){
      if(child.classList.contains('handle')||child.classList.contains('transport-panel-head'))continue;
      scrollArea.appendChild(child);
    }
    panel.appendChild(scrollArea);
  }
  // The transport sheet's top grip and header are both handled by
  // dj-v8212-sheet-controller. A second pointer owner bypassed the staged
  // collapse and could close an expanded sheet in a single downward drag.
  // Closing a map safety overlay uses its own class state, not a click replay.
  let safetyTimer=0;
  const safetyExit=e=>{
    if(!phone()||!e.target?.closest?.('#map-safety-close'))return;
    e.preventDefault();e.stopImmediatePropagation();
    const safety=doc.getElementById('map-safety-controls');
    if(!app.classList.contains('map-safety-open')||safetyTimer)return;
    const finish=()=>{safetyTimer=0;app.classList.remove('map-safety-open');const backdrop=doc.getElementById('map-safety-backdrop');if(backdrop)backdrop.hidden=true;doc.getElementById('map-safety-toggle')?.setAttribute('aria-expanded','false');safety?.classList.remove('dj875-map-safety-exiting');};
    if(win.DongjakWindowMotion){win.DongjakWindowMotion.close(safety,finish);return;}
    safety?.classList.add('dj875-map-safety-exiting');
    safetyTimer=win.setTimeout(()=>{
      safetyTimer=0;app.classList.remove('map-safety-open');
      const backdrop=doc.getElementById('map-safety-backdrop');if(backdrop)backdrop.hidden=true;
      safety?.classList.remove('dj875-map-safety-exiting');
    },win.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches?0:240);
  };
  on(win,'click',safetyExit,true);
  stops.push(()=>{if(safetyTimer)win.clearTimeout(safetyTimer);});
  // Avoid browser scrolling the entire transport sheet when only data scrolls.
  const setScroll=()=>{
    if(!phone()||!scrollArea||panel?.hidden)return;
    // Keep a changed route's information visible without moving the grip.
    if(scrollArea.scrollTop>scrollArea.scrollHeight-scrollArea.clientHeight+80)scrollArea.scrollTop=0;
  };
  on(win,'resize',setScroll,{passive:true});
  // Explain "N stops away" on the right of each compact bus row without
  // discarding real-time source text or changing the underlying API objects.
  const arrivals=doc.getElementById('transport-arrivals');
  let marking=false;
  const decorateBus=()=>{
    if(marking||!phone()||panel?.dataset.kind!=='bus')return;
    marking=true;
    try{for(const row of arrivals?.querySelectorAll('.transport-arrival-row')||[]){
      const time=row.querySelector('.transport-arrival-time');
      if(!time||time.dataset.dj875Decorated==='1')continue;
      time.dataset.dj875Decorated='1';
      const original=time.textContent?.trim()||'';
      const match=original.match(/\[\s*(\d+)\s*(?:번째|정거장)\s*전\s*\]/u);
      if(!match)continue;
      const main=original.replace(match[0],'').trim();
      time.replaceChildren();
      const first=doc.createElement('span');first.className='dj875-arrival-eta';first.textContent=main||'도착 예정';
      const sub=doc.createElement('small');sub.className='dj875-stop-count';sub.textContent=`${match[1]} 정거장 전`;
      time.append(first,sub);
    }}finally{marking=false;}
  };
  if(arrivals&&typeof MutationObserver!=='undefined'){
    const ob=new MutationObserver(decorateBus);
    ob.observe(arrivals,{childList:true,subtree:false});stops.push(()=>ob.disconnect());
  }
  if(panel&&typeof MutationObserver!=='undefined'){
    const ob=new MutationObserver(()=>{setScroll();decorateBus();});
    ob.observe(panel,{attributes:true,attributeFilter:['hidden','data-kind']});stops.push(()=>ob.disconnect());
  }
  // The quick-search input remains a real input. Don't alter WebKit keyboard
  // helpers: set a stable light-background on the document only while focused.
  const query=doc.getElementById('map-quick-search-query');
  on(query,'focus',()=>app.classList.add('dj875-search-focused'));
  on(query,'blur',()=>app.classList.remove('dj875-search-focused'));
  // Map options belongs to one controller on mobile. Older UI generations
  // attach multiple competing click handlers to the moved original button.
  // Intercept only mobile map-options toggling, not the safety or desktop tools.
  let optionsClosing=0;
  const closeOptions=(animate=true)=>{
    const options=doc.getElementById('map-advanced-controls');
    if(!app.classList.contains('map-controls-open'))return;
    if(optionsClosing)return;
    const finish=()=>{
      optionsClosing=0;app.classList.remove('map-controls-open');
      const backdrop=doc.getElementById('map-options-backdrop');if(backdrop)backdrop.hidden=true;
      const help=doc.getElementById('mobile-webapp-help');if(help)help.hidden=true;
      const button=doc.getElementById('map-tools-toggle');button?.setAttribute('aria-expanded','false');
      options?.classList.remove('dj875-map-options-exiting');
    };
    if(!animate||win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){finish();return;}
    if(win.DongjakWindowMotion){win.DongjakWindowMotion.close(options,finish);return;}
    options?.classList.add('dj875-map-options-exiting');
    optionsClosing=win.setTimeout(finish,240);
  };
  const onMapOptions=e=>{
    if(!phone())return;
    const btn=e.target?.closest?.('#map-tools-toggle,#map-options-mobile-close,#map-options-desktop-close,#map-options-backdrop');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(btn.id!=='map-tools-toggle'){closeOptions();return;}
    if(optionsClosing)return;
    if(app.classList.contains('map-controls-open')){closeOptions();return;}
    app.classList.remove('map-safety-open');
    const safetyBackdrop=doc.getElementById('map-safety-backdrop');if(safetyBackdrop)safetyBackdrop.hidden=true;
    app.classList.add('map-controls-open');
    const backdrop=doc.getElementById('map-options-backdrop');if(backdrop)backdrop.hidden=false;
    btn.setAttribute('aria-expanded','true');
  };
  on(win,'click',onMapOptions,true);
  // The visible top-edge strip (not its gray glyph alone) is the swipe target.
  // Use pointer events but NEVER hijack button or input taps.
  const options=doc.getElementById('map-advanced-controls');
  let edge=null,gesture=null;
  if(options){
    edge=doc.createElement('div');edge.className='dj875-options-grip';
    edge.setAttribute('aria-label','지도 옵션 창 크기 조절');edge.setAttribute('role','separator');
    options.prepend(edge);
    on(edge,'pointerdown',e=>{if(!phone()||!app.classList.contains('map-controls-open'))return;
      gesture={id:e.pointerId,y:e.clientY};try{edge.setPointerCapture(e.pointerId);}catch{}});
    on(edge,'pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;
      const delta=e.clientY-gesture.y;gesture=null;
      if(delta>65)closeOptions();
      else if(delta< -65)options.classList.add('dj875-options-expanded');
    });
    on(edge,'pointercancel',()=>{gesture=null;});
  }
  // Distinguish switches from one-shot map tools: don't invent a switch for a
  // button that opens a separate dialog or performs an action.
  function fixActionRows(){
    if(!phone())return;
    for(const el of options?.querySelectorAll('button')||[]){
      if(el.closest('label')||el.matches('[role=switch],[aria-pressed]'))continue;
      if(el.classList.contains('dj875-plain-action'))continue;
      if(/필터|행정동|등록/.test(el.textContent||''))el.classList.add('dj875-plain-action');
    }
  }
  fixActionRows();
  return ()=>{
    stops.forEach(fn=>fn());if(optionsClosing)win.clearTimeout(optionsClosing);
    if(scrollArea&&panel){for(const child of [...scrollArea.children])panel.appendChild(child);scrollArea.remove();}
    edge?.remove();delete app.dataset.dj875Ready;app.classList.remove('dj875-search-focused');
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installV875MobileStability(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
