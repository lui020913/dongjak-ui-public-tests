/** v8.9.1 navigation logo and keyboard-safe AI dialog, without modifying map
 * data, search provider, third-party authentication or the global theme. */
export function mobileKeyboardInset({innerHeight=0,visualHeight=0,offsetTop=0}={}){
  return Math.max(0,Math.ceil(innerHeight - visualHeight - offsetTop));
}
export function installV891HeaderAndAi(doc=document,win=window){
  const app=doc.getElementById('app');
  const header=app?.querySelector('.topbar');
  if(!header)return ()=>{};
  const mq=win.matchMedia?.('(max-width:1079px), (min-width:1080px) and (max-width:1366px) and (pointer:coarse)');
  if(!mq)return ()=>{};
  const cleanups=[];
  let logoObserver=null,modalObserver=null,modal=null,modalWatcher=null,frame=0;
  let layoutHeight=0;
  const resetGeometry=()=>{
    layoutHeight=0;
    for(const key of ['top','right','bottom','left','height','max-height','min-height','margin','transform','translate'])modal?.style.removeProperty(key);
  };
  const iconUrl='/icons/dongjak-nav-transparent.png';
  const resize=(fn)=>(win.requestAnimationFrame||((cb)=>win.setTimeout(cb,16))).call(win,fn);
  const cancel=(id)=>(win.cancelAnimationFrame||win.clearTimeout).call(win,id);
  const installLogo=()=>{
    if(!mq.matches)return;
    const button=doc.getElementById('dj-settings-mobile');
    const image=button?.querySelector('img');
    if(!image||image.dataset.dj891Logo==='1')return;
    image.dataset.dj891Logo='1';
    const original=image.getAttribute('src')||'';
    image.dataset.dj891OriginalLogo=original;
    image.addEventListener('error',()=>{
      if(image.getAttribute('src')===iconUrl){
        image.src=original;
        image.dataset.dj891Logo='fallback';
      }
    },{once:true});
    image.src=iconUrl;
    // The legacy mobile header can reapply !important 58px image sizes.
    // The real transparent mark stays smaller inside a 48px circular hit area.
    const compact=win.innerWidth<=374;
    const outer=compact?'44px':'48px';
    const inner=compact?'38px':'40px';
    const set=(node,prop,value)=>node.style.setProperty(prop,value,'important');
    for(const prop of ['width','min-width','max-width','height','min-height','max-height'])
      set(button,prop,outer);
    set(button,'flex-basis',outer);
    set(button,'border-radius','999px');
    for(const prop of ['background','box-shadow','border'])set(button,prop,prop==='background'?'transparent':'none');
    set(button,'overflow','visible');
    for(const prop of ['width','min-width','max-width','height','min-height','max-height'])
      set(image,prop,inner);
    set(image,'object-fit','contain');
  };
  const syncModal=()=>{
    frame=0;
    if(!modal||!modal.open||!mq.matches){
      for(const key of ['--dj891-ai-keyboard-inset','--dj891-ai-visible-height','--dj891-ai-visible-top'])modal?.style.removeProperty(key);
      if(modal)delete modal.dataset.djAiKeyboard;
      resetGeometry();
      return;
    }
    // A focused iOS input can pan the visual viewport as well as resize it.
    // Use one coordinate system; do not combine top/bottom constraints with a height.
    const view=win.visualViewport;
    const top=Math.max(0,Math.round(view?.offsetTop||0));
    // Clamp the dialog to the actually visible viewport; iOS can report
    // intermediate keyboard frames larger than the remaining layout height.
    layoutHeight=Math.max(layoutHeight,win.innerHeight,doc.documentElement?.clientHeight||0);
    const height=Math.max(1,Math.min(Math.floor(view?.height||win.innerHeight),layoutHeight-top));
    const inset=mobileKeyboardInset({innerHeight:layoutHeight,visualHeight:height,offsetTop:top});
    const query=modal.querySelector('#dj-ai-query');
    // Use one keyboard state for the composer safe-area. Do not treat an
    // ordinary scroll/zoom with the input unfocused as an open keyboard.
    const keyboardOpen=Boolean(inset>120&&(query&&doc.activeElement===query||modal.dataset.djAiKeyboard==='true'));
    // Keep keyboard padding until the visible viewport expands, not merely
    // until focus leaves the field (iOS dismiss animation is asynchronous).
    modal.dataset.djAiKeyboard=keyboardOpen?'true':'false';
    modal.style.setProperty('--dj891-ai-keyboard-inset',inset+'px');
    modal.style.setProperty('--dj891-ai-visible-top',top+'px');
    modal.style.setProperty('--dj891-ai-visible-height',height+'px');
    if(win.matchMedia('(max-width:699px)').matches){
      for(const [key,value] of Object.entries({top:top+'px',right:'0px',bottom:'auto',left:'0px',height:height+'px','max-height':height+'px','min-height':'0px',margin:'0px',transform:'none',translate:'none'}))modal.style.setProperty(key,value,'important');
    }
  };
  const schedule=()=>{
    if(frame)return;
    frame=resize(syncModal);
  };
  const bindModal=()=>{
    const found=doc.getElementById('dj-ai-search-modal');
    if(!found||found===modal)return;
    modalWatcher?.disconnect();
    modal=found;
    modalWatcher=new MutationObserver(schedule);
    modalWatcher.observe(modal,{attributes:true,attributeFilter:['open','class']});
    schedule();
  };
  if(typeof MutationObserver==='function'){
    logoObserver=new MutationObserver(()=>{installLogo();bindModal();});
    logoObserver.observe(header,{childList:true,subtree:true});
    // The AI modal is appended later, after the map initializes.
    modalObserver=new MutationObserver(bindModal);
    modalObserver.observe(doc.body,{childList:true});
  }
  for(const [target,event] of [
    [win,'resize'],[win,'orientationchange'],[win.visualViewport,'resize'],
    [win.visualViewport,'scroll'],[doc,'focusin'],[doc,'focusout']
  ])if(target?.addEventListener){
    target.addEventListener(event,schedule,{passive:true});
    cleanups.push(()=>target.removeEventListener(event,schedule));
  }
  mq.addEventListener?.('change',installLogo);
  cleanups.push(()=>mq.removeEventListener?.('change',installLogo));
  installLogo();bindModal();
  return ()=>{
    logoObserver?.disconnect();modalObserver?.disconnect();modalWatcher?.disconnect();
    if(frame)cancel(frame);
    for(const fn of cleanups)fn();
    for(const key of ['--dj891-ai-keyboard-inset','--dj891-ai-visible-height','--dj891-ai-visible-top'])modal?.style.removeProperty(key);
    if(modal)delete modal.dataset.djAiKeyboard;
    resetGeometry();
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installV891HeaderAndAi();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
