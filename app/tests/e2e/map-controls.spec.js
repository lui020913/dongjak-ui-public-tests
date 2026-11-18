import { test, expect } from '@playwright/test';
import { openMapPage, visibleMapOptionsClose, clickRealPointer } from './helpers.js';

test('PC 지도 옵션과 보행안전 메뉴는 서로 겹치지 않음', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'PC 좌측 도구 레일의 상호 배타 동작 검사');
  test.setTimeout(180000);
  await openMapPage(page);

  const app = page.locator('#app');
  const mapOptions = page.locator('#map-advanced-controls');
  const safetyPanel = page.locator('#map-safety-controls');

  await clickRealPointer(page, page.locator('#map-tools-toggle'), 'Map options toggle');
  await expect(app).toHaveClass(/map-controls-open/);
  await expect(mapOptions).toBeVisible();

  await clickRealPointer(page, page.locator('#map-safety-toggle'), 'Safety tools toggle');
  await expect(app).toHaveClass(/map-safety-open/);
  await expect(app).not.toHaveClass(/map-controls-open/);
  await expect(safetyPanel).toBeVisible();

  await clickRealPointer(page, page.locator('#map-safety-close'), 'Safety tools close');
  await expect(app).not.toHaveClass(/map-safety-open/);

  await clickRealPointer(page, page.locator('#map-tools-toggle'), 'Map options toggle');
  await expect(app).toHaveClass(/map-controls-open/);
  await expect(visibleMapOptionsClose(page)).toBeVisible();
  await clickRealPointer(page, visibleMapOptionsClose(page), 'Map options close');
  await expect(app).not.toHaveClass(/map-controls-open/);
});

test('보행안전 메뉴는 PC·모바일에서 X버튼으로 닫힘', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await openMapPage(page);
  const app = page.locator('#app');
  const trigger = testInfo.project.name === 'mobile'
    ? page.locator('#dj-v794-safety')
    : page.locator('#map-safety-toggle');

  await expect(trigger).toBeVisible();
  await clickRealPointer(page, trigger, 'Safety menu toggle');
  await expect(app).toHaveClass(/map-safety-open/);
  await expect(page.locator('#map-safety-controls')).toBeVisible();
  await clickRealPointer(page, page.locator('#map-safety-close'), 'Safety tools close');
  await expect(app).not.toHaveClass(/map-safety-open/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('모바일 더보기 창 열기·닫기', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', '모바일 전용 더보기 도구 검사');
  test.setTimeout(130000);
  await openMapPage(page);

  const more = page.locator('#dj-v794-more');
  const panel = page.locator('#dj-mobile-utilities');
  await expect(more).toBeVisible();
  await clickRealPointer(page, more, 'Mobile more open');
  await expect(panel).toBeVisible();
  await clickRealPointer(page, page.locator('#dj-mobile-utilities-close'), 'Mobile more close');
  await expect(panel).toBeHidden({ timeout: 10000 });
});
