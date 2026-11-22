/**
 * Dock the overview card and map scale together, away from the map's bottom edge.
 * Desktop: top-left information rail, immediately to the right of the left navigation.
 * Phone/tablet: retain the existing bottom sheet and mobile scale behaviour.
 *
 * The old implementation only positioned the scale while the card was still
 * bottom:20px; it could never move the *group* away from the bottom.
 */


/** Keep the PC's original 1.5x ceiling; sharpen only coarse-pointer phones. */
export function responsiveMapPixelRatio({width=390,coarse=true,deviceRatio=3}={}){
  const cap=Number(width)<=699&&coarse?1.75:1.5;
  return Math.min(cap,Math.max(1,Number(deviceRatio)||1));
}

/** Adaptive quality budget: PC is unchanged; idle mobile canvas is sharper.
 * DPR is capped independently of CSS pixel size to avoid 3x mobile GPU cost.
 */
export function mobileMapPixelBudget({deviceRatio=2,deviceMemory=null,coarse=true,width=390}={}){
  const dpr=Math.max(1,Number(deviceRatio)||1);
  if(width>699||!coarse)return {moving:Math.min(dpr,1.5),idle:Math.min(dpr,1.5)};
  const lowMemory=Number.isFinite(Number(deviceMemory))&&Number(deviceMemory)>0&&Number(deviceMemory)<=3;
  return {moving:Math.min(dpr,lowMemory?1.15:1.35),idle:Math.min(dpr,lowMemory?1.65:2)};
}

export function scaleDockTop({mapTop=0,mapBottom,cardTop=null,scaleHeight=22,margin=14}){
  const baseline=mapBottom-mapTop-scaleHeight-18;
  if(cardTop===null)return Math.max(0,baseline);
  return Math.max(12,Math.min(baseline,cardTop-mapTop-scaleHeight-margin));
}

/** The mobile scale is a separate HUD element and must remain above the
 * upper edge of whichever bottom floating sheet is currently visible. */
export function mobileScalePosition({mapTop=0,boundaryTop,headerBottom=0,scaleHeight=22,gap=12}={}){
  const minTop=Math.max(70,headerBottom-mapTop+12);
  const desired=boundaryTop-mapTop-scaleHeight-gap;
  return {top:Math.max(minTop,Math.round(desired)),visible:desired>=minTop};
}

/** Horizontal placement of mobile scale: align with the inner left inset of
 * the lower navigation, never with a partially off-screen map tool. */
export function mobileScaleLeft({mapLeft=0,mapWidth=390,navLeft=null,scaleWidth=88,inset=18}={}){
  const navInset=Number.isFinite(navLeft)?navLeft-mapLeft+8:inset;
  const preferred=Math.max(inset,navInset);
  const maxLeft=Math.max(inset,mapWidth-Math.max(0,scaleWidth)-inset);
  return Math.round(Math.min(preferred,maxLeft));
}

/** Use the actual bottom navigation bounds, including centered tablet docks. */
export function compactHudInsets(viewportWidth,navRect,minInset=12){
  const width=Math.max(0,Number(viewportWidth)||0);
  const valid=Number.isFinite(navRect?.left)&&Number.isFinite(navRect?.right)&&navRect.right>navRect.left;
  const left=Math.round(Math.max(minInset,valid?navRect.left:minInset));
  const right=Math.round(Math.max(minInset,valid?width-navRect.right:minInset));
  return {left,right,width:Math.max(0,width-left-right)};
}

const sizeOf=(rect,dimension,fallback)=>Math.max(0,Number(rect?.[dimension])||fallback);

/** Geometry in app-relative px. The main nav is a *vertical* rail on desktop. */
/**
 * Desktop information dock: compact top-left chip aligned to the first item of
 * the vertical navigation rail, never pinned to the bottom of the map.
 * The map-options button can occupy this area; resolve collisions horizontally
 * first instead of pushing the information card halfway down the map.
 */
