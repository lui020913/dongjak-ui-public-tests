import {test,expect} from '@playwright/test';
import {openMapPage,navTab} from './helpers.js';

test('phone standalone tabs use the complete viewport and preserve the floating pill',async({page})=>{
 test.skip(page.viewportSize().width>=700,'Mobile-only full-screen tabs');
 await openMapPage(page);
 const app=page.locator('#app');
 const targets=[['route','#route-panel'],['participate','#participation-panel'],['news','#news-panel'],['mine','#mine-panel']];
 for(const [tab,selector] of targets){
  await navTab(page,tab).click({noWaitAfter:true});
  await expect(app).toHaveAttribute('data-tab',tab);
  const panel=page.locator(selector);
  await expect(panel).toBeVisible();
  await expect.poll(async()=>{
   const r=await panel.boundingBox(),height=await page.evaluate(()=>document.documentElement.clientHeight);
   return Boolean(r&&Math.abs(r.x)<3&&Math.abs(r.y)<3&&Math.abs(r.height-height)<5);
  }).toBe(true);
  await expect(page.locator('#bottom-nav')).toBeVisible();
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(panel.locator('.dj-sheet-chrome-grip')).toBeHidden();
  const before=await panel.boundingBox();
  await panel.locator('.dj-sheet-chrome-title').dispatchEvent('pointerdown',{pointerId:23,clientX:80,clientY:44,isPrimary:true});
  await panel.locator('.dj-sheet-chrome-title').dispatchEvent('pointermove',{pointerId:23,clientX:80,clientY:170,isPrimary:true});
  await panel.locator('.dj-sheet-chrome-title').dispatchEvent('pointerup',{pointerId:23,clientX:80,clientY:170,isPrimary:true});
  await expect(panel).toBeVisible();
  const after=await panel.boundingBox();
  expect(Math.abs(after.y-before.y)).toBeLessThan(2);
 }
 await navTab(page,'map').click({noWaitAfter:true});
 await expect(app).toHaveAttribute('data-tab','map');
 await expect(page.locator('#route-panel')).toBeHidden();
 await expect(page.locator('#bottom-nav')).toBeVisible();
 await expect(page.locator('.topbar')).toBeVisible();
});
