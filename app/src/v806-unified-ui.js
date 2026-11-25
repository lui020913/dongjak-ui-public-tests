import {dispatchLocalClick} from './v865-close-dispatch.js';
import {createWindowLifecycle} from './window-lifecycle-state.js';
import {closeClassControlledSurface} from './window-surface-cleanup.js';
import {WINDOW_MOTION,windowMotionFrame,sheetFadeOpacity,CONFIRM_MOTION,TAB_MOTION,tabMotionFrameDelta,confirmMotionOpacity,continuationOffset} from './mobile-window-motion.js';
/** One coordinated motion/visibility owner, added after v8.0.3 UI modules.
 * Retains the original map, route, station and dialog click handlers.
 * CSS entrance animations and earlier JS coordinators opt out while enabled.
 */
/** Resolve competing application overlays without relying on z-index. */
export function chooseExclusiveSurface(open=[],newlyOpened=[],intent='',active=''){
  if(intent&&open.includes(intent))return intent;
  if(newlyOpened.length)return newlyOpened.at(-1);
  if(active&&open.includes(active))return active;
  return open.at(-1)||'';
}
export function installUnifiedUI(doc=document, win=window){
  const app=doc.getElementById('app');if(!app)return ()=>{};
  app.dataset.dj806Motion='on';
  app.dataset.dj806Exclusive='on';
  const clean=[];
  const on=(node,type,handler,options)=>{
    node?.addEventListener?.(type,handler,options);
    clean.push(()=>node?.removeEventListener?.(type,handler,options));
  };
  const element=id=>doc.getElementById(id);
  const reduced=()=>app.classList.contains('dj-reduced-animation')||
    win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const phone=()=>Boolean(win.matchMedia?.('(max-width:1079px), (min-width:1080px) and (max-width:1366px) and (pointer:coarse)')?.matches);
  const desktop=()=>!phone()&&Boolean(win.matchMedia?.('(min-width:1080px)')?.matches);
  const lifecycle=createWindowLifecycle();
  const explicitUntil=new Map();
  const tabReplacement=new Set();
  const tabFadeUntil=new Map();
  // Track a real opening click separately from exclusive-surface arbitration.
  // A preceding resize or observer must not consume the entrance request.
  const entranceIntent=new Map();
  win.DongjakWindowLifecycle={
    dismiss:(id,options)=>lifecycle.dismiss(id,options),
    requestOpen:(id)=>{
      explicitUntil.set(id,Date.now()+1200);
      if(win.matchMedia?.('(max-width:699px)')?.matches&&['dj854-weather-sheet','djNext-layer-panel','ped-tools-panel','map-gesture-guide','dj-ai-search-modal'].includes(id)){
        pendingIntent=id;dismissOthers(id);activeSurface='';
      }
      return lifecycle.requestOpen(id,{explicit:true});
    },
    snapshot:(id)=>lifecycle.snapshot(id)
  };
  const ids=['admin-dong-picker','overview-sheet','transport-sheet','route-panel',
    'participation-panel','news-panel','mine-panel','map-gesture-guide','road-width-legend',
    'map-safety-controls','map-advanced-controls','dj800-type-panel','dj-map-settings',
    'dj-app-about','version-history-modal','pza-road-sheet','night-visibility-float',
    'detail-sheet','entry-sheet','ped-tools-panel','dj-mobile-utilities',
    'map-quick-search-dropdown',...(win.matchMedia?.('(max-width:699px)')?.matches?['dj854-weather-sheet','djNext-layer-panel']:[])];
  const visible=id=>{
    const node=element(id);
    if(!node||node.hidden||node.classList.contains('dj871-search-leaving')||node.dataset.djTabOutgoing==='true'||content(node)?.dataset?.dj810Animating==='closing'||(id==='dj-mobile-utilities'&&node.getAttribute('aria-hidden')==='true'))return false;
    if(id==='map-safety-controls'&&!app.classList.contains('map-safety-open'))return false;
    if(id==='map-advanced-controls'&&!app.classList.contains('map-controls-open'))return false;
    const style=win.getComputedStyle(node);
    return style.display!=='none'&&style.visibility!=='hidden';
  };
  const content=node=>node?.dataset?.djDialogFade==='true'?node:node?.id==='version-history-modal'?node.querySelector('.version-history-dialog')||node:
    node?.id==='dj-map-settings'?node.querySelector('.dj-map-settings-card')||node:
    node?.id==='dj-app-about'?node.querySelector('.dj-about-card')||node:
    node?.id==='dj833-night-modal'?node.querySelector('.dj833-night-dialog')||node:
    node?.classList.contains('djNext-modal')?node.querySelector('.djNext-modal-body')||node:node;
  // v8 mobile motion repair: ONE Web Animations owner for both entrance and
  // explicit exit.  Older v803 clip-path and v805 click handlers opt out while
  // data-dj806-motion is enabled.  Animate CSS `translate`, not the `transform`
  // that legacy fixed-position sheets use to establish their screen position.
  const activeAnimation=new WeakMap();
  const animationTimers=new Set();
  // Every mobile window uses the same opaque slide. The existing feature
  // remains the owner of visibility, data, route, focus and cleanup.
  function playMobileMotion(target,opening,afterClose,fadeFrom,offsetFrom,forceTabFade=false){
    if(!phone()||!target?.style||reduced())return false;
    if(target.id==='dj-community-editor-portal'||target.dataset.djPrimaryTransition)return false;
    // Phone primary tabs are independent, opaque full-viewport screens.
    // Their only entrance owner is bottom-tab-navigation.js (content-only
    // reveal). The old 806 surface transition wrote inline opacity:0 and
    // exposed the WebGL map/white compositor frame on every tab change.
    // Keep sheet/modal animation for all other surfaces.
    if(win.matchMedia?.('(max-width:699px)')?.matches&&
      target.matches?.('#route-panel.page-panel,#participation-panel.page-panel,#news-panel.page-panel,#mine-panel.page-panel'))return false;
    const slideDuration=opening?WINDOW_MOTION.open:WINDOW_MOTION.close;
    const isGuide=target.id==='map-gesture-guide'&&win.matchMedia?.('(max-width:699px)')?.matches;
    const tabFade=forceTabFade||(opening&&(tabFadeUntil.get(target.id)||0)>Date.now());
    if(opening)tabFadeUntil.delete(target.id);
    const stationary=target.id==='ped-tools-panel';
    const fade=isGuide||stationary||tabFade||target.dataset.djDialogFade==='true'||target.matches?.('.dj833-night-dialog');
    const scrim=target.matches?.('.dj-ai-search-modal')?target:target.parentElement?.matches?.('.djNext-modal,#dj-app-about,#version-history-modal')?target.parentElement:null;
    const guideFrom=fade&&Number.isFinite(fadeFrom)?Math.max(0,Math.min(1,fadeFrom)):(opening?0:1);
    const slideFrom=Number.isFinite(fadeFrom)?Math.max(0,Math.min(1,fadeFrom)):(opening?.12:1);
    const duration=tabFade?(opening?TAB_MOTION.open:TAB_MOTION.close):fade&&!stationary?(opening?CONFIRM_MOTION.open:CONFIRM_MOTION.close):slideDuration;
    const beforeOpacity=target.style.getPropertyValue('opacity');
    const beforeOpacityPriority=target.style.getPropertyPriority('opacity');
    const beforeTranslate=target.style.getPropertyValue('translate');
    const beforeTranslatePriority=target.style.getPropertyPriority('translate');
    const beforeWillChange=target.style.getPropertyValue('will-change');
    const beforeWillChangePriority=target.style.getPropertyPriority('will-change');
    const beforeAnimation=target.style.getPropertyValue('animation');
    const beforeAnimationPriority=target.style.getPropertyPriority('animation');
    const beforeTransition=target.style.getPropertyValue('transition');
    const beforeTransitionPriority=target.style.getPropertyPriority('transition');
    const rect=target.getBoundingClientRect();
    if(rect.height<1||rect.width<1)return false;
    const nav=element('bottom-nav');
    const docked=(target.matches?.('.page-panel,#transport-sheet,#dj-mobile-utilities,#ped-tools-panel,.maplibregl-popup-content,.version-history-dialog')&&nav&&!nav.hidden)||false;
    const distance=opening&&tabReplacement.has(target.id)?Math.min(rect.height,36):docked?rect.height:Math.max(rect.height,win.innerHeight-rect.top+8);
    // Pin the measured transit sheet box for the entire close. Legacy
    // expanded/compact class changes must not turn a closing card fullscreen.
    const lockTransit=!opening&&target.id==='transport-sheet';
    const geometry=lockTransit?['position','top','bottom','height','min-height','max-height','box-sizing','margin-top','margin-bottom'].map(key=>[key,target.style.getPropertyValue(key),target.style.getPropertyPriority(key)]):[];
    if(lockTransit){
      const boxHeight=target.offsetHeight||rect.height;
      for(const [key,value] of Object.entries({position:'fixed',top:rect.top+'px',bottom:'auto',height:boxHeight+'px','min-height':boxHeight+'px','max-height':boxHeight+'px','box-sizing':'border-box','margin-top':'0','margin-bottom':'0'}))target.style.setProperty(key,value,'important');
    }
    const beforeClip=target.style.getPropertyValue('clip-path');
    const beforeClipPriority=target.style.getPropertyPriority('clip-path');
    let finished=false,frame=0,start=null,timeout=0,elapsed=0;
    let liveOffset=opening?distance:0;
    const record={cancel:()=>finish(false),offset:()=>liveOffset};
    const restore=()=>{
      for(const [key,value,priority] of geometry){if(value)target.style.setProperty(key,value,priority);else target.style.removeProperty(key);}
      if(isGuide)app.style.removeProperty('--dj-guide-fade');
      scrim?.style.removeProperty('--dj-scrim-alpha');
      if(beforeOpacity)target.style.setProperty('opacity',beforeOpacity,beforeOpacityPriority);
      else target.style.removeProperty('opacity');
      if(beforeTranslate)target.style.setProperty('translate',beforeTranslate,beforeTranslatePriority);
      else target.style.removeProperty('translate');
      if(beforeClip)target.style.setProperty('clip-path',beforeClip,beforeClipPriority);
      else target.style.removeProperty('clip-path');
      if(beforeWillChange)target.style.setProperty('will-change',beforeWillChange,beforeWillChangePriority);else target.style.removeProperty('will-change');
      if(beforeAnimation)target.style.setProperty('animation',beforeAnimation,beforeAnimationPriority);
      else target.style.removeProperty('animation');
      if(beforeTransition)target.style.setProperty('transition',beforeTransition,beforeTransitionPriority);
      else target.style.removeProperty('transition');
    };
    function finish(complete){
      if(finished)return;
      finished=true;
      if(frame)win.cancelAnimationFrame?.(frame);
      if(timeout){win.clearTimeout(timeout);animationTimers.delete(timeout);}
      target.removeAttribute('data-dj810-animating');
      if(activeAnimation.get(target)===record)activeAnimation.delete(target);
      // Hide synchronously before clearing the final slide/opacity on closing,
      // otherwise iOS may flash the old visible card for one frame.
      try{if(complete&&!opening&&typeof afterClose==='function')afterClose();}
      finally{restore();}
    }
    function setMotion(progress){
      if(scrim)scrim.style.setProperty('--dj-scrim-alpha',String(confirmMotionOpacity(progress,opening)));
      if(fade){
        const alpha=guideFrom+((opening?1:0)-guideFrom)*confirmMotionOpacity(progress,true);
        target.style.setProperty('opacity',String(alpha),'important');
        if(isGuide)app.style.setProperty('--dj-guide-fade',String(alpha));
        return;
      }
      const frame=windowMotionFrame(progress,opening,distance,rect.height,docked);
      if(Number.isFinite(offsetFrom)){frame.offset=continuationOffset(offsetFrom,progress,opening,distance);frame.clip=docked?Math.min(rect.height,Math.max(0,frame.offset)):0;}
      liveOffset=frame.offset;
      target.style.setProperty('opacity',String(sheetFadeOpacity(progress,opening,slideFrom)),'important');
      target.style.setProperty('translate',`0 ${frame.offset}px`,'important');
      if(docked)target.style.setProperty('clip-path',`inset(0 0 ${frame.clip}px 0 round 24px)`,'important');
    }
    target.style.setProperty('will-change',fade?'opacity':docked?'translate,clip-path':'translate','important');
    target.style.setProperty('animation','none','important');
    target.style.setProperty('transition','none','important');
    target.setAttribute('data-dj810-animating',opening?'opening':'closing');
    target.dataset.djWindowMotionDuration=String(duration);
    target.dataset.djWindowMotionKind=fade?'fade':'slide';
    setMotion(0);
    activeAnimation.set(target,record);
    // A busy map compositor can defer the first rAF. Do not let the old
    // absolute timeout silently skip the entire entrance before it paints.
    // Rearm a bounded inactivity watchdog and cap a single frame's step.
    const watchdog=()=>{
      if(timeout){win.clearTimeout(timeout);animationTimers.delete(timeout);}
      // A compositor-starved foreground tab may miss the first frame for
      // longer than the normal inactivity budget, including after one frame.
      // Keep a bounded foreground entrance budget; background tabs release sooner.
      timeout=win.setTimeout(()=>finish(true),tabFade?(doc.hidden?350:1600):opening&&!doc.hidden?4500:1600);
      animationTimers.add(timeout);
    };
    const tick=timestamp=>{
      if(finished)return;
      if(start!==null)elapsed+=tabFade?tabMotionFrameDelta(timestamp-start):Math.max(0,Math.min(64,timestamp-start));
      start=timestamp;
      const progress=Math.max(0,Math.min(1,elapsed/duration));
      setMotion(progress);
      if(progress<1){watchdog();frame=win.requestAnimationFrame(tick);}
      else finish(true);
    };
    if(typeof win.requestAnimationFrame==='function')frame=win.requestAnimationFrame(tick);
    else {
      // Minimal non-browser fallback; actual mobile browsers always have rAF.
      setMotion(1);
      finish(true);
      return true;
    }
    watchdog();
    return true;
  }
  const motionSupported=()=>!!win.CSS?.supports?.('translate','0px 1px');
  const frames=(opening,id)=>{
    // v816: desktop floating panels are already docked by the CSS layout.
    // Moving/scaling the sheet during its entrance makes it appear briefly
    // in the center / at the right before snapping next to the left rail.
    // Desktop transitions are opacity-only. Mobile has a separate fade owner.
    if(!phone())return opening?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}];
    const vertical=phone();
    const offset=vertical?'0 34px':id==='version-history-modal'||id==='dj-map-settings'?'0 13px':'-10px 0';
    // Old Safari fallback: a clipped reveal is preferable to overriding a
    // fixed sheet's legacy `transform`, which can jump its screen position.
    if(!motionSupported())return opening
      ?[{opacity:0,clipPath:vertical?'inset(88% 0 0 0 round 22px)':'inset(15% 0 0 0 round 22px)'},
        {opacity:1,clipPath:'inset(0 0 0 0 round 22px)'}]
      :[{opacity:1,clipPath:'inset(0 0 0 0 round 22px)'},
        {opacity:0,clipPath:vertical?'inset(88% 0 0 0 round 22px)':'inset(12% 0 0 0 round 22px)'}];
    // The old responsive stylesheet can mark translate/scale !important.
    // A clip-path reveal is independent of those layout properties, so users
    // still see actual motion on iPhone rather than an instantaneous sheet.
    return opening
      ?[{opacity:0,translate:offset,scale:vertical?'.965':'.987',
          clipPath:vertical?'inset(88% 0 0 0 round 22px)':'inset(11% 0 0 0 round 22px)'},
        {opacity:1,translate:'0 0',scale:'1',clipPath:'inset(0 0 0 0 round 22px)'}]
      :[{opacity:1,translate:'0 0',scale:'1',clipPath:'inset(0 0 0 0 round 22px)'},
        {opacity:0,translate:vertical?'0 23px':'0 8px',scale:vertical?'.982':'.994',
          clipPath:vertical?'inset(88% 0 0 0 round 22px)':'inset(11% 0 0 0 round 22px)'}];
  };
  const cancelActive=target=>{
    const current=activeAnimation.get(target);
    if(!current)return;
    activeAnimation.delete(target);
    try{current.cancel();}catch{}
  };
  // Native close functions call this directly, never replay a synthetic click.
  // A replacement or swipe retains its own native cleanup, avoiding duplicates.
  win.DongjakWindowMotion={
    policy:WINDOW_MOTION,
    open(target){
      if(!target||target.dataset.dj810Animating==='opening')return;
      const from=target.dataset.dj810Animating==='closing'?Number(win.getComputedStyle(target).opacity):undefined;
      const offset=activeAnimation.get(target)?.offset?.();
      cancelActive(target);playMobileMotion(target,true,undefined,from,offset);
    },
    close(target,finish){
      if(!target||!phone()||reduced()||target.hidden||target.classList.contains('dj889-sheet-transitioning')||target.dataset.djSwipeDismissed==='true'){finish();return;}
      if(target.dataset.dj810Animating==='closing')return;
      const from=target.dataset.dj810Animating==='opening'?Number(win.getComputedStyle(target).opacity):undefined;
      const offset=activeAnimation.get(target)?.offset?.();
      cancelActive(target);if(!playMobileMotion(target,false,finish,from,offset))finish();
    },
    closeTab(target,finish){
      if(!target||target.hidden||!phone()||reduced()){finish();return;}
      const from=target.dataset.dj810Animating?Number(win.getComputedStyle(target).opacity):undefined;
      cancelActive(target);
      if(!playMobileMotion(target,false,finish,from,undefined,true))finish();
    },
    cancel:cancelActive
  };
  function playOpen(id){
    // Search is a keyboard-aware anchored portal, not a bottom sheet.
    if(id==='map-quick-search-dropdown'&&phone())return;
    if((phone()&&id==='dj-ai-search-modal')||reduced() || (id==='transport-sheet'&&element(id)?.dataset.dj807Switching==='true'))return;
    const target=content(element(id));if(!target)return;
    cancelActive(target);
    // On phones, only the common slide owner may animate the surface.
    if(phone()){playMobileMotion(target,true);return;}
    if(typeof target.animate!=='function')return;
    const anim=target.animate(frames(true,id),{
      duration:phone()?410:260,easing:'cubic-bezier(.17,.84,.27,1)',fill:'both'
    });
    activeAnimation.set(target,anim);
    Promise.resolve(anim.finished).then(()=>{
      if(activeAnimation.get(target)===anim){activeAnimation.delete(target);anim.cancel();}
    },()=>{});
  }
  // Treat already-visible startup dialogs as entering surfaces, too.  This
  // also avoids a missed animation if a panel opened just before boot.
  let previous=new Map(ids.map(id=>[id,false])), queued=false;
  const measure=()=>{
    const nav=element('bottom-nav');if(!nav)return;
    const rect=nav.getBoundingClientRect();
    if(desktop())app.style.setProperty('--dj806-rail-height',Math.round(Math.max(300,Math.min(rect.height,win.innerHeight-rect.top-12)))+'px');
    else app.style.removeProperty('--dj806-rail-height');
  };
  on(win,'resize',measure,{passive:true});
  let sizes;
  if(typeof ResizeObserver!=='undefined'){
    sizes=new ResizeObserver(measure);const nav=element('bottom-nav');if(nav)sizes.observe(nav);
    clean.push(()=>sizes?.disconnect());
  }
  measure();
  const panelHide=(id,{immediate=false}={})=>{
    const node=element(id);if(!node)return;
    lifecycle.dismiss(id,{global:false});
    if(node.dataset.djTabOutgoing==='true')return;
    if(id==='map-quick-search-dropdown'){
      dispatchLocalClick(element('map-quick-search-close'),win);
      if(!node.hidden&&!node.classList.contains('dj871-search-leaving'))node.hidden=true;
      return;
    }
    if(win.matchMedia?.('(max-width:699px)')?.matches&&['ped-tools-panel','djNext-layer-panel'].includes(id)){
      cancelActive(content(node));
      node.dispatchEvent(new (win.Event||Event)(id==='ped-tools-panel'?'dongjak:ped-dismiss':'dj-next:layer-dismiss'));
      if(!node.hidden)node.hidden=true;
      return;
    }
    if(closeClassControlledSurface({id,doc,app}))return;
    if(id==='dj-mobile-utilities'){node.dispatchEvent(new (win.CustomEvent||CustomEvent)('dongjak:close-more',{detail:{immediate}}));}
    else if(id==='road-width-legend'&&!node.hidden){
      const trigger=element('toggle-road-width');if(trigger?.getAttribute('aria-pressed')==='true')trigger.click();
      else node.hidden=true;
    } else if(!node.hidden){
      const target=content(node);
      if(id==='transport-sheet'){
        // The transport controller is the single owner. Close it now,
        // without the delayed synthetic click or a second animation owner.
        const EventCtor=win.Event||Event;
        node.dispatchEvent(new EventCtor('dongjak:transport-dismiss'));
        if(!node.hidden)node.hidden=true;
        return;
      }
      const finish=()=>{node.hidden=true;};
      if(immediate){cancelActive(target);finish();return;}
      if(target?.dataset.dj810Animating==='closing')return;
      cancelActive(target);
      if(!playMobileMotion(target,false,finish))finish();
    }
  };
  // One actual modal owner for ALL application surfaces, including legacy
  // class-controlled drawers and MapLibre facility popups.  A panel is closed
  // in application state, not merely covered with a higher z-index.
  let syncing=false, activeSurface='', pendingIntent='', replacingSurface='';
  const enteredPopups=new WeakSet();
  const popupNodes=()=>[...element('map')?.querySelectorAll?.('.maplibregl-popup')||[]]
    .filter(node=>node.isConnected);
  function dismissPopupNode(popup){
    if(!popup?.isConnected)return;
    const card=popup.querySelector('.maplibregl-popup-content')||popup;
    cancelActive(card);
    const close=popup.querySelector('.maplibregl-popup-close-button,.dj-place-header-close');
    // MapLibre owns its listener cleanup. Send exactly one local event only
    // for programmatic *other-window* dismissal, never replay a user X.
    if(close?.isConnected){if(phone()&&popup.classList.contains('dj-place-detail-popup'))popup.dataset.dj912ImmediateDismiss='true';dispatchLocalClick(close,win);}
    else popup.remove();
  }
  function dismissPopups(keep=null){
    for(const popup of popupNodes()){
      if(popup===keep)continue;
      dismissPopupNode(popup);
    }
  }
  function dismissOthers(winner='',{popups=true}={}){
    // A real close handler may restore the overview as a side effect, so do
    // one more synchronous sweep before allowing the new sheet to paint.
    for(let pass=0;pass<2;pass++)for(const id of ids){
      if(id===winner)continue;
      const target=content(element(id));
      if(!visible(id)&&target?.dataset.dj810Animating!=='closing')continue;
      if(target)cancelActive(target);
      panelHide(id,{immediate:phone()});
    }
    if(popups)dismissPopups();
  }
  const tabPanels={route:'route-panel',participate:'participation-panel',
    news:'news-panel',mine:'mine-panel'};
  function openingIntent(event){
    const node=event.target;
    if(!node?.closest)return '';
    const search=node.closest('#map-quick-search');
    if(search)return 'map-quick-search-dropdown';
    // Map-origin risk reporting opens the real participation page through a
    // delegated, otherwise hidden button. It is an explicit user intent, not
    // a ghost modal; without this allowance the lifecycle can dismiss the
    // editor after the topbar and hit-layer have already been updated.
    if(node.closest('#djNext-report,#ped-report-open'))return 'participation-panel';
    const tab=node.closest('#bottom-nav .nav-tab[data-tab]');
    if(tab)return tabPanels[tab.dataset.tab]||'';
    const opener=node.closest('#map-tools-toggle,#map-safety-toggle,#toggle-road-width,'+
      '#map-gesture-guide-open,#dj800-type-trigger,#open-admin-dongs,#open-admin-dongs-from-options,[aria-controls],'+
      '#dj-settings-mobile,#dj-settings-pc,#dj-about-pc,#dj-about-mobile,'+
      '#version-history-trigger,#dj-guide-release-details');
    if(!opener)return '';
    // v886: on phones the old font toolbar button delegates to My Info.
    // Treating it as an old dj800-type-panel opener pre-emptively closed the
    // active tab and raced the real event handler. The button itself owns the
    // navigation; the coordinator will observe the resulting mine-panel.
    if(phone()&&opener.id==='dj800-type-trigger')return '';
    const direct={'map-tools-toggle':'map-advanced-controls',
      'map-safety-toggle':'map-safety-controls',
      'toggle-road-width':'road-width-legend',
      'map-gesture-guide-open':'map-gesture-guide',
      'dj800-type-trigger':'dj800-type-panel',
      'open-admin-dongs':'admin-dong-picker',
      'open-admin-dongs-from-options':'admin-dong-picker',
      'dj-settings-mobile':'dj-map-settings',
      'dj-settings-pc':'dj-map-settings',
      'dj-about-pc':'dj-app-about',
      'dj-about-mobile':'dj-app-about',
      'version-history-trigger':'version-history-modal',
      'dj-guide-release-details':'version-history-modal'};
    const name=direct[opener.id]||opener.getAttribute('aria-controls')||'';
    return ids.includes(name)?name:'';
  }
  // Additional explicit user / domain actions are not native aria-controls
  // openers. Authorize their associated temporary dialogs as real reopens.
  on(doc,'click',event=>{
    if(event.target?.closest?.('[data-dj860-open]'))
      explicitUntil.set('dj860-onboarding',Date.now()+1300);
    if(event.target?.closest?.('#transport-save-place'))
      explicitUntil.set('dj-transit-signin-prompt',Date.now()+1300);
  },true);
  on(win,'dongjak:route-boundary-denied',()=>
    explicitUntil.set('dj832-dongjak-boundary',Date.now()+1300));
  on(win,'dongjak:transport-login-required',()=>
    explicitUntil.set('dj-transit-signin-prompt',Date.now()+1300));
  // A real application place selection may immediately follow closing transit.
  // Authorize only the explicit selection event, not delayed popup mutations.
  on(win,'dongjak:map-place-selected',()=>{
    explicitUntil.set('maplibre-popup',Date.now()+1300);
  },true);
  // Capture the known opening click BEFORE the app's existing listeners.
  // This prevents a single frame with two sheets and never re-opens the same
  // sheet merely to replay the fade animation.
  on(doc,'focusin',event=>{
    if(event.target?.id!=='map-quick-search-query')return;
    pendingIntent='map-quick-search-dropdown';
    explicitUntil.set('map-quick-search-dropdown',Date.now()+1200);
    dismissOthers('map-quick-search-dropdown');
    activeSurface='';
  },true);
  on(doc,'click',event=>{
    const requested=openingIntent(event);
    const mobileMapTab=win.matchMedia?.('(max-width:699px)')?.matches&&event.target?.closest?.('#bottom-nav .nav-tab[data-tab="map"]');
    if(mobileMapTab){dismissOthers('');activeSurface='';return;}
    if(!requested||visible(requested))return;
    if(phone()){
      replacingSurface=ids.some(id=>id!==requested&&visible(id))||popupNodes().length?requested:'';
      const tabClick=event.target?.closest?.('#bottom-nav .nav-tab[data-tab]');
      if(tabClick&&Object.values(tabPanels).includes(requested)){
        if(Object.values(tabPanels).some(id=>id!==requested&&visible(id)))tabReplacement.add(requested);
        else if(phone())tabFadeUntil.set(requested,Date.now()+3000);
      }
      entranceIntent.set(requested,Date.now()+3000);
    }
    pendingIntent=requested;
    explicitUntil.set(requested,Date.now()+1200);
    dismissOthers(requested);
    activeSurface='';
  },true);
  function sync(){
    queued=false;if(syncing)return;syncing=true;
    try{
      // Every source of window opening (buttons, map features, async data,
      // timers, startup dialogs) passes through the same state transition.
      // Explicit opener clicks are authorized; ghost opens after X are not.
      for(const id of ids.filter(visible)){
        const explicit=id===pendingIntent || (explicitUntil.get(id)||0)>Date.now();
        const state=lifecycle.snapshot(id);
        if(!explicit && state.phase==='closed' && previous.get(id) &&
           Date.now()-state.lastDismissedAt<680){panelHide(id);continue;}
        if((!previous.get(id)||(explicit&&state.phase==='closed')) && !lifecycle.requestOpen(id,{explicit,origin:'automatic'})){
          panelHide(id);
        }
      }
      const open=ids.filter(visible);
      const fresh=open.filter(id=>!previous.get(id));
      const winner=chooseExclusiveSurface(open,fresh,pendingIntent,activeSurface);
      if(open.length>1)dismissOthers(winner,{popups:false});
      const actual=ids.filter(visible);
      if(actual.length&&popupNodes().length){
        // A newly inserted MapLibre popup is the most recent opening, even
        // when a fade animation's style mutations caused this sync first.
        if(popupNodes().some(popup=>!enteredPopups.has(popup)) && !fresh.length && !pendingIntent){
          dismissOthers('',{popups:false});
        } else dismissPopups();
      }
      activeSurface=visible(winner)?winner:(ids.filter(visible).at(-1)||'');
      app.dataset.dj806ActiveSurface=activeSurface;
      pendingIntent='';
      for(const id of ids){
        const now=visible(id),was=previous.get(id);
        const intent=entranceIntent.get(id)||0;
        const realOpen=now&&id===activeSurface;
        const requested=realOpen&&intent>Date.now();
        if(requested||(intent&&intent<=Date.now()))entranceIntent.delete(id);
        if(!requested&&intent&&intent<=Date.now()){if(!now)tabReplacement.delete(id);if(id===replacingSurface)replacingSurface='';}
        if(realOpen&&(!was||requested)){
          const target=content(element(id));
          if(id===replacingSurface)replacingSurface='';
          if(phone()&&tabReplacement.has(id)){
            // The dedicated bottom-tab controller already reveals the body.
            // Never start a second Web Animation on the same content.
            cancelActive(target);
          }else if(!activeAnimation.has(target))playOpen(id);
          tabReplacement.delete(id);
        }
        else if(!now&&was){
          tabReplacement.delete(id);
          if(lifecycle.snapshot(id).phase!=='closed')lifecycle.dismiss(id);
          const target=content(element(id));if(target&&target.dataset.dj810Animating!=='closing')cancelActive(target);
        }
        previous.set(id,now);
      }
    }finally{syncing=false;}
  }
  // MutationObserver callbacks run before the next paint. Resolving here
  // avoids the old requestAnimationFrame delay that briefly exposed two sheets.
  const schedule=()=>{
    if(queued)return;queued=true;
    (win.queueMicrotask||((fn)=>Promise.resolve().then(fn)))(sync);
  };
  // Some legacy surfaces are controlled by styles instead of hidden/class
  // mutations; also sample visibility after the original click handlers.
  on(doc,'click',schedule,false);
  // Re-tapping the already active bottom tab is not a navigation event.
  // Stop legacy handlers from tearing down/reopening its sheet.
  const ignoreRepeatTab=e=>{
    const tab=e.target?.closest?.('#bottom-nav .nav-tab[data-tab]');
    if(!tab||!phone())return;
    // A selected tab with a hidden sheet is a broken state, not a repeat tap.
    // Let the native navigator reopen it instead of swallowing the user's click.
    const panelId={route:'route-panel',participate:'participation-panel',news:'news-panel',mine:'mine-panel'}[tab.dataset.tab];
    const linked=panelId?element(panelId):null;
    if(tab.dataset.tab===app.dataset.tab && tab.classList.contains('active') && (!linked||visible(panelId))){
      e.preventDefault();e.stopImmediatePropagation();
    }
  };
  on(doc,'click',ignoreRepeatTab,true);
  on(doc,'keyup',schedule,false);
  on(win,'popstate',schedule);
  const appObserver=new MutationObserver(schedule);
  appObserver.observe(app,{attributes:true,attributeFilter:['class','data-tab'],childList:true,subtree:false});
  clean.push(()=>appObserver.disconnect());
  const surfaceObservers=new Map();
  const attach=()=>{
    for(const id of ids){
      const node=element(id);if(!node||surfaceObservers.has(id))continue;
      const obs=new MutationObserver(records=>{
        // Ignore known animation-only style writes; a full visibility sweep on
        // every rendered frame forces synchronous style reads on mobile.
        const moving=node.dataset.djPrimaryTransition||node.dataset.dj810Animating||node.classList.contains('dj889-sheet-transitioning')||node.classList.contains('dj-sheet-dragging');
        if(moving&&records.every(record=>record.attributeName==='style'))return;
        schedule();
      });
      obs.observe(node,{attributes:true,attributeFilter:['hidden','class','style']});
      surfaceObservers.set(id,obs);
    }
  };
  attach();
  const auxiliaryObservers=new Map();
  const attachAuxiliary=()=>{
    const auxiliaryIds=new Set(['dj-transit-signin-prompt','dj832-dongjak-boundary',
      'dj860-onboarding','dj832-data-sheet','dj832-info-sheet',
      'dj832-feature-sheet','dj833-night-modal','dj833-weather-sheet',
      'dj854-weather-sheet']);
    // Newly introduced dialogs with an accessible dialog role receive the
    // lifecycle automatically; no new version-specific handler is needed.
    for(const node of app.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')){
      if(node.id&&!ids.includes(node.id))auxiliaryIds.add(node.id);
    }
    for(const id of auxiliaryIds){
      const node=element(id);if(!node||auxiliaryObservers.has(id)||ids.includes(id))continue;
      let lastVisible=!node.hidden;
      if(lastVisible)lifecycle.requestOpen(id,{explicit:true});
      const observer=new MutationObserver(()=>{
        const opened=!node.hidden;
        if(opened&&!lastVisible){
          const explicit=(explicitUntil.get(id)||0)>Date.now();
          if(!lifecycle.requestOpen(id,{explicit,origin:'automatic'}))node.hidden=true;
          else if(phone()&&['dj833-night-modal','dj832-data-sheet','dj832-feature-sheet','dj832-info-sheet','dj-transit-signin-prompt','dj832-dongjak-boundary'].includes(id))win.DongjakWindowMotion.open(content(node));
        }else if(!opened&&lastVisible&&lifecycle.snapshot(id).phase!=='closed'){
          lifecycle.dismiss(id,{global:false});
        }
        lastVisible=!node.hidden;
      });
      observer.observe(node,{attributes:true,attributeFilter:['hidden']});
      auxiliaryObservers.set(id,observer);
    }
  };
  attachAuxiliary();
  clean.push(()=>{for(const observer of auxiliaryObservers.values())observer.disconnect();});
  const childObs=new MutationObserver(records=>{
    const dialogSelector='[role="dialog"],[role="alertdialog"],[aria-modal="true"]';
    const interesting=records.some(record=>record.target===app ||
      [...record.addedNodes].some(node=>node.nodeType===1&&
        (node.matches?.(dialogSelector)||node.querySelector?.(dialogSelector))));
    if(!interesting)return;
    attach();attachAuxiliary();schedule();
  });
  childObs.observe(app,{childList:true,subtree:true});
  clean.push(()=>childObs.disconnect());
  clean.push(()=>{for(const obs of surfaceObservers.values())obs.disconnect();});
  // The X is a native, single click. NEVER intercept it to replay after an
  // animation: that previously triggered another panel (or an uncloseable
  // duplicate). Mark the lifecycle CLOSED in capture phase, then allow the
  // original feature-specific cleanup handler to run exactly once.
  const closeSel=[
    '#admin-dong-close','#map-options-mobile-close','#map-options-desktop-close',
    '#map-safety-close','#road-width-legend-close','#map-gesture-guide-close',
    '#ped-tools-close','#version-history-close','.dj-about-close','.dj-about-done',
    '#dj-settings-close','#dj-settings-done','.dj800-type-close','.dj800-type-done',
    '.page-dismiss','[data-close-page]','#overview-sheet-close','#close-detail',
    '#back-to-map','#transport-close','#cancel-add','#pza-road-close',
    '#night-visibility-float-stop','#map-quick-search-close',
    '.dj-place-header-close','.dj-place-route-button',
    '.maplibregl-popup-close-button','#dj-mobile-utilities-close',
    '.dj-transit-signin-x','.dj832-boundary-x','.dj832-boundary-confirm',
    '.dj860-skip','[data-dj860-action="skip"]'
  ].join(',');
  const otherIds=['dj-transit-signin-prompt','dj832-dongjak-boundary',
    'dj860-onboarding','dj832-data-sheet','dj832-info-sheet',
    'dj832-feature-sheet','dj833-night-modal','dj833-weather-sheet',
    'dj854-weather-sheet','route-map-card','nav-live-card'];
  const anySurfaceSelector=[...ids,...otherIds].map(id=>`#${id}`).join(',')+',.maplibregl-popup';
  const nativeDismiss=e=>{
    const button=e.target?.closest?.(closeSel);if(!button)return;
    const container=button.closest?.(anySurfaceSelector);
    if(!container)return;
    const id=container.classList.contains('maplibregl-popup')?'maplibre-popup':container.id;
    // The onboarding module owns its own dismissal, session persistence,
    // focus restoration and closing animation. Do not run the generic
    // close microtask for the same Skip button: that could hide the dialog
    // before its feature handler receives the user's native click.
    if(id==='dj860-onboarding'||(id==='map-gesture-guide'&&win.matchMedia?.('(max-width:699px)')?.matches))return;
    entranceIntent.delete(id);
    const animated=id==='maplibre-popup'?container.querySelector('.maplibregl-popup-content'):content(container);
    // Native close handler reverses the current position, rather than cancelling it first.
    lifecycle.dismiss(id);
    // Original target listeners must run. After their microtasks, ensure
    // that a racing old controller did not reopen the same closed window.
    (win.queueMicrotask||queueMicrotask)(()=>{
      if(id==='maplibre-popup'){
        // The facility popup uses the shared slide owner and must
        // call popup.remove(), not a raw DOM removal that leaks its listeners.
        if(!container.classList.contains('dj-place-detail-popup')&&container.isConnected)container.remove();
      }else if(ids.includes(id)&&visible(id)&&animated?.dataset.dj810Animating!=='closing'){
        panelHide(id);
      }else if(otherIds.includes(id)&&container.isConnected && !container.hidden&&animated?.dataset.dj810Animating!=='closing'){
        container.hidden=true;
      }
      schedule();
    });
  };
  on(doc,'click',nativeDismiss,true);
  // A keyboard dismiss receives the same lifecycle state as the X button.
  on(doc,'keydown',event=>{
    if(event.key!=='Escape')return;
    // A top-level dialog owns Escape before a map/route panel beneath it.
    const overlays=[...app.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')]
      .filter(node=>!node.hidden&&win.getComputedStyle(node).display!=='none');
    const modal=overlays.at(-1);
    const id=modal?.id||ids.filter(visible).at(-1);
    if(!id)return;
    // The owner handles Escape for these dialogs; never hide mid-slide.
    if(app.querySelector('[data-dj-dialog-fade="true"]:not([hidden])')||['djNext-layer-panel','djNext-permissions','dj-map-settings','dj-app-about','version-history-modal','dj860-onboarding'].includes(id))return;
    lifecycle.dismiss(id);
    (win.queueMicrotask||queueMicrotask)(()=>{
      if(ids.includes(id)&&visible(id))panelHide(id);
      else if(modal&&!modal.hidden)modal.hidden=true;
      schedule();
    });
  },true);
  // If a MapLibre popup is added, dismiss stale popup cards using the popup's
  // own close button rather than removing DOM nodes (which leaks listeners).
  const mapElement=element('map');
  if(mapElement){
    const popObs=new MutationObserver(()=>{
      const visiblePopups=[...mapElement.querySelectorAll('.maplibregl-popup')].filter(n=>n.isConnected);
      const newlyAdded=visiblePopups.filter(popup=>!enteredPopups.has(popup));
      if(!newlyAdded.length)return;
      for(const popup of newlyAdded)enteredPopups.add(popup);
      const newest=visiblePopups.at(-1);
      // A late popup created by the same iOS close gesture is not a new
      // user selection; remove it before it can render behind the old sheet.
      const explicitPopup=(explicitUntil.get('maplibre-popup')||0)>Date.now();
      explicitUntil.delete('maplibre-popup');
      if(!lifecycle.requestOpen('maplibre-popup',{origin:'automatic',explicit:explicitPopup})){
        for(const popup of newlyAdded)dismissPopupNode(popup);
        return;
      }
      // MutationObservers run before rendering. Close any previous sheet NOW,
      // not in requestAnimationFrame, so the browser cannot paint two windows.
      dismissOthers('',{popups:false});
      for(const old of visiblePopups){
        if(old===newest)continue;
        dismissPopupNode(old);
      }
      activeSurface='';pendingIntent='';schedule();
      // Set the first mobile animation frame before the browser paints the inserted popup.
      if(!newest?.isConnected||reduced())return;
      const card=newest.querySelector('.maplibregl-popup-content');
      if(phone()){
          if(card&&newest.classList.contains('dj-place-detail-popup')&&!activeAnimation.has(card))playMobileMotion(card,true);
          return;
      }
      if(card)card.animate?.([{opacity:0},{opacity:1}],{duration:220,easing:'ease-out'});
    });
    popObs.observe(mapElement,{childList:true,subtree:false});
    clean.push(()=>popObs.disconnect());
  }
  schedule();
  return ()=>{
    for(const timer of animationTimers)win.clearTimeout(timer);
    animationTimers.clear();
    for(const id of ids){const target=content(element(id));if(target)cancelActive(target);}
    for(const fn of clean)fn();delete app.dataset.dj806Motion;
    delete app.dataset.dj806Exclusive;delete app.dataset.dj806ActiveSurface;
    delete win.DongjakWindowLifecycle;delete win.DongjakWindowMotion;
  };
}
if(typeof document!=='undefined'){
  const boot=()=>installUnifiedUI();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
