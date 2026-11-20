import {test,expect} from '@playwright/test';
const compact=page=>page.viewportSize().width<1080||page.viewportSize().width===1180;
const tab=(page,key)=>page.locator('#bottom-nav .nav-tab[data-tab="'+key+'"]');
async function tap(page,locator){
 await expect(locator).toBeVisible();
 try{
   await expect.poll(()=>locator.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===n||n.contains(hit)})).toBe(true);
 }catch(error){
   const hit=await locator.evaluate(n=>{const r=n.getBoundingClientRect();return {target:{id:n.id,className:n.getAttribute('class'),rect:[r.x,r.y,r.width,r.height]},layers:document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2).slice(0,8).map(e=>({tag:e.tagName,id:e.id,className:e.getAttribute('class'),pointerEvents:getComputedStyle(e).pointerEvents}))};});
   console.log('UI_HIT_DIAGNOSTIC',JSON.stringify(hit));throw error;
 }
 const r=await locator.boundingBox();await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
}
async function ready(page,{keepTour=false}={}){
 await page.goto('/',{waitUntil:'domcontentloaded'});
 if(page.viewportSize().width<700){
   const menu=page.locator('#dj-install-menu');
   if(!await page.evaluate(()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches))await expect(menu).toBeAttached({timeout:20000});
   if(await menu.isVisible()){
     await expect(menu.locator('.dj-install-choice')).toHaveCount(4);
     await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
     await expect(menu).toBeHidden();
   }
 }
 await expect(page.locator('#map')).toBeVisible({timeout:45000});
 const startup=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
 await expect.poll(async()=>!await startup.isVisible()||await next.isVisible(),{timeout:60000}).toBe(true);
 if(await startup.isVisible()&&await next.isVisible())await tap(page,next);
 await expect(startup).toBeHidden({timeout:30000});
 await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state',/^(signed-out|signed-in)$/,{timeout:30000});
 // Fresh anonymous context, never enter credentials.
 const tour=page.locator('#dj860-onboarding');
 await expect(page.locator('#app')).toHaveAttribute('data-dj860-auto-resolved','true',{timeout:45000});
 await expect(tour).toBeVisible({timeout:30000});
 await visuallyPresented(tour);
 if(keepTour)return;
 await tour.locator('[data-dj860-action="skip"]').click();
 await expect(tour).toBeHidden();
}
async function geometry(page,sel){
 await expect.poll(async()=>{const p=await page.locator(sel).boundingBox(),n=await page.locator('#bottom-nav').boundingBox();return p&&n?n.y-p.y-p.height:-1000}).toBeGreaterThanOrEqual(5);
}
async function visuallyPresented(locator){
 await expect.poll(()=>locator.evaluate(n=>{
   const r=n.getBoundingClientRect();
   if(r.width<1||r.height<1||r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight)return false;
   for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility!=='visible'||Number(s.opacity)<.98)return false;}
   const x=r.left+r.width/2,y=r.top+r.height/2;
   const hit=document.elementFromPoint(x,y);
   return hit===n||n.contains(hit);
 })).toBe(true);
}
async function enter(page,id,key){
 await page.evaluate(id=>{
   const frames=[];window.__auditFrames=frames;const until=performance.now()+60000;
   function sample(){const n=document.getElementById(id);if(n?.dataset.dj810Animating==='opening'){const c=getComputedStyle(n);frames.push({o:Number(c.opacity),t:c.translate,p:c.clipPath});}if(performance.now()<until&&window.__auditFrames===frames)requestAnimationFrame(sample);}
   requestAnimationFrame(sample);
 },id);
 await tap(page,tab(page,key));await expect(page.locator('#'+id)).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__auditFrames.length)).toBeGreaterThan(1);
 await expect.poll(()=>page.locator('#'+id).getAttribute('data-dj810-animating')).toBeNull();
 await expect(page.locator('#'+id)).toHaveCSS('opacity','1');
 const frames=await page.evaluate(()=>window.__auditFrames);
 expect(frames.every(f=>f.o===1)).toBe(true);
 expect(frames.some(f=>f.t!=='none'&&f.t.split(' ').some(v=>parseFloat(v)>2))).toBe(true);
 await geometry(page,'#'+id);
}
test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus)return;
 for(const e of info.errors)console.log('PHONE_TEST_FAILURE',info.project.name,info.title,String(e.message||'').slice(0,5000));
 try{
   const debug=await page.evaluate(()=>{
     const app=document.getElementById('app');
     const ids=['djNext-toolbar','djNext-layer-panel','djNext-layers','dj854-weather-sheet','bottom-nav','dj840-map-tip','dj-user-tip-close','dj-browser-webapp-tip','transport-sheet','route-panel','mine-panel','map-startup-overlay','overview-sheet','dj-mobile-utilities','dj-v794-more','dj-v794-safety','dj831-scrollport','map-safety-controls','night-visibility-toggle','dj833-night-modal'];
     const describe=n=>{if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {id:n.id,className:n.getAttribute('class'),hidden:n.hidden,ariaHidden:n.getAttribute('aria-hidden'),rect:[r.x,r.y,r.width,r.height],display:s.display,visibility:s.visibility,opacity:s.opacity,pointerEvents:s.pointerEvents};};
     return {viewport:[innerWidth,innerHeight],nightReady:app?.dataset.djNightReady,nightState:app?.dataset.sangdoNight,tourResolved:app?.dataset.dj860AutoResolved,routeBlocks:['route-picking','route-preview','route-guiding'].filter(c=>app?.classList.contains(c)),routeDialogs:['route-pick-hint','route-transit-confirm','route-place-search','route-search-confirm'].filter(id=>{const n=document.getElementById(id);return n&&!n.hidden&&n.getClientRects().length;}),tab:app?.dataset.tab,sheetOpen:app?.dataset.dj910SheetOpen,tipDismissed:app?.dataset.djUserTipDismissed,webappTipVisible:app?.dataset.djWebappTipVisible,runMode:document.documentElement.dataset.djRunMode,controls:ids.map(id=>describe(document.getElementById(id))),scale:describe(document.querySelector('#map .maplibregl-ctrl-scale')),scaleParent:describe(document.querySelector('#map .maplibregl-ctrl-bottom-left'))};
   });
   await info.attach('anonymous-layout-diagnostic.json',{body:Buffer.from(JSON.stringify(debug,null,2)),contentType:'application/json'});
   console.log('UI_LAYOUT_DIAGNOSTIC',JSON.stringify(debug));
 }catch{console.log('Anonymous layout diagnostic unavailable.');}
});
test('compact HUD and visible motion; desktop navigation and dark theme',{tag:'@phone-layout'},async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 if(compact(page)){
   const header=page.locator('.topbar'),brandLogo=header.locator('.map-quick-search-form #dj-settings-mobile img');
   await expect(header.locator(':scope > #dj-settings-mobile')).toBeHidden();
   await expect(brandLogo).toHaveCount(1);await expect(brandLogo).toBeVisible();
   await expect(header.locator('.map-quick-search-form .brand')).toBeHidden();
   await expect(header.locator('.map-quick-search-form #dj-about-pc')).toBeHidden();
   const nav=page.locator('#bottom-nav'),tip=page.locator('#dj840-map-tip'),scale=page.locator('#map .maplibregl-ctrl-scale');
   await expect(nav).toBeVisible();
   await expect(page.locator('#dj-install-menu')).toBeHidden();
   await expect(tip).toBeVisible();await expect(scale).toBeVisible();
   await expect(scale).toHaveCSS('border-top-left-radius','999px');
   const query=page.locator('#map-quick-search-query'),first=await query.getAttribute('placeholder');
   await expect.poll(()=>query.getAttribute('placeholder'),{timeout:22000}).not.toBe(first);
   await expect.poll(async()=>{const n=await nav.boundingBox(),t=await tip.boundingBox(),s=await scale.boundingBox();return n&&t&&s&&n.y-t.y-t.height>=3&&n.y-t.y-t.height<=10&&t.y-s.y-s.height>=3&&t.y-s.y-s.height<=10;}).toBe(true);
   const contained=await nav.evaluate(n=>{const r=n.getBoundingClientRect();return [...n.querySelectorAll('.nav-tab')].every(b=>{const q=b.getBoundingClientRect();return q.top>=r.top-1&&q.bottom<=r.bottom+1})});expect(contained).toBe(true);
   await enter(page,'route-panel','route');await expect(tip).toBeHidden();
   await tap(page,tab(page,'map'));await expect(page.locator('#route-panel')).toBeHidden();
   await enter(page,'mine-panel','mine');
 }else{await tap(page,tab(page,'mine'));await expect(page.locator('#mine-panel')).toBeVisible();}
 await tap(page,page.locator('#mine-panel [data-dj834-action=theme]'));
 await tap(page,page.locator('#dj840-theme-confirm [data-decision=confirm]'));
 await expect(page.locator('#app')).toHaveAttribute('data-theme','dark');
 await expect(page.locator('#mine-panel')).toHaveCSS('background-color','rgb(25, 27, 31)');
});
test('phone More functions live in collapsible My Info groups',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 await expect(page.locator('#dj-v794-more')).toBeHidden();
 await tap(page,tab(page,'mine'));
 const section=page.locator('#mine-panel .dj17-more-root');
 await expect(section).toBeVisible();
 await section.locator(':scope > summary').click();
 await expect(section).toHaveAttribute('open','');
 const group=section.locator('.dj17-feature-details').first();
 await expect(group).toBeVisible();await group.locator('summary').click();
 await expect(group.locator('.dj832-more-feature').first()).toBeVisible();
 const tour=section.locator('.dj860-more-launch'),settings=section.locator('#dj-mobile-settings');
 await expect(tour).toBeVisible();const boxes=await Promise.all([tour.boundingBox(),settings.boundingBox()]);expect(boxes[0].y>=boxes[1].y+boxes[1].height+3).toBe(true);
 await settings.click();
 await expect(page.locator('#dj-map-settings')).toBeVisible();
});

