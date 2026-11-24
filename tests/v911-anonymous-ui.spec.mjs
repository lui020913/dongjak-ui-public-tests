import {test,expect} from './live-qa-fixture.mjs';
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
 if(page.viewportSize().width<700 && sel==='#route-panel'){
  await expect.poll(async()=>{
    const r=await page.locator(sel).boundingBox();
    const dock=await page.locator('#bottom-nav').boundingBox();
    const vh=page.viewportSize().height;
    return Boolean(r&&dock&&r.x>=-1&&r.x<=2&&r.y>=-1&&r.y<=3&&
      r.width>=page.viewportSize().width-3&&r.x+r.width<=page.viewportSize().width+1&&
      r.y+r.height<=dock.y-70);
  }).toBe(true);
  return;
 }
 const full=page.viewportSize().width<700&&['#participation-panel','#news-panel','#mine-panel'].includes(sel);
 if(full){
  await expect.poll(async()=>{const b=await page.locator(sel).boundingBox(),n=await page.locator('#bottom-nav').boundingBox(),h=await page.evaluate(()=>document.documentElement.clientHeight);return Boolean(b&&n&&Math.abs(b.x)<3&&Math.abs(b.y)<3&&Math.abs(b.height-h)<5&&n.y>h-160);}).toBe(true);
  const z=await page.evaluate(id=>{const a=document.querySelector(id),b=document.getElementById('bottom-nav');return [Number(getComputedStyle(a).zIndex),Number(getComputedStyle(b).zIndex)]},sel);
  expect(z[1],'pill navigation overlays an independent page').toBeGreaterThan(z[0]);
  return;
 }
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
 await page.evaluate(({id,key})=>{
   const panel=document.getElementById(id),frames=[];
   window.__auditStop?.();
   window.__auditFrames=frames;
   let stopped=false,frame=0;
   window.__auditStop=()=>{stopped=true;cancelAnimationFrame(frame);};
   function capture(){
     if(stopped)return;
     if(panel?.classList.contains('dj-tab-content-enter')&&!panel.hidden){
       // V3 renders in an independent shadow host. The legacy route-panel
       // remains an engine adapter and must never serve as visual evidence.
       const route=key==='route'?document.getElementById('dj-route-v3'):null;
       const body=route?.shadowRoot?.querySelector('.canvas > .route-panel')||panel.querySelector(':scope > .dj836-sheet-body');
       if(body&&(!route||!route.hidden)&&body.getClientRects().length){
         const c=getComputedStyle(panel),actual=getComputedStyle(body);
         frames.push({rootOpacity:Number(c.opacity),contentOpacity:Number(actual.opacity),y:panel.getBoundingClientRect().y,visible:actual.visibility!=='hidden'&&actual.display!=='none'});
       }
     }
     frame=requestAnimationFrame(capture);
   }
   capture();
 },{id,key});
 try{
   await tap(page,tab(page,key));await expect(page.locator('#'+id)).toBeVisible();
   // Test painted intermediate opacity, not a particular CSS animation
   // name. The inline-important rAF owner intentionally disables keyframes.
   await expect.poll(()=>page.evaluate(()=>window.__auditFrames.some(f=>f.visible&&f.contentOpacity>.12&&f.contentOpacity<.98)),{message:'visible intermediate content opacity on '+key+' entry'}).toBe(true);
   await expect.poll(()=>page.locator('#'+id).getAttribute('data-dj810-animating')).toBeNull();
   await expect(page.locator('#'+id)).toHaveCSS('opacity','1');
   const frames=await page.evaluate(()=>window.__auditFrames);
   expect(frames.every(f=>f.rootOpacity===1)).toBe(true);
   expect(frames.every(f=>Math.abs(f.y-frames[0].y)<1)).toBe(true);
 }finally{await page.evaluate(()=>window.__auditStop?.());}
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
 // Ordinary appearance is light-only; temporary dark styling belongs solely
 // to the night-visibility feature, not a resurrected settings button.
 await expect(page.locator('#mine-panel [data-dj834-action=theme]')).toHaveCount(0);
 await expect(page.locator('#mine-panel [data-dj834-action=map]')).toHaveCount(1);
 await expect(page.locator('#app')).toHaveAttribute('data-theme','light');
 await expect(page.locator('#mine-panel')).toHaveCSS('background-color','rgb(237, 243, 239)');
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
 await page.route('**/api/transport/bus?**',r=>r.fulfill({json:{status:'ok',items:[{routeId:'100100152',route:'152',routeType:'3',destination:'삼막사거리',message:'5분후 [4정거장 전]'},{route:'6515',routeType:'4',destination:'경인교육대학교',message:'1분후 [1정거장 전]'}]}}));
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
 if(page.viewportSize().width<700){
   const routeId='100100152';
   const stops=Array.from({length:24},(_,i)=>({seq:i+1,stationId:String(1000+i),arsId:i===8?'20240':String(20300+i),name:i===8?'노량진역5번출구·동작구청·동작보건소건강관리청 긴 정류장 이름':'검증 정류장 '+(i+1),lng:126.9423+i*.0001,lat:37.5133+i*.0001,firstTime:'06:00',lastTime:'23:10',direction:i<12?'삼막사거리':'회차 방면'}));
   await page.route('**/api/transport/bus/route-path?**',r=>r.fulfill({json:{routeId,stops,coordinates:stops.map(s=>[s.lng,s.lat])}}));
   await page.route('**/api/transport/live-vehicles?**',r=>r.fulfill({json:{ok:true,bus:[{id:'bus:1',routeId,vehicleNumber:'4520',nextStopId:'1009',longitude:126.943,latitude:37.514,observedAt:new Date().toISOString(),receivedAt:new Date().toISOString()}],metro:[]}}));
   await tap(page,cards.first());
   const detail=page.locator('#dj-bus-route-detail'),scroller=detail.locator('.dj-bus-detail-scroll'),dock=page.locator('.dj-bus-detail-dock');
   await expect(sheet).toBeHidden();await expect(detail).toBeVisible();
   for(const selector of ['.topbar','#djNext-toolbar','.map-actions','#dj840-map-tip'])await expect(page.locator(selector).first()).toBeHidden();
   await expect(detail.locator('.dj-bus-detail-stop')).toHaveCount(24);
   await expect(detail.locator('.dj-bus-detail-stop[aria-current=location]')).toBeVisible();
   await expect(detail.locator('.dj-bus-detail-vehicle')).toHaveCount(1);
   await expect.poll(()=>detail.evaluate(n=>{const rect=x=>x.getBoundingClientRect(),head=rect(n.querySelector('.dj-bus-detail-head')),status=rect(n.querySelector('.dj-bus-detail-status')),scroll=rect(n.querySelector('.dj-bus-detail-scroll')),foot=rect(n.querySelector('.dj-bus-detail-actions')),root=rect(n),nav=rect(document.getElementById('bottom-nav'));return n.parentElement.id==='app'&&head.bottom<=status.top+1&&status.bottom<=scroll.top+1&&scroll.bottom<=foot.top+1&&root.bottom<=nav.top-3&&root.top>=0;})).toBe(true);
   await scroller.evaluate(n=>n.scrollTop=200);const scrollBefore=await scroller.evaluate(n=>n.scrollTop);
   await tap(page,detail.getByRole('button',{name:'새로고침'}));
   await expect.poll(()=>scroller.evaluate(n=>n.scrollTop)).toBe(scrollBefore);
   await tap(page,detail.getByRole('button',{name:'노선정보'}));await expect(detail.locator('.dj-bus-detail-info')).toHaveCount(3);
   await tap(page,detail.getByRole('button',{name:'노선정보'}));await expect(detail.locator('.dj-bus-detail-stop')).toHaveCount(24);
   await tap(page,detail.getByRole('button',{name:'지도 보기'}));await expect(detail).toBeHidden();await expect(sheet).toBeHidden();await expect(dock).toBeVisible();await expect(page.locator('.topbar')).toBeVisible();
   await expect.poll(()=>dock.evaluate(n=>{const d=n.getBoundingClientRect(),s=document.querySelector('#map .maplibregl-ctrl-scale')?.getBoundingClientRect();return Boolean(s&&s.width>0&&d.left>=s.right+5&&Math.abs(d.bottom-s.bottom)<=12&&d.right<=innerWidth-10);})).toBe(true);
   const clearTarget=await dock.getByRole('button',{name:'노선 표시 해제',exact:true}).boundingBox();expect(clearTarget.width).toBeGreaterThanOrEqual(90);expect(clearTarget.height).toBeGreaterThanOrEqual(44);
   const detailTarget=await dock.getByRole('button',{name:'152 노선 상세'}).boundingBox();expect(Math.abs(detailTarget.width-clearTarget.width)).toBeLessThanOrEqual(1);expect(detailTarget.height).toBeGreaterThanOrEqual(44);
   await tap(page,dock.getByRole('button',{name:'152 노선 상세'}));await expect(detail).toBeVisible();await expect(sheet).toBeHidden();
   await tap(page,detail.getByRole('button',{name:'노선 상세 닫기'}));await expect(detail).toBeHidden();await expect(dock).toBeHidden();
 }else{await tap(page,page.locator('#transport-close'));await expect(sheet).toBeHidden();}
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
 const add=settings.getByRole('switch',{name:label+' 상단 바로가기 고정',exact:true});await add.scrollIntoViewIfNeeded();await add.click();await expect(add).toHaveAttribute('aria-checked','true');
 await settings.getByRole('button',{name:'레이어 설정 닫기'}).click();await expect(settings).toBeHidden();
 const shortcut=page.locator('#djNext-rail [data-shortcut="'+key+'"]');await expect(shortcut).toBeVisible();await shortcut.scrollIntoViewIfNeeded();return shortcut;
}
test('phone toolbar has compact adaptive slots, three saved shortcuts maximum and no overlapping legacy controls',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 const rail=page.locator('#djNext-rail'),nav=page.locator('#bottom-nav'),panel=page.locator('#djNext-layer-panel');
 await expect(rail).toBeVisible();await expect(rail.locator('button.djNext-tool')).toHaveCount(5);await expect(rail.locator('button.djNext-tool').first()).toHaveCSS('height','54px');
 await expect(rail.locator('.djNext-empty')).toHaveCount(1);
 const assertLayerRight=async()=>{await expect.poll(()=>rail.evaluate(n=>{const r=n.getBoundingClientRect(),b=n.querySelector('#djNext-layers').getBoundingClientRect();return Math.abs(r.right-b.right)})).toBeLessThanOrEqual(2);};
 await assertLayerRight();
 for(const id of ['dj-v794-more','dj-v794-night','dj831-scrollport','dj-v794-safety'])await expect(page.locator('#'+id)).toBeHidden();
 await expect(page.locator('#dj-v794-toolbar [data-poi-group]:visible')).toHaveCount(0);
 await expect(page.locator('#djNext-mic')).toBeVisible();
 await tap(page,rail.locator('.djNext-empty').first());
 await expect(panel).toBeVisible();
 await expect(panel.locator('.djNext-layer-grid')).toHaveCount(2);
 const layerAction=panel.locator('.djNext-layer-action').first();await expect(layerAction).toHaveCSS('box-shadow',/^rgba?\([^)]*\) 0px 1px 3px 0px$/);await expect(layerAction).toHaveCSS('border-top-left-radius','999px');await expect(panel.locator('.djNext-layer-tile')).toHaveCount(0);
 await expect(panel.locator('.djNext-shortcut-switch').first()).toHaveCSS('box-shadow','none');
 await expect(panel.locator('.djNext-layer-grid').first()).toHaveCSS('grid-template-columns',/^[0-9.]+px$/);await expect.poll(()=>panel.locator('.djNext-layer-row').first().evaluate(n=>{const a=n.querySelector('.djNext-layer-action').getBoundingClientRect(),b=n.querySelector('.djNext-shortcut-switch').getBoundingClientRect();return Math.abs(a.top-b.top)<=2&&b.left>=a.right+4;})).toBe(true);
 await expect(panel.locator('.djNext-pin')).toHaveCount(0);await expect(panel.getByText('기능 열기',{exact:true})).toHaveCount(0);
 const slopeAction=panel.getByRole('button',{name:'경사도 지도 기능',exact:true});const slopeState=await slopeAction.getAttribute('aria-pressed');
 for(const label of ['보행안전','경사도','야간시야']){
   const b=panel.getByRole('switch',{name:label+' 상단 바로가기 고정',exact:true});await expect(b).toHaveAttribute('aria-checked','false');await b.scrollIntoViewIfNeeded();await b.click();await expect(b).toHaveAttribute('aria-checked','true');
 }
 expect(await slopeAction.getAttribute('aria-pressed')).toBe(slopeState);await expect(panel).toBeVisible();
 await expect(panel.locator('.djNext-count')).toHaveText('상단 바로가기 3/3');
 await expect(panel.getByRole('switch',{name:'보차혼용 상단 바로가기 고정',exact:true})).toBeDisabled();
 await expect(rail.locator('[data-shortcut]')).toHaveCount(3);
 await expect(rail.locator('.djNext-empty')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dongjak-phone-shortcuts-v2')))).toEqual(['pilot','slope','night']);
 await panel.getByRole('button',{name:'레이어 설정 닫기'}).click();await expect(panel).toBeHidden();
 await assertLayerRight();
 const scroll=rail.locator('#djNext-scroll');await expect.poll(()=>scroll.evaluate(n=>n.scrollWidth-n.clientWidth)).toBeGreaterThan(8);await expect(scroll).toHaveAttribute('data-overflow-right','true');
 await scroll.evaluate(n=>{n.scrollLeft=n.scrollWidth;});await expect(scroll).toHaveAttribute('data-overflow-left','true');await assertLayerRight();
 await scroll.evaluate(n=>{n.scrollLeft=0;});await tap(page,page.locator('#djNext-layers'));await expect(panel).toBeVisible();
 const remove=panel.getByRole('switch',{name:'경사도 상단 바로가기 고정',exact:true});await remove.scrollIntoViewIfNeeded();await remove.click();await expect(remove).toHaveAttribute('aria-checked','false');
 await expect(panel.locator('.djNext-count')).toHaveText('상단 바로가기 2/3');
 await expect(panel.getByRole('switch',{name:'보차혼용 상단 바로가기 고정',exact:true})).toBeEnabled();
 await panel.getByRole('button',{name:'레이어 설정 닫기'}).click();await expect(panel).toBeHidden();
 await expect(rail.locator('.djNext-empty')).toHaveCount(0);
 await expect(rail.locator('button.djNext-tool')).toHaveCount(6);
 await assertLayerRight();
 const fit=await rail.evaluate(n=>{const r=n.getBoundingClientRect();const bs=[...n.querySelectorAll('button.djNext-tool')].map(x=>x.getBoundingClientRect());return bs.every((x,i)=>x.left>=r.left-1&&x.right<=r.right+1&&x.width>=40&&Math.abs(x.height-54)<1&&Math.abs(x.top-bs[0].top)<1&&(i===0||x.left>=bs[i-1].right-1))});expect(fit).toBe(true);
 await page.evaluate(()=>{window.__railSamples=[];let n=0;const sample=()=>{const rail=document.getElementById('djNext-rail'),p=rail?.parentElement,c=p?getComputedStyle(p):null;window.__railSamples.push(!!rail&&!!c&&c.visibility==='visible'&&c.display!=='none'&&Number(c.opacity)>.98);if(n++<60)requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 await tap(page,tab(page,'map'));
 await expect.poll(()=>page.evaluate(()=>window.__railSamples.length)).toBeGreaterThan(20);
 expect(await page.evaluate(()=>window.__railSamples.every(Boolean))).toBe(true);
 await expect(page.locator('#djNext-toolbar')).toBeVisible();
 await expect.poll(()=>nav.evaluate(n=>Math.round(innerHeight-n.getBoundingClientRect().bottom))).toBeLessThanOrEqual(4);
 await test.info().attach('phone-six-slot-toolbar',{body:await page.screenshot(),contentType:'image/png'});
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
 // Verify the rendered CSS cascade: legacy v864 had a higher-specificity 48% scrim and 5px blur.
 const backdrop=await overlay.evaluate(n=>{
   const style=getComputedStyle(n);
   return {background:style.backgroundColor,blur:style.backdropFilter,webkitBlur:style.webkitBackdropFilter};
 });
 expect(backdrop.background).toBe('rgb(237, 243, 239)'); // Full-screen tour has an opaque theme surface.
 expect(backdrop.blur||'none').toBe('none');
 expect(backdrop.webkitBlur||'none').toBe('none');
 await visuallyPresented(image);
 await expect.poll(async()=>{
   const p=await content.boundingBox(),c=await copy.boundingBox();
   return p&&c?c.y-p.y:1000;
 }).toBeLessThanOrEqual(30);
 await expect.poll(async()=>{const p=await overlay.boundingBox(),v=page.viewportSize();return p?Math.abs(p.x)+Math.abs(p.y)+Math.abs(p.width-v.width)+Math.abs(p.height-v.height):999;}).toBeLessThanOrEqual(2);
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
 const advanced=body.locator('#dj-route-advanced');
 await expect(advanced).toBeVisible();
 await tap(page,advanced.locator(':scope > summary'));
 await expect(advanced).toHaveAttribute('open','');
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
 const mineHeader=mine.locator(':scope > .dj-sheet-chrome');await geometry(page,'#mine-panel');
 // Full-page account headers no longer expand, collapse, or swipe-dismiss.
 const before=await mine.boundingBox(),headerBox=await mineHeader.boundingBox();
 const px=headerBox.x+headerBox.width*.28,py=headerBox.y+headerBox.height*.66;
 await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(px,py+105,{steps:10});await page.mouse.up();
 await expect(mine).toBeVisible();await expect(mine).not.toHaveClass(/dj871-sheet-expanded/);
 const after=await mine.boundingBox();expect(Math.abs(after.y-before.y)).toBeLessThan(2);
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
 await tap(page,page.locator('#mine-panel .dj834-choice-settings:not([hidden]) [data-dj834-theme=dark]'));
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
test('phone route comparison uses actual pedestrian graph and conservative PRI evidence',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 await page.evaluate(()=>{for(const [which,lng,lat,name] of [['start',126.960,37.510,'검증용 출발지'],['end',126.962,37.512,'검증용 목적지']])window.dispatchEvent(new CustomEvent('dongjak:route-select',{detail:{which,place:{lng,lat,name}}}))});
 await expect(page.locator('#route-start-label')).toHaveText('검증용 출발지',{timeout:30000});
 await expect(page.locator('#route-end-label')).toHaveText('검증용 목적지');
 const routeScreen=page.locator('#dj-route-v3');
 await expect(routeScreen).toBeVisible({timeout:15000});
 const newCalc=routeScreen.locator('.action');
 await expect(newCalc).toBeEnabled({timeout:15000});
 await expect.poll(()=>newCalc.evaluate(button=>{
  const r=button.getBoundingClientRect(),nav=document.getElementById('bottom-nav')?.getBoundingClientRect();
  // The V3 CTA is inside Shadow DOM: the document-level hit target
  // is the shadow host, not the rendered button.
  const hit=button.getRootNode().elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return Boolean(nav&&r.width>0&&r.height>=50&&r.bottom<=nav.top-5&&
    (hit===button||button.contains(hit)));
 }),{timeout:12000}).toBe(true);
 await newCalc.click({timeout:15000});
 const cards=page.locator('#dj-route-choice-list .dj-route-choice'),summary=page.locator('#route-map-card');
 await expect(summary).toBeVisible({timeout:60000});
 await expect(cards.first()).toBeVisible({timeout:15000});
 const count=await cards.count();
 expect(count).toBeGreaterThanOrEqual(1);
 expect(count).toBeLessThanOrEqual(2);
 const viewport=page.viewportSize().width;
 await expect.poll(()=>summary.evaluate(n=>{
  const r=n.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.width>0;
 })).toBe(true);
 const labels=await cards.allTextContents();
 expect(labels.every(x=>!/종합 최적|환승 경로/.test(x))).toBe(true);
 expect(labels.some(x=>/PRI 미평가|PRI [0-9.]+점/.test(x))).toBe(true);
 // No extra third route-details screen. Risk map and legend are inline.
 await expect(page.locator('#dj-route-pri-detail')).toHaveCount(0);
 await expect(page.locator('#dj-route-pri-legend')).toBeVisible();
 if(count===2){
  await cards.nth(1).click();
  await expect(cards.nth(1)).toHaveAttribute('aria-pressed','true');
 }
 await test.info().attach('phone-real-route-comparison',{body:await page.screenshot(),contentType:'image/png'});
});

test('phone weather single window and layer grid dark surfaces, header stays fixed',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 await tap(page,page.locator('#djNext-weather'));
 const weather=page.locator('#dj854-weather-sheet');
 await expect(weather).toBeVisible();await expect(page.locator('#dj833-weather-sheet')).toBeHidden();
 // The weather sheet bottom follows the REAL navigation top on iOS PWAs.
 await expect.poll(async()=>{
   const panel=await weather.boundingBox(),dock=await page.locator('#bottom-nav').boundingBox();
   return panel&&dock?Math.round(dock.y-(panel.y+panel.height)):-100;
 }).toBeGreaterThanOrEqual(4);
 await expect.poll(async()=>{
   const panel=await weather.boundingBox(),dock=await page.locator('#bottom-nav').boundingBox();
   return panel&&dock?Math.round(dock.y-(panel.y+panel.height)):100;
 }).toBeLessThanOrEqual(16);
 // Weather location must be fully BELOW the heading separator, never on it.
 const head=await weather.locator('.dj854-weather-head').boundingBox();
 const place=await weather.locator('.dj854-weather-place').boundingBox();
 expect(place.y).toBeGreaterThanOrEqual(head.y+head.height+3);
 await expect(weather.locator('[data-weather-location]')).toBeVisible();
 await expect(page.locator('#dj840-map-tip')).toBeHidden();
 // The weather information card intentionally has no grip or expanded state.
 await expect(weather.locator('.dj-weather-edge-drag')).toHaveCount(0);
 await expect(weather).toHaveAttribute('data-dj-fixed-size','true');
 await weather.locator('.dj854-weather-head h2').click();
 await expect(weather).not.toHaveClass(/dj871-sheet-expanded/);
 // Keep the measured scale on the map only; a weather sheet above the
 // bottom nav must suppress both the MapLibre corner and its scale chip.
 const mapScale=page.locator('#map .maplibregl-ctrl-scale');
 await expect(mapScale).toBeHidden();
 await weather.getByRole('button',{name:'날씨창 닫기'}).click();await expect(weather).toBeHidden();
 // The existing scale returns when the weather overlay has fully closed.
 await expect(mapScale).toBeVisible();
 await expect(page.locator('.map-actions > #toggle-road-width')).toBeHidden();
 await tap(page,tab(page,'mine'));
 await expect(page.locator('#mine-panel [data-dj834-action=theme]')).toHaveCount(0);
 await expect(page.locator('#app')).toHaveAttribute('data-theme','light');
 await tap(page,tab(page,'map'));
 await tap(page,page.locator('#djNext-layers'));
 const modal=page.locator('#djNext-layer-panel'),scroll=modal.locator('.djNext-layer-scroll'),header=modal.locator('header');
 await expect(page.locator('#app')).toHaveAttribute('data-dj-next-last-action','djNext-layers');
 await expect(page.locator('#app')).toHaveAttribute('data-dj-next-layer-action','open');
 await expect(modal).toBeVisible();await expect(scroll).toBeVisible();await expect(header).toBeVisible();
 const bounds=async()=>await header.boundingBox();
 // The sheet moves vertically during its intentional entry animation.
 // Scroll-lock geometry is meaningful only after that movement settles.
 // Await actual browser animation completion (not a guessed sleep).
 await modal.evaluate(async node=>{
   // iOS sheet entry may animate its OUTER surface while the inner scroll
   // body has no own animation. Await both rather than sampling a moving
   // header and mistaking its intentional 140px entry for scroll drift.
   const nodes=[node,node.querySelector('.djNext-modal-body')].filter(Boolean);
   const animations=[...new Set(nodes.flatMap(el=>el.getAnimations({subtree:false})))];
   await Promise.all(animations.filter(animation=>{
     const end=animation.effect?.getComputedTiming?.().endTime;
     return animation.playState!=='finished' && Number.isFinite(end);
   }).map(animation=>animation.finished.catch(()=>{})));
 });
 await expect.poll(async()=>{const h=await bounds(),b=await scroll.boundingBox();return h&&b?Math.abs(h.y+h.height-b.y)<2:false}).toBe(true);
 // Require the layer header position to settle across actual paint frames
 // before asserting that the child scrolling area cannot move it.
 await expect.poll(async()=>{
   const before=await bounds();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const after=await bounds();
   return before&&after?Math.abs(before.y-after.y)<0.6:false;
 }).toBe(true);
 const before=await bounds();await scroll.evaluate(n=>n.scrollTop=n.scrollHeight);const after=await bounds();
 expect(Math.abs(before.y-after.y)).toBeLessThan(2);
 const toggle=modal.getByRole('switch').last();await expect(toggle).toHaveAttribute('aria-checked','false');
 // The ordinary app is light-only. #a5b5ad is its neutral OFF track;
 // #53615d belonged to the removed dark-mode UI and is no longer a valid
 // expectation. Verify the switch actually changes appearance and state.
 const track=toggle.locator('.djNext-switch-track');
 await expect(track).toHaveCSS('background-color','rgb(165, 181, 173)');
 await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','true');
 await expect(track).not.toHaveCSS('background-color','rgb(165, 181, 173)');
 await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','false');
 await modal.getByRole('button',{name:'레이어 설정 닫기'}).click();await expect(modal).toBeHidden();
});
test('phone report composer has non-overlapping independent header and input scroll',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);await tap(page,page.locator('#djNext-report'));
 const form=page.locator('#community-form'),scroll=form.locator('.djNext-form-scroll'),head=form.locator('.community-form-top');
 await expect(form).toBeVisible();await expect(scroll).toBeVisible();
 const title=form.locator('#community-title');await title.scrollIntoViewIfNeeded();await title.focus();
 const h=await head.boundingBox(),b=await scroll.boundingBox();expect(b.y>=h.y+h.height-1).toBe(true);
 const before=await head.boundingBox();await scroll.evaluate(n=>n.scrollTop=n.scrollHeight);const after=await head.boundingBox();expect(Math.abs(before.y-after.y)).toBeLessThan(2);
 const submit=form.locator('button[type=submit]');await expect(submit).toBeVisible();
 await expect.poll(async()=>{
   const btn=await submit.boundingBox(),lane=await scroll.boundingBox(),dock=await page.locator('#bottom-nav').boundingBox();
   return !!btn&&!!lane&&!!dock&&btn.y>=lane.y&&btn.y+btn.height<=lane.y+lane.height+2&&btn.y+btn.height<dock.y-2;
 }).toBe(true);
 await form.locator('#community-compose-close').click();await expect(form).toBeHidden();
});


