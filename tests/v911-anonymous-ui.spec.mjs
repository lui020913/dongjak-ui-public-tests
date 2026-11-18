import {test,expect} from '@playwright/test';
const compact=page=>page.viewportSize().width<1080;
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
async function ready(page){
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#map')).toBeVisible({timeout:45000});
 const startup=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
 await expect.poll(async()=>!await startup.isVisible()||await next.isVisible(),{timeout:60000}).toBe(true);
 if(await startup.isVisible()&&await next.isVisible())await tap(page,next);
 await expect(startup).toBeHidden({timeout:30000});
 await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state',/^(signed-out|signed-in)$/,{timeout:30000});
 // Fresh anonymous context, never enter credentials.
 const tour=page.locator('#dj860-onboarding');
 if(await tour.isVisible().catch(()=>false))await tap(page,tour.locator('[data-dj860-action="skip"]'));
 await expect(tour).toBeHidden();
}
async function geometry(page,sel){
 await expect.poll(async()=>{const p=await page.locator(sel).boundingBox(),n=await page.locator('#bottom-nav').boundingBox();return p&&n?n.y-p.y-p.height:-1000}).toBeGreaterThanOrEqual(5);
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
     const ids=['bottom-nav','dj840-map-tip','dj-user-tip-close','transport-sheet','route-panel','mine-panel','map-startup-overlay','overview-sheet','dj-mobile-utilities'];
     const describe=n=>{if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {id:n.id,className:n.getAttribute('class'),hidden:n.hidden,ariaHidden:n.getAttribute('aria-hidden'),rect:[r.x,r.y,r.width,r.height],display:s.display,visibility:s.visibility,opacity:s.opacity,pointerEvents:s.pointerEvents};};
     return {viewport:[innerWidth,innerHeight],tab:app?.dataset.tab,sheetOpen:app?.dataset.dj910SheetOpen,tipDismissed:app?.dataset.djUserTipDismissed,controls:ids.map(id=>describe(document.getElementById(id))),scale:describe(document.querySelector('#map .maplibregl-ctrl-scale')),scaleParent:describe(document.querySelector('#map .maplibregl-ctrl-bottom-left'))};
   });
   await info.attach('anonymous-layout-diagnostic.json',{body:Buffer.from(JSON.stringify(debug,null,2)),contentType:'application/json'});
   console.log('UI_LAYOUT_DIAGNOSTIC',JSON.stringify(debug));
 }catch{console.log('Anonymous layout diagnostic unavailable.');}
});
test('compact HUD and visible motion; desktop navigation and dark theme',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 if(compact(page)){
   const nav=page.locator('#bottom-nav'),tip=page.locator('#dj840-map-tip'),scale=page.locator('#map .maplibregl-ctrl-scale');
   await expect(nav).toBeVisible();await expect(tip).toBeVisible();await expect(scale).toBeVisible();
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
 if(compact(page)){await geometry(page,'#transport-sheet');await expect(page.locator('#transport-kind')).toBeHidden();const centered=await sheet.evaluate(n=>{const h=n.querySelector(':scope > .handle'),r=n.getBoundingClientRect(),g=h.getBoundingClientRect(),p=getComputedStyle(h,'::after');return Math.abs(g.left+g.width/2-r.left-r.width/2)<2&&p.display!=='none'&&p.left!=='auto'});expect(centered).toBe(true);}
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

test('tablet workspace margins, unclipped tools, More and safety modal',async({page})=>{
  const width=page.viewportSize().width;
  test.skip(width<700||width>=1080,'tablet only');
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
  const r=await more.boundingBox();
  expect(r.x).toBeGreaterThanOrEqual(18);
  expect(width-r.x-r.width).toBeGreaterThanOrEqual(18);
  await geometry(page,'#dj-mobile-utilities');
  const icon=more.locator('.dj832-more-icon svg').first();
  await expect(icon).toBeVisible();
  const i=await icon.boundingBox();expect(i.width).toBeLessThanOrEqual(24);expect(i.height).toBeLessThanOrEqual(24);
  await tap(page,page.locator('#dj-mobile-utilities-close'));
  await tap(page,page.locator('#dj-v794-safety'));
  const shade=page.locator('#map-safety-backdrop'),panel=page.locator('#map-safety-controls');
  await expect(shade).toBeVisible();await expect(panel).toBeVisible();
  const d=await shade.boundingBox();expect(d.x).toBeGreaterThanOrEqual(-1);expect(d.y).toBeGreaterThanOrEqual(-1);
  expect(d.width).toBeGreaterThanOrEqual(width-1);expect(d.height).toBeGreaterThanOrEqual(page.viewportSize().height-1);
  await tap(page,page.locator('#map-safety-close'));
  await expect(shade).toBeHidden();
});