export function desktopInformationDock({
  appRect,headerRect,navRect,toolsRect,cardHeight=60,scaleHeight=26,
  cardWidth=430,gap=10
}){
  const inset=14;
  const headerBottom=(headerRect?.bottom??appRect.top+70)-appRect.top;
  const railTop=navRect?.height>0 ? navRect.top-appRect.top : headerBottom+12;
  const minTop=headerBottom+12;
  let top=Math.max(minTop,railTop);
  let left=Math.max(inset,(navRect?.width>0 ? navRect.right-appRect.left+12 : 112));
  let width=Math.min(cardWidth,appRect.width-left-inset);
  width=Math.max(228,width);

  // A narrow desktop may have other floating tools next to the rail.
  const collidesTools=(x,y,w,h)=>Boolean(toolsRect?.width>0 &&
    toolsRect.right>appRect.left+x && toolsRect.left<appRect.left+x+w &&
    toolsRect.bottom>appRect.top+y && toolsRect.top<appRect.top+y+h);
  const dockHeight=Math.max(48,cardHeight)+gap+Math.max(18,scaleHeight);
  if(collidesTools(left,top,width,dockHeight)){
    const shifted=toolsRect.right-appRect.left+12;
    if(shifted+width+inset<=appRect.width){left=shifted;}
    else top=Math.max(top,toolsRect.bottom-appRect.top+12);
  }
  // Keep the top-left presentation on unusually short desktop windows too.
  top=Math.min(top,Math.max(minTop,appRect.height-168));
  const allowedHeight=Math.max(60,Math.min(290,appRect.height-top-72));
  const visibleHeight=Math.min(Math.max(48,cardHeight),allowedHeight);
  let scaleTop=top+visibleHeight+gap;
  if(scaleTop+scaleHeight>appRect.height-inset){
    scaleTop=Math.max(headerBottom+8,top-scaleHeight-gap);
  }
  return {
    card:{left,top,width,maxHeight:allowedHeight},
    scale:{left,top:scaleTop}
  };
}

function applyImportant(el,prop,value){
  const expected=String(value);
  if(el.style.getPropertyValue(prop)!==expected || el.style.getPropertyPriority(prop)!=='important'){
    el.style.setProperty(prop,expected,'important');
  }
}

const desktopCardProps=['position','top','bottom','left','right','width','max-width','max-height','transform','border-radius'];

// A distance scale is a map-only measurement. The v8.5.2 HUD reserves the
// left side for this scale and the right side for the independent map TIP pill.
// Other search results, sheets and modal surfaces still suppress the scale.
export const MOBILE_SCALE_BLOCKERS=Object.freeze([
  '#map-quick-search-dropdown', '#overview-sheet',
  '#transport-sheet', '#detail-sheet', '#entry-sheet', '#route-panel',
  '#participation-panel', '#news-panel', '#mine-panel', '#admin-dong-picker',
  '#road-width-legend', '#ped-tools-panel', '#map-safety-controls',
  '#map-advanced-controls', '#night-visibility-float',
  '#dj-mobile-utilities', '#dj832-data-sheet', '#dj833-weather-sheet',
  '#djNext-layer-panel', '#djNext-permissions', '#dj-pri-legend', '#dj-pri-dialog',
  '#dj854-weather-sheet',
  '#dj833-night-modal', '#dj832-info-sheet', '#dj832-feature-sheet',
  '#dj-map-settings', '#dj-app-about', '#version-history-modal',
  '#dj840-theme-confirm', '#dj832-dongjak-boundary',
  '#dj-transit-signin-prompt', '#map-startup-overlay',
  '#route-place-search', '#route-transit-confirm', '#route-pick-hint',
  '#community-map-hint', '#route-map-card', '#nav-live-card',
  '#dj815-rail-planner', '#dj815-waypoints',
  '#toast', '.maplibregl-popup', '[role="dialog"][aria-modal="true"]'
]);

export function mobileScaleBlockerVisible(node,view){
  if(!node||node.hidden||node.closest?.('[hidden]')||node.getAttribute?.('aria-hidden')==='true')return false;
  if(node.id==='toast'&&!node.classList?.contains('show'))return false;
  const style=view?.getComputedStyle?.(node);
  if(style && (style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0))return false;
  const bounds=node.getBoundingClientRect?.();
  if(bounds){
    if(bounds.width<2||bounds.height<2)return false;
    if(bounds.right<=0||bounds.bottom<=0||bounds.left>=view.innerWidth||bounds.top>=view.innerHeight)return false;
  }
  return true;
}

