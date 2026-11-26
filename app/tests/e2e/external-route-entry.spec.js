import {test,expect} from '@playwright/test';
import {openMapPage,clickRealPointer} from './helpers.js';
test('real transit detail buttons navigate to the visible route editor, including immediate reopen',async({page})=>{
 test.setTimeout(180000);
 await page.setViewportSize({width:390,height:844});
 await openMapPage(page);
 const app=page.locator('#app'),route=page.locator('#dj-route-v3'),sheet=page.locator('#transport-sheet');
 for(const [kind,name,lng,lat,which] of [['subway','상도',126.94795,37.50283,'start'],['bus','상도역',126.9481,37.5027,'end']]){
  await page.evaluate(place=>window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport',{detail:{place}})),{kind,name,lng,lat,arsId:kind==='bus'?'20190':'',lines:kind==='subway'?['7호선']:[],selectedLine:'7호선'});
  await expect(sheet).toBeVisible({timeout:15000});
  await clickRealPointer(page,page.locator('#transport-use-'+which),kind+' '+which);
  await expect(app).toHaveAttribute('data-tab','route',{timeout:10000});
  await expect(route).toBeVisible();
  await expect(page.locator('#route-'+which+'-label')).toContainText(name);
  await expect(sheet).toBeHidden();
  await page.waitForTimeout(800);
  await expect(route).toBeVisible();
  await route.locator('[data-v3="back"]').click();
  await expect(app).toHaveAttribute('data-tab','map');
 }
});