test('phone windows share the opaque gradual slide on open and close',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await ready(page);
 // The old djNext layer/weather launcher was removed by the independent
 // map controls. This case checks the two live full-page tab transitions
 // involved in routing; other active layer/weather tests live elsewhere.
 await tap(page,tab(page,'route'));
 const routeScreen=page.locator('#dj-route-v3');
 await expect(routeScreen).toBeVisible({timeout:15000});
 await expect(page.locator('#app')).toHaveAttribute('data-tab','route');
 await expect(page.locator('#route-panel')).toHaveCSS('clip-path','inset(100%)');
 await routeScreen.locator('[data-v3="close"]').click();
 await expect(routeScreen).toBeHidden();
 await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
 await tap(page,tab(page,'mine'));
 const mine=page.locator('#mine-panel');
 await expect(mine).toBeVisible();
 await expect.poll(()=>mine.getAttribute('data-dj810-animating')).toBeNull();
 await expect(mine).toHaveCSS('opacity','1');
 await expect(page.locator('#bottom-nav')).toBeVisible();
 await tap(page,mine.locator('.dj-sheet-chrome-close'));
 await expect(mine).toBeHidden();
 await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
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


test('ordinary light-only startup has no manual theme dialog; night visibility remains available',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 const root=page.locator('#app');
 await expect(root).toHaveAttribute('data-theme','light');
 await expect(page.locator('#theme-toggle')).toHaveCount(0);
 await expect(page.locator('#mine-panel [data-dj834-action=theme]')).toHaveCount(0);
 await expect(page.locator('#dj840-theme-confirm')).toBeHidden();
 await expect(page.locator('#night-visibility-toggle')).toHaveCount(1);
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
    const opacityAnimation=n.getAnimations?.({subtree:false})?.some(animation=>{const keyframes=animation.effect?.getKeyframes?.()||[];const values=keyframes.map(k=>Number(k.opacity)).filter(Number.isFinite);return values.length>=2&&Math.max(...values)-Math.min(...values)>.5;})||false;
    frames.push({phase:n.dataset.dj810Animating,y:r.top,height:r.height,visibleBottom:Math.min(d.bottom,r.bottom-clipped),navTop:nav.getBoundingClientRect().top,opacity:Number(s.opacity),opacityAnimation,animation:s.animationName,duration:Number(n.dataset.djWindowMotionDuration)});}
   requestAnimationFrame(tick);}requestAnimationFrame(tick);
 });
 // Click synchronously after starting the in-page sampler: mobile automation
 // can postpone a high-level tap until the entrance has already finished.
 await trigger.evaluate(button=>button.click());await expect(modal).toBeVisible();await expect.poll(()=>card.getAttribute('data-dj810-animating')).toBeNull();const final=await card.boundingBox(),nav=await page.locator('#bottom-nav').boundingBox();expect(final.y+final.height).toBeLessThanOrEqual(nav.y-3);
 await page.evaluate(()=>document.getElementById('version-history-close').click());await expect(modal).toBeHidden();
 const frames=await page.evaluate(()=>window.__historyMotionFrames);for(const [phase,duration] of [['opening',200],['closing',180]]){
  // The compositor can coalesce frames of a 180ms fade under CI load.
   // Still verify duration, clipping, geometry, intermediate alpha, and monotonicity.
   const a=frames.filter(f=>f.phase===phase);expect(a.length).toBeGreaterThan(0);expect(a.every(f=>f.duration===duration&&f.animation==='none'&&Math.abs(f.y-final.y)<=3&&f.visibleBottom<=f.navTop-3&&Math.abs(f.height-final.height)<4)).toBe(true);
  expect(a.some(f=>f.opacity>0&&f.opacity<1)||a.some(f=>f.opacityAnimation),'a real opacity animation must exist even when CI coalesces every intermediate paint frame').toBe(true);
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
 // Emptying the query auto-dismisses suggestions; the close icon is now hidden.
 await expect(results).toBeHidden();
});

