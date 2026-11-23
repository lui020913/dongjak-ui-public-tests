/**
 * A mobile community editor is NOT a sheet. Keep the same live form and submit
 * listeners, but portal it outside #app so no map/page-sheet geometry or
 * transform can become its fixed-position containing block.
 */
export function communityVisualBounds({layoutHeight,visualHeight,visualTop}){
  const layout=Math.max(1,Number(layoutHeight)||1);
  const offset=Number.isFinite(Number(visualTop))?Number(visualTop):0;
  const top=Math.max(0,Math.min(Math.floor(offset),Math.max(0,layout-160)));
  const measured=Number(visualHeight);
  const available=Number.isFinite(measured)&&measured>0?measured:layout-top;
  return {top,height:Math.max(1,Math.min(Math.floor(available),layout-top))};
}
export function createCommunityComposerPortal(form,{doc=document,win=window}={}){
  if(!form)throw new Error('Community form missing');
  const anchor=doc.createComment('community-form-original-location');
  form.parentNode.insertBefore(anchor,form);
  const portal=doc.createElement('section');
  portal.id='dj-community-editor-portal';
  portal.setAttribute('role','dialog');
  portal.setAttribute('aria-modal','true');
  portal.setAttribute('aria-label','새 게시글 작성');
  portal.hidden=true;
  doc.body.append(portal);
  let active=false,raf=0,initialLayoutHeight=0;

  const ensureStructure=()=>{
    let sc=form.querySelector(':scope > .djNext-form-scroll');
    if(!sc){
      const header=form.querySelector(':scope > .community-form-top');
      sc=doc.createElement('div');
      sc.className='djNext-form-scroll';
      for(const node of [...form.childNodes])if(node!==header)sc.append(node);
      form.append(sc);
    }
    let footer=form.querySelector(':scope > .dj-community-compose-footer');
    if(!footer){
      const save=sc.querySelector('button[type="submit"]');
      footer=doc.createElement('div');
      footer.className='dj-community-compose-footer';
      if(save)footer.append(save);
      form.append(footer);
    }
    return sc;
  };
  const keepFocusedFieldVisible=()=>{
    if(!active)return;
    const focused=doc.activeElement;
    const sc=form.querySelector(':scope > .djNext-form-scroll');
    if(!focused||!sc||!sc.contains(focused))return;
    const bounds=sc.getBoundingClientRect(),field=focused.getBoundingClientRect();
    if(field.bottom>bounds.bottom-12)sc.scrollTop+=field.bottom-bounds.bottom+16;
    else if(field.top<bounds.top+12)sc.scrollTop-=bounds.top-field.top+16;
  };
  const sync=()=>{
    raf=0;
    if(!active)return;
    const visual=win.visualViewport;
    const layout=Math.max(initialLayoutHeight,Number(win.innerHeight)||0,Number(doc.documentElement.clientHeight)||0);
    const bounds=communityVisualBounds({
      layoutHeight:layout,
      visualHeight:visual?.height??win.innerHeight,
      visualTop:visual?.offsetTop??0
    });
    portal.style.setProperty('--dj-community-visual-top',bounds.top+'px');
    portal.style.setProperty('--dj-community-visual-height',bounds.height+'px');
    portal.dataset.keyboard=(bounds.height<layout-120&&form.contains(doc.activeElement))?'open':'closed';
    keepFocusedFieldVisible();
  };
  const schedule=()=>{
    if(!active||raf)return;
    raf=win.requestAnimationFrame(sync);
  };
  const onFocus=()=>schedule();
  const subscriptions=[
    [win,'resize',schedule],[win,'orientationchange',schedule],
    [win.visualViewport,'resize',schedule],[win.visualViewport,'scroll',schedule],
    [form,'focusin',onFocus],[form,'focusout',onFocus]
  ];
  const activateListeners=()=>{for(const [target,type,fn] of subscriptions)target?.addEventListener?.(type,fn,{passive:true});};
  const deactivateListeners=()=>{for(const [target,type,fn] of subscriptions)target?.removeEventListener?.(type,fn);};

  function open(){
    if(active)return;
    const sc=ensureStructure();
    initialLayoutHeight=Math.max(1,Number(win.innerHeight)||Number(doc.documentElement.clientHeight)||1);
    active=true;
    portal.append(form);
    form.hidden=false;
    portal.hidden=false;
    doc.body.dataset.djCommunityEditor='open';
    sc.scrollTop=0;
    activateListeners();
    sync();
  }
  function close(){
    if(!active)return;
    if(form.contains(doc.activeElement))doc.activeElement.blur?.();
    active=false;
    deactivateListeners();
    if(raf)win.cancelAnimationFrame(raf);
    raf=0;
    form.hidden=true;
    if(anchor.parentNode)anchor.parentNode.insertBefore(form,anchor.nextSibling);
    portal.hidden=true;
    portal.style.removeProperty('--dj-community-visual-top');
    portal.style.removeProperty('--dj-community-visual-height');
    delete portal.dataset.keyboard;
    delete doc.body.dataset.djCommunityEditor;
  }
  return {open,close,isOpen:()=>active,portal};
}
