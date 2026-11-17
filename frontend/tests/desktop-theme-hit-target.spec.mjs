import { test, expect } from '@playwright/test';

for (const [width,height] of [[1280,800],[1440,900],[1920,1080]]) {
  test('desktop '+width+' theme toggle has 44px hit area and switches theme',async({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/');
    const toggle=page.locator('.top-actions [data-action="theme"]');
    await expect(toggle).toBeVisible();
    const bounds=await toggle.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);
    await expect(toggle).toBeEnabled();
    await toggle.click();
    await expect(page.locator('#app-shell')).toHaveClass(/theme-dark/);
  });
}
