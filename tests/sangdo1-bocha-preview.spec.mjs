import {test,expect} from '@playwright/test';
const path='/data/sangdo1-analysis-view/bocha-mixed-roads.geojson';
test('Bocha reference layer enables, loads exact data and clears from the safety drawer',async({page,request})=>{
 const release=async()=>{const r=await request.get('/release-source.json?verify='+Date.now());expect(r.ok()).toBe(true);const j=await r.json();expect(j.source_commit).toBe(process.env.DONGJAK_EXPECTED_SOURCE_SHA);expect(String(j.build_run)).toBe(process.env.DONGJAK_EXPECTED_BUILD_RUN);expect(j.application_version).toBe('8.9.15');expect(j.release_status).toBe('CANDIDATE_PREVIEW_NOT_PRODUCTION');};
 await release();await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#map')).toBeVisible({timeout:45000});
 const startup=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
 await expect.poll(async()=>!await startup.isVisible()||await next.isVisible(),{timeout:60000}).toBe(true);
 if(await startup.isVisible()&&await next.isVisible())await next.click();await expect(startup).toBeHidden({timeout:30000});
 await expect(page.locator('#app')).toHaveAttribute('data-dj860-auto-resolved','true',{timeout:45000});
 const tour=page.locator('#dj860-onboarding');if(await tour.isVisible())await tour.locator('[data-dj860-action="skip"]').click();
 const advice=page.locator('#dj-browser-webapp-tip');if(await advice.isVisible())await advice.locator('.dj-webapp-tip-later').click();
 const panel=page.locator('#map-safety-controls');if(!await panel.isVisible()){
 const controls=page.locator('#dj-v794-safety:visible,#map-safety-toggle:visible');await expect(controls.first()).toBeVisible();await controls.first().click();}
 await expect(panel).toBeVisible();const toggle=page.locator('#sangdo-bocha-toggle');
 if(!await toggle.isVisible()){const menu=panel.locator('[data-dj-safety-target="dj-safety-data"]:visible');if(await menu.count())await menu.first().click();}
 if(!await toggle.isVisible()){const summary=page.locator('#dj-safety-data > summary:visible');if(await summary.count())await summary.first().click();}
 await expect(toggle).toBeVisible();await expect(toggle).toHaveAttribute('aria-pressed','false');
 const response=page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.ok(),{timeout:30000});await toggle.click();
 const data=await (await response).json();expect(data.features).toHaveLength(237);expect(data.features.every(f=>f.properties.score===null&&f.properties.route_penalty_allowed===false)).toBe(true);
 await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(page.locator('#sangdo-bocha-status')).toContainText('237');
 await test.info().attach('bocha-reference-enabled',{body:await page.screenshot(),contentType:'image/png'});
 const clear=page.locator('#dj-safety-clear-imports');await expect(clear).toBeEnabled();await clear.click();await expect(toggle).toHaveAttribute('aria-pressed','false');
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');await release();
});
