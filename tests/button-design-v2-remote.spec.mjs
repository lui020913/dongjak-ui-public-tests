import {test,expect} from '@playwright/test';
const baseline='https://04d39fc2.dongjak-walk-safety-preview.pages.dev/';
const target=process.env.BUTTON_PREVIEW_URL;
async function inspect(browser,url,info,label){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
 const page=await context.newPage();
 try{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await expect(page.locator('html')).toHaveAttribute('data-dj-mobile-only','allowed',{timeout:30000});
 const marker=await page.evaluate(async()=>await (await fetch('/release-source.json',{cache:'no-store'})).json());
 expect(marker.source_commit).toBe(label==='v2'?'3ac9fe76eebea6fbb158e84862d54285ccf2e65f':process.env.GITHUB_SHA);
 if(label==='v3') await expect(page.locator('meta[name="dj-button-design-revision"]')).toHaveAttribute('content','3');
 const menu=page.locator('dialog#dj-install-menu');
 if(await menu.isVisible({timeout:2000})){await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();await expect(menu).toBeHidden();}
 await expect(page.locator('#map')).toBeVisible({timeout:45000});
 const overlay=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
 await expect.poll(async()=>!await overlay.isVisible()||await next.isVisible(),{timeout:60000}).toBe(true);
 if(await overlay.isVisible()&&await next.isVisible())await next.click();await expect(overlay).toBeHidden({timeout:30000});
 const tour=page.locator('#dj860-onboarding');await expect(page.locator('#app')).toHaveAttribute('data-dj860-auto-resolved','true',{timeout:45000});if(await tour.isVisible())await tour.locator('[data-dj860-action="skip"]').click();await expect(tour).toBeHidden({timeout:30000});
 const result={};
 const snap=async(name,loc)=>{await expect(loc.first()).toBeVisible({timeout:20000});result[name]=await loc.first().evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,border:s.borderTopColor,radius:s.borderTopLeftRadius,color:s.color}});await info.attach(label+'-'+name+'.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});};
 await snap('map',page.locator('#app .map-actions > button:visible'));
 await page.locator('#bottom-nav .nav-tab[data-tab="route"]').click({timeout:15000,noWaitAfter:true});const host=page.locator('#dj-route-v3');await snap('route',host.locator('.action'));
 await host.locator('[data-v3="back"]').click();await page.locator('#bottom-nav .nav-tab[data-tab="participate"]').click({timeout:15000,noWaitAfter:true});await snap('community',page.locator('#community-compose-toggle'));
 return result;
 }finally{await context.close()}
}
test('deployed V3 differs from V2 in computed styles',async({browser},info)=>{
 test.setTimeout(300000);
 expect(target).toMatch(/^https:\/\/[a-z0-9-]+\.dongjak-walk-safety-preview\.pages\.dev\/?$/);
 const before=await inspect(browser,baseline,info,'v2');const after=await inspect(browser,target,info,'v3');
 await info.attach('comparison.json',{body:Buffer.from(JSON.stringify({before,after},null,2)),contentType:'application/json'});
 console.log('V2/V3 computed button styles',JSON.stringify({before,after}));
 expect(after.map.background).toBe('rgb(220, 236, 229)');expect(after.map.radius).toBe('10px');expect(after.route.background).toBe('rgb(208, 221, 215)');expect(after.route.radius).toBe('10px');expect(after.community.background).toBe('rgb(57, 126, 110)');
 for(const name of ['map','route','community'])expect(after[name]).not.toEqual(before[name]);
});
