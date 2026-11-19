/** v7.0.13: Desktop-only dock. Preserve the original interactive buttons and
 * their existing event handlers; the phone keeps exactly its former toolbar. */
export function installDesktopSafetyRail({app=document.getElementById('app'),minWidth=1080}={}){
  if(!app||typeof window==='undefined')return ()=>{};
  const nav=app.querySelector('#bottom-nav');
  if(!nav)return ()=>{};
  // Layout mode is determined by viewport width only. Pointer type must not
  // turn a resized PC window/tablet into a hybrid desktop/mobile interface.
  const desktopActive=()=>window.innerWidth>=minWidth;
  // Road width is no longer a fourth floating rail button. On desktop the
  // original, event-bound control is docked inside the safety workspace; on
  // tablet/phone it returns to its original map-actions position.
  const ids=['map-tools-toggle','night-visibility-quick-off','map-safety-toggle'];
  const controls=ids.map(id=>app.querySelector('#'+id)).filter(Boolean);
  if(controls.length!==ids.length)return ()=>{};
  const slots=controls.map(el=>{const mark=document.createComment('original-'+el.id);el.parentNode.insertBefore(mark,el);return mark;});
  const roadWidth=app.querySelector('#toggle-road-width');
  const roadWidthSlot=roadWidth?document.createComment('original-toggle-road-width'):null;
  if(roadWidth&&roadWidthSlot)roadWidth.parentNode.insertBefore(roadWidthSlot,roadWidth);
  const roadWidthWrap=roadWidth?document.createElement('div'):null;
  const roadWidthBody=app.querySelector('#dj-safety-actions .dj-safety-group-body');
  if(roadWidthWrap){roadWidthWrap.className='dj-pc-road-width-slot';roadWidthWrap.setAttribute('aria-label','도로폭 분석');}
  const section=document.createElement('div');section.id='dj-desktop-safety-rail';
  section.className='dj-desktop-safety-rail';section.setAttribute('aria-label','안전 지도 도구');
  let measurementFrame=0;
  let stableBaseTop=null;
  const measure=()=>{
    measurementFrame=0;
    if(!desktopActive())return;
    const rect=nav.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    // Desktop search results occupy the same lane as the rail. Shift the rail
    // only while the dropdown is open, using its *rendered* lower boundary.
    const dropdown=app.querySelector('.map-quick-search-dropdown');
    const previousPush=Number.parseFloat(app.style.getPropertyValue('--dj-v725-search-rail-push'))||0;
    // Keep the rail's original anchor stable during the CSS top animation.
    // getBoundingClientRect() returns intermediate animated values.
    if(stableBaseTop===null)stableBaseTop=rect.top-previousPush;
    const idleTop=stableBaseTop;
    const searching=app.dataset.searchOpen==='true' && dropdown && !dropdown.hidden;
    const dropdownBottom=searching?dropdown.getBoundingClientRect().bottom:0;
    const push=0; // The search workspace does not move the desktop navigation.
    if(Math.abs(previousPush-push)>1)app.style.setProperty('--dj-v725-search-rail-push',`${push}px`);
    // All panels share this real rail geometry, never guessed CSS offsets.
    app.style.setProperty('--dj-v724-rail-top',`${Math.round(idleTop+push)}px`);
    app.style.setProperty('--dj-v724-rail-right',`${Math.round(rect.right)}px`);
    app.style.setProperty('--dj-v724-rail-height',`${Math.round(rect.height)}px`);
  };
  const scheduleMeasure=()=>{
    if(measurementFrame)cancelAnimationFrame(measurementFrame);
    measurementFrame=requestAnimationFrame(measure);
  };
  const sync=()=>{
    const enabled=desktopActive();
    if(enabled){
      if(!section.isConnected)nav.append(section);
      controls.forEach(el=>{if(el.parentNode!==section)section.append(el);});
      if(roadWidth&&roadWidthWrap&&roadWidthBody){
        if(!roadWidthWrap.isConnected)roadWidthBody.append(roadWidthWrap);
        if(roadWidth.parentNode!==roadWidthWrap)roadWidthWrap.append(roadWidth);
      }
      scheduleMeasure();
    } else {
      controls.forEach((el,i)=>{if(el.parentNode!==slots[i].parentNode)slots[i].parentNode.insertBefore(el,slots[i].nextSibling);});
      if(roadWidth&&roadWidthSlot?.parentNode&&roadWidth.parentNode!==roadWidthSlot.parentNode)roadWidthSlot.parentNode.insertBefore(roadWidth,roadWidthSlot.nextSibling);
      roadWidthWrap?.remove();section.remove();
    }
  };
  const observer=new MutationObserver(sync);
  observer.observe(app,{attributes:true,attributeFilter:['data-tab','data-search-open']});
  const dropdown=app.querySelector('.map-quick-search-dropdown');
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(scheduleMeasure):null;
  if(dropdown)resizeObserver?.observe(dropdown);
  if(dropdown)dropdown.addEventListener('transitionend',scheduleMeasure);
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('load',scheduleMeasure,{once:true});
  sync();
  return ()=>{observer.disconnect();resizeObserver?.disconnect();dropdown?.removeEventListener('transitionend',scheduleMeasure);window.removeEventListener('resize',sync);cancelAnimationFrame(measurementFrame);controls.forEach((el,i)=>slots[i].parentNode?.insertBefore(el,slots[i].nextSibling));if(roadWidth&&roadWidthSlot?.parentNode)roadWidthSlot.parentNode.insertBefore(roadWidth,roadWidthSlot.nextSibling);roadWidthWrap?.remove();section.remove();slots.forEach(el=>el.remove());roadWidthSlot?.remove();};
}
