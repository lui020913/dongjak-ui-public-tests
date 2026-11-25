import {test,expect} from '@playwright/test';

async function ready(page){
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const menu=page.locator('#dj-install-menu');
  if(await menu.isVisible({timeout:2000})){
    await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
    await expect(menu).toBeHidden();
  }
  await expect(page.locator('#map')).toBeVisible({timeout:45000});
  const overlay=page.locator('#map-startup-overlay');
  const next=page.locator('#map-startup-continue');
  // The startup layer appears before the continue action is available.
  // Use the existing production smoke-test handshake, never force-click.
  await expect.poll(async()=>!await overlay.isVisible()||await next.isVisible(),
    {timeout:60000,intervals:[250,500,1000]}).toBe(true);
  if(await overlay.isVisible()&&await next.isVisible())await next.click();
  await expect(overlay).toBeHidden({timeout:30000});
  const tour=page.locator('#dj860-onboarding');
  await expect(page.locator('#app')).toHaveAttribute('data-dj860-auto-resolved','true',{timeout:45000});
  await expect(tour).toBeVisible({timeout:30000});
  await tour.locator('[data-dj860-action="skip"]').click();
  await expect(tour).toBeHidden({timeout:20000});
  await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state',/^(signed-in|signed-out)$/,{timeout:45000});
}
async function enterRoute(page){
  await ready(page);
  await page.locator('#bottom-nav .nav-tab[data-tab="route"]').click({timeout:15000,noWaitAfter:true});
  await expect(page.locator('#app')).toHaveAttribute('data-tab','route',{timeout:20000});
  const host=page.locator('#dj-route-v3');
  await expect(host).toBeVisible({timeout:15000});
  await expect(page.locator('#app')).toHaveAttribute('data-dj-route-screen-v3','1');
  return host;
}
test('completely rebuilt route entry matches reference map-first composition',async({page},testInfo)=>{
  test.setTimeout(130000);
  const root=await enterRoute(page);
  const heading=root.locator('.heading');
  const card=root.locator('.route-panel');
  const cta=root.locator('.action');
  const nav=page.locator('#bottom-nav');
  await expect(heading).toHaveText('길찾기');
  await expect(page.locator('#app > .topbar')).toBeHidden();
  await expect(root.locator('.header')).toHaveCSS('background-color','rgb(237, 243, 239)');
  await expect(root.locator('.mode')).toContainText('도보');
  await expect(root.locator('#v3-start')).toHaveText('출발지를 선택하세요');
  await expect(root.locator('#v3-end')).toHaveText('어디로 가시나요?');
  await expect(cta).toBeDisabled();
  // Keep the legacy engine recognized by tab motion, but never painted or hit.
  await expect(page.locator('#route-panel')).toHaveCSS('clip-path','inset(100%)');
  await expect(page.locator('#route-panel')).toHaveCSS('pointer-events','none');
  await expect(page.locator('#dj-walk-map-actions')).toHaveCSS('display','none');
  await expect.poll(async()=>page.evaluate(()=>{
    const host=document.getElementById('dj-route-v3'),shadow=host?.shadowRoot;
    if(!shadow)return false;
    const card=shadow.querySelector('.route-panel')?.getBoundingClientRect();
    const head=shadow.querySelector('.header')?.getBoundingClientRect();
    const cta=shadow.querySelector('.action')?.getBoundingClientRect();
    const nav=document.getElementById('bottom-nav')?.getBoundingClientRect();
    const map=document.getElementById('map');
    if(!card||!head||!cta||!nav||!map)return false;
    const hit=document.elementFromPoint(innerWidth/2,Math.round((card.bottom+cta.top)/2));
    const topClear=head.bottom<=card.top+3;
    return card.left>=7 && card.right<=innerWidth-7 &&
      card.top>=head.bottom-3 && card.bottom<=innerHeight*.52 &&
      cta.top>=card.bottom+96 && cta.bottom<=nav.top-7 &&
      cta.height>=50 && topClear &&
      Boolean(hit&&(hit===map||map.contains(hit)));
  }),{timeout:15000,intervals:[100,300,500]}).toBe(true);
  // Reference has one pair of floating controls, never both old and new.
  await expect(root.locator('.tools button')).toHaveCount(2);
  const measured=await page.evaluate(()=>{
    const shadow=document.getElementById('dj-route-v3').shadowRoot;
    const names=['.header','.route-panel','.tools','.action'];
    return {viewport:{width:innerWidth,height:innerHeight},rects:Object.fromEntries(names.map(n=>{const r=shadow.querySelector(n).getBoundingClientRect();return [n,{x:r.x,y:r.y,width:r.width,height:r.height}]}))};
  });
  await testInfo.attach('rebuilt-route-v3-geometry.json',{body:Buffer.from(JSON.stringify(measured,null,2)),contentType:'application/json'});
  await testInfo.attach('rebuilt-route-v3-screen.png',{body:await page.screenshot(),contentType:'image/png'});
});
test('new entry has independent functional destination-search and dismiss',async({page})=>{
  test.setTimeout(130000);
  const root=await enterRoute(page);
  await root.locator('[data-v3="end"]').click();
  const search=root.locator('[data-v3-screen="search"]');
  await expect(search).toBeVisible();
  await expect(search.locator('#v3-search-title')).toHaveText('도착지 검색');
  await expect(page.locator('#route-place-search')).not.toHaveAttribute('hidden');
  await root.locator('#v3-query').fill('상도역');
  await expect(page.locator('#route-search-query')).toHaveValue('상도역');
  await expect(search.locator('#v3-results button').filter({hasText:'상도역'}).first()).toBeVisible();
  await expect(search.locator('.search-go')).toHaveCount(0);
  await expect(search).toHaveCSS('background-color','rgb(237, 243, 239)');
  await root.locator('[data-v3="clear-query"]').click();
  await expect(search.locator('#v3-results button')).toHaveCount(0);
  await root.locator('#v3-query').fill('노량진역');
  await expect(search.locator('#v3-results button').filter({hasText:'1호선'}).first()).toBeVisible();
  await root.locator('[data-v3="search-back"]').click();
  await expect(search).toBeHidden();
  await expect(page.locator('#route-place-search')).toHaveAttribute('hidden','');
  await root.locator('[data-v3="back"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
  await expect(root).toBeHidden();
});

test('inline waypoint grows editor and search actions use the selected target',async({page})=>{
 test.setTimeout(130000);
 const root=await enterRoute(page),card=root.locator('.route-panel'),plus=root.locator('[data-v3="waypoint"]');
 const original=await card.boundingBox();await expect(plus).toBeVisible();await expect(root.locator('.quick,.waypoint-actions')).toHaveCount(0);
 await plus.click();await expect(root.locator('.waypoint-pending')).toBeVisible();await expect(plus).toBeHidden();
 await expect.poll(async()=> (await card.boundingBox()).height-original.height).toBeGreaterThan(10);
 const pending=root.locator('.waypoint-pending');await pending.locator('.waypoint-input').click();
 const search=root.locator('.search-screen');await expect(search).toBeVisible();await expect(search.locator('#v3-search-title')).toHaveText('경유지 검색');
 await expect(search.locator('[data-v3="search-gps"]')).toBeVisible();await expect(search.locator('[data-v3="search-map"]')).toBeVisible();
 await root.locator('[data-v3="search-back"]').click();await expect(pending).toBeVisible();await pending.getByRole('button',{name:'경유지 추가 취소'}).click();await expect(plus).toBeVisible();
 for(const [key,title] of [['start','출발지 검색'],['end','도착지 검색']]){
  await root.locator('[data-v3="'+key+'"]').click();await expect(search.locator('#v3-search-title')).toHaveText(title);
  await expect(search.locator('[data-v3="search-gps"]')).toBeVisible();await expect(search.locator('[data-v3="search-map"]')).toBeVisible();
  await root.locator('[data-v3="search-back"]').click();
 }
 await root.locator('[data-v3="start"]').click();await search.locator('[data-v3="search-map"]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-tab','map');await expect(page.locator('#route-pick-hint')).toContainText('출발지');
 await page.locator('#route-pick-cancel').click();await expect(root).toBeVisible();
});