export function shouldHideMobileScale(app,doc,view){
  if(!app||!doc||!view)return true;
  if((app.dataset.tab||'map')!=='map'||app.dataset.searchOpen==='true'||app.dataset.dj910SheetOpen==='true')return true;
  if(app.classList.contains('map-controls-open')||app.classList.contains('map-safety-open'))return true;
  for(const selector of MOBILE_SCALE_BLOCKERS){
    for(const node of doc.querySelectorAll(selector)){
      // Some permanently mounted elements (e.g. the waypoints control) are
      // children of an already hidden panel and must not block the map HUD.
      if(mobileScaleBlockerVisible(node,view))return true;
    }
  }
  return false;
}

export function installScaleDocking({map,app,overview}={}){
  if(!map||!app||!overview||typeof window==='undefined')return ()=>{};
  let qualityIdleTimer=null;
  const pixelBudget=()=>mobileMapPixelBudget({
    width:window.innerWidth,
    coarse:window.matchMedia?.('(pointer:coarse)')?.matches===true,
    deviceRatio:window.devicePixelRatio||1,
    deviceMemory:window.navigator?.deviceMemory
  });
  let lastAppliedRatio=null;
  const setRatio=target=>{
    // Some MapLibre builds expose setPixelRatio without getPixelRatio. Keep a
    // local memo to avoid repeated idle -> resize -> idle repaint loops.
    const reported=map.getPixelRatio?.();
    const current=Number.isFinite(reported)?reported:lastAppliedRatio;
    if(typeof map.setPixelRatio==='function'&&(!Number.isFinite(current)||Math.abs(current-target)>.035)){
      map.setPixelRatio(target);
      lastAppliedRatio=target;
    }
  };
  const syncPixelRatio=()=>{
    const coarse=window.matchMedia?.('(pointer:coarse)')?.matches===true;
    const target=responsiveMapPixelRatio({width:window.innerWidth,coarse,deviceRatio:window.devicePixelRatio||1});
    if(window.innerWidth<=699&&coarse)setRatio(pixelBudget().idle);
    else setRatio(target);
  };
  const onMotionStart=()=>{
    if(window.innerWidth>699)return;
    clearTimeout(qualityIdleTimer);
    app.classList.add('dj873-map-moving');
    setRatio(pixelBudget().moving);
  };
  const onMotionStop=()=>{
    if(window.innerWidth>699)return;
    clearTimeout(qualityIdleTimer);
    qualityIdleTimer=setTimeout(()=>{
      if(map.isMoving?.())return;
      app.classList.remove('dj873-map-moving');
      setRatio(pixelBudget().idle);
    },250);
  };
  syncPixelRatio();
  map.on?.('movestart',onMotionStart);
  map.on?.('moveend',onMotionStop);
  map.on?.('idle',onMotionStop);
  let scheduled=false,disposed=false,previousDesktop=false;
  const scaleElement=()=>map.getContainer?.()?.querySelector('.maplibregl-ctrl-bottom-left');
  // Dynamic weather sheets may be mounted after the initial overlay observer.
  // Their explicit lifecycle event must hide MapLibre's inline-important scale
  // immediately, without waiting for an observer/motion frame.
  const onWeatherVisibility=()=>{
    if(disposed)return;
    const scale=scaleElement();
    if(scale && window.innerWidth<700 && shouldHideMobileScale(app,app.ownerDocument,window)){
      applyImportant(scale,'visibility','hidden');
      const chip=scale.querySelector('.maplibregl-ctrl-scale');
      if(chip)applyImportant(chip,'visibility','hidden');
    }
    schedule();
  };
  window.addEventListener('dongjak:weather-visibility-changed',onWeatherVisibility);
  const restoreCard=()=>{
    for(const prop of desktopCardProps)overview.style.removeProperty(prop);
  };
  function schedule(){
    if(disposed||scheduled)return;
    scheduled=true;
    requestAnimationFrame(update);
  }
  function update(){
    scheduled=false;
    if(disposed)return;
    const scale=scaleElement();
    const mapContainer=map.getContainer?.();
    if(!mapContainer||!scale)return;
    const mapRect=mapContainer.getBoundingClientRect();
    const appRect=app.getBoundingClientRect();
    if(mapRect.height<100||appRect.height<100)return;
    const navRect=app.querySelector('#bottom-nav')?.getBoundingClientRect();
    const railButtons=['#map-tools-toggle','#night-visibility-quick-off','#map-safety-toggle']
      .map(selector=>app.querySelector(selector))
      .filter(node=>node && !node.hidden && getComputedStyle(node).display!=='none' && getComputedStyle(node).visibility!=='hidden')
      .map(node=>node.getBoundingClientRect()).filter(r=>r.width>0 && r.height>0);
    const railBottom=railButtons.length?Math.max(...railButtons.map(r=>r.bottom)):null;
    const desktop=Boolean(window.innerWidth>=700 && navRect &&
      navRect.height>220 && navRect.height>navRect.width*1.35);
    if(!desktop){
      app.style.removeProperty('--dj-left-dock-x');
      app.style.removeProperty('--dj-rail-top');
      if(previousDesktop)restoreCard();
      previousDesktop=false;
      // An open map window or modal takes precedence. The map TIP is no longer
      // a blocker: it occupies a reserved right-hand HUD lane beside the scale.
      const scaleChip=scale.querySelector('.maplibregl-ctrl-scale');
      if(shouldHideMobileScale(app,app.ownerDocument,window)){
        applyImportant(scale,'visibility','hidden');
        if(scaleChip)applyImportant(scaleChip,'visibility','hidden');
        return;
      }
      // Visibility:hidden preserves geometry. Do not toggle visible just to
      // measure and immediately hide again: the HUD observer watches styles.
      // Legacy tablet styles can hide the entire MapLibre corner, even when
      // the chip itself is visible. Restore the corner before measuring it.
      // Overlay visibility remains governed by shouldHideMobileScale above.
      applyImportant(scale,'display','block');
      if(scaleChip)applyImportant(scaleChip,'display','flex');
      const scaleRect=scaleChip?.getBoundingClientRect()||scale.getBoundingClientRect();
      const header=app.querySelector('.topbar')?.getBoundingClientRect();
      // Start with the floating navigation dock. Other visible cards can rise
      // above it, so use their top edge when locating the scale chip.
      const overlaySelectors=[
        '#bottom-nav','#overview-sheet:not([hidden])',
        '.page-panel:not([hidden])','#transport-sheet:not([hidden])',
        '.detail-sheet:not([hidden])','.entry-sheet:not([hidden])',
        '#night-visibility-float:not([hidden])'
      ];
      let boundaryTop=mapRect.bottom-18;
      for(const selector of overlaySelectors){
        const node=app.querySelector(selector);
        if(!mobileScaleBlockerVisible(node,window))continue;
        const rect=node.getBoundingClientRect();
        if(rect.width<50||rect.height<20||rect.bottom<=mapRect.top||rect.top>=mapRect.bottom)continue;
        boundaryTop=Math.min(boundaryTop,rect.top);
      }
      const dock=mobileScalePosition({
        mapTop:mapRect.top,boundaryTop,
        headerBottom:header?.bottom??mapRect.top+60,
        scaleHeight:Math.max(18,scaleRect.height||22),gap:6
      });
      // At night the floating analysis report can sit above the bottom dock.
      // Move the scale above 지도 옵션, not into either the report or bottom sheet.
      const toolsRect=app.querySelector('#map-tools-toggle')?.getBoundingClientRect();
      const scaleHeight=Math.max(18,scaleRect.height||22);
      const aboveTools=toolsRect?.height>0 ? toolsRect.top-mapRect.top-scaleHeight-10 : -1;
      const minimumTop=Math.max(70,(header?.bottom??mapRect.top+60)-mapRect.top+12);
      const dockNight=app.dataset.sangdoNight==='on' && aboveTools>=minimumTop;
      const railBelow=railBottom===null?null:railBottom-mapRect.top+10;
      const fitsBelowRail=railBelow!==null && railBelow+scaleHeight < boundaryTop-mapRect.top-12;
      const tip=app.querySelector('#dj840-map-tip');
      const pair=tip&&!tip.hidden&&tip.classList.contains('is-visible')&&
        navRect&&navRect.width>120&&app.dataset.tab==='map'&&!dockNight&&app.dataset.djUserTipDismissed!=='true';
      const scaleX=mobileScaleLeft({
        mapLeft:mapRect.left,mapWidth:mapRect.width,
        navLeft:navRect?.width>0?navRect.left:null,
        scaleWidth:scaleRect.width||88,inset:18
      });
      // Keep the distance scale's *measured MapLibre width* (it encodes actual
      // map distance); do not stretch it like an ordinary decorative chip.
      // Stack the measured scale above the full-width TIP, 6px between rows.
      const hudHeight=window.innerWidth<700?38:44;
      const hudTop=pair?Math.max(minimumTop,Math.round(navRect.top-mapRect.top-hudHeight-6)):null;
      const scaleY=pair?hudTop-scaleHeight-6:(fitsBelowRail?railBelow:(dockNight?Math.min(aboveTools,dock.top):dock.top));
      applyImportant(scale,'top',`${Math.round(scaleY)}px`);
      applyImportant(scale,'bottom','auto');
      applyImportant(scale,'left',`${scaleX}px`);
      applyImportant(scale,'right','auto');
      const visible=fitsBelowRail||dockNight||dock.visible;
      // A paired TIP/scalebar row is also visible even when there is no free
      // space below the navigation rail. Preserve the original OR semantics.
      const hudVisibility=(visible||pair)?'visible':'hidden';
      applyImportant(scale,'visibility',hudVisibility);
      if(scaleChip)applyImportant(scaleChip,'visibility',hudVisibility);
      if(pair){
        const {left:tipLeft,right:tipRight,width:tipWidth}=compactHudInsets(window.innerWidth,navRect);
        for(const [prop,val] of Object.entries({
          position:'fixed',top:`${Math.round(mapRect.top+hudTop)}px`,bottom:'auto',
          left:`${tipLeft}px`,right:`${tipRight}px`,width:'auto',
          'max-width':'none',height:`${hudHeight}px`,'min-height':`${hudHeight}px`,
          'max-height':`${hudHeight}px`,transform:'none',
          'box-sizing':'border-box'
        }))applyImportant(tip,prop,val);
        // On extremely narrow viewports a long physical scale leaves no TIP
        // text lane. Hide the TIP only, rather than overlap or forge the scale.
        if(tipWidth<108)applyImportant(tip,'visibility','hidden');
        else tip.style.removeProperty('visibility');
      }else if(tip){
        for(const prop of ['position','top','bottom','left','right','width','max-width',
          'height','min-height','max-height','transform','box-sizing','visibility'])tip.style.removeProperty(prop);
      }
      return;
    }
    previousDesktop=true;
    // Clear phone-only TIP inline positioning when switching to PC/tablet.
    const pcTip=app.querySelector('#dj840-map-tip');
    if(pcTip){
      for(const prop of ['position','top','bottom','left','right','width','max-width',
        'height','min-height','max-height','transform','box-sizing','visibility'])
        pcTip.style.removeProperty(prop);
    }
    // One measured nav anchor for every desktop side drawer. This adapts to
    // display scaling and portrait monitors without guessed pixel positions.
    const navLeft=Math.round(navRect.right-appRect.left+12);
    const navTop=Math.round(navRect.top-appRect.top);
    applyImportant(app,'--dj-left-dock-x',`${navLeft}px`);
    applyImportant(app,'--dj-rail-top',`${navTop}px`);
    scale.style.removeProperty('display');
    applyImportant(scale,'visibility','visible');
    const scaleChip=scale.querySelector('.maplibregl-ctrl-scale');
    if(scaleChip){scaleChip.style.removeProperty('visibility');scaleChip.style.removeProperty('display');}
    const headerRect=app.querySelector('.topbar')?.getBoundingClientRect();
    const toolsRect=app.querySelector('#map-tools-toggle')?.getBoundingClientRect();
    const cardRect=overview.getBoundingClientRect();
    const scaleRect=scale.getBoundingClientRect();
    const dock=desktopInformationDock({
      appRect,headerRect,navRect,toolsRect,
      cardHeight:cardRect.height||60,
      scaleHeight:Math.max(18,scaleRect.height||26)
    });
    const card=dock.card;
    applyImportant(overview,'position','absolute');
    applyImportant(overview,'top',`${Math.round(card.top)}px`);
    applyImportant(overview,'bottom','auto');
    applyImportant(overview,'left',`${Math.round(card.left)}px`);
    applyImportant(overview,'right','auto');
    applyImportant(overview,'width',`${Math.round(card.width)}px`);
    applyImportant(overview,'max-width',`${Math.round(card.width)}px`);
    applyImportant(overview,'max-height',`${Math.round(card.maxHeight)}px`);
    applyImportant(overview,'transform','none');
    applyImportant(overview,'border-radius','16px');
    // Card height may have changed after applying its width; the second pass
    // uses its measured height, keeping the scale consistently below it.
    const measuredHeight=Math.min(overview.getBoundingClientRect().height,card.maxHeight);
    const scaleDock=desktopInformationDock({
      appRect,headerRect,navRect,toolsRect,
      cardHeight:measuredHeight,
      scaleHeight:Math.max(18,scaleRect.height||26)
    }).scale;
    // v7.0.17: place the scale as an independent HUD in the true bottom-left
    // corner of the map on desktop, instead of docking it under the tool rail.
    // This keeps the left sidebar and safety controls visually separate.
    const desktopBottomInset=14;
    const desktopLeftInset=14;
    applyImportant(scale,'top','auto');
    applyImportant(scale,'bottom',`${desktopBottomInset}px`);
    applyImportant(scale,'left',`${desktopLeftInset}px`);
    applyImportant(scale,'right','auto');
  }

  const ro=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
  ro?.observe(overview);
  ro?.observe(map.getContainer());
  const observedNodes=new WeakSet();
  const tipSelector='#dj840-map-tip'; // Observe the TIP; it is never a scale blocker.
  const watchOverlayNodes=()=>{
    if(!mo)return;
    // The TIP is not a scale blocker, but its visibility/class change must
    // schedule a fresh synchronized HUD row when the startup tour closes.
    for(const selector of [...MOBILE_SCALE_BLOCKERS,tipSelector]){
      for(const node of app.ownerDocument.querySelectorAll(selector)){
        if(observedNodes.has(node))continue;
        observedNodes.add(node);
        // Never observe TIP style: this updater owns its inline geometry.
        // Observing it would cause a mutation/update feedback loop on iOS.
        mo.observe(node,{attributes:true,attributeFilter:selector===tipSelector
          ?['hidden','class']:['hidden','class','aria-hidden','style','data-dj-user-tip-dismissed']});
      }
    }
  };
  const mo=typeof MutationObserver==='function'?new MutationObserver((records)=>{
    if(records.some(record=>record.type==='childList'))watchOverlayNodes();
    schedule();
  }):null;
  mo?.observe(overview,{attributes:true,attributeFilter:['hidden','class','data-sheet-state']});
  mo?.observe(app,{attributes:true,attributeFilter:['data-tab','data-overview-sheet-state','data-search-open','data-dj910-sheet-open','data-dj-user-tip-dismissed','class'],childList:true});
  const nav=app.querySelector('#bottom-nav');if(nav)ro?.observe(nav);
  // Overlay animations can end without another hidden/class mutation. Recheck
  // the idle HUD when the obstruction actually finishes leaving the viewport.
  app.addEventListener('transitionend',schedule,true);
  app.addEventListener('animationend',schedule,true);
  mo?.observe(map.getContainer(),{childList:true,subtree:true});
  for(const selector of ['#bottom-nav','#map-tools-toggle','#night-visibility-quick-off','#map-safety-toggle','#night-visibility-float','#transport-sheet',
    '.page-panel','#detail-sheet','#entry-sheet']){
    const node=app.querySelector(selector);
    if(node)mo?.observe(node,{attributes:true,attributeFilter:['hidden','class','data-collapsed','style']});
  }
  watchOverlayNodes();
  map.on?.('load',schedule);
  const onViewportResize=()=>{syncPixelRatio();schedule();};
  window.addEventListener('resize',onViewportResize,{passive:true});
  schedule();
  return ()=>{
    disposed=true;
    ro?.disconnect();mo?.disconnect();
    map.off?.('load',schedule);
    map.off?.('movestart',onMotionStart);
    map.off?.('moveend',onMotionStop);
    map.off?.('idle',onMotionStop);
    clearTimeout(qualityIdleTimer);
    app.classList.remove('dj873-map-moving');
    window.removeEventListener('resize',onViewportResize);
    window.removeEventListener('dongjak:weather-visibility-changed',onWeatherVisibility);
    app.removeEventListener('transitionend',schedule,true);
    app.removeEventListener('animationend',schedule,true);
    restoreCard();
    app.style.removeProperty('--dj-left-dock-x');
    app.style.removeProperty('--dj-rail-top');
    const scale=scaleElement();
    for(const prop of ['top','bottom','left','right','visibility','display'])scale?.style.removeProperty(prop);
    const scaleChip=scale?.querySelector('.maplibregl-ctrl-scale');for(const prop of ['visibility','display'])scaleChip?.style.removeProperty(prop);
    const tip=app.querySelector('#dj840-map-tip');
    if(tip)for(const prop of ['position','top','bottom','left','right','width','max-width',
      'height','min-height','max-height','transform','box-sizing','visibility'])
      tip.style.removeProperty(prop);
  };
}
