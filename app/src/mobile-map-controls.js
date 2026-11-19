/** Mobile browser controls: do not assume fullscreen is available on iOS Safari. */
export function isMobileWeb({width=innerWidth,coarse=matchMedia('(pointer:coarse)').matches,native=Boolean(globalThis.Capacitor?.isNativePlatform?.())}={}){
  return width<=1024&&coarse&&!native;
}
export function installMobileMapControls({app,map}={}){
  const guide=document.getElementById('map-gesture-guide');
  const show=document.getElementById('map-gesture-guide-open');
  const close=document.getElementById('map-gesture-guide-close');
  const hideNext=document.getElementById('map-gesture-guide-hide-next');
  const button=document.getElementById('mobile-fullscreen-toggle');
  const help=document.getElementById('mobile-webapp-help');
  const dismissHelp=document.getElementById('mobile-webapp-help-close');
  if(!guide||!show)return ()=>{};
  const saved=()=>{try{return localStorage.getItem('dj-map-guide-dismissed-v1')==='1';}catch{return false;}};
  // Never automatically reopen first-use guidance after theme or night-mode reloads.
  const sessionGuideKey='dj-map-guide-initial-shown-v7121';
  const autoShown=()=>{try{return sessionStorage.getItem(sessionGuideKey)==='1';}catch{return true;}};
  const markAutoShown=()=>{try{sessionStorage.setItem(sessionGuideKey,'1');}catch{}};
  // A single centered dialog on first entry and on a later help-button tap.
  // It is independent of the position of the right-side control stack.
  const positionGuide=()=>{
    if(guide.hidden||app?.dataset?.tab!=='map')return;
    guide.classList.add('dj-guide-centered');
    guide.style.removeProperty('--dj-guide-x');
    guide.style.removeProperty('--dj-guide-y');
    guide.style.removeProperty('--dj-guide-height');
  };
  const openGuide=(event)=>{
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if(app?.dataset?.tab!=='map')return;
    markAutoShown();
    if(launchTimer){clearTimeout(launchTimer);launchTimer=null;}
    guide.hidden=false;positionGuide();
    guide.querySelector('#map-gesture-guide-close')?.focus?.({preventScroll:true});
  };
  let guideDismissedThisSession=false;
  let launchTimer=null,launchAttempts=0;
  const closeGuide=()=>{
    guide.hidden=true;
    guideDismissedThisSession=true;
    markAutoShown();
    if(launchTimer){clearTimeout(launchTimer);launchTimer=null;}
    if(hideNext?.checked){try{localStorage.setItem('dj-map-guide-dismissed-v1','1');}catch{}}
  };
  const isStandalone=()=>Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true);
  const isIOS=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
  const fullscreenSupported=()=>typeof document.documentElement.requestFullscreen==='function'&&document.fullscreenEnabled!==false;
  const sync=()=>{
    const mobile=isMobileWeb();
    const standalone=isStandalone();
    if(button)button.hidden=!mobile||standalone;
    if(!mobile||standalone){if(help)help.hidden=true;return;}
    const label=isIOS()||!fullscreenSupported()?'앱으로 보기':document.fullscreenElement?'전체화면 종료':'전체화면';
    if(button){
      button.textContent=label;
      button.setAttribute('aria-label',label);
      button.title=isIOS()?'Safari 홈 화면 웹 앱 실행 방법':label;
    }
  };
  async function setFullScreen(){
    if(isStandalone())return;
    if(isIOS()||!fullscreenSupported()){
      if(help)help.hidden=!help.hidden;
      sync();
      return;
    }
    if(document.fullscreenElement){try{await document.exitFullscreen?.();}catch{}sync();return;}
    try{await document.documentElement.requestFullscreen({navigationUI:'hide'});}
    catch{if(help)help.hidden=false;}
    sync();map?.resize?.();
  }
  // Fullscreen must originate from a real user gesture. First map tap is
  // allowed to attempt it only once; never retry in a gesture loop.
  let triedAuto=false;
  const onFirstMapTouch=(event)=>{
    if(triedAuto||!isMobileWeb()||isIOS()||isStandalone()||document.fullscreenElement||event.pointerType==='mouse')return;
    triedAuto=true;
    if(fullscreenSupported())void setFullScreen();
  };
  const onPress=()=>{void setFullScreen();};
  const onDismissHelp=()=>{if(help)help.hidden=true;};
  dismissHelp?.addEventListener('click',onDismissHelp);
  const resize=()=>{sync();positionGuide();map?.resize?.();};
  const onGuideClose=(event)=>{
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    closeGuide();
  };
  const onOpenGuideEvent=()=>openGuide();
  const onBackdropClick=(event)=>{if(event.target===app&&!guide.hidden)closeGuide();};
  app?.addEventListener('click',onBackdropClick);
  const releaseDetails=document.getElementById('dj-guide-release-details');
  const onReleaseDetails=()=>{
    closeGuide();
    document.getElementById('version-history-trigger')?.click();
  };
  releaseDetails?.addEventListener('click',onReleaseDetails);

  // Explicit theme/night actions must not trigger the initial guide again,
  // even if a PWA reload interrupts the first-entry timer.
  const onModeSwitch=(event)=>{
    if(event.target?.closest?.('#theme-toggle,#night-visibility-toggle,#night-visibility-quick-off,#dj-v794-night,#night-visibility-float-stop')){
      markAutoShown();if(launchTimer){clearTimeout(launchTimer);launchTimer=null;}
    }
  };
  document.addEventListener('click',onModeSwitch,true);
  window.addEventListener('dongjak:open-map-guide',onOpenGuideEvent);
  show.addEventListener('click',openGuide);close?.addEventListener('click',onGuideClose,{capture:true});
  guide.addEventListener('keydown',e=>{if(e.key==='Escape')closeGuide();});
  button?.addEventListener('click',onPress);
  map?.getCanvas?.()?.addEventListener('pointerdown',onFirstMapTouch,{passive:true});
  window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);
  const watchTab=new MutationObserver(()=>{if(app?.dataset?.tab!=='map')closeGuide();else positionGuide();});
  if(app)watchTab.observe(app,{attributes:true,attributeFilter:['data-tab']});
  document.addEventListener('fullscreenchange',resize);
  sync();
  // Offer the guide once after the map has become usable, never block the map.
  const showOnInitialMap=()=>{
    // The onboarding flow owns first-run guidance. Never open a second guide
    // underneath it; the final "시작하기" action opens this guide explicitly.
    if(app?.dataset?.dj860OnboardingOpen==='true'){markAutoShown();return;}
    if(saved()||autoShown()||guideDismissedThisSession||document.hidden)return;
    if(document.documentElement.dataset.djReloadMode) {markAutoShown();return;}
    if(app?.dataset?.tab!=='map')return;
    const startup=document.getElementById('map-startup-overlay');
    const loading=startup && !startup.hidden && !startup.classList.contains('is-hidden');
    if(loading && launchAttempts++<18){launchTimer=setTimeout(showOnInitialMap,650);return;}
    markAutoShown();
    openGuide();
  };
  if(!saved()&&!autoShown())launchTimer=setTimeout(showOnInitialMap,850);

  return ()=>{document.removeEventListener('click',onModeSwitch,true);app?.removeEventListener('click',onBackdropClick);if(launchTimer)clearTimeout(launchTimer);window.removeEventListener('dongjak:open-map-guide',onOpenGuideEvent);releaseDetails?.removeEventListener('click',onReleaseDetails);watchTab.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('orientationchange',resize);document.removeEventListener('fullscreenchange',resize);map?.getCanvas?.()?.removeEventListener('pointerdown',onFirstMapTouch);button?.removeEventListener('click',onPress);close?.removeEventListener('click',onGuideClose,{capture:true});show.removeEventListener('click',openGuide);dismissHelp?.removeEventListener('click',onDismissHelp);};
}
