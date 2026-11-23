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
  await expect(root.locator('.mode')).toContainText('도보');
  await expect(root.locator('#v3-start')).toHaveText('현재 위치');
  await expect(root.locator('#v3-end')).toHaveText('어디로 가시나요?');
  await expect(cta).toBeDisabled();
  // Keep the legacy engine recognized by tab motion, but never painted or hit.
  await expect(page.locator('#route-panel')).toHaveCSS('clip-path','inset(100%)');
  await expect(page.locator('#route-panel')).toHaveCSS('pointer-events','none');
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
  await root.locator('[data-v3-form="search"] .search-go').click();
  await expect(page.locator('#route-search-query')).toHaveValue('상도역');
  await root.locator('[data-v3="search-back"]').click();
  await expect(search).toBeHidden();
  await expect(page.locator('#route-place-search')).toHaveAttribute('hidden','');
  await root.locator('[data-v3="close"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-tab','map');
  await expect(root).toBeHidden();
});