test('transport cards, transfer tabs, right aligned arrivals and facility grip',{tag:'@phone-layout'},async({page})=>{
 await ready(page);
 // Supply only anonymous synthetic arrival examples; no logged-in account or private records.
 await page.route('**/api/transport/bus?**',r=>r.fulfill({json:{status:'ok',items:[{route:'152',routeType:'3',destination:'삼막사거리',message:'5분후 [4정거장 전]'},{route:'6515',routeType:'4',destination:'경인교육대학교',message:'1분후 [1정거장 전]'}]}}));
 // Use exposed UI events that open public map selections; no app source is imported.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place:{kind:'subway',name:'노량진',lng:126.9411,lat:37.5142,lines:['1호선','9호선'],selectedLine:'1호선'}}})));
 const sheet=page.locator('#transport-sheet');await expect(sheet).toBeVisible();
 const first=page.locator('#transport-title [data-dj-line="1호선"]'),nine=page.locator('#transport-title [data-dj-line="9호선"]');
 await tap(page,nine);await expect(nine).toHaveAttribute('aria-pressed','true');await tap(page,first);await expect(first).toHaveAttribute('aria-pressed','true');
 if(compact(page)){await geometry(page,'#transport-sheet');await expect(page.locator('#transport-kind')).toBeHidden();const grip=sheet.locator(':scope > .handle');await expect(grip).toBeVisible();const gripGeometry=()=>sheet.evaluate(n=>{const h=n.querySelector(':scope > .handle'),r=n.getBoundingClientRect(),g=h.getBoundingClientRect(),p=getComputedStyle(h,'::after'),style=getComputedStyle(h);return {centerError:Math.abs(g.left+g.width/2-r.left-r.width/2),grip:[g.x,g.y,g.width,g.height],sheet:[r.x,r.y,r.width,r.height],display:style.display,visibility:style.visibility,markerDisplay:p.display,markerLeft:p.left};});try{await expect.poll(async()=>{const d=await gripGeometry();return d.centerError<2&&d.markerDisplay!=='none'&&d.markerLeft!=='auto'&&d.grip[2]>0;}).toBe(true);}catch(error){console.log('TRANSIT_GRIP_DIAGNOSTIC',JSON.stringify(await gripGeometry()));throw error;}}
 if(!compact(page)){await expect(sheet.locator(':scope > .handle')).toBeHidden();const header=sheet.locator('.transport-panel-head'),close=page.locator('#transport-close');const a=await header.boundingBox(),z=await close.boundingBox();expect(a.x+a.width-z.x-z.width).toBeLessThanOrEqual(28);}
 await tap(page,page.locator('#transport-close'));await expect(sheet).toBeHidden();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place:{kind:'bus',name:'노량진역5번출구',lng:126.9423,lat:37.5133,arsId:'20240'}}})));
 await expect(sheet).toBeVisible();const cards=page.locator('#transport-arrivals .transport-arrival-row');await expect(cards).toHaveCount(2);
 if(compact(page)){await geometry(page,'#transport-sheet');await expect(page.locator('#transport-kind')).toBeHidden();const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox();expect(Math.abs(a.y-b.y)).toBeLessThan(3);expect(b.x).toBeGreaterThanOrEqual(a.x+a.width);expect(await cards.first().evaluate(n=>{const l=n.querySelector('.transport-arrival-main').getBoundingClientRect(),r=n.querySelector('.transport-arrival-time').getBoundingClientRect();return r.left>=l.right-1&&r.bottom<=n.getBoundingClientRect().bottom})).toBe(true);}
 await tap(page,page.locator('#transport-close'));await expect(sheet).toBeHidden();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:map-place-selected',{detail:{place:{name:'동작도서관',category:'공공기관',address:'서울특별시 동작구 장승배기로 94',lng:126.9304,lat:37.5059}}})));
 const popup=page.locator('.dj-place-detail-popup');await expect(popup).toBeVisible();
 if(compact(page)){await geometry(page,'.dj-place-detail-popup');expect(await popup.evaluate(n=>{const a=n.getBoundingClientRect(),b=n.querySelector('.dj-place-edge-drag').getBoundingClientRect();return Math.abs(a.left+a.width/2-b.left-b.width/2)<3})).toBe(true);}
 await tap(page,popup.locator('.dj-place-header-close'));await expect(popup).toBeHidden();
});

test('tablet More panel is fully visible and contained',{tag:'@non-phone'},async({page})=>{
  const width=page.viewportSize().width;
  test.skip(width<700||!compact(page),'tablet only');
  await ready(page);
  const toolbar=page.locator('#dj-v794-toolbar'),scroll=toolbar.locator('.dj831-scrollport');
  await expect(toolbar).toBeVisible();
  expect(await scroll.evaluate(n=>{
    const r=n.getBoundingClientRect();
    return [...n.querySelectorAll(':scope > button')].filter(b=>b.getClientRects().length).every(b=>{
      const q=b.getBoundingClientRect();return q.top>=r.top-1&&q.bottom<=r.bottom+1;
    });
  })).toBe(true);
  await tap(page,page.locator('#dj-v794-more'));
  const more=page.locator('#dj-mobile-utilities');
  await expect(more).toBeVisible();
  await visuallyPresented(more);
  await expect(more.locator('> .dj854-more-head')).toBeVisible();
  await expect(more.locator('> .dj-mobile-utilities-body')).toBeVisible();
  await expect(more.locator('#dj832-more-features')).toBeVisible();
  await expect(more.locator('.dj832-more-title')).toHaveText('지도 기능 · 개인 설정');
  const r=await more.boundingBox();
  expect(r.x).toBeGreaterThanOrEqual(18);
  expect(width-r.x-r.width).toBeGreaterThanOrEqual(18);
  await geometry(page,'#dj-mobile-utilities');
  const icon=more.locator('.dj832-more-icon svg').first();
  await expect(icon).toBeVisible();
  const i=await icon.boundingBox();expect(i.width).toBeLessThanOrEqual(24);expect(i.height).toBeLessThanOrEqual(24);
  await test.info().attach('tablet-more',{body:await page.screenshot(),contentType:'image/png'});
});

test('tablet safety modal remains visible and contained',{tag:'@non-phone'},async({page})=>{
  const width=page.viewportSize().width;
  test.skip(width<700||!compact(page),'tablet only');
  await ready(page);
  await tap(page,page.locator('#dj-v794-safety'));
  const shade=page.locator('#map-safety-backdrop'),panel=page.locator('#map-safety-controls');
  await expect(shade).toBeVisible();await expect(panel).toBeVisible();
  await visuallyPresented(panel);
  const d=await shade.boundingBox();expect(d.x).toBeGreaterThanOrEqual(-1);expect(d.y).toBeGreaterThanOrEqual(-1);
  expect(d.width).toBeGreaterThanOrEqual(width-1);expect(d.height).toBeGreaterThanOrEqual(page.viewportSize().height-1);
  await test.info().attach('tablet-safety',{body:await page.screenshot(),contentType:'image/png'});
  await tap(page,page.locator('#map-safety-close'));
  await expect(shade).toBeHidden();
});

test('all five onboarding illustrations remain uncropped on tablet and desktop',{tag:'@non-phone'},async({page})=>{
  test.skip(page.viewportSize().width<700,'tablet and desktop only');
  await ready(page,{keepTour:true});
  const tour=page.locator('#dj860-onboarding'),image=tour.locator('.dj860-screen-image');
  await visuallyPresented(tour);
  for(let slide=1;slide<=5;slide++){
    await expect(tour.locator('#dj860-count')).toHaveText(new RegExp('0'+slide+'\\s*/\\s*05'));
    await expect(image).toBeVisible();
    await expect.poll(()=>image.evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);
    await visuallyPresented(image);
    await expect(image).toHaveCSS('object-fit','contain');
    await test.info().attach('onboarding-'+slide,{body:await page.screenshot(),contentType:'image/png'});
    if(slide<5)await tap(page,tour.locator('[data-dj860-action="next"]'));
  }
  await tap(page,tour.locator('[data-dj860-action="skip"]'));
  await expect(tour).toBeHidden();
});

