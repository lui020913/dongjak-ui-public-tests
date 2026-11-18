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
 await expect(page.locator('#'+id)).toHaveCSS('opacity','1');
 const frames=await page.evaluate(()=>window.__auditFrames);
 expect(frames.some(f=>f.o>.05&&f.o<.75)).toBe(true);
 if(key==='route')expect(frames.some(f=>(f.t!=='none'&&f.t.split(' ').some(v=>parseFloat(v)>2))||(f.p!=='none'&&parseFloat(f.p.replace('inset(',''))>4))).toBe(true);
 await geometry(page,'#'+id);
}
test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus)return;
 try{
   const debug=await page.evaluate(()=>{
     const app=document.getElementById('app');
     const ids=['bottom-nav','dj840-map-tip','dj-user-tip-close','dj-browser-webapp-tip','transport-sheet','route-panel','mine-panel','map-startup-overlay','overview-sheet','dj-mobile-utilities'];
     const describe=n=>{if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {id:n.id,className:n.getAttribute('class'),hidden:n.hidden,ariaHidden:n.getAttribute('aria-hidden'),rect:[r.x,r.y,r.width,r.height],display:s.display,visibility:s.visibility,opacity:s.opacity,pointerEvents:s.pointerEvents};};
     return {viewport:[innerWidth,innerHeight],nightReady:app?.dataset.djNightReady,nightState:app?.dataset.sangdoNight,tourResolved:app?.dataset.dj860AutoResolved,routeBlocks:['route-picking','route-preview','route-guiding'].filter(c=>app?.classList.contains(c)),routeDialogs:['route-pick-hint','route-transit-confirm','route-place-search','route-search-confirm'].filter(id=>{const n=document.getElementById(id);return n&&!n.hidden&&n.getClientRects().length;}),tab:app?.dataset.tab,sheetOpen:app?.dataset.dj910SheetOpen,tipDismissed:app?.dataset.djUserTipDismissed,webappTipVisible:app?.dataset.djWebappTipVisible,runMode:document.documentElement.dataset.djRunMode,controls:ids.map(id=>describe(document.getElementById(id))),scale:describe(document.querySelector('#map .maplibregl-ctrl-scale')),scaleParent:describe(document.querySelector('#map .maplibregl-ctrl-bottom-left'))};
   });
   await info.attach('anonymous-layout-diagnostic.json',{body:Buffer.from(JSON.stringify(debug,null,2)),contentType:'application/json'});
   console.log('UI_LAYOUT_DIAGNOSTIC',JSON.stringify(debug));
 }catch{console.log('Anonymous layout diagnostic unavailable.');}
});
test('compact HUD and visible motion; desktop navigation and dark theme',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 if(compact(page)){
   const nav=page.locator('#bottom-nav'),tip=page.locator('#dj840-map-tip'),scale=page.locator('#map .maplibregl-ctrl-scale');
   await expect(nav).toBeVisible();
   // The browser-only install advice intentionally replaces the map TIP.
   // Exercise the real snooze button before checking the ordinary HUD;
   // do not suppress the advice by injecting storage or modifying app state.
   const installAdvice=page.locator('#dj-browser-webapp-tip');
   if(page.viewportSize().width<700&&await page.locator('html').getAttribute('data-dj-run-mode')==='browser'){
     await expect(installAdvice).toBeVisible({timeout:30000});
     await expect(tip).toBeHidden();
     await tap(page,installAdvice.locator('.dj-webapp-tip-later'));
     await expect(installAdvice).toBeHidden();
   }
   await expect(tip).toBeVisible();await expect(scale).toBeVisible();
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
test('compact More close and settings open from real buttons',async({page})=>{
 test.skip(!compact(page),'compact only');await ready(page);
 const more=page.locator('#dj-v794-more'),panel=page.locator('#dj-mobile-utilities'),close=page.locator('#dj-mobile-utilities-close');
 await tap(page,more);await expect(panel).toBeVisible();
 const a=await panel.boundingBox(),b=await close.boundingBox();expect(a.x+a.width-b.x-b.width).toBeLessThan(24);
 await tap(page,close);await expect(panel).toBeHidden();
 await tap(page,more);await tap(page,page.locator('#dj-mobile-settings'));await expect(page.locator('#dj-map-settings')).toBeVisible();await expect(panel).toBeHidden();
});
test('transport cards, transfer tabs, right aligned arrivals and facility grip',async({page})=>{
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

test('tablet More panel is fully visible and contained',async({page})=>{
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

test('tablet safety modal remains visible and contained',async({page})=>{
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

test('all five onboarding illustrations remain uncropped on tablet and desktop',async({page})=>{
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

test('phone compact toolbar, reachable swipe cue and bottom dock share a visual system',async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 const scroll=page.locator('#dj831-scrollport'),cue=page.locator('.dj912-toolbar-next'),more=page.locator('#dj-v794-more'),nav=page.locator('#bottom-nav');
 await expect(scroll).toBeVisible();await expect(cue).toBeVisible();await expect(more).toBeVisible();
 const geometry=()=>scroll.evaluate(n=>{const more=document.getElementById('dj-v794-more'),w=more.getBoundingClientRect().width;return {widths:[...n.children].filter(b=>b.tagName==='BUTTON'&&b.getClientRects().length).map(b=>b.getBoundingClientRect().width),more:w,overflow:n.scrollWidth-n.clientWidth};});
 await expect.poll(async()=>{const d=await geometry();return d.overflow>3&&d.widths.length>=4&&d.widths.every(w=>Math.abs(w-52)<=1)&&Math.abs(d.more-52)<=1;}).toBe(true);
 const left=await scroll.evaluate(n=>n.scrollLeft);
 await tap(page,cue);await expect.poll(()=>scroll.evaluate(n=>n.scrollLeft)).toBeGreaterThan(left+8);
 const district=scroll.locator('[data-dj831-feature="map-dong"]');await expect(district.locator('.dj832-feature-label')).toHaveText('행정동');
 const wx=scroll.locator('#dj-v794-weather .dj910-weather-icon svg');await expect(wx).toBeAttached();
 await expect.poll(()=>nav.evaluate(n=>Math.round(innerHeight-n.getBoundingClientRect().bottom))).toBeLessThanOrEqual(4);
 await tap(page,more);await expect(page.locator('#dj-mobile-utilities')).toBeVisible();
 await visuallyPresented(page.locator('#dj-mobile-utilities'));
 await expect(page.locator('#dj-v794-toolbar')).toBeHidden();
 await tap(page,page.locator('#dj-mobile-utilities-close'));await expect(page.locator('#dj-mobile-utilities')).toBeHidden();
 await expect(page.locator('#dj-v794-toolbar')).toBeVisible();
 await test.info().attach('phone-compact-design',{body:await page.screenshot(),contentType:'image/png'});
});


test('mobile and touch tablet POI filters share the existing top toolbar with blurred scroll edges',async({page})=>{
 test.skip(!compact(page),'mobile and touch tablet only');await ready(page);
 const app=page.locator('#app'),toolbar=page.locator('#dj-v794-toolbar'),rail=page.locator('#dj831-scrollport'),categories=page.locator('#dj912-poi-categories');
 await expect(toolbar).toBeVisible({timeout:30000});
 await expect(categories).toHaveAttribute('data-dj912-integrated','true',{timeout:45000});
 await expect(categories).toBeHidden();
 await expect(categories.locator('.dj912-poi-scroll button')).toHaveCount(0);
 const buttons=rail.locator(':scope > button[data-poi-group]');
 await expect(buttons).toHaveCount(7);
 const food=rail.locator(':scope > button[data-poi-group="food"]'),cafe=rail.locator(':scope > button[data-poi-group="cafe"]');
 await expect(food).toBeVisible();await expect(cafe).toBeVisible();
 expect(await food.evaluate(n=>n.parentElement?.id==='dj831-scrollport')).toBe(true);
 await expect(food).toHaveAttribute('aria-pressed','false');
 const metrics=await rail.evaluate(n=>({scrollWidth:n.scrollWidth,clientWidth:n.clientWidth}));
 const left=toolbar.locator(':scope > .dj831-edge-blur-left'),right=toolbar.locator(':scope > .dj831-edge-blur-right');
 if(metrics.scrollWidth>metrics.clientWidth+3){
   // Verify the actual initial state, then explicitly exercise both ends.
   const snapshot=()=>rail.evaluate(n=>{
     const l=n.parentElement.querySelector('.dj831-edge-blur-left'),r=n.parentElement.querySelector('.dj831-edge-blur-right');
     const shown=e=>!!e&&!e.hidden&&getComputedStyle(e).display!=='none'&&e.getClientRects().length>0;
     const max=n.scrollWidth-n.clientWidth;
     return {offset:n.scrollLeft,max,left:shown(l),right:shown(r)};
   });
   console.log('TOOLBAR_INITIAL',JSON.stringify(await snapshot()));
   await expect.poll(async()=>{const d=await snapshot();return d.left===(d.offset>3)&&d.right===(d.max-d.offset>3);}).toBe(true);
   const move=async end=>{
     await rail.evaluate((n,end)=>n.scrollTo({left:end?n.scrollWidth:0,behavior:'instant'}),end);
     await expect.poll(async()=>{const d=await snapshot();return end?d.max-d.offset:Math.abs(d.offset);}).toBeLessThanOrEqual(3);
   };
   await move(false);
   await expect(left).toBeHidden();await expect(right).toBeVisible();
   expect(await right.evaluate(n=>getComputedStyle(n).backdropFilter)).toContain('blur(5px)');
   await move(true);
   await expect(right).toBeHidden();await expect(left).toBeVisible();
   await move(false);
   await expect(left).toBeHidden();await expect(right).toBeVisible();
 }else{
   await expect(left).toBeHidden();await expect(right).toBeHidden();
 }
 await food.scrollIntoViewIfNeeded();await tap(page,food);
 await expect(food).toHaveAttribute('aria-pressed','true');
 await expect(app).toHaveAttribute('data-dj912-poi-groups',/food/);
 await cafe.scrollIntoViewIfNeeded();await tap(page,cafe);
 await expect(cafe).toHaveAttribute('aria-pressed','true');
 await expect(food).toHaveAttribute('aria-pressed','true');
 await test.info().attach('poi-toolbar-mobile-tablet',{body:await page.screenshot(),contentType:'image/png'});
});

test('PC desktop chrome and independent facility categories',async({page})=>{
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

test('PC visual contract: compact profile and unobscured route footer',async({page})=>{
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

test('PC dark transit surfaces and arrival rows remain readable and unclipped',async({page})=>{
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

test('PC night report fits workspace and facility categories restore on exit',async({page})=>{
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

test('phone night shortcut waits for the map, honors consent and exits',async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 const app=page.locator('#app'),shortcut=page.locator('#dj-v794-night');
 await expect(app).toHaveAttribute('data-dj-night-ready','true',{timeout:60000});
 await expect(shortcut).toBeEnabled();
 await shortcut.click();
 const consent=page.locator('#dj833-night-modal');
 await expect(consent.getByRole('dialog')).toBeVisible();
 await expect(app).toHaveAttribute('data-sangdo-night','off');
 await consent.getByRole('button',{name:'예, 시작',exact:true}).click();
 const night=page.locator('#night-visibility-float');
 await expect(app).toHaveAttribute('data-sangdo-night','on',{timeout:45000});
 await expect(night).toBeVisible();
 await visuallyPresented(night);
 await night.locator('#night-visibility-float-stop').click();
 await expect(app).toHaveAttribute('data-sangdo-night','off');
 await expect(night).toBeHidden();
});