test('primary tabs reveal content without fading the opaque page and keep the pill dock',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 await tap(page,tab(page,'mine'));await expect(page.locator('#mine-panel')).toBeVisible();await expect.poll(()=>page.locator('#mine-panel').getAttribute('data-dj810-animating')).toBeNull();
 // Use the same real content sampler for direct tab-to-tab and map return.
 await enter(page,'news-panel','news');
 await expect(page.locator('#mine-panel')).toBeHidden();
 await expect(page.locator('#bottom-nav')).toHaveCSS('border-top-left-radius','999px');
 await expect(page.locator('#bottom-nav')).toHaveAttribute('data-dj-motion-indicator','ready');
 // The older moving selection plate is intentionally hidden. Active icon
 // and text provide selection without a tinted block.
 await expect(page.locator('#bottom-nav > .dj-motion-indicator')).toBeHidden();
 await expect(page.locator('#bottom-nav > .dj-motion-indicator')).toHaveCSS('display','none');
 await expect.poll(()=>page.locator('#bottom-nav').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length)).toBe(5);
 const selected=await page.locator('#bottom-nav').evaluate(el=>{
  const active=el.querySelector('.nav-tab[aria-current=page]'),inactive=el.querySelector('.nav-tab:not(.active)');
  return {background:getComputedStyle(active).backgroundColor,
   selectedInk:getComputedStyle(active).color,inactiveInk:getComputedStyle(inactive).color};
 });
 expect(['transparent','rgba(0, 0, 0, 0)']).toContain(selected.background);
 expect(selected.selectedInk).not.toBe(selected.inactiveInk);
 await tap(page,tab(page,'map'));await expect(page.locator('#news-panel')).toBeHidden();await expect.poll(()=>page.locator('#app').getAttribute('data-dj-pilot-lock-count')).toBe('0');
 // Returning from the map is a fresh stationary fade for the previous tab.
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


test('iPhone flat loading surface shares the native status-strip tone',{tag:'@phone-common'},async({page})=>{
  const ua=await page.evaluate(()=>navigator.userAgent);
  test.skip(!/iPhone/.test(ua),'iOS PWA only');
  await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  await ready(page);
  const colors=await page.evaluate(async()=>{
    const overlay=document.getElementById('map-startup-overlay');
    overlay.hidden=false;overlay.classList.remove('is-hidden');
    // iOS native status sampling is frame-synchronized by a MutationObserver.
    // Assert AFTER the real UI has reconciled the loading/onboarding priority.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const style=getComputedStyle(overlay);
    const status=getComputedStyle(document.getElementById('dj-ios-pwa-status-sample'));
    return {start:style.getPropertyValue('--start-bg').trim(),
      gradient:style.backgroundImage,
      status:status.backgroundColor,
      runtime:getComputedStyle(document.documentElement).getPropertyValue('--dj-pwa-status-color').trim(),
      meta:document.querySelector('meta[name="theme-color"]').content};
  });
  expect(colors.start).toBe('#edf3ef');
  expect(colors.runtime).toBe(colors.start);
  expect(colors.meta).toBe(colors.start);
  expect(colors.status).toBe('rgb(237, 243, 239)');
  expect(colors.gradient).toBe('none');
  await test.info().attach('iphone-startup-status-continuity',{body:await page.screenshot(),contentType:'image/png'});
});

