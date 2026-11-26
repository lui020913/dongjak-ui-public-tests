import {test,expect} from '@playwright/test';
import {dismissOnboarding,clickRealPointer} from './helpers.js';
test('real transit detail buttons navigate to the visible route editor, including immediate reopen',async({page})=>{
 test.setTimeout(180000);
 await page.setViewportSize({width:390,height:844});
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
  await route.locator('[data-v3="back"]').click();
  await expect(app).toHaveAttribute('data-tab','map');
  await expect(page.locator('.dj-route-endpoint-marker,.dj-route-candidate-marker')).toHaveCount(0);
 }
});