async function pinPhoneShortcut(page,label,key){
 const settings=page.locator('#djNext-layer-panel');
 await tap(page,page.locator('#djNext-layers'));await expect(settings).toBeVisible();
 const add=settings.getByRole('switch',{name:label+' 바로가기',exact:true});await add.scrollIntoViewIfNeeded();await add.click();await expect(add).toHaveAttribute('aria-checked','true');
 await settings.getByRole('button',{name:'레이어 설정 닫기'}).click();await expect(settings).toBeHidden();
 const shortcut=page.locator('#djNext-rail [data-shortcut="'+key+'"]');await expect(shortcut).toBeVisible();return shortcut;
}
test('phone toolbar has compact adaptive slots, three saved shortcuts maximum and no overlapping legacy controls',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 const rail=page.locator('#djNext-rail'),nav=page.locator('#bottom-nav'),panel=page.locator('#djNext-layer-panel');
 await expect(rail).toBeVisible();await expect(rail.locator(':scope>button')).toHaveCount(5);
 await expect(rail.locator('.djNext-empty')).toHaveCount(1);
 const assertLayerRight=async()=>{await expect.poll(()=>rail.evaluate(n=>{const r=n.getBoundingClientRect(),b=n.querySelector('#djNext-layers').getBoundingClientRect();return Math.abs(r.right-b.right)})).toBeLessThanOrEqual(2);};
 await assertLayerRight();
 for(const id of ['dj-v794-more','dj-v794-night','dj831-scrollport','dj-v794-safety'])await expect(page.locator('#'+id)).toBeHidden();
 await expect(page.locator('#dj-v794-toolbar [data-poi-group]:visible')).toHaveCount(0);
 await expect(page.locator('#djNext-mic')).toBeVisible();
 await tap(page,rail.locator('.djNext-empty').first());
 await expect(panel).toBeVisible();
 await expect(panel.locator('.djNext-layer-grid')).toHaveCount(2);
 await expect(panel.locator('.djNext-layer-grid').first()).toHaveCSS('grid-template-columns',/^[0-9.]+px [0-9.]+px [0-9.]+px [0-9.]+px$/);
 await expect(panel.locator('.djNext-pin')).toHaveCount(0);await expect(panel.getByText('기능 열기',{exact:true})).toHaveCount(0);
 const slopeAction=panel.getByRole('button',{name:'경사도 지도 기능',exact:true});const slopeState=await slopeAction.getAttribute('aria-pressed');
 for(const label of ['보행안전','경사도','야간시야']){
   const b=panel.getByRole('switch',{name:label+' 바로가기',exact:true});await expect(b).toHaveAttribute('aria-checked','false');await b.scrollIntoViewIfNeeded();await b.click();await expect(b).toHaveAttribute('aria-checked','true');
 }
 expect(await slopeAction.getAttribute('aria-pressed')).toBe(slopeState);await expect(panel).toBeVisible();
 await expect(panel.locator('.djNext-count')).toHaveText('등록 3/3');
 await expect(panel.getByRole('switch',{name:'보차혼용 바로가기',exact:true})).toBeDisabled();
 await expect(rail.locator('[data-shortcut]')).toHaveCount(3);
 await expect(rail.locator('.djNext-empty')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dongjak-phone-shortcuts-v2')))).toEqual(['pilot','slope','night']);
 const remove=panel.getByRole('switch',{name:'경사도 바로가기',exact:true});await remove.scrollIntoViewIfNeeded();await remove.click();await expect(remove).toHaveAttribute('aria-checked','false');
 await expect(panel.locator('.djNext-count')).toHaveText('등록 2/3');
 await expect(panel.getByRole('switch',{name:'보차혼용 바로가기',exact:true})).toBeEnabled();
 await panel.getByRole('button',{name:'레이어 설정 닫기'}).click();await expect(panel).toBeHidden();
 await expect(rail.locator('.djNext-empty')).toHaveCount(1);
 await assertLayerRight();
 const fit=await rail.evaluate(n=>{const r=n.getBoundingClientRect();const bs=[...n.children].map(x=>x.getBoundingClientRect());return bs.every((x,i)=>x.left>=r.left-1&&x.right<=r.right+1&&x.width>36&&Math.abs(x.top-bs[0].top)<1&&(i===0||x.left>=bs[i-1].right-1))});expect(fit).toBe(true);
 await page.evaluate(()=>{window.__railSamples=[];let n=0;const sample=()=>{const rail=document.getElementById('djNext-rail'),p=rail?.parentElement,c=p?getComputedStyle(p):null;window.__railSamples.push(!!rail&&!!c&&c.visibility==='visible'&&c.display!=='none'&&Number(c.opacity)>.98);if(n++<60)requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 await tap(page,tab(page,'map'));
 await expect.poll(()=>page.evaluate(()=>window.__railSamples.length)).toBeGreaterThan(20);
 expect(await page.evaluate(()=>window.__railSamples.every(Boolean))).toBe(true);
 await expect(page.locator('#djNext-toolbar')).toBeVisible();
 await expect.poll(()=>nav.evaluate(n=>Math.round(innerHeight-n.getBoundingClientRect().bottom))).toBeLessThanOrEqual(4);
 await test.info().attach('phone-seven-slot-toolbar',{body:await page.screenshot(),contentType:'image/png'});
});
test('phone pilot safety symbols are native and disappear when the mode closes',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 const shortcut=await pinPhoneShortcut(page,'보행안전','pilot');
 await tap(page,shortcut);
 const app=page.locator('#app'),panel=page.locator('#map-safety-controls');
 await expect(panel).toBeVisible();
 await expect(panel.locator('.dj17-pilot-notice')).toContainText('상도1동');
 await expect(panel.locator('.djNext-safety-scroll')).toBeVisible();
 expect(await panel.evaluate(n=>{const h=n.querySelector('.map-safety-head').getBoundingClientRect(),b=n.querySelector('.djNext-safety-scroll').getBoundingClientRect();return b.top>=h.bottom-1})).toBe(true);
 await expect(app).toHaveAttribute('data-dj-pilot-active','true',{timeout:45000});
 await expect.poll(async()=>Number(await app.getAttribute('data-dj-pilot-lock-count'))).toBeGreaterThan(0);
 await expect(page.locator('.dj17-lock')).toHaveCount(0);
 const grip=panel.locator('.dj17-expand');await expect(grip).toBeVisible();await tap(page,grip);
 await expect(panel).toHaveClass(/dj871-sheet-expanded/);
 await expect(panel).not.toHaveClass(/dj889-sheet-transitioning/);
 await tap(page,grip);await expect(panel).not.toHaveClass(/dj871-sheet-expanded/);
 await panel.locator('#map-safety-close').click();await expect(panel).toBeHidden();
 await expect(app).toHaveAttribute('data-dj-pilot-active','false');await expect(app).toHaveAttribute('data-dj-pilot-lock-count','0');
 await tap(page,shortcut);await expect(app).toHaveAttribute('data-dj-pilot-active','true',{timeout:45000});
 await panel.locator('#map-safety-close').click();await expect(app).toHaveAttribute('data-dj-pilot-lock-count','0');
 await test.info().attach('pilot-off',{body:await page.screenshot(),contentType:'image/png'});
});
test('phone onboarding copy is top aligned and artwork is not cropped',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page,{keepTour:true});
 const overlay=page.locator('#dj860-onboarding'),content=overlay.locator('.dj860-content'),copy=content.locator('.dj860-copy'),image=overlay.locator('.dj860-screen-image');
 await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);
 await visuallyPresented(image);
 await expect.poll(async()=>{
   const p=await content.boundingBox(),c=await copy.boundingBox();
   return p&&c?c.y-p.y:1000;
 }).toBeLessThanOrEqual(24);
 await test.info().attach('phone-onboarding-top-aligned',{body:await page.screenshot(),contentType:'image/png'});
 await tap(page,overlay.locator('[data-dj860-action="skip"]'));await expect(overlay).toBeHidden();
});
test('phone sheets keep headers inside and scrollable content above fixed actions',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 await tap(page,tab(page,'route'));
 const panel=page.locator('#route-panel'),body=panel.locator(':scope > .dj836-sheet-body'),footer=panel.locator(':scope > #dj910-route-footer');
 await visuallyPresented(panel);await expect(footer.locator('#route-calc')).toBeVisible();
 await expect.poll(async()=>{const b=await body.boundingBox(),f=await footer.boundingBox();return b&&f?f.y-(b.y+b.height):-1000;}).toBeGreaterThanOrEqual(-1);
 // The legacy page-note is intentionally hidden on phones. Verify the actual
 // transit planner controls that were reported clipped, not the hidden note.
 const planner=body.locator('#dj815-rail-planner');
 await expect(planner).toBeVisible();
 const railAction=planner.getByRole('button',{name:'지하철 연계 이동안 찾기'});
 await railAction.scrollIntoViewIfNeeded({timeout:20000});
 await expect.poll(async()=>{const a=await body.boundingBox(),b=await railAction.boundingBox();return a&&b?Math.min(b.y-a.y,a.y+a.height-b.y-b.height):-1000;}).toBeGreaterThanOrEqual(-2);
 const last=body.locator('.dj815-route-share button:visible,#route-clear:visible').last();
 if(await last.count()){await last.scrollIntoViewIfNeeded({timeout:20000});
 await expect.poll(async()=>{const a=await body.boundingBox(),b=await last.boundingBox();return a&&b?Math.min(b.y-a.y,a.y+a.height-b.y-b.height):-1000;}).toBeGreaterThanOrEqual(-2);}
 await test.info().attach('phone-route-footer',{body:await page.screenshot(),contentType:'image/png'});
 await tap(page,panel.locator('.dj-sheet-chrome-close'));await expect(panel).toBeHidden();
 await tap(page,tab(page,'mine'));
 const mine=page.locator('#mine-panel');await visuallyPresented(mine);
 await expect(mine.locator('.dj17-more-root')).toBeVisible();await expect(mine.locator('.dj834-settings-group > .dj17-more-root')).toHaveCount(1);
 const metrics=await mine.evaluate(n=>{const a=n.querySelector('[data-dj834-action="records"]'),b=n.querySelector('.dj17-more-root>summary'),c=a.querySelector('.dj834-setting-icon');const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),rc=c.getBoundingClientRect(),sb=getComputedStyle(b),sa=getComputedStyle(a);return {height:Math.abs(ra.height-rb.height),inset:Math.abs(parseFloat(sa.paddingLeft)-parseFloat(sb.paddingLeft)),icon:Math.abs(rc.width-parseFloat(getComputedStyle(b,'::before').width))};});
 expect(metrics.height).toBeLessThanOrEqual(2);expect(metrics.inset).toBeLessThanOrEqual(1);expect(metrics.icon).toBeLessThanOrEqual(1);
 const mineHeader=mine.locator(':scope > .dj-sheet-chrome');await expect(mineHeader).toHaveCSS('touch-action','none');
 const dragMine=async(dy)=>{await expect.poll(()=>mineHeader.evaluate(n=>{const panel=n.closest('#mine-panel'),r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width*.28,r.top+r.height*.66);return !panel?.dataset.dj810Animating&&!panel?.classList.contains('dj889-sheet-transitioning')&&!!hit&&n.contains(hit)&&!hit.closest('button,a,input,select,textarea,label,summary,[role="button"]')})).toBe(true);const h=await mineHeader.boundingBox();const x=h.x+h.width*.28,y=h.y+h.height*.66;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+dy,{steps:10});await page.mouse.up();};
 await dragMine(-100);await expect(mine).toHaveClass(/dj871-sheet-expanded/);await expect(mine).not.toHaveClass(/dj889-sheet-transitioning/);
 await dragMine(105);await expect(mine).not.toHaveClass(/dj871-sheet-expanded/);await expect(mine).not.toHaveClass(/dj889-sheet-transitioning/);
 await tap(page,mine.locator('.dj-sheet-chrome-close'));await expect(mine).toBeHidden();
 await tap(page,tab(page,'participate'));
 const community=page.locator('#participation-panel'),cb=community.locator(':scope > .dj836-sheet-body'),summary=cb.locator('.community-report-secondary > summary');
 await visuallyPresented(community);await summary.scrollIntoViewIfNeeded();
 await expect.poll(async()=>{const a=await cb.boundingBox(),b=await summary.boundingBox();return a&&b?a.y+a.height-b.y-b.height:-1000;}).toBeGreaterThanOrEqual(-2);
 await test.info().attach('phone-community-last-content',{body:await page.screenshot(),contentType:'image/png'});
 await tap(page,community.locator('.dj-sheet-chrome-close'));await expect(community).toBeHidden();
});