test('iOS PWA status edge stays flat when a dialog opens',{tag:'@phone-common'},async({page})=>{
 const ua=await page.evaluate(()=>navigator.userAgent);test.skip(!/iPhone/.test(ua),'iOS PWA only');
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
 await ready(page);
 const root=page.locator('html'),bridge=page.locator('#app > #dj-ios-pwa-status-bridge');
 await expect(root).toHaveClass(/dj-ios-home-pwa/);
 await expect(bridge).toHaveCount(1);await expect(bridge).toHaveCSS('opacity','0');
 const dialog=page.locator('#dj-pri-dialog');await dialog.evaluate(n=>n.showModal());await expect(dialog).toBeVisible();
 await expect(root).toHaveAttribute('data-dj-pwa-dimmed','false');await expect(bridge).toHaveCSS('opacity','0');
 const style=await bridge.evaluate(n=>{const c=getComputedStyle(n),r=n.getBoundingClientRect();return {gradient:c.backgroundImage,pointer:c.pointerEvents,top:r.top,height:r.height,color:getComputedStyle(document.documentElement).getPropertyValue('--dj-pwa-status-color').trim()};});
 expect(style.gradient).toBe('none');expect(style.pointer).toBe('none');expect(style.height).toBe(0);expect(style.color).toBe('#edf3ef');
 const sample=page.locator('body > #dj-ios-pwa-status-sample');await expect(sample).toHaveCSS('background-color','rgb(237, 243, 239)');await expect(sample).toHaveCSS('position','fixed');const sr=await sample.boundingBox();expect(sr.height).toBeGreaterThanOrEqual(6);expect(sr.y).toBe(0);expect(sr.width).toBeGreaterThanOrEqual(page.viewportSize().width*.8);
 await test.info().attach('ios-pwa-flat-status',{body:await page.screenshot(),contentType:'image/png'});
 await dialog.evaluate(n=>n.close());await expect(dialog).toBeHidden();await expect(bridge).toHaveCSS('opacity','0');
 // The AI dialog, native status sample and page background share one opaque tone; no dimmer.
 const ai=page.locator('#dj-ai-search-modal');await expect(ai).toBeAttached();await ai.evaluate(n=>n.showModal());
 await expect(root).toHaveAttribute('data-dj-pwa-dimmed','false');await expect(bridge).toHaveCSS('opacity','0');
 const native=await ai.evaluate(n=>({image:getComputedStyle(n,'::backdrop').backgroundImage,color:getComputedStyle(n,'::backdrop').backgroundColor}));
 expect(native.image).toBe('none'); // The top-layer dialog has no backdrop gradient.
 expect(native.color).toBe('rgba(0, 0, 0, 0)'); // Nor any default browser dimmer.
 await expect(ai).toHaveCSS('background-color','rgb(237, 243, 239)');
 await expect(sample).toHaveCSS('background-color','rgb(237, 243, 239)');
 await expect(root).toHaveCSS('background-color','rgb(237, 243, 239)');
 await expect(page.locator('body')).toHaveCSS('background-color','rgb(237, 243, 239)');
 await ai.evaluate(n=>n.close());await expect(root).toHaveAttribute('data-dj-pwa-dimmed','false');
 // Dark theme palette is tested in the same DOM without requiring an OS-controlled reload.
 await page.evaluate(()=>document.getElementById('app').dataset.theme='dark');await expect.poll(()=>root.evaluate(n=>getComputedStyle(n).getPropertyValue('--dj-pwa-status-color').trim())).toBe('#22282e');
 await expect(sample).toHaveCSS('background-color','rgb(34, 40, 46)');await expect(page.locator('body')).toHaveCSS('background-color','rgb(34, 40, 46)');
});


// On a phone the train feed is intentionally zoom-gated to protect the Seoul daily quota.
// Drive real MapLibre input instead of forcing internal map state.
async function changeLiveTrainZoom(page,near){
 const canvas=page.locator('#map canvas.maplibregl-canvas').first();
 await expect(canvas).toBeVisible();
 const box=await canvas.boundingBox();
 expect(box).toBeTruthy();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.46);
 for(let i=0;i<9;i++){await page.mouse.wheel(0,near?-700:700);await page.waitForTimeout(110);}
 await page.waitForTimeout(1400);
}
test('metro feed is requested only near the tracks and distant symbols disappear',{tag:'@phone-common'},async({page})=>{
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
 expect(calls,'do not spend subway API calls below metroMinZoom').toBe(0);
 await changeLiveTrainZoom(page,true);
 await expect.poll(()=>calls,{timeout:60000}).toBeGreaterThan(0);
 await expect(map).toHaveAttribute('data-dj-live-train-artwork','atlas',{timeout:60000});
 await expect.poll(async()=>{
   const value=await map.getAttribute('data-dj-live-train-diagnostics');
   if(!value)return 0;
   try{return Number(JSON.parse(value).features||0);}catch{return 0;}
 },{timeout:60000}).toBeGreaterThan(0);
 let diagnostics=JSON.parse(await map.getAttribute('data-dj-live-train-diagnostics'));
 expect(diagnostics.minimum).toBe(13.0);
 expect(diagnostics.zoom).toBeGreaterThanOrEqual(13.0);
 expect(diagnostics.feed).toBeGreaterThan(0);
 await changeLiveTrainZoom(page,false);
 await expect.poll(async()=>{
   const raw=await map.getAttribute('data-dj-live-train-diagnostics');
   if(!raw)return 99;
   try{return Number(JSON.parse(raw).zoom)}catch{return 99}
 },{timeout:60000}).toBeLessThan(13.0);
 await expect.poll(()=>map.getAttribute('data-dj-live-train-rendered'),{timeout:60000}).toBe('0');
 await test.info().attach('distant-train-icons-hidden',{body:await page.screenshot(),contentType:'image/png'});
});

test('route title cannot swipe-dismiss the full page; composer report returns directly to map',{tag:'@phone-common'},async({page,browserName})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);await tap(page,tab(page,'route'));
 const panel=page.locator('#route-panel'),header=panel.locator(':scope > .dj-sheet-chrome');await visuallyPresented(panel);
 await expect(panel.locator(':scope > .dj836-sheet-body')).toHaveCSS('touch-action','pan-y');await geometry(page,'#route-panel');
 const title=header.locator('h2'),box=await title.boundingBox();const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
 await expect.poll(()=>panel.getAttribute('data-dj810-animating')).toBeNull();
 const client=browserName==='chromium'?await page.context().newCDPSession(page):null;
 try{if(client){await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+Math.round(i*18)}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+145,{steps:8});await page.mouse.up();}await expect(panel).toBeVisible();await geometry(page,'#route-panel');}finally{await client?.detach();}
 await tap(page,panel.locator('.dj-sheet-chrome-close'));await expect(panel).toBeHidden();
 await tap(page,page.locator('#djNext-report'));const form=page.locator('#community-form');await expect(form).toBeVisible();
  await expect(page.locator('#participation-panel')).toHaveClass(/dj9256-composing/);
  await expect(page.locator('#app')).toHaveAttribute('data-tab','participate');
  await expect(page.locator('#app')).toHaveAttribute('data-dj806-active-surface','participation-panel');
  await expect(page.locator('#app > .topbar')).toBeHidden();
  await expect(page.locator('#app > .topbar')).toHaveCSS('display','none');
  const reportPanel=page.locator('#participation-panel');
  if(await page.locator('#app').getAttribute('data-tab')==='map'){
    await expect(reportPanel).toHaveCSS('pointer-events','auto');
    await expect.poll(()=>reportPanel.evaluate(n=>Number.parseInt(getComputedStyle(n).zIndex,10))).toBeGreaterThanOrEqual(12000);
  }
 const consent=form.locator('#community-share-publicly');await expect(consent).toHaveCSS('width','20px');
 expect(await form.evaluate(n=>Boolean(n.querySelector('#community-share-publicly').compareDocumentPosition(n.querySelector('[type=submit]'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 await tap(page,form.locator('#community-compose-close'));await expect(page.locator('#participation-panel')).toBeHidden();await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
 await tap(page,tab(page,'participate'));await expect(form).toHaveAttribute('hidden','');await expect(page.locator('#community-compose-toggle')).toBeVisible();await tap(page,page.locator('#community-compose-toggle'));await expect(form).toBeVisible();await tap(page,form.locator('#community-compose-close'));await expect(form).toBeHidden();await expect(page.locator('#participation-panel')).toBeVisible();
});

 test('official daily train quota is communicated and does not repeatedly query the feed',{tag:'@phone-common'},async({page})=>{
 let calls=0;
 await page.addInitScript(()=>{
   localStorage.setItem('dongjak_live_vehicle_options_v827',JSON.stringify({metro:true,bus:false}));
   localStorage.setItem('dongjak_basemap_layers_v1',JSON.stringify({metro:true,bus:true,buildings:true,boundary:true}));
 });
 await page.route('**/api/transport/live-vehicles**',async route=>{
   calls++;
   await route.fulfill({status:429,json:{ok:false,code:'ERROR-337',retryAfterSeconds:3600,error:'일일 조회량 초과'}});
 });
 await ready(page);
 expect(calls,'distant zoom must not consume a quota request').toBe(0);
 await changeLiveTrainZoom(page,true);
 await expect(page.locator('[data-live-vehicle="metro"]')).toHaveAttribute('data-live-quota','true',{timeout:60000});
 await expect(page.locator('#dj-live-vehicle-status')).toContainText('일일 조회량을 초과');
 await tap(page,page.locator('#djNext-layers'));
 await expect(page.locator('[data-layer-key="livemetro"] .djNext-layer-state')).toHaveText('조회 한도 초과');
 expect(calls).toBe(1);
});


test('iPhone tabs never expose white or transparent full-screen panels during switching',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 await tap(page,tab(page,'route'));await expect(page.locator('#route-panel')).toBeVisible();
 // Begin the ongoing compositor sampler AFTER entering the first non-map tab.
 // The old bounded timer expired during tap() hit-testing and recorded 0 frames.
 await page.evaluate(()=>{
  window.__phoneTabFrameAudit=[];
  window.__phoneTabAuditActive=true;
  const frames=window.__phoneTabFrameAudit;
  function frame(){
   if(!window.__phoneTabAuditActive)return;
   const root=document.getElementById('app'),selected=root.dataset.tab;
   if(['route','participate','news','mine'].includes(selected)){
    const panel=document.querySelector('.page-panel[data-page="'+selected+'"]');
    const css=panel?getComputedStyle(panel):null;
    frames.push({selected,
      shown:!!panel&&!panel.hidden&&css?.display!=='none'&&css?.visibility!=='hidden',
      opacity:Number(css?.opacity||0),background:css?.backgroundColor||''});
   }
   requestAnimationFrame(frame);
  }
  frame();
 });
 for(const key of ['news','mine','participate']){
  await tap(page,tab(page,key));
  await expect(page.locator('#app')).toHaveAttribute('data-tab',key);
  await expect(page.locator('.page-panel[data-page="'+key+'"]')).toBeVisible();
  // The CI browser may have only one compositor frame during several quick
  // taps. Verify actual painted frames for EACH destination rather than
  // treating a fixed 100ms wall-clock sleep as six display frames.
  await expect.poll(async()=>page.evaluate(selected=>
    (window.__phoneTabFrameAudit||[]).filter(f=>f.selected===selected).length,key),
    {message:'compositor frames for '+key,timeout:15000,intervals:[100,250,500]}
  ).toBeGreaterThan(1);
 }
 const samples=await page.evaluate(()=>{window.__phoneTabAuditActive=false;return window.__phoneTabFrameAudit;});
 expect(samples.length,'the sampler must observe painted frames on all three destinations').toBeGreaterThan(5);
 const bad=samples.filter(f=>!f.shown||f.opacity<.95||f.background==='rgba(0, 0, 0, 0)'||f.background==='rgb(255, 255, 255)');
 expect(bad,'Missing/white/transparent panel during tab switch: '+JSON.stringify(bad.slice(0,10))).toHaveLength(0);
 await expect(page.locator('#dj-tab-surface-curtain')).toHaveCount(0);
 await tap(page,tab(page,'map'));await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
});

test('bottom dock swipes change full-screen tabs immediately without an intermediate empty panel',{tag:'@phone-common'},async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 await tap(page,tab(page,'route'));
 await expect(page.locator('#dj-route-v3')).toBeVisible();
 const dock=page.locator('#bottom-nav');
 await expect(dock).toHaveAttribute('data-dj-tab-navigation','ready');
 // Diagnostic-only event capture to isolate interception by a modal or the
 // centered HOME button. Does not alter gesture dispatch or test assertions.
 await page.evaluate(()=>{
  const nav=document.getElementById('bottom-nav');
  window.__dockGestureSamples=[];
  for(const type of ['pointerdown','pointerup','pointercancel','click']){
   window.addEventListener(type,event=>{
    if(window.__dockGestureSamples.length>80)return;
    window.__dockGestureSamples.push({type,target:event.target?.id||event.target?.getAttribute?.('class')||event.target?.tagName,
      button:event.button,pointerId:event.pointerId,x:event.clientX,y:event.clientY,
      inDock:event.composedPath?.().includes(nav),trusted:event.isTrusted,tab:document.getElementById('app')?.dataset.tab});
   },true);
  }
 });
 const before=await dock.boundingBox();
 async function swipe(dx){
  const r=await dock.boundingBox();expect(r).toBeTruthy();
  const x=r.x+r.width*.5,y=r.y+r.height*.5;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(x+dx,y,{steps:8});await page.mouse.up();
 }
 await swipe(-85);
 console.log('DOCK_GESTURE_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>{
  const nav=document.getElementById('bottom-nav'),r=nav.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  const layers=document.elementsFromPoint(x,y).slice(0,8).map(n=>({id:n.id,tag:n.tagName,className:n.getAttribute('class'),pointerEvents:getComputedStyle(n).pointerEvents,zIndex:getComputedStyle(n).zIndex}));
  return {tab:document.getElementById('app')?.dataset.tab,events:window.__dockGestureSamples,layers};
 })));
 await expect(page.locator('#app')).toHaveAttribute('data-tab','participate');
 await expect(page.locator('#dj-route-v3')).toBeHidden();
 await expect(page.locator('#participation-panel')).toBeVisible();
 await expect(page.locator('#participation-panel')).toHaveCSS('opacity','1');
 const result=await page.locator('#participation-panel').evaluate(el=>{
  const cs=getComputedStyle(el);
  return {background:cs.backgroundColor,animation:cs.animationName,height:el.getBoundingClientRect().height};
 });
 expect(result.background).not.toBe('rgba(0, 0, 0, 0)');
 expect(result.background).not.toBe('rgb(255, 255, 255)');
 expect(result.height).toBeGreaterThan(80);
 await swipe(85);
 await expect(page.locator('#app')).toHaveAttribute('data-tab','route');
 await expect(page.locator('#participation-panel')).toBeHidden();
 await expect(page.locator('#dj-route-v3')).toBeVisible();
 await tap(page,tab(page,'map'));
 await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
 await expect(page.locator('#dj-route-v3')).toBeHidden();
 const after=await dock.boundingBox();
 expect(Math.abs(before.y-after.y)).toBeLessThan(3);
 await expect(page.locator('#dj-tab-surface-curtain')).toHaveCount(0);
});

