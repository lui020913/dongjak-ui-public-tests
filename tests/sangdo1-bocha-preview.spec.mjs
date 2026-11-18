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
 const safetyNav=page.getByRole('navigation',{name:'보행안전 메뉴 바로가기'});
 await expect(safetyNav).toBeVisible();
 await safetyNav.getByRole('button',{name:'사고·지도자료'}).click();
 const dataGroup=page.locator('#dj-safety-data');await expect(dataGroup).toHaveCount(1);
 await expect(dataGroup).toHaveJSProperty('open',true);
 if((page.viewportSize()?.width||0)>=1080){
   const subnav=page.getByRole('group',{name:'사고·보행환경 데이터 세부 메뉴'});
   await expect(subnav).toBeVisible();
   const roadDataTab=subnav.getByRole('button',{name:'사고·횡단'});
   await roadDataTab.click();
   await expect(roadDataTab).toHaveAttribute('aria-pressed','true');
 }
 await toggle.scrollIntoViewIfNeeded();
 await expect(toggle).toBeVisible();await expect(toggle).toHaveAttribute('aria-pressed','false');
 const response=page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.ok(),{timeout:30000});await toggle.click();
 const data=await (await response).json();expect(data.features).toHaveLength(237);expect(data.features.every(f=>f.properties.score===null&&f.properties.route_penalty_allowed===false)).toBe(true);
 await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(page.locator('#sangdo-bocha-status')).toContainText('237');
 const switchState=toggle.locator('.dj-feature-state');
 const knobOffset=()=>switchState.evaluate(el=>{const t=getComputedStyle(el,'::before').transform;if(t==='none')return 0;const v=t.slice(t.indexOf('(')+1,-1).split(',').map(Number);return v.length===6?v[4]:0;});
 await expect.poll(()=>switchState.evaluate(el=>getComputedStyle(el).backgroundColor),{timeout:3000}).not.toBe('rgb(200, 212, 209)');
 await expect.poll(knobOffset,{timeout:3000}).toBeGreaterThan(10);
 await test.info().attach('bocha-reference-enabled',{body:await page.screenshot(),contentType:'image/png'});
 const clear=page.locator('#dj-safety-clear-imports');await expect(clear).toBeEnabled();await clear.click();await expect(toggle).toHaveAttribute('aria-pressed','false');
 await expect.poll(()=>switchState.evaluate(el=>getComputedStyle(el).backgroundColor),{timeout:3000}).toBe('rgb(200, 212, 209)');
 await expect.poll(knobOffset,{timeout:3000}).toBe(0);
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>switchState.evaluate(el=>getComputedStyle(el).backgroundColor),{timeout:3000}).not.toBe('rgb(200, 212, 209)');
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');await release();
});
