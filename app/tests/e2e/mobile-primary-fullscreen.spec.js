import {test,expect} from '@playwright/test';
import {openMapPage,navTab,clickRealPointer} from './helpers.js';

test('phone primary tabs occupy the entire viewport without old sheet gestures',async({page})=>{
 test.skip(page.viewportSize().width>=700,'mobile phone shell only');
 test.setTimeout(120000);
 await openMapPage(page);
 const app=page.locator('#app');
 for(const [tab,id] of [['route','route-panel'],['news','news-panel'],['mine','mine-panel'],['participate','participation-panel']]){
   await clickRealPointer(page,navTab(page,tab),'open '+tab);
   await expect(app).toHaveAttribute('data-tab',tab);
   const panel=page.locator('#'+id);
   await expect(panel).toBeVisible();
   await expect.poll(async()=>{
     const rect=await panel.boundingBox();
     return Boolean(rect&&Math.abs(rect.x)<2&&Math.abs(rect.y)<2&&
       Math.abs(rect.width-page.viewportSize().width)<2&&
       Math.abs(rect.height-page.viewportSize().height)<2);
   }).toBe(true);
   await expect(panel.locator('.dj-sheet-chrome-grip')).toBeHidden();
   await expect(panel.locator('.dj836-edge-drag')).toBeHidden();
   await expect(page.locator('#bottom-nav')).toBeVisible();
   const dock=await page.locator('#bottom-nav').boundingBox();
   const heading=await panel.locator(':scope > .dj-sheet-chrome').boundingBox();
   expect(heading.y+heading.height,'header must not overlap the dock').toBeLessThan(dock.y);
   expect(await panel.locator(':scope > .dj836-sheet-body').evaluate(n=>getComputedStyle(n).overflowY)).toBe('auto');
   await expect(page.locator('#app > .topbar')).toBeHidden();
   // A downward pointer gesture on a full-screen title must not dismiss it.
   const box=await panel.locator(':scope > .dj-sheet-chrome').boundingBox();
   await page.mouse.move(box.x+box.width*.45,box.y+box.height*.65);
   await page.mouse.down();await page.mouse.move(box.x+box.width*.45,box.y+box.height*.65+110,{steps:6});await page.mouse.up();
   await expect(panel).toBeVisible();
   await expect(app).toHaveAttribute('data-tab',tab);
 }
 await clickRealPointer(page,navTab(page,'map'),'return to map');
 await expect(app).toHaveAttribute('data-tab','map');
 await expect(page.locator('#app > .topbar')).toBeVisible();
 await expect(page.locator('#route-panel')).toBeHidden();
 await expect(page.locator('#news-panel')).toBeHidden();
 await expect(page.locator('#mine-panel')).toBeHidden();
 await expect(page.locator('#participation-panel')).toBeHidden();
});

test('phone route search and my info preserve existing owners',async({page})=>{
 test.skip(page.viewportSize().width>=700,'mobile phone shell only');
 test.setTimeout(120000);
 await openMapPage(page);
 await clickRealPointer(page,navTab(page,'route'),'route');
 await clickRealPointer(page,page.locator('#route-search-start'),'route search');
 await expect(page.locator('#route-place-search')).toBeVisible();
 await expect(page.locator('#route-search-query')).toBeVisible();
 await clickRealPointer(page,page.locator('#route-search-close'),'close route search');
 await clickRealPointer(page,navTab(page,'mine'),'my info');
 await expect(page.locator('.dj834-my-home')).toBeVisible();
 await expect(page.locator('.dj834-profile-card')).toBeVisible();
 await clickRealPointer(page,navTab(page,'news'),'news');
 await expect(page.locator('#dongjak-news-refresh')).toBeVisible();
 await expect(page.locator('#dongjak-news-list')).toBeAttached();
});