test('AI full-screen conversation and inline voice state keep the map task separate',{tag:'@phone-common'},async({page})=>{
 await page.addInitScript(()=>{
  class MockRecognition{start(){this.onstart?.();}abort(){this.onend?.();}}
  Object.defineProperty(window,'SpeechRecognition',{value:MockRecognition,configurable:true});
 });
 await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 const ai=page.locator('#dj-ai-search-modal');await expect(ai).toBeAttached();
 await page.evaluate(()=>{window.__aiAlpha=[];let count=0;function sample(){const n=document.querySelector('#dj-ai-search-modal[open] > .dj-ai-search-body');if(n)window.__aiAlpha.push({a:Number(getComputedStyle(n).opacity),closing:n.parentElement.classList.contains('dj887-ai-closing')});if(++count<1200)requestAnimationFrame(sample);}sample();});
 await tap(page,page.locator('#dj890-ai-orb'));await expect(ai).toBeVisible();await expect.poll(async()=>{const b=await ai.boundingBox(),v=page.viewportSize();return b?Math.abs(b.x)+Math.abs(b.y)+Math.abs(b.width-v.width)+Math.abs(b.height-v.height):999}).toBeLessThanOrEqual(5);
 await expect(ai.locator('.dj-ai-transcript')).toBeVisible();await expect(ai.locator('.dj-ai-composer')).toBeVisible();
 await expect(ai.locator('.dj-ai-preferences')).toBeVisible();await expect(ai.locator('#dj-ai-query')).toBeDisabled();await tap(page,ai.locator('[data-profile="senior"]'));await expect(ai.locator('#dj-ai-query')).toBeEnabled();await expect(ai).toHaveAttribute('data-explanation','senior');await expect(ai.locator('.dj-ai-preferences')).toBeHidden();
 await expect.poll(()=>page.evaluate(()=>window.__aiAlpha.some(x=>!x.closing&&x.a>.1&&x.a<.95))).toBe(true);
 await ai.getByRole('button',{name:'AI 검색 닫기'}).click();await expect(ai).toBeHidden();
 expect(await page.evaluate(()=>window.__aiAlpha.some(x=>x.closing&&x.a>0&&x.a<.95))).toBe(true);
 const mic=page.locator('#djNext-mic'),shell=page.locator('#map-quick-search'),status=page.locator('#djNext-voice-status');
 const form=page.locator('.map-quick-search-form');const before=await form.boundingBox();await tap(page,mic);await expect(mic).toHaveAttribute('aria-pressed','true');await expect(status).toContainText('듣는 중');await expect(status).toHaveCSS('position','static');
 await expect.poll(async()=>{const b=await form.boundingBox();return b&&before?b.height-before.height:0}).toBeGreaterThan(70);await expect(page.locator('#djNext-voice-panel .djNext-voice-wave')).toBeVisible();await expect.poll(async()=>{const a=await mic.boundingBox(),b=await status.boundingBox();return !!a&&!!b&&b.y>a.y+a.height;}).toBe(true);
 await tap(page,mic);await expect(status).toBeHidden();await expect(mic).toHaveAttribute('aria-pressed','false');await expect.poll(async()=>Math.abs((await form.boundingBox()).height-before.height)).toBeLessThanOrEqual(2);
});

test('compact subway sheet shows arrivals before neighbors and has no duplicate selected-line ring',{tag:'@phone-layout'},async({page})=>{
 test.skip(!compact(page),'phone only');await ready(page);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place:{kind:'subway',name:'노량진',lng:126.9411,lat:37.5142,lines:['1호선','9호선'],selectedLine:'1호선'}}})));
 const sheet=page.locator('#transport-sheet');await expect(sheet).toBeVisible();await visuallyPresented(sheet);await expect(sheet).toHaveAttribute('data-dj-transport-layout','compact-v2');
 const buttons=sheet.locator('.dj-news-transport-actions>button');await expect(buttons).toHaveCount(4);
 await expect.poll(async()=>{const b=await buttons.evaluateAll(ns=>ns.map(n=>({r:n.getBoundingClientRect().toJSON(),s:getComputedStyle(n).boxShadow})));return b.length===4&&b.every(x=>Math.abs(x.r.top-b[0].r.top)<1&&Math.abs(x.r.width-b[0].r.width)<2&&x.s!=='none');}).toBe(true);
  await expect.poll(async()=>{
    const h=await sheet.locator('.transport-panel-head').boundingBox();
    const bar=await sheet.locator('.transport-arrivals-title').boundingBox();
    const arrival=await sheet.locator('#transport-arrivals').boundingBox();
    const neighbor=await sheet.locator('#transport-neighbors').boundingBox();
    return !!h&&!!bar&&!!arrival&&!!neighbor
      && bar.y>=h.y+h.height-1
      && neighbor.y>=arrival.y+arrival.height-1;
  }).toBe(true);
 await expect(sheet.locator('#transport-title .dj-metro-line-selector')).toHaveCount(2);
  await expect.poll(async()=>{
    const chosen=sheet.locator('#transport-title .dj-metro-line-selector[aria-pressed=true]');
    return Number.parseFloat(await chosen.evaluate(el=>getComputedStyle(el).borderTopWidth))<2;
  }).toBe(true); // Selection uses the line accent; no redundant 2px dark ring.
 await expect(sheet.locator('.metro-neighbor-row').first()).toHaveCSS('border-top-left-radius','18px');await expect(sheet.locator('.metro-rail-current').first()).toHaveCSS('border-top-left-radius','999px');
 await expect(sheet.locator('#transport-share-place')).toHaveCSS('background-image','none');await expect(sheet.locator('#transport-share-place')).toHaveCSS('box-shadow',/^rgba?\([^)]*\) 0px 1px 3px 0px$/);
 const commonShadow=await page.locator('html').evaluate(n=>getComputedStyle(n).getPropertyValue('--djNext-tool-shadow').trim());expect(commonShadow).toMatch(/^0 1px 3px (?:#[0-9a-f]{3,8}|rgba?\([^)]*\))$/i);await expect.poll(()=>buttons.evaluateAll(ns=>new Set(ns.map(n=>getComputedStyle(n).boxShadow)).size)).toBe(1);
 await expect(sheet.locator('.dj875-transit-scroll')).toHaveCSS('overflow-y','auto');await test.info().attach('compact-metro-v2',{body:await page.screenshot(),contentType:'image/png'});
 if(page.viewportSize().width<700){
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect.poll(()=>sheet.getAttribute('data-dj810-animating')).toBeNull();
  await page.evaluate(()=>{const n=document.getElementById('transport-sheet');window.__metroClose={height:n.getBoundingClientRect().height,frames:[]};function sample(){if(n.hidden)return;const r=n.getBoundingClientRect();window.__metroClose.frames.push({h:r.height,y:r.y,closing:n.dataset.dj810Animating==='closing'});requestAnimationFrame(sample);}sample();});
  await tap(page,sheet.locator('#transport-close'));await expect(sheet).toBeHidden();
  const result=await page.evaluate(()=>window.__metroClose);
  expect(result.frames.some(f=>f.closing)).toBe(true);
  expect(result.frames.every(f=>f.h<=result.height+3),'Closing sheet must never grow: '+JSON.stringify(result)).toBe(true);
 }
});

test('facility close remains actionable when WebKit drops the synthetic click',{tag:'@phone-common'},async({page})=>{
  test.skip(page.viewportSize().width>=700,'phone only');
  await ready(page);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:map-place-selected',{
    detail:{place:{name:'동작도서관',category:'공공기관',address:'서울특별시 동작구 장승배기로 94',lng:126.9304,lat:37.5059}}
  })));
  const popup=page.locator('.dj-place-detail-popup');
  await expect(popup).toBeVisible();
  const close=popup.locator('.dj-place-header-close');
  await expect(close).toBeVisible();
  // Simulate the real pointerup but deliberately omit click, as on a
  // compositor-reparented popup header. Cleanup must still happen exactly once.
  await close.dispatchEvent('pointerup',{isPrimary:true,button:0,pointerType:'touch'});
  await expect(popup).toBeHidden({timeout:5000});
  await expect(page.locator('.dj-place-detail-popup')).toHaveCount(0);
});

test('community tab opens a usable feed and searchable empty state, without fabricated posts',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await ready(page);
 await tap(page,tab(page,'participate'));
 const panel=page.locator('#participation-panel'),feed=panel.locator('#community-list');
 await expect(panel).toBeVisible();
 await expect(feed).toBeVisible();
 const search=panel.locator('#community-search');
 await search.fill('특별히일치할수없는검색어__20261121__');
 await expect(feed.locator('.dj-community-empty-state')).toBeVisible();
 await expect(feed.getByRole('button',{name:'전체 게시글 보기'})).toBeVisible();
 await search.blur();
 const showAll=feed.getByRole('button',{name:'전체 게시글 보기'});
 await showAll.scrollIntoViewIfNeeded();
 await tap(page,showAll);
 await expect(search).toHaveValue('');
 // On a genuinely empty public database, the first-run home must include
 // useful actions. Existing real posts remain visible instead of sample data.
 if(await feed.locator('.dj-community-empty-state').isVisible()){
   // The empty feed uses the single persistent '+ 글쓰기' action.
   // Do not require a second duplicate button in the empty-state card.
   const compose=panel.locator('#community-compose-toggle');
   await expect(compose).toBeVisible();
   await compose.scrollIntoViewIfNeeded();
   await tap(page,compose);
   // The composer is intentionally portaled outside the legacy sheet so
   // the iOS keyboard cannot drag the entire parent page upward.
   const editor=page.locator('#dj-community-editor-portal');
   await expect(editor).toBeVisible();
   await expect(editor.locator('#community-form')).toBeVisible();
   await expect(page.locator('#bottom-nav')).toBeHidden();
   await tap(page,editor.locator('#community-compose-close'));
   await expect(editor).toBeHidden();
   await expect(panel.locator('#community-form')).toBeHidden();
 }
});

test('category-first release history preserves the actual deployment version in the current record',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await ready(page);
 const response=await page.request.get('/version.json');
 expect(response.ok()).toBe(true);
 const version=String((await response.json()).version);
 // The public release screen intentionally groups changes by type, rather than
 // by major/minor/patch editions. The first timeline item can be an archived
 // release; only the explicit current-build marker identifies this deployment.
 const timeline=page.locator('#history-version-timeline');
 const current=timeline.locator('.v707-release[data-current-build="true"]');
 await expect(current.first()).toHaveAttribute('data-version',version);
 await expect(current.first().locator('h4')).toHaveText('최근 변경사항');
 const group=current.first().locator('xpath=ancestor::details[contains(@class,"dj-edition-history")]');
 await expect(group).toHaveAttribute('data-change-type',/^(major|feature|design|fix)$/);
 // Historical records still carry unchanged operational SemVer in data-version;
 // the public button and user-visible pre-release name remain simplified.
 await expect(page.locator('#version-history-trigger')).toContainText('업데이트');
 await expect(timeline.locator('.v707-release').first()).toHaveAttribute('data-version',/^v?\d+\.\d+\.\d+$/);
});


