import { test, expect } from '@playwright/test';
import { openMapPage } from './helpers.js';

test('동작하는 안전지도 페이지와 기본 내비게이션 로딩', async ({ page }) => {
  // GitHub's software-rendered map may need longer than the global 45s
  // to finish the real first-run onboarding. Assertions remain unchanged.
  test.setTimeout(150000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await openMapPage(page);

  await expect(page.locator('#map')).toBeVisible();
  await expect(page.locator('#bottom-nav')).toBeVisible();
  await expect(page.locator('#bottom-nav .nav-tab')).toHaveCount(5);
  expect(pageErrors).toEqual([]);
});
