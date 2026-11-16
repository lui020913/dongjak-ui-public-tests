import { test, expect } from '@playwright/test';

// Guard the existing green brand across both themes. This does not approve
// visual redesigns; responsive screenshot tests cover geometry separately.
test('semantic design tokens preserve the original light/dark palette', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const shell = page.locator('#app-shell');
  const brand = page.locator('.brand-mark');
  await expect(brand).toHaveCSS('background-color', 'rgb(25, 114, 83)');
  await expect(shell).toHaveCSS('background-color', 'rgb(220, 233, 222)');

  await page.locator('.top-actions [data-action="theme"]').click();
  await expect(shell).toHaveClass(/theme-dark/);
  await expect(brand).toHaveCSS('background-color', 'rgb(116, 212, 170)');
  await expect(shell).toHaveCSS('background-color', 'rgb(24, 43, 35)');
});