test('focused map search retains AI orb and full-width suggestions with fixed header',{tag:'@phone-layout'},async({page})=>{
  test.skip(page.viewportSize().width>=700,'phone only');
  await ready(page);
  const ai=page.locator('#dj890-ai-orb'),search=page.locator('#map-quick-search');
  const dropdown=page.locator('#map-quick-search-dropdown');
  const mic=page.locator('#djNext-mic'),query=search.locator('#map-quick-search-query');
  await expect(ai).toBeVisible();
  await expect(mic).toBeVisible();
  await query.click();
  // Empty focus hides the map toolbar and shows only the two search actions.
  await expect(dropdown).toBeHidden();
  await expect(page.locator('#dj-search-nearby')).toBeVisible();
  await expect(page.locator('#djNext-toolbar')).toBeHidden();
  await page.getByRole('button',{name:'최근 검색',exact:true}).click();
  await expect(dropdown).toBeVisible();
  await expect(dropdown.locator('.dj-recent-query-title')).toHaveText('최근 검색어');
  await expect(dropdown.locator('.map-quick-search-suggestion')).toHaveCount(0);
  await page.locator('#map-quick-search-close').click();
  await expect(dropdown).toBeHidden();
  await expect(page.locator('#djNext-toolbar')).toBeVisible();
  await query.click();
  await expect(ai).toBeVisible();
  await expect(mic).toBeVisible();
  // The rounded, pill-aligned panel appears only after meaningful input.
  await query.fill('노량진');
  await expect(dropdown).toBeVisible();
  await expect(ai).toBeVisible();
  await expect(mic).toBeVisible();
  await expect(ai).toHaveCSS('pointer-events','auto');
  const sb=await search.boundingBox(),rb=await dropdown.boundingBox(),ab=await ai.boundingBox();
  expect(Math.abs(rb.x-12)).toBeLessThanOrEqual(2);
  expect(Math.abs(rb.x+rb.width-(page.viewportSize().width-12))).toBeLessThanOrEqual(2);
  expect(rb.y).toBeGreaterThanOrEqual(Math.max(sb.y+sb.height,ab.y+ab.height)-2);
  await expect(page.locator('#dj-search-nearby')).toBeVisible();
  await expect(dropdown.locator('.map-quick-search-result small').first()).not.toContainText(/OpenStreetMap|^bus\b|운영 여부 미확인/i);
  const head=dropdown.locator('.map-quick-search-dropdown-head'),body=dropdown.locator('#dj-search-scroll-body');
  const before=await head.boundingBox();await body.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const after=await head.boundingBox();expect(Math.abs(before.height-after.height)).toBeLessThanOrEqual(1);expect(Math.abs(before.y-after.y)).toBeLessThanOrEqual(1);
  const radius=await dropdown.evaluate(node=>parseFloat(getComputedStyle(node).borderTopLeftRadius));
  expect(radius).toBeGreaterThanOrEqual(18);
  await test.info().attach('search-ai-visible',{body:await page.screenshot(),contentType:'image/png'});
});

test('v9.2.53 category-first community and unobstructed nearby expansion',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await ready(page);
 const search=page.locator('#map-quick-search'),ai=page.locator('#dj890-ai-orb');
 await expect(search).toBeVisible();await expect(ai).toBeVisible();
 const sb=await search.boundingBox(),ab=await ai.boundingBox();
 expect(sb.x+sb.width).toBeLessThanOrEqual(ab.x+1);
 await tap(page,tab(page,'participate'));
 const categories=page.locator('#participation-panel .community-category-tabs');
 await expect(categories).toBeVisible();
 const intro=page.locator('#participation-panel .dj-page-intro');
 const cb=await categories.boundingBox(),ib=await intro.boundingBox();
 expect(cb.y+cb.height).toBeLessThanOrEqual(ib.y+2);
 await categories.locator('[data-community-filter="보행 불편"]').click();
 await expect(categories.locator('[data-community-filter="보행 불편"]')).toHaveAttribute('aria-pressed','true');
 await tap(page,tab(page,'map'));
 await page.evaluate(()=>document.getElementById('ped-nearby-open')?.click());
 const panel=page.locator('#ped-tools-panel');await expect(panel).toBeVisible();
 await expect(search).toBeVisible();
 const hb=await search.boundingBox(),pb=await panel.boundingBox();
 expect(hb.y+hb.height).toBeLessThanOrEqual(pb.y+2);
 const header=panel.locator('.ped-tools-panel-head');await expect(header).toBeVisible();
 // The touch must begin on the *settled* visible header. Previously this
 // browser check pressed coordinates while the sheet was still sliding upward;
 // the header moved from under the pointer, so it never tested a real swipe.
 await expect.poll(()=>page.evaluate(()=>{
   const head=document.querySelector('#ped-tools-panel .ped-tools-panel-head');
   const pane=document.getElementById('ped-tools-panel');
   const rect=head?.getBoundingClientRect();
   if(!rect||rect.height<24||rect.bottom>innerHeight||
      pane?.dataset.dj810Animating==='opening')return false;
   const hit=document.elementFromPoint(rect.x+Math.min(64,rect.width/4),rect.y+rect.height/2);
   return hit===head||head.contains(hit);
 }),{timeout:10000}).toBe(true);
 await page.waitForTimeout(380);
 const r=await header.boundingBox();
 await page.mouse.move(r.x+Math.min(64,r.width/4),r.y+r.height/2);
 await page.mouse.down();
 await page.mouse.move(r.x+Math.min(64,r.width/4),r.y+r.height/2-135,{steps:10});
 await page.mouse.up();
 await expect(panel).toHaveClass(/dj871-sheet-expanded/,{timeout:7000});
 await expect(search).toBeVisible();
 const expanded=await panel.boundingBox(),searchBox=await search.boundingBox();
 expect(expanded.y).toBeGreaterThanOrEqual(searchBox.y+searchBox.height-3);
});

test('v9.2.66 onboarding uses compositor crossfade without blank painted surfaces',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await ready(page,{keepTour:true});
 const tour=page.locator('#dj860-onboarding');
 await expect(tour.locator('#dj860-count')).toHaveText('01 / 05');
 // Unlike the obsolete v9.2.53 test, the colored artwork mat must NEVER fade.
 // The separate outgoing composited clone fades above the fully opaque next slide.
 await page.evaluate(()=>{
   const samples=[];window.__dj9266OnboardFade=samples;window.__dj9266Compositor=null;
   const start=performance.now();
   const sample=()=>{
     const root=document.getElementById('dj860-onboarding');
     const pane=root?.querySelector('.dj860-visual-pane:not(.dj860-slide-ghost)');
     const ghost=root?.querySelector('.dj860-visual-pane.dj860-slide-ghost');
     const copy=root?.querySelector('.dj860-copy:not(.dj860-slide-ghost)');
     if(ghost&&!window.__dj9266Compositor){
       const compositor=ghost.getAnimations().find(animation=>
         animation.effect?.getKeyframes?.().some(frame=>Number(frame.opacity)===0));
       if(compositor)window.__dj9266Compositor={
         duration:compositor.effect.getTiming().duration,
         frames:compositor.effect.getKeyframes().map(frame=>({opacity:Number(frame.opacity),offset:frame.offset})),
         state:compositor.playState,
         engine:ghost.dataset.dj9266FadeEngine
       };
     }
     if(pane)samples.push({
       t:Math.round(performance.now()-start),
       mat:Number(getComputedStyle(pane).opacity),
       ghost:ghost?Number(getComputedStyle(ghost).opacity):null,
       title:copy?.querySelector('h1')?.textContent||''
     });
   };
   let live=true;const frame=()=>{if(!live)return;sample();requestAnimationFrame(frame);};
   requestAnimationFrame(frame);const interval=setInterval(sample,12);sample();
   setTimeout(()=>{live=false;clearInterval(interval);sample();},1500);
   document.querySelector('#dj860-onboarding [data-dj860-action="next"]').click();
 });
 await expect(tour.locator('#dj860-count')).toHaveText('02 / 05',{timeout:5000});
 await expect(tour.locator('#dj860-title')).toHaveText('필요한 안전정보만 지도에',{timeout:6500});
 await page.waitForTimeout(1540);
 const samples=await page.evaluate(()=>window.__dj9266OnboardFade);
 expect(samples.some(x=>x.ghost!==null),
   'No outgoing retained frame was ever rendered: '+JSON.stringify(samples.slice(0,90))).toBe(true);
 // Under 12 parallel phone runners the rendering timeline can be suspended
 // while interval timers continue firing. Verify a real 280ms opacity keyframe
 // effect exists on the compositor and finishes, rather than treating frozen
 // getComputedStyle samples as proof that a visible iPhone transition is broken.
 const compositor=await page.evaluate(()=>window.__dj9266Compositor);
 expect(compositor,'No real compositor opacity animation was created').toBeTruthy();
 expect(compositor.engine).toBe('waapi');
 expect(compositor.duration).toBe(280);
 expect(compositor.frames.some(f=>f.opacity===1&&f.offset===0)).toBe(true);
 expect(compositor.frames.some(f=>f.opacity===0&&f.offset===1)).toBe(true);
 expect(['running','finished']).toContain(compositor.state);
 expect(samples.every(x=>x.mat>=.99),
   'The colored artwork mat became transparent during the transition: '+JSON.stringify(samples.filter(x=>x.mat<.99))).toBe(true);
 expect(samples.every(x=>x.title.trim().length>0),
   'The incoming copy disappeared entirely during the transition').toBe(true);
 await expect(tour.locator('.dj860-slide-ghost')).toHaveCount(0);
 await tour.locator('[data-dj860-action="skip"]').click();
 await expect(tour).toBeHidden();
});

test('phone primary tabs fill the viewport while preserving the fixed bottom pill',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');await ready(page);
 for(const [key,id] of [['route','route-panel'],['participate','participation-panel'],['news','news-panel'],['mine','mine-panel']]){
  await tap(page,tab(page,key));await expect(page.locator('#app')).toHaveAttribute('data-tab',key);
  const p=page.locator('#'+id);await expect(p).toBeVisible();await geometry(page,'#'+id);
  // Chrome may set touch-action:none for native touch shielding; real
  // non-dismissal is verified by the route/account physical-swipe tests.
  await expect(p.locator('.dj-sheet-chrome-grip')).toBeHidden();
  await expect(page.locator('#app > .topbar')).toBeHidden();
 }
 await tap(page,tab(page,'map'));await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
 await expect(page.locator('#app > .topbar')).toBeVisible();
});

test('walking vulnerability remains neutral and suppresses TIP after real layer activation',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await ready(page);
 const top=page.locator('#djNext-layers'),panel=page.locator('#djNext-layer-panel');
 await tap(page,top);await expect(panel).toBeVisible();
 const open=panel.locator('[data-layer-key="pri"] .djNext-layer-action');
 await expect(open).toHaveAttribute('aria-label','보행 취약도 지도 기능');
 await open.scrollIntoViewIfNeeded();await open.click();
 const dialog=page.locator('#dj-pri-dialog');
 await expect(dialog).toBeVisible();
 const gap=dialog.getByRole('button',{name:'제도적 사각지대',exact:true});
 await expect(gap).toBeEnabled({timeout:30000});
 await gap.click();
 const detail=dialog.locator('#dj-pri-protection-detail');
 await expect(detail).toBeVisible();
 await detail.getByRole('button',{name:/상도1동 전체 보호 공백 점수/}).click();
 await expect(dialog).toBeHidden();
 const app=page.locator('#app'),tip=page.locator('#dj840-map-tip');
 await expect(app).toHaveAttribute('data-dj-pri-visible','true');
 await expect(page.locator('#dj-pri-legend')).toBeVisible();
 // Force the legacy tip controller's observed mutation path; it must not
 // resurrect the TIP under any active vulnerability analysis.
 await page.evaluate(()=>document.getElementById('app').classList.toggle('dj-pri-qa-pulse'));
 await expect.poll(()=>tip.evaluate(n=>n.hidden)).toBe(true);
 await expect(tip).toBeHidden();
 await expect(page.locator('#map .maplibregl-ctrl-scale')).toBeHidden();
 await page.locator('#dj-pri-legend').getByRole('button',{name:'끄기'}).click();
 await expect(app).not.toHaveAttribute('data-dj-pri-visible','true');
});

