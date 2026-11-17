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
export function keyboardBounds(layoutHeight,view,focused){
  if(!focused||!view||Math.abs((view.scale??1)-1)>.05)return null;
  const top=Math.max(0,Number(view.offsetTop)||0),height=Number(view.height);
  if(!Number.isFinite(height)||height<=0||layoutHeight-height<100)return null;
  return {top:Math.ceil(top+8),bottom:Math.max(8,Math.ceil(layoutHeight-top-height+8))};
}
export function installMobileSurfaceCoordinator(doc=document,win=window){
  const app=doc.getElementById('app'),nav=doc.getElementById('bottom-nav');
  if(!app||!nav||app.dataset.djUserSurfaceReady==='1')return ()=>{};
  app.dataset.djUserSurfaceReady='1';
  const media=win.matchMedia('(max-width:699px)');
  let queued=0,delayed=0,observer=null,resize=null,lastRail=null,lastScale=null,composerWasOpen=false,disposed=false;
  const removers=[];
  const on=(target,event,fn,opts)=>{if(!target?.addEventListener)return;target.addEventListener(event,fn,opts);removers.push(()=>target.removeEventListener(event,fn,opts));};
  const set=(name,value)=>{const v=value==null?'':String(value);if(v){if(app.style.getPropertyValue(name)!==v)app.style.setProperty(name,v);}else app.style.removeProperty(name);};
  const flag=(name,state)=>{if(state){if(app.getAttribute(name)!=='true')app.setAttribute(name,'true');}else if(app.hasAttribute(name))app.removeAttribute(name);};
  const visible=n=>Boolean(n&&!n.hidden&&n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0&&win.getComputedStyle(n).visibility!=='hidden'&&win.getComputedStyle(n).display!=='none');
  const viewportHeight=()=>doc.documentElement.clientHeight||win.innerHeight;
  const keepFieldVisible=()=>{
    const input=doc.activeElement,form=doc.getElementById('community-form'),body=doc.querySelector('#participation-panel > .dj836-sheet-body');
    if(!input||!body||!form?.contains(input)||!app.hasAttribute('data-dj-user-editor-keyboard'))return;
    const r=input.getBoundingClientRect(),b=body.getBoundingClientRect(),head=form.querySelector('.community-form-top');
    const min=Math.max(b.top,head?.getBoundingClientRect().bottom||b.top)+10,max=b.bottom-12;
    if(r.bottom>max)body.scrollTop+=r.bottom-max;
    else if(r.top<min)body.scrollTop-=min-r.top;
  };
  function sync(){
    queued=0;if(disposed)return;
    if(!media.matches){set('--dj-user-dock-bottom',null);set('--dj-user-editor-top',null);set('--dj-user-editor-bottom',null);set('--dj-user-tip-left',null);set('--dj-user-tip-bottom',null);flag('data-dj-user-editor-keyboard',false);return;}
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
    if(scale&&scale!==lastScale){if(lastScale)resize?.unobserve(lastScale);resize?.observe(scale);lastScale=scale;}
    if(visible(scale)&&dock!==null){
      const r=scale.getBoundingClientRect();
      // Preserve the native scale width, which encodes a distance.
      const left=Math.ceil(r.right+8);
      set('--dj-user-tip-left',left+ 'px');
      set('--dj-user-tip-bottom',Math.ceil(h-r.bottom)+'px');
    }else{set('--dj-user-tip-left',null);set('--dj-user-tip-bottom',null);}
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
  return ()=>{disposed=true;observer?.disconnect();resize?.disconnect();for(const remove of removers)remove();if(queued)win.cancelAnimationFrame(queued);if(delayed)win.clearTimeout(delayed);for(const p of ['--dj-user-dock-bottom','--dj-user-editor-top','--dj-user-editor-bottom','--dj-user-tip-left','--dj-user-tip-bottom'])set(p,null);flag('data-dj-user-editor-keyboard',false);delete app.dataset.djUserSurfaceReady;};
}