test('PC desktop chrome and independent facility categories',{tag:'@non-phone'},async({page})=>{
 test.skip(compact(page),'desktop only');await ready(page);
 const app=page.locator('#app'),nav=page.locator('#bottom-nav'),form=page.locator('.topbar .map-quick-search-form'),settings=page.locator('#dj-settings-pc'),actions=page.locator('.map-actions');
 const categories=page.locator('#dj912-poi-categories');
 await expect(categories).toBeVisible({timeout:45000});
 await expect(settings).toBeVisible();
 const idle=await nav.boundingBox();
 const alignment=await page.evaluate(()=>{const rect=s=>document.querySelector(s)?.getBoundingClientRect();const f=rect('.topbar .map-quick-search-form'),n=rect('#bottom-nav'),settings=rect('#dj-settings-pc'),actions=rect('.map-actions');return {search:f?.left,nav:n?.left,settings:settings?.right,actions:actions?.right,width:innerWidth};});
 expect(Math.abs(alignment.search-alignment.nav)).toBeLessThanOrEqual(3);
 expect(Math.abs(alignment.settings-alignment.actions)).toBeLessThanOrEqual(4);
 expect(alignment.search).toBeGreaterThanOrEqual(10);expect(alignment.search).toBeLessThanOrEqual(20);
 const food=categories.locator('[data-poi-group="food"]'),cafe=categories.locator('[data-poi-group="cafe"]'),safety=categories.locator('[data-poi-group="safety"]'),pub=categories.locator('[data-poi-group="public"]');
 await expect(safety).toHaveAttribute('aria-pressed','true');await expect(pub).toHaveAttribute('aria-pressed','true');await expect(food).toHaveAttribute('aria-pressed','false');await expect(cafe).toHaveAttribute('aria-pressed','false');
 await tap(page,food);await expect(food).toHaveAttribute('aria-pressed','true');await expect(cafe).toHaveAttribute('aria-pressed','false');await expect(safety).toHaveAttribute('aria-pressed','true');
 await tap(page,cafe);await expect(cafe).toHaveAttribute('aria-pressed','true');
 await tap(page,categories.locator('[data-poi-group="default"]'));await expect(food).toHaveAttribute('aria-pressed','false');await expect(cafe).toHaveAttribute('aria-pressed','false');
 await tap(page,page.locator('#map-quick-search-query'));
 const results=page.locator('#map-quick-search-dropdown');await expect(results).toBeVisible();
 await visuallyPresented(results);
 await expect.poll(async()=>Math.abs((await nav.boundingBox()).y-idle.y)).toBeLessThanOrEqual(2);
 const r=await results.boundingBox();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(page.viewportSize().width);
 await test.info().attach('pc-search-and-stationary-navigation',{body:await page.screenshot(),contentType:'image/png'});
 await tap(page,page.locator('#map-quick-search-close'));await expect(results).toBeHidden();
 await test.info().attach('pc-safety-first-map',{body:await page.screenshot(),contentType:'image/png'});
});

test('PC visual contract: compact profile and unobscured route footer',{tag:'@non-phone'},async({page})=>{
 test.skip(compact(page),'desktop only');
 await ready(page);
 const app=page.locator('#app'),nav=page.locator('#bottom-nav'),categories=page.locator('#dj912-poi-categories');
 await tap(page,tab(page,'mine'));
 const profile=page.locator('#mine-panel [data-dj834-action="profile"]');
 await tap(page,profile);
 const preview=page.locator('#mine-panel .dj877-photo-preview');
 await expect(preview).toBeVisible();
 await visuallyPresented(page.locator('#mine-panel'));
 await visuallyPresented(preview);
 await expect.poll(()=>preview.evaluate(n=>{const a=n.getBoundingClientRect(),g=n.querySelector('svg,img')?.getBoundingClientRect();return !!g&&a.width<=60&&a.height<=60&&g.width<=60&&g.height<=60;})).toBe(true);
 await test.info().attach('pc-profile-bounded',{body:await page.screenshot(),contentType:'image/png'});
 await tap(page,page.locator('#mine-panel .dj834-detail-back'));await expect(profile).toBeVisible();
 await tap(page,tab(page,'map'));
 await expect(page.locator('#mine-panel')).toBeHidden();
 await tap(page,tab(page,'route'));
 const route=page.locator('#route-panel');
 await expect(route).toBeVisible();
 await visuallyPresented(route);
 await expect(route.locator('.dj-sheet-chrome-grip')).toBeHidden();
 const footer=route.locator('#dj910-route-footer'),body=route.locator('.dj836-sheet-body');
 await expect.poll(async()=>{const a=await body.boundingBox(),b=await footer.boundingBox();return !!a&&!!b&&a.y+a.height<=b.y+2;}).toBe(true);
 await tap(page,tab(page,'map'));
 await expect(route).toBeHidden();
});