test('phone production settings, cards and nearby overlays follow rendered geometry',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await ready(page);
 await tap(page,tab(page,'mine'));
 const mine=page.locator('#mine-panel'),home=mine.locator('.dj834-my-home');
 await expect(home).toBeVisible();
 const lang=mine.locator('.dj854-language-section');
 await expect(lang).toBeVisible();
 const langGeometry=await lang.evaluate(node=>{
  const r=node.getBoundingClientRect(),parent=node.parentElement,p=parent.getBoundingClientRect(),css=getComputedStyle(node);
  return {inGroup:parent.classList.contains('dj834-settings-group'),display:css.display,top:r.top,bottom:r.bottom,groupTop:p.top,groupBottom:p.bottom,height:r.height};
 });
 expect(langGeometry.inGroup,'language must remain in the normal App & Display list').toBe(true);
 expect(langGeometry.display).toBe('flex');
 expect(langGeometry.height).toBeGreaterThanOrEqual(54);
 expect(langGeometry.height).toBeLessThanOrEqual(76);
 expect(langGeometry.bottom).toBeLessThanOrEqual(langGeometry.groupBottom+2);
 if(page.viewportSize().width===390)await test.info().attach('my-info-home.png',{body:await page.screenshot(),contentType:'image/png'});

 const content=mine.locator('.dj834-detail-content'),detail=mine.locator('.dj834-my-detail');
 await expect(home.locator('[data-dj834-action="theme"]')).toHaveCount(0);
 await expect(home.locator('[data-dj834-action="map"]')).toHaveCount(1);
 for(const key of ['type','records','history']){
  const choice=home.locator('[data-dj834-action="'+key+'"]');
  await choice.scrollIntoViewIfNeeded();
  await tap(page,choice);
  await expect(detail).toBeVisible();
  const active=content.locator(':scope > .dj834-view-active');
  await expect(active).toHaveCount(1);
  await expect(active).toBeVisible();
  const geometry=await page.evaluate(()=>{
    const panel=document.getElementById('mine-panel'),nav=document.getElementById('bottom-nav');
    const title=panel.querySelector('.dj834-detail-title');
    const active=panel.querySelector('.dj834-detail-content > .dj834-view-active');
    const body=panel.querySelector(':scope > .dj836-sheet-body');
    const inactive=[...panel.querySelectorAll('.dj834-detail-content > *')].filter(x=>x!==active);
    return {titleBottom:title.getBoundingClientRect().bottom,activeTop:active.getBoundingClientRect().top,
      bodyBottom:body.getBoundingClientRect().bottom,navTop:nav.getBoundingClientRect().top,
      inactiveVisible:inactive.filter(x=>getComputedStyle(x).display!=='none').map(x=>x.className)};
  });
  expect(geometry.inactiveVisible,key+' inactive pages must consume no layout height').toEqual([]);
  expect(geometry.activeTop-geometry.titleBottom,key+' content should start by its heading').toBeGreaterThanOrEqual(-5);
  expect(geometry.activeTop-geometry.titleBottom,key+' excessive vertical whitespace').toBeLessThan(180);
  expect(geometry.bodyBottom,key+' scroll viewport must not sit behind tab dock').toBeLessThanOrEqual(geometry.navTop+3);
  if(page.viewportSize().width===390&&['records','history'].includes(key))
   await test.info().attach('my-info-'+key+'.png',{body:await page.screenshot(),contentType:'image/png'});
  await tap(page,mine.locator('.dj834-detail-back'));
  await expect(home).toBeVisible();
 }
 await tap(page,tab(page,'participate'));
 const panel=page.locator('#participation-panel'),toolbar=panel.locator('.community-toolbar');
 const options=panel.locator('.community-view-options');
 await expect(options).toBeVisible();
 await expect(toolbar).toBeHidden();
 await tap(page,options.locator('summary'));
 await expect(toolbar).toBeVisible();
 const district=options.locator('.community-dong-filter-row #community-dong-filter');
 await expect(district).toBeVisible();
 await expect(district.locator('option')).toHaveCount(16);
 const districtBox=await district.boundingBox();
 const toolbarBox=await toolbar.boundingBox();
 expect(districtBox.y+districtBox.height,'district selector must not crowd the four action buttons').toBeLessThanOrEqual(toolbarBox.y+2);
 const controls=toolbar.locator(':scope > button, :scope > select');
 await expect(controls).toHaveCount(4);
 const cells=await controls.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,display:getComputedStyle(n).display}}));
 for(let i=0;i<4;i++){
  expect(cells[i].h,'each community action retains a compact touch target').toBeGreaterThanOrEqual(38);
  expect(cells[i].h).toBeLessThanOrEqual(48);
  expect(Math.abs(cells[i].y-cells[0].y),'actions must be on one row').toBeLessThan(3);
  if(i)expect(cells[i].x,'community controls must increase left-to-right').toBeGreaterThan(cells[i-1].x);
 }
 expect(cells[3].x+cells[3].w).toBeLessThanOrEqual(page.viewportSize().width-8);
 if(page.viewportSize().width===390)await test.info().attach('community-actions.png',{body:await page.screenshot(),contentType:'image/png'});
 await tap(page,tab(page,'map'));
 await page.evaluate(()=>{
  Object.defineProperty(navigator.geolocation,'getCurrentPosition',{configurable:true,value:(ok,fail)=>queueMicrotask(()=>fail({code:1}))});
 });
 await tap(page,page.locator('#djNext-near'));
 const nearby=page.locator('#ped-tools-panel');
 await expect(nearby).toBeVisible();
 await expect(nearby.locator('#ped-tools-status')).toBeVisible();
 // The nearby sheet intentionally animates upward from beneath the dock.
 // Assert its SETTLED geometry, not the first partially visible animation
 // frame: the latter can extend 25px beyond the screen for 100-350ms.
 await expect.poll(()=>nearby.evaluate(n=>{
   const r=n.getBoundingClientRect(),nav=document.getElementById('bottom-nav').getBoundingClientRect();
   return r.height<310 && r.bottom<=nav.top+4;
 }),{timeout:10000,intervals:[100,150,250,400]}).toBe(true);
 const box=await nearby.evaluate(n=>{const r=n.getBoundingClientRect(),nav=document.getElementById('bottom-nav').getBoundingClientRect(),s=getComputedStyle(n);return{height:r.height,bottom:r.bottom,navTop:nav.top,display:s.display}});
 expect(box.height,'nearby sheet should be content-sized').toBeLessThan(310);
 expect(box.bottom,'settled nearby sheet must clear the dock').toBeLessThanOrEqual(box.navTop+4);
 if(page.viewportSize().width===390)await test.info().attach('nearby-compact.png',{body:await page.screenshot(),contentType:'image/png'});
});

test('phone verified protection-gap menu contains SHP audit and NULL middle-school review',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width!==390,'reference iPhone only');
 await ready(page);
 const auditResponse=await page.request.get('/data/protection-zone/sangdo1_22_clipped_official_catchment_audit_20261122.json');
 expect(auditResponse.ok()).toBe(true);
 const audit=await auditResponse.json();
 expect(audit.rows).toHaveLength(22);
 expect(audit.score_change_required).toBe(0);
 const geoResponse=await page.request.get('/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson');
 expect(geoResponse.ok()).toBe(true);
 const geo=await geoResponse.json();
 expect(geo.features.filter(f=>f.properties.combined_new_score!==null)).toHaveLength(1003);
 expect(geo.features.filter(f=>f.properties.combined_new_score===null)).toHaveLength(603);
 await page.evaluate(()=>document.getElementById('dj-pri-toggle')?.click());
 const dialog=page.locator('#dj-pri-dialog');
 await expect(dialog).toBeVisible();
 const entry=dialog.getByRole('button',{name:'제도적 사각지대',exact:true});
 await expect(entry).toBeVisible({timeout:45000});
 await expect(dialog.getByRole('button',{name:/상현중학교 300m 도로 검토/})).toBeHidden();
 await entry.click();
 const detail=dialog.locator('#dj-pri-protection-detail');
 await expect(detail).toBeVisible();
 await expect(detail.locator('.dj-pri-protection-action')).toHaveCount(2);
 await expect(detail).toContainText('SHP 경계 도로 22개');
 await expect(detail).toContainText('172개 구간');
 await expect(detail).toContainText('NULL');
 await test.info().attach('protection-gap-nested-choices.png',{body:await page.screenshot(),contentType:'image/png'});
 await detail.getByRole('button',{name:/보행 취약도 목록/}).click();
 await expect(entry).toBeVisible();
 await expect(detail).toBeHidden();
});

test('phone speed limit risk is selectable with PDF thresholds and real source links',{tag:'@phone-common'},async({page})=>{
 test.skip(page.viewportSize().width!==390,'reference iPhone only');
 await ready(page);
 await tap(page,page.locator('#djNext-layers'));
 const panel=page.locator('#djNext-layer-panel');
 await expect(panel).toBeVisible();
 const open=panel.locator('[data-layer-key="pri"] .djNext-layer-action');
 await open.scrollIntoViewIfNeeded();await open.click();
 const dialog=page.locator('#dj-pri-dialog');
 await expect(dialog).toBeVisible();
 const speed=dialog.getByRole('button',{name:/제한속도 위험도/});
 await expect(speed).toBeEnabled({timeout:30000});
 await speed.click();
 await expect(dialog).toBeHidden();
 const app=page.locator('#app'),legend=page.locator('#dj-pri-legend');
 await expect(app).toHaveAttribute('data-dj-pri-mode','speed');
 await expect(legend).toBeVisible();
 await expect(legend).toContainText('제한속도 위험도');
 await legend.getByRole('button',{name:'평가 기준 보기'}).click();
 await expect(legend).toContainText('206개');
 await expect(legend).toContainText('30km/h 미만 0점');
 await expect(legend).toContainText('50km/h 100점');
 await test.info().attach('sangdo1-speed-limit-risk.png',{body:await page.screenshot(),contentType:'image/png'});
 await legend.getByRole('button',{name:'끄기'}).click();
 await expect(app).not.toHaveAttribute('data-dj-pri-visible','true');
});


