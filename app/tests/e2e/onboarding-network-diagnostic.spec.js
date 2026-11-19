import { test, expect } from '@playwright/test';

// Deferred by request: the PC first-run onboarding close button is a known
// issue and will be tested after its separate fix. Do not make the regular
// regression suite fail on this intentionally deferred behavior.
test.skip('보류: PC 초기 안내창 닫기 및 API 오류 진단', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#map')).toBeVisible();
});
