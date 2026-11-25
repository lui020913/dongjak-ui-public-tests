/**
 * Independent phone composer. The community feed remains a normal map tab.
 * The report editor is mounted directly under body so legacy page-panel
 * transforms, bottom dock calculations and sheet gestures cannot move it.
 * Original field nodes and submit listeners are preserved.
 */
export function communityVisibleViewport(win,layoutHeight=win.innerHeight){
  const inner=Math.max(1,Number(layoutHeight)||1);
  const visual=win.visualViewport;
  const top=Math.max(0,Math.round(Number(visual?.offsetTop)||0));
  const measured=Number(visual?.height);
  const height=Math.max(1,Math.round(Math.min(Number.isFinite(measured)&&measured>0?measured:inner,Math.max(1,inner-top))));
  return {top,height,keyboardInset:Math.max(0,inner-top-height)};
}

export function communityVisualBounds({layoutHeight,visualHeight,visualTop}){
  const {top,height}=communityVisibleViewport({
    innerHeight:layoutHeight,visualViewport:{height:visualHeight,offsetTop:visualTop}
  },layoutHeight);
  return {top,height};
}

export function createCommunityComposerPortal(form,{doc=document,win=window}={}){
  if(!form)throw new Error('Community composer form missing');
  const initialParent=form.parentNode;
  const initialNext=form.nextSibling;
  const originalTitle=form.querySelector(':scope > .community-form-top strong')?.textContent||'새 게시글';
  let root=null;
  let scroll=null;
  let header=null;
  let footer=null;
  let helper=null;
  let frame=0;
  let listeners=[];
  let wasAppInert=false;
  let initialLayoutHeight=0;
  let dockRestore=null;
  function hideDock(){
    if(dockRestore)return;
    const node=doc.getElementById('bottom-nav');
    if(!node)return;
    const keys=['display','visibility','pointer-events'];
    dockRestore={node,values:keys.map(key=>({key,
      value:node.style.getPropertyValue(key),priority:node.style.getPropertyPriority(key)}))};
    for(const key of keys)node.style.setProperty(key,key==='display'?'none':key==='visibility'?'hidden':'none','important');
  }
  function restoreDock(){
    if(!dockRestore)return;
    for(const {key,value,priority} of dockRestore.values){
      if(value)dockRestore.node.style.setProperty(key,value,priority);
      else dockRestore.node.style.removeProperty(key);
    }
    dockRestore=null;
  }

  function updateTitle(){
    const title=header?.querySelector('strong');
    const issue=doc.getElementById('community-category')?.value==='보행 불편';if(title)title.textContent=issue?'보행환경 제보':'새 게시글';if(helper)helper.textContent=issue?'보행 중 불편했던 상황을 공개 게시판에 알려주세요. 지역과 지도 위치는 필수입니다.':'지역은 자유게시판에서만 선택사항이며 사진과 위치는 선택사항입니다.';
  }
  function geometry(){
    frame=0;
    if(!root||root.hidden||root.dataset.closing==='true')return;
    const layout=Math.max(initialLayoutHeight,Number(win.innerHeight)||0,Number(doc.documentElement.clientHeight)||0);
    const box=communityVisibleViewport(win,layout);
    root.style.setProperty('--dj-compose-visible-top',box.top+'px');
    root.style.setProperty('--dj-compose-visible-height',box.height+'px');
    const active=doc.activeElement;
    const keyboard=box.keyboardInset>120&&Boolean(active&&form.contains(active)&&active.matches?.('input,textarea,select'));
    root.dataset.keyboard=keyboard?'open':'closed';
    footer?.style.setProperty('padding-bottom',keyboard?'10px':'max(16px,env(safe-area-inset-bottom,0px))','important');
  }
  function schedule(){
    if(!root||root.hidden||root.dataset.closing==='true'||frame)return;
    frame=win.requestAnimationFrame(geometry);
  }
  function ensure(){
    if(root)return;
    // Discard every legacy form scroll wrapper and footer from the old sheet.
    const oldScroll=form.querySelector(':scope > .djNext-form-scroll');
    if(oldScroll){
      for(const node of [...oldScroll.childNodes])form.insertBefore(node,oldScroll);
      oldScroll.remove();
    }
    const oldFooter=form.querySelector(':scope > .dj-community-compose-footer');
    if(oldFooter){
      for(const node of [...oldFooter.childNodes])form.insertBefore(node,oldFooter);
      oldFooter.remove();
    }
    header=form.querySelector(':scope > .community-form-top');
    const save=form.querySelector(':scope > button[type="submit"]');
    if(!header||!save)throw new Error('Community composer header or save action missing');
    header.querySelector('#community-compose-close')?.replaceChildren(doc.createTextNode('×'));
    header.querySelector('strong')?.setAttribute('id','dj-compose-title');

    scroll=doc.createElement('div');
    scroll.className='dj-compose-scroll';
    // The shared legacy community stylesheet has higher-specificity flex
    // declarations. This portal's sole scrolling row must be shrinkable even
    // when those declarations arrive after this module's stylesheet.
    for(const [property,value] of [
      ['flex','1 1 0%'],['height','0px'],['min-height','0px'],
      ['overflow-y','auto'],['overflow-x','hidden'],
      ['box-sizing','border-box'],['padding','19px max(16px,env(safe-area-inset-right,0px)) 25px max(16px,env(safe-area-inset-left,0px))']
    ])scroll.style.setProperty(property,value,'important');
    helper=doc.createElement('p');
    helper.className='dj-compose-intro';
    helper.textContent='보행 중 불편했던 상황을 공개 게시판에 알려주세요. 사진과 위치는 선택사항입니다.';
    scroll.append(helper);
    for(const node of [...form.childNodes])if(node!==header&&node!==save)scroll.append(node);
    footer=doc.createElement('footer');
    footer.className='dj-compose-footer';
    footer.style.setProperty('padding-inline','max(16px,env(safe-area-inset-left,0px)) max(16px,env(safe-area-inset-right,0px))','important');
    footer.style.setProperty('box-sizing','border-box','important');
    footer.append(save);
    form.replaceChildren(header,scroll,footer);

    root=doc.createElement('section');
    root.id='dj-community-editor-portal';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.setAttribute('aria-labelledby','dj-compose-title');
    root.hidden=true;
    root.append(form);
    doc.body.append(root);
    form.querySelector('#community-category')?.addEventListener('change',updateTitle);
    listeners=[
      [win.visualViewport,'resize'],[win.visualViewport,'scroll'],
      [win,'resize'],[win,'orientationchange'],
      [form,'focusin'],[form,'focusout']
    ];
    for(const [target,type] of listeners)target?.addEventListener?.(type,schedule,{passive:true});
    updateTitle();
  }
  function show({resetScroll=true,mapOrigin=false}={}){
    ensure();
    initialLayoutHeight=Math.max(1,Number(win.innerHeight)||Number(doc.documentElement.clientHeight)||1);
    if(form.parentNode!==root)root.append(form);
    form.hidden=false;
    delete root.dataset.closing;
    root.hidden=false;
    doc.body.dataset.djCommunityEditor='open';
    const app=doc.getElementById('app');
    if(app){wasAppInert=app.inert;app.inert=true;}
    root.dataset.mapOrigin=String(mapOrigin);
    if(mapOrigin)doc.body.dataset.djCommunityMapOrigin='true';
    else{delete doc.body.dataset.djCommunityMapOrigin;hideDock();}
    updateTitle();
    geometry();
    if(resetScroll&&scroll)scroll.scrollTop=0;
    schedule();
  }
  function prepareClose(){
    if(!root||root.hidden)return;
    root.dataset.closing='true';
    if(frame){win.cancelAnimationFrame(frame);frame=0;}
    doc.body.dataset.djCommunityEditor='closing';
    restoreDock();
  }
  function hide(){
    if(!root||root.hidden)return;
    if(form.contains(doc.activeElement))doc.activeElement.blur();
    root.hidden=true;
    delete root.dataset.closing;
    form.hidden=true;
    delete doc.body.dataset.djCommunityEditor;
    delete doc.body.dataset.djCommunityMapOrigin;
    if(initialParent&&form.parentNode!==initialParent){
      if(initialNext?.parentNode===initialParent)initialParent.insertBefore(form,initialNext);
      else initialParent.append(form);
    }
    const app=doc.getElementById('app');
    if(app)app.inert=wasAppInert;
    restoreDock();
    if(frame){win.cancelAnimationFrame(frame);frame=0;}
  }
  function restoreDesktop(){
    if(!root)return;
    hide();
    const save=footer?.querySelector('button[type="submit"]');
    const nodes=[...scroll.childNodes].filter(node=>node!==helper);
    form.replaceChildren(header,...nodes,...(save?[save]:[]));
    header.querySelector('strong').textContent=originalTitle;
    header.querySelector('strong').removeAttribute('id');
    header.querySelector('#community-compose-close')?.replaceChildren();
    if(initialNext?.parentNode===initialParent)initialParent.insertBefore(form,initialNext);
    else initialParent.append(form);
    for(const [target,type] of listeners)target?.removeEventListener?.(type,schedule);
    listeners=[];
    root.remove();
    root=null;scroll=null;footer=null;helper=null;header=null;
  }
  return {open:options=>show({resetScroll:true,...options}),prepareClose,close:hide,restoreDesktop,
    isOpen:()=>Boolean(root&&!root.hidden),get portal(){return root;}};
}
