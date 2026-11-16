import { test, expect } from '@playwright/test';
async function openPublishedMap(page) {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response, 'Published site returned no HTTP response').toBeTruthy();
  expect(response.status(), 'Published site returned an HTTP failure').toBeLessThan(400);
  await expect(page.locator('#app')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#map')).toBeVisible({ timeout: 30000 });
  const onboarding = page.locator('#dj860-onboarding');
  if (await onboarding.isVisible().catch(() => false)) {
    const skip = onboarding.locator('[data-dj860-action="skip"]');
    await expect(skip).toBeVisible();
    await skip.click();
    await expect(onboarding).toBeHidden({ timeout: 10000 });
  }
}
test('published map opens and renders', async ({ page }) => { await openPublishedMap(page); });
test('five bottom tabs switch content and return to map', async ({ page }) => {
  await openPublishedMap(page);
  for (const [key, panel] of [
    ['route','#route-panel'],['participate','#participation-panel'],
    ['news','#news-panel'],['mine','#mine-panel']
  ]) {
    const tab = page.locator('#bottom-nav .nav-tab[data-tab="' + key + '"]');
    await expect(tab, key + ' tab must be visible').toBeVisible();
    await tab.click();
    await expect(page.locator('#app')).toHaveAttribute('data-tab', key);
    await expect(page.locator(panel)).toBeVisible();
  }
  await page.locator('#bottom-nav .nav-tab[data-tab="map"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-tab', 'map');
});
test('map tools or mobile more menu opens and closes', async ({ page }, info) => {
  await openPublishedMap(page);
  if (info.project.name === 'mobile') {
    await page.locator('#dj-v794-more').click();
    await expect(page.locator('#dj-mobile-utilities')).toBeVisible();
    await page.locator('#dj-mobile-utilities-close').click();
    await expect(page.locator('#dj-mobile-utilities')).toBeHidden();
  } else {
    await page.locator('#map-tools-toggle').click();
    await expect(page.locator('#map-advanced-controls')).toBeVisible();
    await page.locator('#map-options-desktop-close:visible, #map-options-mobile-close:visible').first().click();
    await expect(page.locator('#map-advanced-controls')).toBeHidden();
  }
});
test('text preferences are interactive without freezing the app', async ({ page }) => {
  await openPublishedMap(page);
  await page.locator('#bottom-nav .nav-tab[data-tab="mine"]').click();
  const trigger = page.locator('#mine-panel [data-dj834-action="type"]');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const scale = page.locator('#mine-panel [data-dj877-type="scale"]');
  const weight = page.locator('#mine-panel [data-dj877-type="weight"]');
  await expect(scale).toBeVisible();
  await expect(weight).toBeVisible();
  await scale.selectOption('large');
  await expect(page.locator('#dj-type-scale')).toHaveValue('large');
  await weight.selectOption('bold');
  await expect(page.locator('#dj-type-weight')).toHaveValue('bold');
});
