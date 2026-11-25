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

async function measure(page,locator){
 const el=locator.first();await expect(el).toBeVisible({timeout:20000});
 return el.evaluate(e=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();return {background:s.backgroundColor,color:s.color,border:s.borderTopColor,radius:s.borderTopLeftRadius,width:r.width,height:r.height}});
}
async function capture(page,info,name,locator){
 const el=locator.first(); const styles=await measure(page,el);
 await info.attach(name+'.json',{body:Buffer.from(JSON.stringify(styles,null,2)),contentType:'application/json'});
 await info.attach(name+'.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 return styles;
}
test('V3 visible button contracts and screen capture',async({page},info)=>{
 test.setTimeout(220000);
 await ready(page);
 await expect(page.locator('meta[name="dj-button-design-revision"]')).toHaveAttribute('content','3');
 const map=page.locator('#app .map-actions > button:visible').first();
 const m=await capture(page,info,'v3-map',map);
 expect(m.radius).toBe('10px');
 expect(m.background).toBe('rgb(22, 72, 63)');
 expect(m.border).toBe('rgb(22, 72, 63)');
 await page.locator('#bottom-nav .nav-tab[data-tab="route"]').click({timeout:15000,noWaitAfter:true});
 const host=page.locator('#dj-route-v3');await expect(host).toBeVisible({timeout:20000});
 const r=await capture(page,info,'v3-route',host.locator('.action'));
 expect(r.radius).toBe('10px');expect(r.background).toBe('rgb(208, 221, 215)');
 const tool=await measure(page,host.locator('.tools button'));expect(tool.radius).toBe('10px');expect(tool.border).toBe('rgb(22, 72, 63)');
 await host.locator('[data-v3="end"]').click();await expect(host.locator('.search-screen')).toBeVisible();
 await capture(page,info,'v3-route-search',host.locator('.search-location'));
 await host.locator('[data-v3="search-back"]').click();await host.locator('[data-v3="back"]').click();
 await page.locator('#bottom-nav .nav-tab[data-tab="participate"]').click({timeout:15000,noWaitAfter:true});
 const c=await capture(page,info,'v3-community',page.locator('#community-compose-toggle'));
 expect(c.radius).toBe('10px');expect(c.background).toBe('rgb(18, 63, 56)');
});
