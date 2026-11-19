import { test, expect } from '@playwright/test';
import { openMapPage, dismissOnboarding, navTab, clickRealPointer } from './helpers.js';

test('critical: onboarding close and all five navigation tabs work', async ({ page }) => {
  test.setTimeout(180000);
  await openMapPage(page, { dismissOnboarding: false });
  await dismissOnboarding(page);

  for (const [key, panel] of [
    ['route', '#route-panel'],
    ['participate', '#participation-panel'],
    ['news', '#news-panel'],
    ['mine', '#mine-panel']
  ]) {
    await test.step('open tab ' + key, async () => {
      const button = navTab(page, key);
      await expect(button).toBeVisible();
      await clickRealPointer(page, button, 'bottom tab ' + key);
      await expect(page.locator('#app')).toHaveAttribute('data-tab', key);
      await expect(button).toHaveAttribute('aria-current', 'page');
      await expect(page.locator(panel)).toBeVisible();
    });
  }
  await clickRealPointer(page, navTab(page, 'map'), 'bottom tab map');
  await expect(page.locator('#app')).toHaveAttribute('data-tab', 'map');
});

test('critical: PC 1920x1080 onboarding skip responds to a real pointer click', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wide desktop-only onboarding check');
  // The real-click check has to outlive the map's explicit startup gate.
  test.setTimeout(260000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openMapPage(page, { dismissOnboarding: false });
  await dismissOnboarding(page);
});

test('critical: safety tool and mobile more menu are usable', async ({ page }, testInfo) => {
  test.setTimeout(145000);
  await openMapPage(page);
  const app = page.locator('#app');
  if (testInfo.project.name === 'mobile') {
    await clickRealPointer(page, page.locator('#dj-v794-more'), 'Mobile more');
    await expect(page.locator('#dj-mobile-utilities')).toBeVisible();
    await clickRealPointer(page, page.locator('#dj-mobile-utilities-close'), 'Mobile more close');
    await expect(page.locator('#dj-mobile-utilities')).toBeHidden({ timeout: 10000 });
  } else {
    await clickRealPointer(page, page.locator('#map-tools-toggle'), 'PC map options');
    await expect(app).toHaveClass(/map-controls-open/);
    await expect(page.locator('#map-advanced-controls')).toBeVisible();
    await clickRealPointer(page, page.locator('#map-options-desktop-close:visible, #map-options-mobile-close:visible').first(), 'PC map options close');
    await expect(app).not.toHaveClass(/map-controls-open/);
  }
  const safetyTrigger = testInfo.project.name === 'mobile' ? '#dj-v794-safety' : '#map-safety-toggle';
  await clickRealPointer(page, page.locator(safetyTrigger), 'Safety tool open');
  await expect(app).toHaveClass(/map-safety-open/);
  await expect(page.locator('#map-safety-controls')).toBeVisible();
  await clickRealPointer(page, page.locator('#map-safety-close'), 'Safety tool close');
  await expect(app).not.toHaveClass(/map-safety-open/);
});

test('critical: v8.7.7 map settings opens from My Info', async ({ page }) => {
  test.setTimeout(145000);
  await openMapPage(page);
  await clickRealPointer(page, navTab(page, 'mine'), 'My Info tab');
  await expect(page.locator('#mine-panel')).toBeVisible();
  const settings = page.locator('#mine-panel [data-dj834-action="map"]');
  await expect(settings).toBeVisible();
  await clickRealPointer(page, settings, 'Map settings entry');
  const modal = page.locator('#dj-map-settings');
  await expect(modal).toBeVisible({ timeout: 10000 });
  await expect(modal.locator('.dj877-preferences')).toBeVisible();
  await expect(modal.locator('.dj877-pref-group')).toHaveCount(3);
  await expect(modal.locator('[data-dj877-layer="buildings"]')).toHaveCount(1);
});

test('critical: mobile sheet expand and collapse respond', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'v8.7.7 expansion is a mobile-only feature');
  test.setTimeout(145000);
  await openMapPage(page);
  await clickRealPointer(page, navTab(page, 'route'), 'Route tab');
  const panel = page.locator('#route-panel');
  await expect(panel).toBeVisible();
  const expand = panel.locator('.dj877-expand-button');
  await expect(expand).toBeVisible();
  await expect(expand).toHaveAttribute('aria-pressed', 'false');
  await clickRealPointer(page, expand, 'Expand mobile sheet');
  await expect(expand).toHaveAttribute('aria-pressed', 'true', { timeout: 8000 });
  await clickRealPointer(page, expand, 'Expand mobile sheet');
  await expect(expand).toHaveAttribute('aria-pressed', 'false', { timeout: 8000 });
});

test('critical: v8.7.7 typography controls update the existing preferences', async ({ page }) => {
  test.setTimeout(145000);
  await openMapPage(page);
  await clickRealPointer(page, navTab(page, 'mine'), 'My Info tab');
  await clickRealPointer(page, page.locator('#mine-panel [data-dj834-action="type"]'), 'Typography entry');
  const scale = page.locator('#mine-panel [data-dj877-type="scale"]');
  const weight = page.locator('#mine-panel [data-dj877-type="weight"]');
  await expect(scale).toBeVisible();
  await expect(weight).toBeVisible();
  await scale.selectOption('large');
  await expect(page.locator('#dj-type-scale')).toHaveValue('large');
  await weight.selectOption('bold');
  await expect(page.locator('#dj-type-weight')).toHaveValue('bold');
});

test('critical: v8.7.7 local profile photo can be chosen and removed', async ({ page }) => {
  test.setTimeout(145000);
  await openMapPage(page);
  await clickRealPointer(page, navTab(page, 'mine'), 'My Info tab');
  await clickRealPointer(page, page.locator('#mine-panel [data-dj834-action="profile"]'), 'Profile entry');
  await expect(page.locator('#mine-panel .dj877-photo-choose')).toBeVisible();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8//8/AwMDEwMDAwMDAwAkBgMB/DXemwAAAABJRU5ErkJggg==', 'base64');
  await page.locator('#mine-panel .dj877-photo-file').setInputFiles({
    name: 'test-avatar.png', mimeType: 'image/png', buffer: png
  });
  await expect(page.locator('#mine-panel .dj877-photo-status')).toContainText('저장했습니다');
  await expect(page.locator('#mine-panel .dj877-photo-preview img')).toHaveCount(1);
  await clickRealPointer(page, page.locator('#mine-panel .dj877-photo-remove'), 'Remove profile photo');
  await expect(page.locator('#mine-panel .dj877-photo-preview img')).toHaveCount(0);
});
