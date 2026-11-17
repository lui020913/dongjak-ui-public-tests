/**
 * Review candidate, not automatically imported by the Production bridge.
 * Local presentation only: no API calls, data, authentication, or location reads.
 * The existing controllers remain the owners of visibility and user actions.
 */
export const MOBILE_GAP=8;
export function dockBottom(layoutHeight,navTop,gap=MOBILE_GAP){
  if(!Number.isFinite(layoutHeight)||!Number.isFinite(navTop)||navTop<=0||navTop>=layoutHeight)return null;
  return Math.ceil(layoutHeight-navTop+gap);
}
export function tipHudPositions(layoutHeight,navTop,tipHeight=36,scaleHeight=36,gap=12){
  if(!Number.isFinite(layoutHeight)||!Number.isFinite(navTop)||navTop<=0||navTop>=layoutHeight)return null;
  if(!Number.isFinite(tipHeight)||!Number.isFinite(scaleHeight)||tipHeight<=0||scaleHeight<=0||!Number.isFinite(gap)||gap<0)return null;
  const tipTop=Math.ceil(navTop-gap-tipHeight);
  const scaleTop=Math.ceil(tipTop-gap-scaleHeight);
  return {tipTop,scaleTop};
}
export function hudScaleCorrection(actualGap,target=12){
  if(!Number.isFinite(actualGap)||!Number.isFinite(target))return 0;
  return actualGap<8||actualGap>16?Math.max(-36,Math.min(36,target-actualGap)):0;
}
export function keyboardBounds(layoutHeight,view,focused){
  if(!focused||!view||Math.abs((view.scale??1)-1)>.05)return null;
  const top=Math.max(0,Number(view.offsetTop)||0),height=Number(view.height);
  if(!Number.isFinite(height)||height<=0||layoutHeight-height<100)return null;
  return {top:Math.ceil(top+8),bottom:Math.max(8,Math.ceil(layoutHeight-top-height+8))};
}
// v8.0.6 writes an inline important 9% slide during its automatic transition.
// CSS cannot override that declaration. Limit the cleanup to this one native
// panel, only while its automatic transition owns it; never touch drag state.
export function shouldClearMoreTranslate({mobile,hidden,dragging,automatic,translate}){
  return Boolean(mobile&&!hidden&&!dragging&&automatic&&translate&&translate!=='none'&&translate!=='0px 0px');
}
export function installMobileSurfaceCoordinator(doc=document,win=window){
  const app=doc.getElementById('app'),nav=doc.getElementById('bottom-nav');
  if(!app||!nav||app.dataset.djUserSurfaceReady==='1')return ()=>{};
  app.dataset.djUserSurfaceReady='1';
  const media=win.matchMedia('(max-width:699px)');
  let queued=0,delayed=0,observer=null,resize=null,scaleObserver=null,lastRail=null,lastScale=null,lastMore=null,moreObserver=null,lastTip=null,tipObserver=null,tipClose=null,mapOptionsButton=null,composerWasOpen=false,disposed=false;
  const removers=[];
  const on=(target,event,fn,opts)=>{if(!target?.addEventListener)return;target.addEventListener(event,fn,opts);removers.push(()=>target.removeEventListener(event,fn,opts));};
  const set=(name,value)=>{const v=value==null?'':String(value);if(v){if(app.style.getPropertyValue(name)!==v)app.style.setProperty(name,v);}else app.style.removeProperty(name);};
  const flag=(name,state)=>{if(state){if(app.getAttribute(name)!=='true')app.setAttribute(name,'true');}else if(app.hasAttribute(name))app.removeAttribute(name);};
  const visible=n=>Boolean(n&&!n.hidden&&n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0&&win.getComputedStyle(n).visibility!=='hidden'&&win.getComputedStyle(n).display!=='none');
  const viewportHeight=()=>doc.documentElement.clientHeight||win.innerHeight;
  const important=(node,prop,value)=>{
    const next=String(value);
    if(node.style.getPropertyValue(prop)!==next||node.style.getPropertyPriority(prop)!=='important')node.style.setProperty(prop,next,'important');
  };
  const ensureTipClose=()=>{
    if(tipClose?.isConnected)return tipClose;
    tipClose=doc.createElement('button');
    tipClose.type='button';
    tipClose.id='dj-user-tip-close';
    tipClose.setAttribute('aria-label','지도 TIP 닫기');
    tipClose.setAttribute('aria-controls','dj840-map-tip');
    tipClose.textContent='×';
    tipClose.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      app.dataset.djUserTipDismissed='true';
      tipClose.hidden=true;
    });
    app.appendChild(tipClose);
    return tipClose;
  };
  const observeTip=()=>{
    const found=doc.getElementById('dj840-map-tip');
    if(found===lastTip)return;
    tipObserver?.disconnect();lastTip=found;
    if(found&&win.MutationObserver){
      tipObserver=new win.MutationObserver(schedule);
      tipObserver.observe(found,{attributes:true,attributeFilter:['style','hidden','class']});
    }
  };
  const ensureMapOptions=()=>{
    const toolbar=doc.getElementById('dj-v794-toolbar');
    const scroller=toolbar?.querySelector(':scope > .dj831-scrollport');
    if(!media.matches||!scroller){
      mapOptionsButton?.remove();mapOptionsButton=null;return;
    }
    if(!mapOptionsButton?.isConnected){
      mapOptionsButton=doc.createElement('button');
      mapOptionsButton.type='button';
      mapOptionsButton.id='dj-user-map-options';
      mapOptionsButton.className='dj-v794-tool dj832-native';
      mapOptionsButton.dataset.dj832Label='지도 옵션';
      mapOptionsButton.setAttribute('aria-label','지도 옵션 열기');
      mapOptionsButton.setAttribute('aria-controls','map-advanced-controls');
      mapOptionsButton.innerHTML='<span class="dj-v794-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg></span>';
      mapOptionsButton.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const utilities=doc.getElementById('dj-mobile-utilities');
        if(utilities&&!utilities.hidden)doc.getElementById('dj-mobile-more-trigger')?.click();
        const source=doc.getElementById('map-tools-toggle');
        if(source&&!source.disabled)source.click();
        schedule();
      });
    }
    mapOptionsButton.classList.add('dj-v794-tool','dj832-native');
    mapOptionsButton.dataset.dj832Label='지도 옵션';
    const open=app.classList.contains('map-controls-open');
    mapOptionsButton.dataset.active=open?'true':'false';
    mapOptionsButton.setAttribute('aria-expanded',String(open));
    const night=doc.getElementById('dj-v794-night');
    const expectedNext=night?.nextSibling||null;
    // v831 rebuilds shortcut buttons immediately after the night control.
    // Keep the proxy in the same DOM order as its visual order for keyboard use.
    if(mapOptionsButton.parentElement!==scroller||mapOptionsButton!==expectedNext){
      scroller.insertBefore(mapOptionsButton,expectedNext);
    }
  };
  const keepFieldVisible=()=>{
    const input=doc.activeElement,form=doc.getElementById('community-form'),body=doc.querySelector('#participation-panel > .dj836-sheet-body');
    if(!input||!body||!form?.contains(input)||!app.hasAttribute('data-dj-user-editor-keyboard'))return;
    const r=input.getBoundingClientRect(),b=body.getBoundingClientRect(),head=form.querySelector('.community-form-top');
    const min=Math.max(b.top,head?.getBoundingClientRect().bottom||b.top)+10,max=b.bottom-12;
    if(r.bottom>max)body.scrollTop+=r.bottom-max;
    else if(r.top<min)body.scrollTop-=min-r.top;
  };
  const fixMoreMotion=()=>{
    if(!lastMore)return;
    const n=lastMore;
    const automatic=Boolean(n.dataset.dj810Animating)||n.classList.contains('dj870-more-entering')||n.classList.contains('dj870-more-leaving');
    if(shouldClearMoreTranslate({mobile:media.matches,hidden:n.hidden,dragging:n.classList.contains('dj-sheet-dragging')||n.classList.contains('dj833-sheet-dismissing'),automatic,translate:n.style.getPropertyValue('translate')})){
      n.style.removeProperty('translate');
    }
  };
  function observeMore(){
    const n=doc.getElementById('dj-mobile-utilities');
    if(n===lastMore)return;
    moreObserver?.disconnect();lastMore=n;
    if(n&&win.MutationObserver){
      moreObserver=new win.MutationObserver(fixMoreMotion);
      moreObserver.observe(n,{attributes:true,attributeFilter:['style','class','hidden','data-dj810-animating']});
      fixMoreMotion();
    }
  }
  function sync(){
    queued=0;if(disposed)return;
    observeMore();observeTip();
    ensureMapOptions();
    if(!media.matches){if(lastScale){lastScale.style.removeProperty('translate');delete lastScale.dataset.djUserHudOffset;}scaleObserver?.disconnect();scaleObserver=null;set('--dj-user-dock-bottom',null);set('--dj-user-editor-top',null);set('--dj-user-editor-bottom',null);set('--dj-user-tip-left',null);set('--dj-user-tip-bottom',null);flag('data-dj-user-editor-keyboard',false);tipClose?.remove();tipClose=null;tipObserver?.disconnect();tipObserver=null;lastTip=null;return;}
    const query=doc.getElementById('map-quick-search-query');
    if(query&&query.placeholder!=='어디로 가시나요?')query.placeholder='어디로 가시나요?';
    const h=viewportHeight(),n=nav.getBoundingClientRect(),dock=visible(nav)?dockBottom(h,n.top):null;
    set('--dj-user-dock-bottom',dock===null?null:dock+'px');
    const form=doc.getElementById('community-form'),input=doc.activeElement;
    const focused=Boolean(form&&!form.hidden&&input?.matches('textarea,input:not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])')&&form.contains(input));
    const composerOpen=Boolean(form&&!form.hidden&&!doc.getElementById('participation-panel')?.hidden);
    if(composerOpen&&!composerWasOpen&&!focused){
      // The native opening action previously scrolled the nested form past
      // its first field. Reset only on opening, never during editing.
      const body=doc.querySelector('#participation-panel > .dj836-sheet-body');
      body?.scrollTo({top:0,behavior:'instant'});
    }
    composerWasOpen=composerOpen;
    const keypad=keyboardBounds(h,win.visualViewport,focused);
    flag('data-dj-user-editor-keyboard',Boolean(keypad));
    set('--dj-user-editor-top',keypad?keypad.top+'px':null);
    set('--dj-user-editor-bottom',keypad?keypad.bottom+'px':null);
    if(keypad){if(delayed)win.clearTimeout(delayed);delayed=win.setTimeout(keepFieldVisible,100);}
    const scale=doc.querySelector('#map .maplibregl-ctrl-bottom-left .maplibregl-ctrl-scale');
    if(scale&&scale!==lastScale){
      scaleObserver?.disconnect();
      if(lastScale){resize?.unobserve(lastScale);lastScale.style.removeProperty('translate');delete lastScale.dataset.djUserHudOffset;}
      resize?.observe(scale);lastScale=scale;
      if(win.MutationObserver){scaleObserver=new win.MutationObserver(schedule);scaleObserver.observe(scale,{attributes:true,attributeFilter:['style']});}
    }
    const tip=doc.getElementById('dj840-map-tip');
    if(tip&&visible(tip)&&visible(scale)&&dock!==null){
      const scaleRect=scale.getBoundingClientRect();
      const positions=tipHudPositions(h,n.top,36,Math.max(18,scaleRect.height||36),12);
      if(positions){
        // Keep the true MapLibre distance scale on its own row above the TIP.
        important(scale,'position','fixed');important(scale,'top',positions.scaleTop+'px');
        important(scale,'bottom','auto');important(scale,'left','18px');important(scale,'right','auto');
        important(scale,'z-index','2780');
        important(tip,'position','fixed');important(tip,'top',positions.tipTop+'px');
        important(tip,'bottom','auto');important(tip,'left','12px');important(tip,'right','12px');
        important(tip,'width','auto');important(tip,'max-width','none');
        important(tip,'height','36px');important(tip,'min-height','36px');important(tip,'max-height','36px');
        important(tip,'box-sizing','border-box');
        // The native MapLibre docking controller also writes scale coordinates.
        // Correct only the measured presentation gap; never alter physical scale width.
        const actualGap=tip.getBoundingClientRect().top-scale.getBoundingClientRect().bottom;
        const adjustment=hudScaleCorrection(actualGap);
        if(adjustment){
          const previous=Number(scale.dataset.djUserHudOffset||0);
          const next=Math.max(-60,Math.min(60,previous+adjustment));
          if(next!==previous){scale.dataset.djUserHudOffset=String(next);important(scale,'translate',`0px ${-next}px`);}
        }
        const close=ensureTipClose();close.hidden=false;
        important(close,'position','fixed');important(close,'top',positions.tipTop+'px');
        important(close,'right','19px');important(close,'left','auto');
        important(close,'width','34px');important(close,'height','34px');
        important(close,'z-index','2891');
        set('--dj-user-tip-left',null);set('--dj-user-tip-bottom',null);
      }
    }else{
      if(scale&&scale.dataset.djUserHudOffset){scale.style.removeProperty('translate');delete scale.dataset.djUserHudOffset;}
      set('--dj-user-tip-left',null);set('--dj-user-tip-bottom',null);
      if(tipClose)tipClose.hidden=true;
    }
    // The native nearby-information sheet already owns permission/error/results.
    // Do not leave a generic explanatory surface on top of it.
    const native=doc.getElementById('ped-tools-panel'),data=doc.getElementById('dj832-data-sheet');
    if(visible(native)&&!data?.hidden&&data?.querySelector('.dj832-sheet-title')?.textContent?.trim()==='내 주변 보행정보'){
      data.querySelector('.dj832-sheet-close')?.click();
    }else if(visible(data)){
      const state=data.querySelector('.dj832-state-text');
      if(state?.textContent==='실행 요청 (결과 미확인)')state.textContent='현재 상태를 확인할 수 없습니다';
    }
    const rail=doc.getElementById('dj831-scrollport');
    if(rail&&rail!==lastRail){
      lastRail=rail;
      // Once expanded width settles, keep the active control entirely inside
      // the swipe rail; never scroll the document or cover the fixed More button.
      on(rail,'transitionend',event=>{
        if(!['width','flex-basis','max-width','min-width'].includes(event.propertyName))return;
        const button=event.target.closest('.dj832-expanded');if(!button||!rail.contains(button))return;
        const r=button.getBoundingClientRect(),v=rail.getBoundingClientRect();
        const delta=r.right>v.right-2?r.right-v.right+2:r.left<v.left+2?r.left-v.left-2:0;
        if(delta)rail.scrollBy({left:delta,behavior:media.matches?'auto':'smooth'});
      });
    }
  }
  const schedule=()=>{if(!queued&&!disposed)queued=win.requestAnimationFrame(sync);};
  for(const [target,event] of [[win,'resize'],[win,'orientationchange'],[win,'pageshow'],[win.visualViewport,'resize'],[win.visualViewport,'scroll'],[doc,'focusin'],[doc,'focusout']])on(target,event,schedule,{passive:true});
  if(win.ResizeObserver){resize=new win.ResizeObserver(schedule);resize.observe(nav);}
  if(win.MutationObserver){
    observer=new win.MutationObserver(mutations=>{
      if(mutations.some(m=>m.type==='childList'||m.attributeName==='hidden'||(m.target===app&&m.attributeName==='data-tab')))schedule();
    });
    observer.observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-tab']});
  }
  schedule();
  return ()=>{disposed=true;observer?.disconnect();moreObserver?.disconnect();tipObserver?.disconnect();scaleObserver?.disconnect();resize?.disconnect();if(lastScale){lastScale.style.removeProperty('translate');delete lastScale.dataset.djUserHudOffset;}tipClose?.remove();mapOptionsButton?.remove();mapOptionsButton=null;for(const remove of removers)remove();if(queued)win.cancelAnimationFrame(queued);if(delayed)win.clearTimeout(delayed);for(const p of ['--dj-user-dock-bottom','--dj-user-editor-top','--dj-user-editor-bottom','--dj-user-tip-left','--dj-user-tip-bottom'])set(p,null);flag('data-dj-user-editor-keyboard',false);delete app.dataset.djUserTipDismissed;delete app.dataset.djUserSurfaceReady;};
}
