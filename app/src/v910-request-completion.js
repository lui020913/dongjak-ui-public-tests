/** Remaining owner-requested UI work, after the verified v8.9.9 baseline.
 * Original nodes/handlers, APIs, authentication and map state remain authoritative.
 */
export function dockClearance(viewportHeight, navTop, gap=8){
  return Number.isFinite(navTop)&&navTop>0&&navTop<viewportHeight
    ?Math.ceil(viewportHeight-navTop+gap):88;
}
export function installRequestCompletion(doc=document,win=window){
  const app=doc.getElementById('app');if(!app||app.dataset.dj910Ready)return ()=>{};
  app.dataset.dj910Ready='1';
  let frame=0,disposed=false;
  const visible=n=>{if(!n||n.hidden||n.closest?.('[hidden]')||n.getAttribute('aria-hidden')==='true'||!n.getClientRects().length)return false;const style=win.getComputedStyle(n);return style.display!=='none'&&style.visibility!=='hidden';};
  const variable=(key,value)=>{if(app.style.getPropertyValue(key)!==value)app.style.setProperty(key,value);};
  const attr=(key,value)=>{if(app.getAttribute(key)!==value)app.setAttribute(key,value);};
  const resize=new win.ResizeObserver(()=>schedule());
  const seen=new WeakSet();
  let communityViewportWidth=0,communityUnfocusedHeight=0;
  function fitCommunityEditor(){
    const panel=doc.getElementById('participation-panel'),form=doc.getElementById('community-form'),field=doc.activeElement,vv=win.visualViewport;
    if(!panel||!form)return;
    const phone=win.innerWidth<700;
    const heading=panel.querySelector('.community-heading-row'),toolbar=panel.querySelector('.community-toolbar'),sort=doc.getElementById('community-sort');
    if(sort&&heading&&toolbar){
      const destination=phone?heading:toolbar;const saved=doc.getElementById('community-saved-toggle');
      if(saved&&saved.parentElement!==destination){if(phone)heading.insertBefore(saved,doc.getElementById('community-compose-toggle'));else toolbar.append(saved);}
      if(sort.parentElement!==destination){if(phone)destination.prepend(sort);else destination.append(sort);}
    }
    const visibleEditor=phone&&!panel.hidden&&!form.hidden;
    // A single native scroll area. Move existing nodes only; preserve handlers and draft data.
    if(visibleEditor&&!form.querySelector(':scope > .djNext-form-scroll')){
      const head=form.querySelector(':scope > .community-form-top');
      if(head){const sc=doc.createElement('div');sc.className='djNext-form-scroll';
        for(const node of [...form.childNodes])if(node!==head)sc.append(node);
        form.append(sc);}
    }
    const full=doc.documentElement.clientHeight||win.innerHeight;
    const w=doc.documentElement.clientWidth||win.innerWidth;
    if(communityViewportWidth!==w){communityViewportWidth=w;communityUnfocusedHeight=full;}
    const focused=visibleEditor&&form.contains(field)&&field.matches?.('input:not([type=file]),textarea,[contenteditable=true]');
    const closing=form.dataset.dj810Animating==='closing';
    if(visibleEditor&&closing)return; // preserve the viewport until the close callback hides the editor
    if(!focused&&!panel.hasAttribute('data-dj-patch-keyboard'))communityUnfocusedHeight=full;
    const viewportHeight=Number(vv?.height)||full;
    const offset=Number(vv?.offsetTop)||0;
    const scale=Number(vv?.scale)||1;
    const keyboard=Boolean(visibleEditor&&(focused||panel.dataset.djPatchKeyboard==='true')&&Math.abs(scale-1)<.08&&Math.max(full,communityUnfocusedHeight)-viewportHeight>100);
    if(!keyboard){if(panel.hasAttribute('data-dj-patch-keyboard'))panel.removeAttribute('data-dj-patch-keyboard');if(!focused)communityUnfocusedHeight=full;return;}
    const top=Math.max(8,Math.round(offset+8)),bottom=Math.max(8,Math.round(full-offset-viewportHeight+8));
    if(panel.style.getPropertyValue('--dj-patch-vv-top')!==top+'px')panel.style.setProperty('--dj-patch-vv-top',top+'px');
    if(panel.style.getPropertyValue('--dj-patch-vv-bottom')!==bottom+'px')panel.style.setProperty('--dj-patch-vv-bottom',bottom+'px');
    if(panel.dataset.djPatchKeyboard!=='true'){
      // Do not let an unfinished sheet slide displace the keyboard viewport.
      win.DongjakWindowMotion?.cancel?.(panel);win.DongjakWindowMotion?.cancel?.(form);
      panel.dataset.djPatchKeyboard='true';
    }
    const scroll=form.querySelector('.djNext-form-scroll');
    if(scroll&&focused){const r=field.getBoundingClientRect(),s=scroll.getBoundingClientRect();
      if(r.height>s.height-24||r.top<s.top+12)scroll.scrollTop+=r.top-s.top-12;
      else if(r.bottom>s.bottom-12)scroll.scrollTop+=r.bottom-s.bottom+12;}
  }
  function sync(){
    frame=0;if(disposed)return;
    fitCommunityEditor();
    const compact=win.innerWidth<1080||win.matchMedia?.('(min-width:1080px) and (max-width:1366px) and (pointer:coarse)')?.matches;
    const form=doc.querySelector('.topbar .map-quick-search-form');
    // Move the real logo buttons; retain their app-information click handlers.
    for(const id of ['dj-settings-mobile','dj-about-pc']){
      const button=doc.getElementById(id);
      if(form&&button&&button.parentElement!==form)form.prepend(button);
    }
    const nav=doc.getElementById('bottom-nav');
    const h=doc.documentElement.clientHeight||win.innerHeight;
    const n=nav?.getBoundingClientRect();
    variable('--dj910-dock-bottom',dockClearance(h,visible(nav)?n?.top:NaN)+'px');
    const head=doc.querySelector('.topbar'),toolbar=doc.getElementById('djNext-toolbar')||doc.getElementById('dj-v794-toolbar');
    const headerBottom=visible(head)?head.getBoundingClientRect().bottom:56;
    const toolsBottom=visible(toolbar)?toolbar.getBoundingClientRect().bottom:headerBottom;
    const categories=doc.getElementById('dj912-poi-categories');
    variable('--dj912-poi-top',Math.ceil(Math.max(headerBottom,toolsBottom)+8)+'px');
    const categoriesBottom=visible(categories)?categories.getBoundingClientRect().bottom:toolsBottom;
    variable('--dj910-header-bottom',Math.ceil(headerBottom+8)+'px');
    variable('--dj910-map-top',Math.ceil(Math.max(headerBottom,toolsBottom,categoriesBottom)+8)+'px');
    for(const node of [nav,head,toolbar,categories])if(node&&!seen.has(node)){seen.add(node);resize.observe(node);}
    const painted=n=>visible(n)||(!n.hidden&&(
      n.dataset.dj810Animating==='closing'||n.classList.contains('dj870-more-leaving')
    )&&n.getClientRects().length>0);
    const sheetOpen=[...doc.querySelectorAll('.page-panel:not([hidden]),#transport-sheet:not([hidden]),.dj-place-detail-popup,#dj-mobile-utilities:not([hidden]),#route-map-card:not([hidden]),#route-transit-confirm:not([hidden])')].some(painted);
    attr('data-dj910-sheet-open',sheetOpen?'true':'false');
    for(const popup of doc.querySelectorAll('.dj-place-detail-popup')){
      const header=popup.querySelector('.dj-place-header');
      const close=popup.querySelector('.dj-place-header-close');
      if(header&&close&&close.parentElement!==header)header.append(close);
      const body=popup.querySelector('.dj-place-body');
      const ai=body?.querySelector('.dj-place-ai-section'),reviews=body?.querySelector('.dj834-reviews');
      if(ai&&reviews&&ai.compareDocumentPosition(reviews)&2)body.insertBefore(ai,reviews);
      const lookup=body?.querySelector('.dj-place-official-lookup');
      if(ai&&lookup&&ai.compareDocumentPosition(lookup)&2)body.insertBefore(ai,lookup);
    }
    // A real sticky footer inside the native scrolling route editor.
    const calc=doc.getElementById('route-calc');
    if(calc&&!doc.getElementById('dj910-route-footer')){
      const footer=doc.createElement('div');footer.id='dj910-route-footer';
      const panel=doc.getElementById('route-panel');
      panel.append(footer);footer.append(calc);
    }
    const safety=doc.querySelector('#bottom-nav [data-tab="map"] .nav-icon');
    if(safety&&!safety.querySelector('.dj910-map-glyph')){
      safety.replaceChildren();
      safety.innerHTML='<svg class="dj910-map-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16"/></svg>';
    }
    if(!compact)variable('--dj910-map-top',Math.ceil(Math.max(headerBottom,categoriesBottom)+8)+'px');
  }
  function schedule(){if(!frame&&!disposed)frame=win.requestAnimationFrame(sync);}
  const observer=new win.MutationObserver(records=>{
    if(records.some(r=>r.type==='childList'||['hidden','class','aria-hidden','data-tab','data-theme','data-dj810-animating'].includes(r.attributeName)))schedule();
  });
  observer.observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','aria-hidden','data-tab','data-theme','data-dj810-animating']});
  win.addEventListener('resize',schedule,{passive:true});
  app.addEventListener('transitionend',schedule,true);
  app.addEventListener('animationend',schedule,true);
  win.visualViewport?.addEventListener('resize',schedule,{passive:true});
  win.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  app.addEventListener('focusin',schedule);app.addEventListener('focusout',schedule);
  schedule();
  return ()=>{disposed=true;observer.disconnect();resize.disconnect();if(frame)win.cancelAnimationFrame(frame);win.removeEventListener('resize',schedule);app.removeEventListener('transitionend',schedule,true);app.removeEventListener('animationend',schedule,true);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);app.removeEventListener('focusin',schedule);app.removeEventListener('focusout',schedule);};
}