test('PC dark transit surfaces and arrival rows remain readable and unclipped',{tag:'@non-phone'},async({page})=>{
 test.skip(compact(page),'desktop only');await ready(page);
 const app=page.locator('#app');
 await tap(page,tab(page,'mine'));
 await tap(page,page.locator('#mine-panel [data-dj834-action=theme]'));
 await tap(page,page.locator('#dj840-theme-confirm [data-decision=confirm]'));
 await expect(app).toHaveAttribute('data-theme','dark');
 await tap(page,tab(page,'map'));
 await page.route('**/api/transport/bus?**',r=>r.fulfill({json:{status:'ok',items:[{route:'152',routeType:'3',destination:'삼막사거리',message:'5분후 [4정거장 전]'},{route:'6515',routeType:'4',destination:'기점',message:'1분후 [1정거장 전]'}]}}));
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place:{kind:'bus',name:'노량진역5번출구',lng:126.9423,lat:37.5133,arsId:'20240'}}})));
 const sheet=page.locator('#transport-sheet'),head=sheet.locator('.transport-panel-head'),bar=sheet.locator('.transport-arrivals-title'),cards=sheet.locator('#transport-arrivals .transport-arrival-row');
 await expect(sheet).toBeVisible();await expect(cards).toHaveCount(2);
 await visuallyPresented(sheet);
 await expect(head).toHaveCSS('background-color','rgb(25, 27, 31)');
 await expect(bar).toHaveCSS('background-color','rgb(25, 27, 31)');
 await expect.poll(async()=>{const h=await head.boundingBox(),a=await head.locator('.dj-news-transport-actions').boundingBox(),c=await sheet.locator('#transport-close').boundingBox(),b=await bar.boundingBox(),r=await cards.first().boundingBox();return !!h&&!!a&&!!c&&!!b&&!!r&&Math.abs((a.y+a.height/2)-(c.y+c.height/2))<=6&&r.y>=b.y+b.height-2;}).toBe(true);
 await test.info().attach('pc-dark-bus-no-overlap',{body:await page.screenshot(),contentType:'image/png'});
 await tap(page,sheet.locator('#transport-close'));await expect(sheet).toBeHidden();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place:{kind:'subway',name:'노량진',lng:126.9411,lat:37.5142,lines:['1호선','9호선'],selectedLine:'1호선'}}})));
 await expect(sheet).toBeVisible();await visuallyPresented(sheet);await expect(head).toHaveCSS('background-color','rgb(25, 27, 31)');await expect(bar).toHaveCSS('background-color','rgb(25, 27, 31)');
 await test.info().attach('pc-dark-metro',{body:await page.screenshot(),contentType:'image/png'});
 await tap(page,sheet.locator('#transport-close'));await expect(sheet).toBeHidden();
});

test('PC night report fits workspace and facility categories restore on exit',{tag:'@non-phone'},async({page})=>{
 test.skip(compact(page),'desktop only');await ready(page);
 const app=page.locator('#app'),nav=page.locator('#bottom-nav'),categories=page.locator('#dj912-poi-categories');
 await expect(categories).toBeVisible();
 const selection=await app.getAttribute('data-dj912-poi-groups');
 const nightAction=nav.locator('#night-visibility-quick-off');
 await expect(app).toHaveAttribute('data-dj-night-ready','true',{timeout:60000});
 await expect(nightAction).toBeEnabled();
 await expect(nightAction.locator('.dj-night-action-text')).toBeVisible({timeout:45000});
 await nightAction.click();
 const consent=page.locator('#dj876-night-confirm');
 await expect(consent.getByRole('dialog')).toBeVisible();
 await expect(app).toHaveAttribute('data-sangdo-night','off');
 await consent.getByRole('button',{name:'전환',exact:true}).click();
 await expect(consent).toBeHidden();
 await expect(app).toHaveAttribute('data-sangdo-night','on',{timeout:45000});
 const night=page.locator('#night-visibility-float');
 await expect(night).toBeVisible();await visuallyPresented(night);await expect(categories).toBeHidden();
 await expect.poll(async()=>{const n=await night.boundingBox(),r=await nav.boundingBox();return !!n&&!!r&&n.y>=r.y-3;}).toBe(true);
 await test.info().attach('pc-night-isolated',{body:await page.screenshot(),contentType:'image/png'});
 await tap(page,night.locator('#night-visibility-float-stop'));
 await expect(app).toHaveAttribute('data-sangdo-night','off',{timeout:30000});
 await expect(categories).toBeVisible();await expect(app).toHaveAttribute('data-dj912-poi-groups',selection);
});

test('phone night shortcut waits for the map, honors consent and exits',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 const app=page.locator('#app'),shortcut=page.locator('#night-visibility-toggle');
 const safety=await pinPhoneShortcut(page,'보행안전','pilot');
 await tap(page,safety);
 await expect(app).toHaveAttribute('data-dj-night-ready','true',{timeout:60000});
 await expect(shortcut).toBeEnabled();
 const menu=page.locator('#map-safety-controls');
 await menu.getByRole('button',{name:'야간시야',exact:true}).click({timeout:15000});
 await expect(shortcut).toBeVisible();await shortcut.scrollIntoViewIfNeeded();await shortcut.click({timeout:15000});
 const consent=page.locator('#dj833-night-modal');
 await expect(consent.getByRole('dialog')).toBeVisible();
 await expect(app).toHaveAttribute('data-sangdo-night','off');
 await consent.getByRole('button',{name:'예, 시작',exact:true}).click({timeout:15000});
 const night=page.locator('#night-visibility-float');
 await expect(app).toHaveAttribute('data-sangdo-night','on',{timeout:45000});
 await expect(night).toBeVisible();
 await visuallyPresented(night);
 await night.locator('#night-visibility-float-stop').click();
 await expect(app).toHaveAttribute('data-sangdo-night','off');
 await expect(night).toBeHidden();
});

test('phone nearby safety opens its own sheet without TIP overlap even when location is denied',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await page.addInitScript(()=>Object.defineProperty(navigator.geolocation,'getCurrentPosition',{configurable:true,value:(ok,fail)=>queueMicrotask(()=>fail({code:1}))}));
 await ready(page);await tap(page,page.locator('#djNext-near'));
 const panel=page.locator('#ped-tools-panel');await expect(panel).toBeVisible();await expect(panel.locator('#ped-tools-heading')).toHaveText('주변 안전정보');
 await expect(panel.locator('#ped-tools-status')).toContainText('위치 접근이 거부');
 await expect(page.locator('#dj840-map-tip')).toBeHidden();
 await geometry(page,'#ped-tools-panel');await panel.locator('#ped-tools-close').click();await expect(panel).toBeHidden();
});
test('phone first-run permission intro handles denial and stops permission-check audio tracks',{tag:'@phone-platform'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await page.addInitScript(()=>{
  Object.defineProperty(navigator.geolocation,'getCurrentPosition',{configurable:true,value:(ok,fail)=>queueMicrotask(()=>fail({code:1}))});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>({getTracks:()=>[{stop:()=>{window.__permissionMicStopped=true}}]})});
 });
 await ready(page,{keepTour:true});const tour=page.locator('#dj860-onboarding');
 const next=tour.locator('[data-dj860-action="next"]');
 for(let i=0;i<4;i++){await next.click();await expect(tour.locator('#dj860-count')).toHaveText(String(i+2).padStart(2,'0')+' / 05')}
 await expect(next).toHaveText('시작하기');await next.click();
 const panel=page.locator('#djNext-permissions');await expect(panel).toBeVisible();await expect(tour).toBeHidden();
 await panel.getByRole('button',{name:'위치 권한 허용'}).click();await expect(panel.locator('[data-status="location"]')).toContainText('거부됨');
 await panel.getByRole('button',{name:'마이크 권한 허용'}).click();await expect(panel.locator('[data-status="microphone"]')).toHaveText('허용됨');
 expect(await page.evaluate(()=>window.__permissionMicStopped)).toBe(true);
 await panel.getByRole('button',{name:'계속하기'}).click();await expect(panel).toBeHidden();
});
test('phone route comparison uses actual pedestrian graph and does not invent a PRI score',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 await page.evaluate(()=>{for(const [which,lng,lat,name] of [['start',126.960,37.510,'검증용 출발지'],['end',126.962,37.512,'검증용 목적지']])window.dispatchEvent(new CustomEvent('dongjak:route-select',{detail:{which,place:{lng,lat,name}}}))});
 await expect(page.locator('#route-start-label')).toHaveText('검증용 출발지',{timeout:30000});
 await expect(page.locator('#route-end-label')).toHaveText('검증용 목적지');
 await page.locator('#route-calc').click();
 const cards=page.locator('#djNext-route-compare'),summary=page.locator('#route-map-card');
 await expect(summary).toBeVisible({timeout:60000});await expect(cards.locator('button')).toHaveCount(4);
 for(const id of ['standard','gentle','balanced'])await expect(cards.locator('[data-comparison="'+id+'"]')).toBeEnabled();
 await cards.locator('[data-comparison="balanced"]').click();
 await expect(cards.locator('[data-comparison="balanced"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#route-map-source')).toContainText('PRI 미반영');
 await cards.locator('[data-comparison="standard"]').click();await expect(cards.locator('[data-comparison="standard"]')).toHaveAttribute('aria-pressed','true');
 await test.info().attach('phone-real-route-comparison',{body:await page.screenshot(),contentType:'image/png'});
});

