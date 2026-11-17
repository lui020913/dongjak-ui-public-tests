import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const viewports=[
  ['mobile-375',375,812],
  ['mobile-390',390,844],
  ['mobile-430',430,932],
  ['tablet-768',768,1024],
  ['tablet-1024',1024,768],
  ['desktop-1280',1280,800],
  ['desktop-1440',1440,900],
  ['desktop-1920',1920,1080]
];

for(const [name,width,height] of viewports){
  test(name+' renders without document overflow',async({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/');
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
    const dimensions=await page.evaluate(()=>({
      documentWidth:document.documentElement.scrollWidth,
      viewportWidth:window.innerWidth,
      documentHeight:document.documentElement.scrollHeight,
      viewportHeight:window.innerHeight
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth+1);
    expect(dimensions.documentHeight).toBeLessThanOrEqual(dimensions.viewportHeight+1);
    if(width<700)await expect(page.getByRole('navigation',{name:'하단 메뉴'})).toBeVisible();
    else await expect(page.getByRole('navigation',{name:'주 메뉴'})).toBeVisible();
    mkdirSync('visual-artifacts',{recursive:true});
    await page.screenshot({path:'visual-artifacts/'+name+'.png',animations:'disabled'});
  });
}

test('mobile drawer expands and collapses by stages',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.locator('.bottom-nav [data-panel="route"]').click();
  await expect(page.locator('#sheet')).toHaveAttribute('data-stage','half');
  await page.locator('#sheet-grip').click();
  await expect(page.locator('#sheet')).toHaveAttribute('data-stage','full');
  mkdirSync('visual-artifacts',{recursive:true});
  await page.screenshot({path:'visual-artifacts/mobile-sheet-full.png',animations:'disabled'});
  await page.locator('#sheet-grip').click();
  await expect(page.locator('#sheet')).toHaveAttribute('data-stage','half');
  await page.locator('.sheet-head [data-action="close"]').click();
  await expect(page.locator('#sheet')).toHaveAttribute('data-stage','closed');
});

test('tablet uses dedicated side panel rather than mobile drawer',async({page})=>{
  await page.setViewportSize({width:768,height:1024});
  await page.goto('/');
  await page.locator('.side-rail [data-panel="community"]').click();
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#workspace-title')).toHaveText('커뮤니티');
  mkdirSync('visual-artifacts',{recursive:true});
  await page.screenshot({path:'visual-artifacts/tablet-side-panel.png',animations:'disabled'});
  await expect(page.locator('#sheet')).toHaveAttribute('data-stage','closed');
});

test('search and appearance controls remain interactive',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto('/');
  await page.locator('#place-query').fill('상도역');
  await page.locator('#search-form button').click();
  await expect(page.locator('#toast')).toContainText('상도역 주변');
  await page.locator('.top-actions [data-action="theme"]').click();
  await expect(page.locator('#app-shell')).toHaveClass(/theme-dark/);
  await page.locator('.tool-stack [data-action="night"]').click();
  await expect(page.locator('#app-shell')).toHaveClass(/night-vision/);
});
