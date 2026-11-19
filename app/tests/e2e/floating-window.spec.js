import { test, expect } from '@playwright/test';
import { openMapPage, clickRealPointer } from './helpers.js';

test('업데이트 내역 플로팅 창 열기·닫기', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await openMapPage(page);

  if (testInfo.project.name === 'mobile') {
    await clickRealPointer(page, page.locator('#dj-v794-more'), 'Mobile more menu');
    await expect(page.locator('#dj-mobile-utilities')).toBeVisible();
    await clickRealPointer(page, page.locator('#dj-mobile-history'), 'Mobile update history');
  } else {
    await clickRealPointer(page, page.locator('#version-history-trigger'), 'Desktop update history');
  }

  const modal = page.locator('#version-history-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('dialog')).toBeVisible();
  await clickRealPointer(page, page.locator('#version-history-close'), 'Update history close');
  await expect(modal).toBeHidden();
});
