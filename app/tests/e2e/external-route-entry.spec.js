import {test,expect} from '@playwright/test';
import {dismissOnboarding,clickRealPointer} from './helpers.js';
test('real transit detail buttons navigate to the visible route editor, including immediate reopen',async({page})=>{
 test.setTimeout(180000);
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('dongjak_safety_community_v15_posts',JSON.stringify([{id:'qa-location',title:'지도 위치 검증 게시글',body:'커뮤니티 위치 전환 회귀 테스트',nickname:'검증 주민',category:'동네 질문',dong:'상도1동',created:Date.now(),location:{lng:126.94795,lat:37.50283},comments:[],likes:0}])));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const menu=page.locator('#dj-install-menu');
 await expect(menu).toBeAttached({timeout:20000});
 if(await menu.isVisible()){
  await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
  await expect(menu).toBeHidden();
 }
 const startup=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
 await expect.poll(async()=>!await startup.isVisible()||await next.isVisible(),{timeout:60000}).toBe(true);
 if(await startup.isVisible()&&await next.isVisible())await clickRealPointer(page,next,'startup continue');
 await expect(startup).toBeHidden({timeout:30000});
 await dismissOnboarding(page);
 const app=page.locator('#app'),route=page.locator('#dj-route-v3'),sheet=page.locator('#transport-sheet');
 for(const [kind,name,lng,lat,which] of [['subway','상도',126.94795,37.50283,'start'],['bus','상도역',126.9481,37.5027,'end']]){
  await page.evaluate(place=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place}})),{kind,name,lng,lat,arsId:kind==='bus'?'20190':'',lines:kind==='subway'?['7호선']:[],selectedLine:'7호선'});
  await expect(sheet).toBeVisible({timeout:15000});
  const action=page.locator('#transport-use-'+which);
  // A newly opened sheet slides in from below the viewport. Wait for real
  // layout/actionability, then scroll through the native container if needed.
  // Never force a click or remove overlays to bypass a hit-test failure.
  await action.scrollIntoViewIfNeeded({timeout:15000});
  await action.click({trial:true,timeout:20000});
  await clickRealPointer(page,action,kind+' '+which);
  await expect(app).toHaveAttribute('data-tab','route',{timeout:10000});
  await expect(route).toBeVisible();
  await expect(page.locator('#route-'+which+'-label')).toContainText(name);
  await expect(sheet).toBeHidden();
  await page.waitForTimeout(800);
  await expect(route).toBeVisible();
  await expect(page.locator('.dj-route-endpoint-marker,.dj-route-candidate-marker')).toHaveCount(0);
  if(which==='start'){
   const trigger=route.locator('[data-v3="pri"]'),dialog=page.locator('#dj-route-pri-preferences-dialog');
   await trigger.click();
   await expect(dialog).toBeVisible();
   await expect(dialog.locator('input:checked')).toHaveCount(6);
   await dialog.locator('input').first().uncheck();
   await dialog.locator('[data-pri-cancel]').click();
   await trigger.click();
   await expect(dialog.locator('input:checked')).toHaveCount(6);
   for(const input of await dialog.locator('input').all())await input.uncheck();
   await expect(dialog.locator('[data-pri-apply]')).toBeDisabled();
   await dialog.locator('input[value="lighting"]').check();
   await dialog.locator('[data-pri-apply]').click();
   await expect(trigger).toContainText('1/6');
   await trigger.click();
   await dialog.locator('[data-pri-all]').click();
   await dialog.locator('[data-pri-apply]').click();
   await expect(trigger).toContainText('6/6');
   await expect(dialog).toHaveCount(1);
   await route.locator('[data-v3="end"]').click();
   await route.locator('[data-v3="search-map"]').click();
   await expect(app).toHaveAttribute('data-tab','map');
   await expect(page.locator('.dj-route-endpoint-marker')).toHaveCount(1);
   await page.locator('#route-pick-cancel').click();
   await expect(app).toHaveAttribute('data-tab','route');
   await expect(page.locator('.dj-route-endpoint-marker,.dj-route-candidate-marker')).toHaveCount(0);
  }
  if(which==='end'){
   // Closing the route editor after the first entry intentionally resets
   // the endpoints. Register the start again through the real app handler.
   const accepted=await page.evaluate(()=>{
    const detail={which:'start',place:{kind:'subway',name:'상도',lng:126.94795,lat:37.50283,lines:['7호선']}};
    window.dispatchEvent(new CustomEvent('dongjak:route-select',{detail}));
    return detail.accepted;
   });
   expect(accepted).toBe(true);
   await expect(route.locator('#v3-start')).toContainText('상도');
   await expect(route.locator('#v3-end')).toContainText('상도역');
   await expect(route.locator('[data-v3="calculate"]')).toBeEnabled({timeout:10000});
   // Deterministic transit service fixture: real app endpoint state and real
   // comparison module, without depending on Seoul API availability in CI.
   const stops=[
    {seq:1,arsId:'20001',name:'검증 승차 정류장',lng:126.94795,lat:37.50283},
    {seq:2,arsId:'20002',name:'검증 하차 정류장',lng:126.9481,lat:37.5027}
   ];
   const fixture={source:'서울시 버스정류소 위치정보',sourceDate:'2026-11-26',stops:[...stops,...Array.from({length:1000},(_,i)=>({arsId:String(30000+i),name:'검증 외부 '+i,lng:127.1,lat:37.6}))]};
   await page.route('**/data/transport/seoul-bus-stops.json',r=>r.fulfill({json:fixture}));
   await page.route('**/api/transport/bus?*',r=>r.fulfill({json:{items:[{routeId:'100000001',route:'검증버스',routeType:'2'}]}}));
   await page.route('**/api/transport/bus/route-path?*',r=>r.fulfill({json:{routeId:'100000001',coordinates:stops.map(p=>[p.lng,p.lat]),stops}}));
   await route.locator('[data-transit-mode="transit"]').click();
   await expect(route.locator('[data-v3="calculate"]')).toContainText('대중교통 경로 찾기');
   await route.locator('[data-v3="calculate"]').click();
   const results=route.locator('.transit-results');
   await expect(results).toBeVisible();
   await expect(results.locator('.tr-card').filter({hasText:'검증버스'}).first()).toBeVisible({timeout:40000});
   await expect(results.locator('.tr-review')).toHaveCount(0);
   const cards=results.locator('.tr-card');
   await expect(results.locator('.tr-review-result')).toHaveCount(await cards.count());
   await expect(results.locator('.tr-note')).toBeHidden();
   await expect(route.locator('[data-transit-mode="walk"] svg path')).toHaveCount(1);

   // Real header drag uses the same staged sheet motion and never covers the V3 back header or dock.
   const handle=results.locator('.tr-header h2');
   const drag=async dy=>{const r=await handle.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2+dy,{steps:8});await page.mouse.up();};
   const compact=await results.boundingBox();
   await drag(-170);
   await expect(results).toHaveClass(/dj871-sheet-expanded/);
   await expect(results).not.toHaveClass(/dj889-sheet-transitioning/);
   const expanded=await results.boundingBox(),top=await route.locator('.header').boundingBox(),dock=await page.locator('#bottom-nav').boundingBox();
   expect(expanded.height).toBeGreaterThan(compact.height+35);expect(expanded.y).toBeGreaterThanOrEqual(top.y+top.height+5);expect(expanded.y+expanded.height).toBeLessThanOrEqual(dock.y-6);
   await drag(100);
   await expect(results).not.toHaveClass(/dj871-sheet-expanded|dj889-sheet-transitioning/);
   const beforeDown=await results.boundingBox();
   await drag(160);
   await expect(results).toBeVisible();
   await expect(results).not.toHaveClass(/dj871-sheet-expanded|dj889-sheet-transitioning/);
   const afterDown=await results.boundingBox();
   expect(Math.abs(afterDown.y-beforeDown.y)).toBeLessThan(3);
   await results.locator('[data-filter="bus"]').click();
   await expect(results.locator('[data-filter="bus"]')).toHaveAttribute('aria-pressed','true');
   await expect(results.locator('.tr-card').first()).not.toContainText(/운임|전체 시간/);
   const card=results.locator('.tr-card').first();
   await expect(card.locator('.tr-metrics')).toBeVisible();
   await expect(card.locator('.tr-line-badge')).toHaveText('검증버스');
   await expect(card.locator('.tr-fare-compact')).toHaveCount(0);
   await expect(card.locator('.tr-route-names')).toBeVisible();
   await expect(card).not.toContainText('일반 교통카드 (참고 요금)');
   // The selected list filter's actual bus geometry and both endpoints must
   // be within the unobscured map, not hidden behind the lower card.
   if(await page.evaluate(()=>Boolean(window.__qaMap))){
    await expect.poll(async()=>page.evaluate(()=>Boolean(window.__qaMap.getSource('dj-transit-comparison-route'))),{timeout:30000}).toBe(true);
    await expect.poll(async()=>{
     const sheet=await results.boundingBox(),header=await route.locator('.header').boundingBox();
     return page.evaluate(({sheet,header,coords})=>{
      const m=window.__qaMap,rect=m.getContainer().getBoundingClientRect();
      if(m.isMoving())return false;
      return coords.every(p=>{const a=m.project(p);return a.x+rect.left>=10&&a.x+rect.left<=rect.right-10&&a.y+rect.top>=header.y+header.height+5&&a.y+rect.top<=sheet.y-5;});
     },{sheet,header,coords:stops.map(p=>[p.lng,p.lat])});
    },{timeout:20000}).toBe(true);
   }

   await results.locator('.tr-pri-preference').click();
   await expect(results.locator('.tr-pri-preference')).toHaveAttribute('aria-pressed','false');
   await route.locator('[data-v3="back"]').click();
   await expect(results).toBeHidden();
   await expect(app).toHaveAttribute('data-tab','route');
   await expect(page.locator('.dj-route-endpoint-marker')).toHaveCount(0);
   if(await page.evaluate(()=>Boolean(window.__qaMap)))await expect.poll(()=>page.evaluate(()=>Boolean(window.__qaMap.getSource('dj-transit-comparison-route')))).toBe(false);
   await route.locator('[data-transit-mode="walk"]').click();
   await expect(route.locator('[data-v3="calculate"]')).toContainText('경로 찾기');
   await page.unroute('**/data/transport/seoul-bus-stops.json');
   await page.unroute('**/api/transport/bus?*');
   await page.unroute('**/api/transport/bus/route-path?*');
   // Exterior map is scoped to transit mode, including real route map picking.
   await expect(app).toHaveAttribute('data-dj-transit-exterior','false');
   await route.locator('[data-transit-mode="transit"]').click();
   await expect(app).toHaveAttribute('data-dj-transit-exterior','true');
   const districtPaint=()=>page.evaluate(()=>{const m=window.__qaMap;if(!m?.getLayer('district-border'))return null;return ['district-border','district-border-halo','district-exterior-fade'].map((id,i)=>{const key=i===2?'fill-opacity':'line-opacity';return {opacity:m.getPaintProperty(id,key),duration:m.getPaintProperty(id,key+'-transition')?.duration,visibility:m.getLayoutProperty(id,'visibility')||'visible'};});});
   if(await page.evaluate(()=>Boolean(window.__qaMap))){
    await expect.poll(districtPaint,{timeout:15000}).toEqual([{opacity:0,duration:250,visibility:'visible'},{opacity:0,duration:250,visibility:'visible'},{opacity:0,duration:250,visibility:'visible'}]);
   }
   const register=async(which,place)=>page.evaluate(({which,place})=>{const detail={which,place};window.dispatchEvent(new CustomEvent('dongjak:route-select',{detail}));return detail.accepted;},{which,place});
   const outside={kind:'point',name:'외부 테스트 장소',lng:127.026,lat:37.497};
   expect(await register('end',outside)).toBe(true);
   await expect(route.locator('#v3-end')).toContainText(outside.name);
   await route.locator('[data-v3="end"]').click();
   await route.locator('[data-v3="search-map"]').click();
   await expect(app).toHaveAttribute('data-tab','map');
   await expect(app).toHaveAttribute('data-dj-transit-exterior','true');
   await page.locator('#route-pick-cancel').click();
   await expect(app).toHaveAttribute('data-tab','route');
   expect(await register('start',{...outside,name:'외부 출발지',lng:127.028})).toBe(true);
   await route.locator('[data-v3="calculate"]').click();
   await expect(results).toContainText('한 곳은 동작구 안이어야 합니다.');
   await route.locator('[data-v3="back"]').click();
   await expect(results).toBeHidden();
   await route.locator('[data-transit-mode="walk"]').click();
   await expect(app).toHaveAttribute('data-dj-transit-exterior','false');
   if(await page.evaluate(()=>Boolean(window.__qaMap))){
    await expect.poll(districtPaint,{timeout:15000}).toEqual([{opacity:.96,duration:250,visibility:'visible'},{opacity:.42,duration:250,visibility:'visible'},{opacity:.65,duration:250,visibility:'visible'}]);
   }
   await expect(route.locator('[data-v3="calculate"]')).toBeDisabled();
   expect(await register('end',outside)).toBe(false);
   const denied=page.locator('#dj832-dongjak-boundary');
   await expect(denied).toBeVisible();
   expect(await denied.evaluate(el=>el.parentElement===document.body)).toBe(true);
   await denied.locator('.dj832-boundary-confirm').click({timeout:10000});
   await expect(denied).toBeHidden();

  }
  await route.locator('[data-v3="back"]').click();
  await expect(app).toHaveAttribute('data-tab','map');
  await expect(page.locator('.dj-route-endpoint-marker,.dj-route-candidate-marker')).toHaveCount(0);
 }
 // Enter a real feed detail, then use the actual map-location action.
 await page.locator('#bottom-nav [data-tab="participate"]').click();
 const post=page.locator('.community-open-detail').filter({hasText:'지도 위치 검증 게시글'});
 await expect(post).toBeVisible();
 await post.click();
 const location=page.locator('.community-location-link');
 await expect(location).toBeVisible();
 await location.click();
 await expect(app).toHaveAttribute('data-tab','map');
 await expect(page.locator('#participation-panel')).toBeHidden();
 const locationCard=page.locator('#dj-community-location-card');
 await expect(locationCard).toBeVisible();
 await expect(locationCard).toContainText('지도 위치 검증 게시글');
 await expect(page.locator('.dj-community-location-marker')).toHaveCount(1);
 await page.waitForTimeout(500);
 await expect(page.locator('#participation-panel')).toBeHidden();
 await expect(page.locator('.dj-community-location-marker')).toBeVisible();
 await expect(page.locator('#dj840-map-tip')).toBeHidden();
 await locationCard.getByRole('button',{name:'제보 위치 닫기'}).click();
 await expect(locationCard).toHaveCount(0);
 await expect(page.locator('.dj-community-location-marker')).toHaveCount(0);
});