test('phone weather single window and layer grid dark surfaces, header stays fixed',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 await tap(page,page.locator('#djNext-weather'));
 const weather=page.locator('#dj854-weather-sheet');
 await expect(weather).toBeVisible();await expect(page.locator('#dj833-weather-sheet')).toBeHidden();
 await expect(weather.locator('[data-weather-location]')).toBeVisible();
 await expect(page.locator('#dj840-map-tip')).toBeHidden();
 await expect(weather.locator('.dj-weather-edge-drag')).toBeVisible();
 await weather.getByRole('button',{name:'날씨창 닫기'}).click();await expect(weather).toBeHidden();
 await expect(page.locator('.map-actions > #toggle-road-width')).toBeHidden();
 await tap(page,tab(page,'mine'));
 await tap(page,page.locator('#mine-panel [data-dj834-action=theme]'));
 await tap(page,page.locator('#dj840-theme-confirm [data-decision=confirm]'));
 await expect(page.locator('#app')).toHaveAttribute('data-theme','dark');
 await tap(page,tab(page,'map'));
 await tap(page,page.locator('#djNext-layers'));
 const modal=page.locator('#djNext-layer-panel'),scroll=modal.locator('.djNext-layer-scroll'),header=modal.locator('header');
 await expect(page.locator('#app')).toHaveAttribute('data-dj-next-last-action','djNext-layers');
 await expect(page.locator('#app')).toHaveAttribute('data-dj-next-layer-action','open');
 await expect(modal).toBeVisible();await expect(scroll).toBeVisible();await expect(header).toBeVisible();
 const bounds=async()=>await header.boundingBox();
 await expect.poll(async()=>{const h=await bounds(),b=await scroll.boundingBox();return h&&b?Math.abs(h.y+h.height-b.y)<2:false}).toBe(true);
 const before=await bounds();await scroll.evaluate(n=>n.scrollTop=n.scrollHeight);const after=await bounds();
 expect(Math.abs(before.y-after.y)).toBeLessThan(2);
 const toggle=modal.getByRole('switch').last();await expect(toggle).toHaveAttribute('aria-checked','false');
 await expect(toggle.locator('.djNext-switch-track')).toHaveCSS('background-color','rgb(83, 97, 93)');
 await modal.getByRole('button',{name:'레이어 설정 닫기'}).click();await expect(modal).toBeHidden();
});
test('phone report composer has non-overlapping independent header and input scroll',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);await tap(page,page.locator('#djNext-report'));
 const form=page.locator('#community-form'),scroll=form.locator('.djNext-form-scroll'),head=form.locator('.community-form-top');
 await expect(form).toBeVisible();await expect(scroll).toBeVisible();
 const title=form.locator('#community-title');await title.scrollIntoViewIfNeeded();await title.focus();
 const h=await head.boundingBox(),b=await scroll.boundingBox();expect(b.y>=h.y+h.height-1).toBe(true);
 const before=await head.boundingBox();await scroll.evaluate(n=>n.scrollTop=n.scrollHeight);const after=await head.boundingBox();expect(Math.abs(before.y-after.y)).toBeLessThan(2);
 await form.locator('#community-compose-close').click();await expect(form).toBeHidden();
});


test('phone windows share the opaque gradual slide on open and close',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 async function audit(selector,parentSelector,trigger,close){
   const target=page.locator(selector);const parent=page.locator(parentSelector);
   await page.evaluate(({selector,parentSelector})=>{
    const frames=[];window.__sharedMotion=frames;const until=performance.now()+40000;
    function sample(){if(window.__sharedMotion!==frames||performance.now()>until)return;const n=document.querySelector(selector),p=document.querySelector(parentSelector),phase=n?.dataset.dj810Animating;
      if(phase&&p&&!p.hidden){const c=getComputedStyle(n),back=getComputedStyle(p);
       frames.push({phase,duration:Number(n.dataset.djWindowMotionDuration),opacity:Number(c.opacity),backOpacity:Number(back.opacity),background:back.backgroundColor,cssAnimation:c.animationName,offset:parseFloat((c.translate||'0 0').split(' ')[1])||0});}
      requestAnimationFrame(sample);}
    requestAnimationFrame(sample);
   },{selector,parentSelector});
   await trigger();await expect(parent).toBeVisible();
   await expect.poll(()=>page.evaluate(()=>window.__sharedMotion.filter(f=>f.phase==='opening'&&f.offset>2).length)).toBeGreaterThan(1);
   await expect.poll(()=>target.getAttribute('data-dj810-animating')).toBeNull();
   await close();await expect(parent).toBeHidden();
   const frames=await page.evaluate(()=>window.__sharedMotion);
   for(const [phase,duration] of [['opening',350],['closing',300]]){
     const motion=frames.filter(f=>f.phase===phase);
     expect(motion.length).toBeGreaterThan(1);
     expect(motion.every(f=>f.duration===duration&&f.opacity===1&&f.backOpacity===1&&f.cssAnimation==='none')).toBe(true);
     expect(motion.some(f=>f.offset>2)).toBe(true);
     if(parentSelector==='#djNext-layer-panel'){expect(new Set(motion.map(f=>f.background)).size).toBeGreaterThan(1);}else expect(motion.every(f=>f.background===motion[0].background)).toBe(true);
     expect(phase==='opening'?motion[0].offset>motion.at(-1).offset:motion[0].offset<motion.at(-1).offset).toBe(true);
   }
 }
 await audit('#djNext-layer-panel .djNext-modal-body','#djNext-layer-panel',()=>tap(page,page.locator('#djNext-layers')),()=>page.getByRole('button',{name:'레이어 설정 닫기'}).click());
 await audit('#dj854-weather-sheet','#dj854-weather-sheet',()=>tap(page,page.locator('#djNext-weather')),()=>page.getByRole('button',{name:'날씨창 닫기'}).click());
 await audit('#route-panel','#route-panel',()=>tap(page,tab(page,'route')),()=>tap(page,page.locator('#route-panel .dj-sheet-chrome-close')));
 await audit('#mine-panel','#mine-panel',()=>tap(page,tab(page,'mine')),()=>tap(page,page.locator('#mine-panel .dj-sheet-chrome-close')));
});


test('layer header follows a real pointer upward and downward; content and X stay independent',{tag:'@phone-layout'},async({page,browserName})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);await tap(page,page.locator('#djNext-layers'));
 const modal=page.locator('#djNext-layer-panel'),body=modal.locator('.djNext-modal-body'),header=modal.locator('header'),scroll=modal.locator('.djNext-layer-scroll');
 await expect(modal).toBeVisible();await expect.poll(()=>body.getAttribute('data-dj810-animating')).toBeNull();
 await expect(header).toHaveCSS('touch-action','none');
 const compact=await body.boundingBox();
 const client=browserName==='chromium'?await page.context().newCDPSession(page):null;
 // WebKit lacks a CDP touch-swipe API. Exercise the exact DOM touch event
 // handlers on the real rendered header, including actual hit-testing.
 // Chromium retains browser-injected real touch input as a separate gate.
 async function dispatch(type,x,y){await page.evaluate(({type,x,y})=>{
   if(type==='touchstart')window.__headerTouchTarget=document.elementFromPoint(x,y);
   const target=window.__headerTouchTarget;
   if(!target?.closest('#djNext-layer-panel .djNext-modal-body > header'))throw Error('Layer header is covered');
   const point={identifier:71,target,clientX:x,clientY:y};
   const touches=type==='touchend'?[]:[point];
   let event;
   try{const t=new Touch(point);event=new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t],targetTouches:type==='touchend'?[]:[t]});}
   catch{event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(event,{touches:{value:touches},changedTouches:{value:[point]}});}
   target.dispatchEvent(event);
 },{type,x,y})}
 async function drag(dy){const r=await header.boundingBox();const x=r.x+Math.min(65,r.width/3),y=r.y+r.height/2;
   if(client){await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/8}]});}
   else{await dispatch('touchstart',x,y);for(let i=1;i<=8;i++)await dispatch('touchmove',x,y+dy*i/8);}
   await expect(body).toHaveAttribute('data-dj-layer-drag-input','touch');
   const mid=await body.boundingBox();
   if(client)await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await dispatch('touchend',x,y+dy);
   return mid;
 }
 const up=await drag(-95);expect(up.y).toBeLessThan(compact.y-20);await expect(body).toHaveAttribute('data-dj-layer-expanded','true');await expect.poll(async()=> (await body.boundingBox()).height).toBeGreaterThan(compact.height+25);
 await page.waitForTimeout(500);const large=await body.boundingBox();const down=await drag(100);expect(down.y).toBeGreaterThan(large.y+20);await expect(body).toHaveAttribute('data-dj-layer-expanded','false');await expect.poll(async()=>Math.abs((await body.boundingBox()).height-compact.height)).toBeLessThan(3);
 await page.waitForTimeout(500);const before=await header.boundingBox();await scroll.evaluate(n=>n.scrollTop=n.scrollHeight);const after=await header.boundingBox();expect(Math.abs(before.y-after.y)).toBeLessThan(2);
 await drag(125);await expect(modal).toBeHidden();await tap(page,page.locator('#djNext-layers'));await expect(modal).toBeVisible();await modal.getByRole('button',{name:'레이어 설정 닫기'}).click();await expect(modal).toBeHidden();
});