test('phone six-indicator vulnerability and bottom-docked wide sheets match visible dock geometry',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await ready(page);
 await page.evaluate(()=>document.getElementById('dj-pri-toggle')?.click());
 const dialog=page.locator('#dj-pri-dialog');
 await expect(dialog).toBeVisible();
 const composite=dialog.getByRole('button',{name:/종합 보행 취약도 · 6개 지표/});
 await expect(composite).toBeEnabled({timeout:45000});
 const ui=await dialog.evaluate(node=>{
  const r=node.getBoundingClientRect(),nav=document.getElementById('bottom-nav').getBoundingClientRect();
  return {left:r.left,right:r.right,bottom:r.bottom,navTop:nav.top,width:r.width};
 });
 expect(ui.left).toBeLessThanOrEqual(16);
 expect(ui.right).toBeGreaterThanOrEqual(page.viewportSize().width-16);
 expect(ui.bottom).toBeLessThanOrEqual(ui.navTop-3);
 expect(ui.navTop-ui.bottom).toBeLessThan(30);
 if(page.viewportSize().width===390)await test.info().attach('walking-vulnerability-six-factor-choices.png',{body:await page.screenshot(),contentType:'image/png'});
 await composite.click();
 await expect(dialog).toBeHidden();
 const app=page.locator('#app'),legend=page.locator('#dj-pri-legend');
 await expect(app).toHaveAttribute('data-dj-pri-mode','current6');
 await expect(legend).toBeVisible();
 await expect(legend).toContainText('6개 항목');
 const rect=await legend.evaluate(node=>{
  const r=node.getBoundingClientRect(),nav=document.getElementById('bottom-nav').getBoundingClientRect();
  return {left:r.left,right:r.right,bottom:r.bottom,navTop:nav.top};
 });
 expect(rect.left).toBeLessThanOrEqual(16);
 expect(rect.right).toBeGreaterThanOrEqual(page.viewportSize().width-16);
 expect(rect.bottom).toBeLessThanOrEqual(rect.navTop-3);
 expect(rect.navTop-rect.bottom).toBeLessThan(30);
 await legend.getByRole('button',{name:'평가 기준 보기'}).click();
 await expect(legend).toContainText('6개 지수');
 await expect(legend).toContainText('제한속도');
 if(page.viewportSize().width===390)await test.info().attach('walking-vulnerability-six-factor-legend.png',{body:await page.screenshot(),contentType:'image/png'});
 await legend.getByRole('button',{name:'끄기'}).click();
 await expect(app).not.toHaveAttribute('data-dj-pri-visible','true');
});


test('iPhone final visual contract: compact route, transparent community status and flat settings',{tag:'@phone-layout'},async({page})=>{
 test.skip(page.viewportSize().width>=700,'mobile visual surfaces only');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await ready(page);

 await tap(page,tab(page,'mine'));
 await tap(page,page.locator('#mine-panel [data-dj834-action="type"]'));
 const type=page.locator('#mine-panel .dj877-type-settings:not([hidden])');
 await expect(type).toBeVisible();
 const choice=type.locator('[data-dj885-type="scale"][aria-pressed="true"]');
 await expect(choice).toHaveCount(1);
 await expect(choice).toHaveCSS('box-shadow','none');
 await tap(page,page.locator('#mine-panel .dj834-detail-back'));
 await tap(page,page.locator('#mine-panel [data-dj834-action="history"]'));
 await expect(page.locator('#mine-panel .dj834-history-container:not([hidden])')).toBeVisible();
 await expect(page.locator('#mine-panel .dj834-detail-title')).toHaveText('업데이트 내역');

 await tap(page,tab(page,'participate'));
 // No permanent status slab may be inserted above the post list.
 await expect(page.locator('#participation-panel .dj-community-feed-status')).toHaveCount(0);
 const search=await page.locator('#community-search').boundingBox();
 const write=await page.locator('#community-compose-toggle').boundingBox();
 expect(Math.abs(search.y-write.y),'search and compose share one control row').toBeLessThan(3);
 await tap(page,page.locator('#participation-panel .community-view-options>summary'));
 const refresh=page.locator('#participation-panel #community-refresh');
 const refreshSize=await refresh.boundingBox();
 expect(refreshSize?.width||0,'refresh should remain compact in expanded options').toBeLessThan(145);
 const toolbar=await page.locator('#participation-panel .community-toolbar').boundingBox();
 expect(toolbar.y-(search.y+search.height),'secondary controls should be separated from primary search').toBeGreaterThanOrEqual(8);

 await tap(page,tab(page,'map'));
 await expect(page.locator('#dj-route-choice-list')).toHaveCount(1);
 await page.evaluate(()=>{
  const variants=document.getElementById('route-variants');
  variants.querySelector('[data-route-variant="standard"]')?.setAttribute('aria-pressed','true');
  document.getElementById('route-map-card').hidden=false;
  dispatchEvent(new CustomEvent('dongjak:route-variants-ready',{detail:{
   standard:{coords:[[126.95,37.5],[126.952,37.501]],seconds:1300,kilometers:2.8},
   gentle:{coords:[[126.95,37.5],[126.949,37.502]],seconds:1450,kilometers:3.1}
  }}));
 });
 const card=page.locator('#route-map-card');
 await expect(card.locator('#dj-route-choice-list .dj-route-choice')).toHaveCount(2);
 await expect(card.locator('#dj-route-choice-list .dj-route-choice').first()).toBeVisible();
 await expect(card.locator('#dj-route-choice-list .dj-route-choice-pri').first()).toContainText('PRI 미평가');
 await expect(card.getByRole('button',{name:'안내 시작'})).toBeVisible();

});


test('phone selected dock has no color plate and route form is vertically balanced',{tag:'@phone-layout'},async({page},testInfo)=>{
 test.skip(page.viewportSize().width>=700,'phone only');
 await ready(page);
 const checkDock=async key=>{
  // Narrow iPhones can commit the selected class before the independent
  // icon/label ink transition completes. Verify painted text only after
  // it settles, not in the same tick as the tap.
  await expect.poll(()=>page.locator('#bottom-nav').evaluate(dock=>{
    const active=dock.querySelector('.nav-tab.active'),inactive=dock.querySelector('.nav-tab:not(.active)');
    if(!active?.lastElementChild||!inactive?.lastElementChild)return false;
    return getComputedStyle(active.lastElementChild).color!==getComputedStyle(inactive.lastElementChild).color;
  }),{timeout:15000,intervals:[100,250,500,1000]}).toBe(true);
  const state=await page.locator('#bottom-nav').evaluate((dock,key)=>{
   const active=dock.querySelector('.nav-tab.active'),inactive=dock.querySelector('.nav-tab:not(.active)');
   const plate=dock.querySelector('.dj-motion-indicator'),r=dock.getBoundingClientRect();
   const color=n=>n?getComputedStyle(n).backgroundColor:null;
   return {key,activeTab:active?.dataset.tab,activeBackground:color(active),
    activeBefore:active?getComputedStyle(active,'::before').backgroundColor:null,
    plateDisplay:plate?getComputedStyle(plate).display:'absent',
    plateVisibility:plate?getComputedStyle(plate).visibility:'absent',
    // The navigation button inherits a neutral text color; its actual visible
    // last-child label owns the active/idle ink. Test rendered text, not wrapper.
    selectedInk:active?.lastElementChild?getComputedStyle(active.lastElementChild).color:null,
    inactiveInk:inactive?.lastElementChild?getComputedStyle(inactive.lastElementChild).color:null,
    dockBottom:r.bottom,viewportHeight:innerHeight};
  },key);
  expect(state.activeTab).toBe(key);
  expect(['absent','none']).toContain(state.plateDisplay);
  expect(['transparent','rgba(0, 0, 0, 0)']).toContain(state.activeBackground);
  expect(state.selectedInk).not.toBe(state.inactiveInk);
  return state;
 };
 await tap(page,tab(page,'route'));
 const routeScreen=page.locator('#dj-route-v3');
 await expect(routeScreen).toBeVisible({timeout:15000});
 const routeDock=await checkDock('route');
 // The new entry is separate from the native route engine DOM. Assert the
 // painted card, fixed CTA, native map and exactly two new map controls.
 await expect.poll(async()=>page.evaluate(()=>{
   const host=document.getElementById('dj-route-v3'),root=host?.shadowRoot;
   if(!root||host.hidden)return false;
   const head=root.querySelector('.header')?.getBoundingClientRect();
   const card=root.querySelector('.route-panel')?.getBoundingClientRect();
   const cta=root.querySelector('.action')?.getBoundingClientRect();
   const dock=document.getElementById('bottom-nav')?.getBoundingClientRect();
   const map=document.getElementById('map');
   const legacy=document.getElementById('route-panel');
   const oldActions=document.getElementById('dj-walk-map-actions');
   if(!head||!card||!cta||!dock||!map||!legacy)return false;
   const mid=document.elementFromPoint(innerWidth/2,Math.round((card.bottom+cta.top)/2));
   const action=root.elementFromPoint(cta.left+cta.width/2,cta.top+cta.height/2);
   return root.querySelectorAll('.tools button').length===2 &&
     card.top>=head.bottom-3&&card.left>=8&&card.right<=innerWidth-8 &&
     card.bottom<=cta.top-24&&cta.bottom<=dock.top-5&&cta.height>=50 &&
     (mid===map||map.contains(mid))&&
     (action===root.querySelector('.action')||root.querySelector('.action')?.contains(action)) &&
     getComputedStyle(legacy).clipPath==='inset(100%)' &&
     getComputedStyle(legacy).pointerEvents==='none' &&
     (!oldActions||getComputedStyle(oldActions).display==='none');
 }),{timeout:30000,intervals:[100,250,500,1000]}).toBe(true);
 const form=await routeScreen.evaluate(host=>{
   const root=host.shadowRoot;
   const rect=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
   return {header:rect(root.querySelector('.header')),
     card:rect(root.querySelector('.route-panel')),cta:rect(root.querySelector('.action')),
     navigation:rect(document.getElementById('bottom-nav')),
     tools:root.querySelectorAll('.tools button').length,
     initialDisabled:root.querySelector('.action').disabled,
     origin:root.querySelector('#v3-start').textContent,
     destination:root.querySelector('#v3-end').textContent};
 });
 expect(form.initialDisabled,'path calculation needs a selected start/end').toBe(true);
 expect(form.origin).toContain('현재 위치');
 expect(form.destination).toContain('어디로 가시나요');
 await testInfo.attach('new-route-v3-geometry.json',{body:Buffer.from(JSON.stringify({routeDock,form},null,2)),contentType:'application/json'});
 if(page.viewportSize().width===390)await testInfo.attach('new-route-v3-reference.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});

 await tap(page,tab(page,'mine'));
 await expect(page.locator('#mine-panel')).toBeVisible();
 const mineDock=await checkDock('mine');
 await tap(page,page.locator('#mine-panel [data-dj834-action="type"]'));
 const type=page.locator('#mine-panel .dj877-type-settings:not([hidden])');
 await expect(type).toBeVisible();
 const contrast=await type.locator('[data-dj885-type="scale"][aria-pressed="true"]').evaluate(active=>{
  const group=active.parentElement,inactive=group.querySelector('[aria-pressed="false"]');
  const css=n=>({bg:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color});
  return {active:css(active),inactive:css(inactive)};
 });
 expect(contrast.active.bg,'selected font pill must differ from an unselected one').not.toBe(contrast.inactive.bg);
 expect(contrast.active.color).not.toBe(contrast.inactive.color);
 if(page.viewportSize().width===390)await testInfo.attach('real-font-pills-after.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 await tap(page,page.locator('#mine-panel .dj834-detail-back'));
 await tap(page,page.locator('#mine-panel [data-dj834-action="history"]'));
 await expect(page.locator('#mine-panel .dj834-history-container:not([hidden])')).toBeVisible();
 const history=await page.evaluate(()=>{
  const panel=document.getElementById('mine-panel'),body=panel.querySelector(':scope > .dj836-sheet-body');
  const title=panel.querySelector(':scope > .dj-sheet-chrome .dj834-detail-nav');
  const dock=document.getElementById('bottom-nav');
  body.scrollTop=body.scrollHeight;
  const b=body.getBoundingClientRect(),h=title?.getBoundingClientRect(),n=dock.getBoundingClientRect();
  return {headerInsideFixedTitle:Boolean(title),headerTop:h?.top??null,scrollportBottom:b.bottom,
   navTop:n.top,scrollBottom:Math.round(body.scrollTop+body.clientHeight),
   scrollHeight:body.scrollHeight,headPosition:getComputedStyle(panel.querySelector(':scope > .dj-sheet-chrome')).position};
 });
 expect(history.headerInsideFixedTitle,'child title/back must be in the shared fixed header').toBe(true);
 expect(history.scrollportBottom,'history scroller may not be masked by nav').toBeLessThanOrEqual(history.navTop+3);
 expect(history.scrollBottom).toBeGreaterThanOrEqual(history.scrollHeight-3);
 await testInfo.attach('real-history-geometry.json',{body:Buffer.from(JSON.stringify({mineDock,contrast,history},null,2)),contentType:'application/json'});
 if(page.viewportSize().width===390)await testInfo.attach('real-history-after.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
});
