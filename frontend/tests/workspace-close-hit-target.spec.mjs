import { test, expect } from '@playwright/test';

for (const [name,width,height] of [['tablet',768,1024],['tablet-landscape',1024,768],['desktop',1440,900]]) {
  test(name+' workspace close button meets 44px target',async({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/');
    await page.locator('.side-rail [data-panel="route"]').click();
    const close=page.locator('.workspace-head .panel-close');
    await expect(close).toBeVisible();
    const rect=await close.boundingBox();
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    expect(rect.x+rect.width).toBeLessThanOrEqual(width+1);
    await expect(close).toBeEnabled();
    await close.click();
    await expect(page.locator('#workspace')).toBeHidden();
  });
}
