import { test, expect } from '@playwright/test';
import { openMapPage, visibleMapOptionsClose, clickRealPointer } from './helpers.js';

// One realistic open/close cycle per surface. Long-running endurance testing
// is not required in the standard CI suite. The visual audit takes screenshots.
test('PC 지도 옵션 열기·X닫기', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'PC 지도 옵션은 PC 도구 레일을 통해 검사');
  test.setTimeout(90000);
  await openMapPage(page);

  const app = page.locator('#app');
  const trigger = page.locator('#map-tools-toggle');

  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await clickRealPointer(page, trigger, 'PC map tools toggle');
  await expect(app).toHaveClass(/map-controls-open/);
  const close = visibleMapOptionsClose(page);
  await expect(close).toBeVisible();
  await clickRealPointer(page, close, 'PC map tools close');
  await expect(app).not.toHaveClass(/map-controls-open/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('보행안전 메뉴 열기·X닫기', async ({ page }, testInfo) => {
  // Retain independently passed native-click validation under software-WebGL CI.
  test.setTimeout(240000);
  await openMapPage(page);

  const app = page.locator('#app');
  const trigger = testInfo.project.name === 'mobile'
    ? page.locator('#dj-v794-safety')
    : page.locator('#map-safety-toggle');
  const close = page.locator('#map-safety-close');

  await expect(trigger).toBeVisible();
  await clickRealPointer(page, trigger, 'safety menu toggle');
  await expect(app).toHaveClass(/map-safety-open/);
  await expect(close).toBeVisible();
  await clickRealPointer(page, close, 'safety menu close');
  await expect(app).not.toHaveClass(/map-safety-open/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