test('theme confirmation fades in place with its backdrop, unlike bottom sheets',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 const dialog=page.locator('#dj840-theme-confirm'),card=dialog.locator('.dj840-theme-card');
 await page.evaluate(()=>{const rows=[];window.__confirmFrames=rows;const until=performance.now()+35000;
  function tick(){if(performance.now()>until||window.__confirmFrames!==rows)return;const n=document.getElementById('dj840-theme-confirm'),c=n?.querySelector('.dj840-theme-card');if(n?.dataset.dj810Animating&&c&&!n.hidden){const s=getComputedStyle(n),r=c.getBoundingClientRect();rows.push({phase:n.dataset.dj810Animating,kind:n.dataset.djWindowMotionKind,opacity:Number(s.opacity),duration:Number(n.dataset.djWindowMotionDuration),y:r.y,x:r.x,transform:getComputedStyle(c).transform});}requestAnimationFrame(tick);}requestAnimationFrame(tick);
 });
 // Trigger the original guarded theme button; no theme change on Cancel.
 const theme=page.locator('#theme-toggle');await theme.evaluate(n=>n.click());await expect(dialog).toBeVisible();await expect(card).toBeVisible();await expect.poll(()=>dialog.getAttribute('data-dj810-animating')).toBeNull();
 await dialog.getByRole('button',{name:'취소'}).click();await expect(dialog).toBeHidden();
 const rows=await page.evaluate(()=>window.__confirmFrames);for(const [phase,duration] of [['opening',200],['closing',180]]){const frames=rows.filter(r=>r.phase===phase);expect(frames.length).toBeGreaterThan(1);expect(frames.every(r=>r.kind==='fade'&&r.duration===duration&&Math.abs(r.x-frames[0].x)<1&&Math.abs(r.y-frames[0].y)<1)).toBe(true);expect(frames.some(r=>r.opacity>0&&r.opacity<1)).toBe(true);}
});


test('phone update history fades in place and never paints over bottom navigation',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 await tap(page,tab(page,'mine'));await expect(page.locator('#mine-panel')).toBeVisible();
 await expect.poll(()=>page.locator('#mine-panel').getAttribute('data-dj810-animating')).toBeNull();
 const trigger=page.locator('#mine-panel [data-dj834-action="history"]');await trigger.scrollIntoViewIfNeeded();
 const modal=page.locator('#version-history-modal'),card=modal.locator('.version-history-dialog');
 await page.evaluate(()=>{const frames=[];window.__historyMotionFrames=frames;const until=performance.now()+40000;
  function tick(){if(performance.now()>until||window.__historyMotionFrames!==frames)return;const m=document.getElementById('version-history-modal'),n=m?.querySelector('.version-history-dialog'),nav=document.getElementById('bottom-nav');
   if(n?.dataset.dj810Animating&&nav&&!m.hidden){const r=n.getBoundingClientRect(),d=m.getBoundingClientRect(),s=getComputedStyle(n),clipped=Number.parseFloat(s.clipPath.slice(6).split(' round ')[0].trim().split(/ +/)[2]||'0')||0;
    frames.push({phase:n.dataset.dj810Animating,y:r.top,height:r.height,visibleBottom:Math.min(d.bottom,r.bottom-clipped),navTop:nav.getBoundingClientRect().top,opacity:Number(s.opacity),animation:s.animationName,duration:Number(n.dataset.djWindowMotionDuration)});}
   requestAnimationFrame(tick);}requestAnimationFrame(tick);
 });
 await tap(page,trigger);await expect(modal).toBeVisible();await expect.poll(()=>card.getAttribute('data-dj810-animating')).toBeNull();const final=await card.boundingBox(),nav=await page.locator('#bottom-nav').boundingBox();expect(final.y+final.height).toBeLessThanOrEqual(nav.y-3);
 await tap(page,modal.locator('#version-history-close'));await expect(modal).toBeHidden();
 const frames=await page.evaluate(()=>window.__historyMotionFrames);for(const [phase,duration] of [['opening',200],['closing',180]]){
  const a=frames.filter(f=>f.phase===phase);expect(a.length).toBeGreaterThan(1);expect(a.every(f=>f.duration===duration&&f.animation==='none'&&Math.abs(f.y-final.y)<=3&&f.visibleBottom<=f.navTop-3&&Math.abs(f.height-final.height)<4)).toBe(true);
  expect(a.some(f=>f.opacity>0&&f.opacity<1)).toBe(true);
  for(let i=1;i<a.length;i++)expect(phase==='opening'?a[i-1].opacity-a[i].opacity:a[i].opacity-a[i-1].opacity).toBeLessThanOrEqual(.03);
 }
});

test('phone search returns a visible local suggestion and clears input safely',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 const input=page.locator('#map-quick-search-query'),results=page.locator('#map-quick-search-dropdown');
 await input.fill('노량진');
 await expect(results).toBeVisible();
 await expect(results.locator('.map-quick-search-result').filter({hasText:'노량진'}).first()).toBeVisible();
 await expect(page.locator('#dj-search-clear')).toBeVisible();
 await page.locator('#dj-search-clear').click();await expect(input).toHaveValue('');
 await expect(results).toBeVisible();
 await page.locator('#map-quick-search-close').click();await expect(results).toBeHidden();
});

test('primary tabs animate replacement and keep the pill dock',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 await tap(page,tab(page,'mine'));await expect(page.locator('#mine-panel')).toBeVisible();await expect.poll(()=>page.locator('#mine-panel').getAttribute('data-dj810-animating')).toBeNull();
 await page.evaluate(()=>{window.__tabMotions=[];const panel=document.getElementById('news-panel');new MutationObserver(()=>{if(panel.dataset.dj810Animating)window.__tabMotions.push(panel.dataset.dj810Animating)}).observe(panel,{attributes:true,attributeFilter:['data-dj810-animating']});});
 await tap(page,tab(page,'news'));await expect(page.locator('#news-panel')).toBeVisible();await expect(page.locator('#mine-panel')).toBeHidden();await expect.poll(()=>page.locator('#news-panel').getAttribute('data-dj810-animating')).toBeNull();expect(await page.evaluate(()=>window.__tabMotions)).toContain('opening');
 await expect(page.locator('#bottom-nav')).toHaveCSS('border-top-left-radius','999px');
 await expect(page.locator('#bottom-nav')).toHaveAttribute('data-dj-motion-indicator','ready');
 await expect(page.locator('#bottom-nav > .dj-motion-indicator')).toBeVisible();
 await expect(page.locator('#bottom-nav > .dj-motion-indicator')).toHaveCSS('position','absolute');
 await expect.poll(()=>page.locator('#bottom-nav').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length)).toBe(5);
 await expect.poll(()=>page.evaluate(()=>{const nav=document.getElementById('bottom-nav'),pill=nav.querySelector('.dj-motion-indicator'),active=nav.querySelector('.nav-tab[aria-current=page]');if(!pill||!active)return 1000;const a=pill.getBoundingClientRect(),b=active.getBoundingClientRect();return Math.abs(a.left-b.left)+Math.abs(a.top-b.top)+Math.abs(a.width-b.width); })).toBeLessThan(4);
 await tap(page,tab(page,'map'));await expect(page.locator('#news-panel')).toBeHidden();await expect.poll(()=>page.locator('#app').getAttribute('data-dj-pilot-lock-count')).toBe('0');
 // Returning from the map is a fresh entrance, even for the previously selected tab.
 await enter(page,'news-panel','news');
});


test('phone browser install choices are visible and PWA hides them',{tag:'@phone-layout'},async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const menu=page.locator('#dj-install-menu');
 await expect(menu).toBeVisible({timeout:20000});
 await expect(menu.locator('.dj-install-choice')).toHaveCount(4);
 await expect(menu.locator('.dj-install-logo')).toBeVisible();
 await page.emulateMedia({reducedMotion:'no-preference'});
 const webChoice=menu.getByRole('button',{name:'웹에서 바로 이용하기'});
 await expect(webChoice).toHaveCSS('transition-property','background-color, box-shadow');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(webChoice).toHaveCSS('transition-duration','0s');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const iosChoice=menu.getByRole('button',{name:/iPhone 앱 다운로드/});
 await expect(iosChoice).toBeDisabled();await expect(iosChoice).toContainText('추후 업데이트 예정');
 const viewport=await page.evaluate(()=>({width:document.documentElement.clientWidth,height:innerHeight}));
 const rect=await menu.boundingBox();expect(rect.x).toBeCloseTo(0,0);expect(rect.y).toBeCloseTo(0,0);expect(Math.abs(rect.width-viewport.width)).toBeLessThanOrEqual(2);expect(Math.abs(rect.height-viewport.height)).toBeLessThanOrEqual(2);
 await expect(menu).toHaveCSS('border-top-left-radius','0px');
 await test.info().attach('fullscreen-browser-welcome',{body:await page.screenshot(),contentType:'image/png'});
 const pwaChoice=menu.getByRole('button',{name:/홈 화면에 웹앱 추가/});
 await expect(pwaChoice).toBeEnabled();await expect(pwaChoice).toContainText('iOS · Android 지원');
 await pwaChoice.click();
 await expect(menu.locator('.dj-install-info')).toBeVisible();
 await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
 await expect(menu).toBeHidden();
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(menu).toBeAttached();await expect(menu).toBeHidden();
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
 await page.goto('/?install=1',{waitUntil:'domcontentloaded'});
 await expect(page.locator('html')).toHaveAttribute('data-dj-run-mode','pwa');
 await expect(menu).toHaveCount(0);
});

