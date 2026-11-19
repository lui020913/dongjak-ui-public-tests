import {test,expect} from '@playwright/test';
import {openMapPage,navTab} from './helpers.js';

// The tests exercise touch-screen interactions; running the same suite in a
// desktop pointer project doubles CI minutes without testing phone behavior.
test.beforeEach(({},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile','Touchscreen interaction regression');
});

async function dragHeader(page,panel,delta){
  const header=panel.locator('.dj-sheet-chrome').first();
  await expect(header).toBeVisible();
  const box=await header.boundingBox();
  expect(box).not.toBeNull();
  // Use a safe non-button area of the header, away from the right-side X.
  const x=Math.round(box.x+box.width*.35);
  const y=Math.round(box.y+Math.min(24,box.height*.5));
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x,y+delta,{steps:6});
  await page.mouse.up();
}

async function dragSurface(page,surface,delta){
  await expect(surface).toBeVisible();
  const box=await surface.boundingBox();
  expect(box).not.toBeNull();
  const x=Math.round(box.x+box.width*.5);
  const y=Math.round(box.y+box.height*.5);
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x,y+delta,{steps:6});
  await page.mouse.up();
}

test('mobile sheet expands, collapses, then closes in three deliberate stages',async({page})=>{
  test.setTimeout(300000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  await navTab(page,'route').click({noWaitAfter:true});
  const panel=page.locator('#route-panel');
  await expect(panel).toBeVisible();
  const compact=await panel.boundingBox();
  expect(compact).not.toBeNull();

  await dragHeader(page,panel,-145);
  await expect(panel).toHaveClass(/dj871-sheet-expanded/);
  await expect(page.locator('#app>.topbar')).toBeHidden();
  const expandedDebug=await panel.evaluate(el=>{
    const rect=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {tag:n.tagName,id:n.id,className:String(n.className||''),x:r.x,y:r.y,width:r.width,height:r.height,position:s.position,top:s.top,bottom:s.bottom,left:s.left,right:s.right,transform:s.transform,translate:s.translate,contain:s.contain,filter:s.filter}};
    const ancestors=[];for(let n=el;n&&ancestors.length<6;n=n.parentElement)ancestors.push(rect(n));
    const s=getComputedStyle(el),header=el.querySelector('.dj-sheet-chrome'),topbar=document.querySelector('#app>.topbar');
    const hr=rect(header),tr=rect(topbar),hs=header?getComputedStyle(header):null,ts=topbar?getComputedStyle(topbar):null;
    const px=Number.isFinite(hr?.left)&&Number.isFinite(hr?.width)?Math.round(hr.left+hr.width*.35):0;
    const py=Number.isFinite(hr?.top)&&Number.isFinite(hr?.height)?Math.round(hr.top+Math.min(24,hr.height*.5)):0;
    const hit=Number.isFinite(px)&&Number.isFinite(py)?document.elementFromPoint(px,py):null;
    const stack=node=>{const out=[];for(let n=node;n&&out.length<8;n=n.parentElement){const cs=getComputedStyle(n),r=n.getBoundingClientRect();out.push({tag:n.tagName,id:n.id,className:String(n.className||''),position:cs.position,zIndex:cs.zIndex,pointerEvents:cs.pointerEvents,opacity:cs.opacity,transform:cs.transform,filter:cs.filter,contain:cs.contain,isolation:cs.isolation,willChange:cs.willChange,rect:{x:r.x,y:r.y,width:r.width,height:r.height}});}return out;};
    const map=document.getElementById('map'),canvas=document.querySelector('.maplibregl-canvas'),canvasContainer=document.querySelector('.maplibregl-canvas-container');
    return {viewport:{width:innerWidth,height:innerHeight,small:matchMedia('(max-width:699px)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,stylesheets:document.styleSheets.length},panel:{...rect(el),inset:s.inset,transition:s.transition,zIndex:s.zIndex,inline:el.getAttribute('style')},header:hr,headerZIndex:hs?.zIndex,headerDisplay:hs?.display,headerVisibility:hs?.visibility,headerPointerEvents:hs?.pointerEvents,topbar:tr,topbarZIndex:ts?.zIndex,topbarVisibility:ts?.visibility,hit:{tag:hit?.tagName,id:hit?.id,className:String(hit?.className||'')},panelStack:stack(el),mapStack:stack(map),canvasStack:stack(canvas),canvasContainerStack:stack(canvasContainer),hitStack:stack(hit),ancestors};
  });
  console.log('V889_EXPANDED_DIAGNOSTIC '+JSON.stringify(expandedDebug));
  await expect.poll(async()=> (await panel.boundingBox())?.y ?? 999,{timeout:8000}).toBeLessThan(32);
  const expanded=await panel.boundingBox();
  expect(expanded).not.toBeNull();
  expect(expanded.height).toBeGreaterThan(compact.height+70);
  expect(Math.abs(expanded.x - (390 - expanded.x - expanded.width))).toBeLessThanOrEqual(2);
  const headerBottom=await panel.locator(".dj-sheet-chrome").evaluate(n=>n.getBoundingClientRect().bottom);
  const bodyTop=await panel.locator(".dj836-sheet-body").evaluate(n=>n.getBoundingClientRect().top);
  expect(bodyTop).toBeGreaterThanOrEqual(headerBottom-1);

  // First downward gesture only returns to the compact stage; it must not close.
  await dragHeader(page,panel,145);
  await expect(panel).not.toHaveClass(/dj871-sheet-expanded/,{timeout:15000});
  await expect(panel).not.toHaveClass(/dj889-sheet-transitioning/,{timeout:10000});
  await expect(panel).toBeVisible();
  await expect(page.locator('#app>.topbar')).toBeVisible();
  await expect.poll(async()=> (await panel.boundingBox())?.height ?? 0,{timeout:8000}).toBeLessThan(expanded.height-70);

  // A second downward gesture from compact closes the sheet. Record both
  // transition events and real animation frames after pointer release. The
  // browser may coalesce transition events on slow CI, but the rendered motion
  // itself must still follow the finger and continue downward while fading.
  const compactBeforeClose=await panel.boundingBox();
  expect(compactBeforeClose).not.toBeNull();
  await panel.evaluate(el=>{
    const state={events:[],frames:[],releaseAt:null};
    window.__dj889SheetExitMotion=state;
    el.addEventListener('pointerup',()=>{state.releaseAt=performance.now();},{capture:true,once:true});
    for(const type of ['transitionrun','transitionstart','transitionend','transitioncancel']){
      el.addEventListener(type,event=>{
        if(event.target!==el)return;
        const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
        state.events.push({type,propertyName:event.propertyName,y:rect.y,opacity:style.opacity,translate:style.translate,transition:style.transition});
      });
    }
    const sample=()=>{
      if(state.releaseAt!==null){
        const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
        state.frames.push({t:performance.now()-state.releaseAt,y:rect.y,opacity:style.opacity,translate:style.translate,transition:style.transition,hidden:el.hidden});
      }
      if(el.isConnected&&state.frames.length<36)requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await dragHeader(page,panel,155);
  await expect(panel).toBeHidden({timeout:5000});
  const exitMotion=await page.evaluate(()=>window.__dj889SheetExitMotion);
  console.log('V889_EXIT_MOTION_DIAGNOSTIC '+JSON.stringify(exitMotion));
  // Software WebGL in CI can yield only 2 painted frames across a 240ms CSS
  // transition. Validate the actual movement and opacity change rather than
  // requiring an arbitrary number of requestAnimationFrame callbacks.
  const renderedFrames=exitMotion.frames.filter(frame=>!frame.hidden);
  expect(renderedFrames.length).toBeGreaterThanOrEqual(2);
  expect(renderedFrames[0].y).toBeGreaterThan(compactBeforeClose.y+70);
  expect(Math.max(...renderedFrames.map(frame=>frame.y))).toBeGreaterThan(renderedFrames[0].y+50);
  expect(Math.min(...renderedFrames.map(frame=>Number(frame.opacity)))).toBeLessThan(Number(renderedFrames[0].opacity)-.15);
});

test('transport top grip uses the same staged collapse instead of closing immediately',async({page})=>{
  test.setTimeout(300000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{
    detail:{place:{kind:'subway',name:'이수',lng:126.981605,lat:37.485196,
      lines:['4호선','7호선'],selectedLine:'7호선'}}
  })));
  const sheet=page.locator('#transport-sheet');
  await expect(sheet).toBeVisible();
  const grip=sheet.locator(':scope > .handle');
  await expect(grip).toBeVisible();

  await dragSurface(page,grip,-140);
  await expect(sheet).toHaveClass(/dj871-sheet-expanded/);
  await expect.poll(async()=> (await sheet.boundingBox())?.y ?? 999,{timeout:8000}).toBeLessThan(32);

  await dragSurface(page,grip,140);
  await expect(sheet).not.toHaveClass(/dj871-sheet-expanded/,{timeout:15000});
  await expect(sheet).not.toHaveClass(/dj889-sheet-transitioning/,{timeout:10000});
  await expect(sheet).toBeVisible();

  await dragSurface(page,grip,155);
  await expect(sheet).toBeHidden({timeout:15000});
});

test('short mobile drag settles back without leaving transform or opacity residue',async({page})=>{
  test.setTimeout(240000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  await navTab(page,'route').click({noWaitAfter:true});
  const panel=page.locator('#route-panel');
  await expect(panel).toBeVisible();
  const before=await panel.boundingBox();
  expect(before).not.toBeNull();

  await dragHeader(page,panel,28);
  await expect.poll(async()=>{
    const after=await panel.boundingBox();
    return after?Math.abs(after.y-before.y):999;
  },{timeout:12000}).toBeLessThan(2);
  await expect(panel).not.toHaveClass(/dj889-sheet-transitioning/,{timeout:10000});
  const state=await panel.evaluate(el=>({
    dragging:el.classList.contains('dj-sheet-dragging'),
    transitioning:el.classList.contains('dj889-sheet-transitioning'),
    translate:el.style.getPropertyValue('translate'),
    clipPath:el.style.getPropertyValue('clip-path'),
    opacity:el.style.getPropertyValue('opacity')
  }));
  expect(state.dragging).toBe(false);
  expect(state.transitioning).toBe(false);
  expect(state.translate).toBe('');
  expect(state.clipPath).toBe('');
  expect(state.opacity).toBe('');
});

test('mobile sheet header and close icon stay centered and inside 375/390/430 viewports',async({page})=>{
  test.setTimeout(240000);
  await page.setViewportSize({width:390,height:844});
  await openMapPage(page);
  await navTab(page,'route').click({noWaitAfter:true});
  const panel=page.locator('#route-panel');
  await expect(panel).toBeVisible();

  for(const width of [375,390,430]){
    await page.setViewportSize({width,height:844});
    const geometry=await panel.evaluate(el=>{
      const rect=n=>{const r=n?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,cx:(r.left+r.right)/2,cy:(r.top+r.bottom)/2}:null};
      const header=el.querySelector('.dj-sheet-chrome');
      const title=el.querySelector('.dj-sheet-chrome-title');
      const close=el.querySelector('.dj-sheet-chrome-close');
      const icon=close?.querySelector('svg');
      const grip=el.querySelector('.dj-sheet-chrome-grip');
      const body=el.querySelector('.dj836-sheet-body');
      return {
        panel:rect(el),header:rect(header),title:rect(title),close:rect(close),
        icon:rect(icon),grip:rect(grip),
        body:body?{clientWidth:body.clientWidth,scrollWidth:body.scrollWidth}:null,
        alignItems:header?getComputedStyle(header).alignItems:null
      };
    });
    expect(geometry.panel.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.panel.right).toBeLessThanOrEqual(width+1);
    expect(geometry.alignItems).toBe('center');
    expect(Math.abs(geometry.title.cy-geometry.close.cy)).toBeLessThan(5);
    if(geometry.grip)expect(Math.abs(geometry.grip.cx-geometry.panel.cx)).toBeLessThan(3);
    if(geometry.icon)expect(Math.abs(geometry.icon.cx-geometry.close.cx)).toBeLessThan(3);
    if(geometry.body)expect(geometry.body.scrollWidth).toBeLessThanOrEqual(geometry.body.clientWidth+2);
  }
});
