import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';

// Mobile-only 44px project hit-area audit. No assumptions about iOS Safari.
for (const [name,width,height] of [['mobile375',375,812],['mobile390',390,844],['mobile430',430,932]]) {
  test(name+' map and sheet touch geometry',async({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/');
    const tools=page.locator('.tool-stack .tool-btn');
    await expect(tools.first()).toBeVisible();
    const measurements=[];
    for(const target of await tools.all()){
      const r=await target.boundingBox();
      expect(r?.width).toBeGreaterThanOrEqual(44);
      expect(r?.height).toBeGreaterThanOrEqual(44);
      measurements.push({control:await target.getAttribute('aria-label'),rect:r});
    }
    mkdirSync('visual-artifacts/mobile-touch',{recursive:true});
    await page.screenshot({path:'visual-artifacts/mobile-touch/'+name+'-map.png',animations:'disabled'});
    await page.locator('.bottom-nav [data-panel="route"]').click();
    await expect(page.locator('#sheet')).toHaveAttribute('data-stage','half');
    for(const selector of ['#sheet-grip','.sheet-head .panel-close']){
      const r=await page.locator(selector).boundingBox();
      expect(r?.width).toBeGreaterThanOrEqual(44);
      expect(r?.height).toBeGreaterThanOrEqual(44);
      measurements.push({control:selector,rect:r});
    }
    await page.screenshot({path:'visual-artifacts/mobile-touch/'+name+'-half.png',animations:'disabled'});
    await page.locator('#sheet-grip').click();
    await expect(page.locator('#sheet')).toHaveAttribute('data-stage','full');
    await page.screenshot({path:'visual-artifacts/mobile-touch/'+name+'-full.png',animations:'disabled'});
    await page.locator('#sheet-grip').click();
    await expect(page.locator('#sheet')).toHaveAttribute('data-stage','half');
    await page.locator('.sheet-head .panel-close').click();
    await expect(page.locator('#sheet')).toHaveAttribute('data-stage','closed');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    writeFileSync('visual-artifacts/mobile-touch/'+name+'-metrics.json',JSON.stringify({viewport:{width,height},overflow,measurements},null,2));
  });
}