test('Android verified download shows security instructions before navigation',{tag:'@phone-layout'},async({page})=>{
 const sha='b'.repeat(40),version='9.2.8',tag='android-debug-v'+version,name='Dongjak-Safety-Map-v'+version+'-debug.apk',url='https://github.com/lui020913/dongjak-ui-public-tests/releases/download/'+tag+'/'+name;
 await page.route('**/download-links.json',r=>r.fulfill({json:{androidAutoRelease:true,ios:null}}));
 await page.route('**/release-source.json',r=>r.fulfill({json:{release_status:'DEPLOYED_PRODUCTION',source_commit:sha,application_version:version}}));
 await page.route('https://api.github.com/repos/lui020913/dongjak-ui-public-tests/releases/tags/'+tag,r=>r.fulfill({headers:{'access-control-allow-origin':'*'},json:{tag_name:tag,target_commitish:sha,draft:false,prerelease:false,assets:[{name,browser_download_url:url,state:'uploaded'}]}}));
 await page.route('https://api.github.com/repos/lui020913/dongjak-ui-public-tests/git/ref/tags/'+tag,r=>r.fulfill({headers:{'access-control-allow-origin':'*'},json:{ref:'refs/tags/'+tag,object:{type:'commit',sha}}}));
 let requested=false;await page.route(url,async r=>{requested=true;await r.abort();});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const menu=page.locator('#dj-install-menu'),choice=menu.getByRole('button',{name:/Android 앱 다운로드/});
 await expect(choice.locator('.dj-install-status')).toHaveText('');
 await choice.click();
 const guide=menu.locator('[data-android-guide]');
 await expect(guide).toBeVisible();await expect(guide).toContainText('출처를 알 수 없는 앱 설치');await expect(guide).toContainText('보안 위험 자동 차단');await expect(guide).toContainText('Play Protect는 켜 두세요');
 expect(requested).toBe(false);
 await expect(guide.getByRole('link',{name:'Galaxy 설치 제한 공식 안내'})).toHaveAttribute('href','https://www.samsungsvc.co.kr/solution/1711930');
 await expect(guide.getByRole('button',{name:'웹 또는 웹앱 이용하기'})).toBeVisible();
 await Promise.all([page.waitForRequest(url),guide.getByRole('button',{name:'APK 다운로드',exact:true}).click({noWaitAfter:true})]);
 await expect.poll(()=>requested).toBe(true);
});

test('PC install notice has one heading, equal actions and stable edge clicks',{tag:'@phone-layout'},async({page})=>{
 await page.setViewportSize({width:1200,height:950});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const gate=page.locator('#dj-mobile-only-screen'),menu=gate.locator('#dj-install-menu');
 await expect(menu).toBeVisible({timeout:20000});await expect(gate.locator('#dj-mobile-only-title')).toBeHidden();
 await expect(menu.locator('.dj-install-subtitle')).toContainText('스마트폰');await expect(gate.locator('.dj-mobile-only-devices')).toBeVisible();
 const web=menu.getByRole('button',{name:/웹에서 바로 이용하기/}),android=menu.getByRole('button',{name:/Android 앱 다운로드/});
 await expect(web).toContainText('모바일 전용');
 expect(await web.evaluate(n=>getComputedStyle(n).backgroundColor)).toBe(await android.evaluate(n=>getComputedStyle(n).backgroundColor));
 await expect(menu.locator('.dj-install-qr')).toHaveCount(0);
 await menu.getByRole('button',{name:/홈 화면에 웹앱 추가/}).click();
 await expect(menu.locator('.dj-install-qr')).toBeVisible();
 await expect.poll(()=>menu.locator('h2').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(32);
 await expect.poll(()=>web.locator('.dj-install-label').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(19);
 await expect.poll(()=>web.locator('.dj-install-status').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(14);
 await expect.poll(()=>menu.locator('.dj-install-subtitle').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(18);
 await page.mouse.move(0,0);const originalBg=await web.evaluate(n=>getComputedStyle(n).backgroundColor);const rect=await web.boundingBox();expect(rect).not.toBeNull();
 await page.mouse.move(rect.x+rect.width/2,rect.y-3);
 await page.mouse.move(rect.x+rect.width/2,rect.y+2);
 if(await page.evaluate(()=>matchMedia('(hover:hover) and (pointer:fine)').matches))await expect.poll(()=>web.evaluate(n=>getComputedStyle(n).backgroundColor)).not.toBe(originalBg);
 await page.mouse.down();
 expect(await web.boundingBox()).toEqual(rect);
 await page.mouse.up();
 await expect(menu.locator('.dj-install-info')).toContainText('스마트폰으로 이 사이트에 접속');await expect(menu.locator('.dj-install-qr')).toHaveCount(0);
 await expect(gate).toBeVisible();
});


test('iOS PWA dimmed status edge blends into the modal scrim',{tag:'@phone-common'},async({page})=>{
 const ua=await page.evaluate(()=>navigator.userAgent);test.skip(!/iPhone/.test(ua),'iOS PWA only');
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
 await ready(page);
 const root=page.locator('html'),bridge=page.locator('body > #dj-ios-pwa-status-bridge');
 await expect(root).toHaveClass(/dj-ios-home-pwa/);
 await expect(bridge).toHaveCount(1);await expect(bridge).toHaveCSS('opacity','0');
 const dialog=page.locator('#dj840-theme-confirm');await page.locator('#theme-toggle').evaluate(n=>n.click());await expect(dialog).toBeVisible();
 await expect(root).toHaveAttribute('data-dj-pwa-dimmed','true');await expect(bridge).toHaveCSS('opacity','1');
 const style=await bridge.evaluate(n=>{const c=getComputedStyle(n),r=n.getBoundingClientRect();return {gradient:c.backgroundImage,pointer:c.pointerEvents,top:r.top,height:r.height,color:getComputedStyle(document.documentElement).getPropertyValue('--dj-pwa-status-color').trim()};});
 expect(style.gradient).toContain('linear-gradient');expect(style.gradient).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)|color\(srgb 0 0 0 \/ 0\)/);expect(style.pointer).toBe('none');expect(style.top).toBe(0);expect(style.height).toBeGreaterThanOrEqual(112);expect(style.color).toBe('#eef3ef');
 const sample=page.locator('body > #dj-ios-pwa-status-sample');await expect(sample).toHaveCSS('background-color','rgb(238, 243, 239)');await expect(sample).toHaveCSS('position','fixed');const sr=await sample.boundingBox();expect(sr.height).toBeGreaterThanOrEqual(6);expect(sr.y).toBe(0);expect(sr.width).toBeGreaterThanOrEqual(page.viewportSize().width*.8);
 await test.info().attach('ios-pwa-light-gradient',{body:await page.screenshot(),contentType:'image/png'});
 await dialog.getByRole('button',{name:'취소'}).click();await expect(dialog).toBeHidden();await expect(bridge).toHaveCSS('opacity','0');
 // Verify native dialog top-layer separately without a network request or login.
 const ai=page.locator('#dj-ai-search-modal');await expect(ai).toBeAttached();await ai.evaluate(n=>n.showModal());
 await expect(root).toHaveAttribute('data-dj-pwa-dimmed','true');await expect(bridge).toHaveCSS('opacity','0');
 const native=await ai.evaluate(n=>getComputedStyle(n,'::backdrop').backgroundImage);expect(native).toContain('linear-gradient');
 await ai.evaluate(n=>n.close());await expect(root).toHaveAttribute('data-dj-pwa-dimmed','false');
 // Dark theme palette is tested in the same DOM without requiring an OS-controlled reload.
 await page.evaluate(()=>document.getElementById('app').dataset.theme='dark');await expect.poll(()=>root.evaluate(n=>getComputedStyle(n).getPropertyValue('--dj-pwa-status-color').trim())).toBe('#192d32');
 await expect(sample).toHaveCSS('background-color','rgb(25, 45, 50)');await expect(page.locator('body')).toHaveCSS('background-color','rgb(25, 45, 50)');
});


test('live subway source artwork decodes and markers render at initial phone map zoom',{tag:'@phone-common'},async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('dongjak_live_vehicle_options_v827',JSON.stringify({metro:true,bus:false}));
    localStorage.setItem('dongjak_basemap_layers_v1',JSON.stringify({metro:true,bus:true,buildings:true,boundary:true}));
  });
  let calls=0;
  await page.route('**/api/transport/live-vehicles**',async route=>{
    calls++;
    const observedAt=new Date().toISOString();
    const metro=[['7호선','장승배기','석남'],['7호선','상도','장암'],['9호선','노량진','중앙보훈병원'],['9호선','노들','개화']].map(([line,station,destination],i)=>({line,station,destination,id:'qa-train-'+i,trainNo:'QA'+i,direction:String(i%2),status:'1',observedAt}));
    await route.fulfill({json:{ok:true,metro,bus:[],warnings:[],availability:{metro:true,bus:false}}});
  });
  await ready(page);
  const map=page.locator('#map');
  await expect.poll(()=>calls,{timeout:60000}).toBeGreaterThan(0);
  await expect(map).toHaveAttribute('data-dj-live-train-artwork','atlas',{timeout:60000});
  await expect.poll(async()=>Number(await map.getAttribute('data-dj-live-train-rendered')||0),{timeout:90000}).toBeGreaterThan(0);
  await test.info().attach('live-train-artwork-visible',{body:await page.screenshot(),contentType:'image/png'});
});
