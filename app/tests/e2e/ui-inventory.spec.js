import { test, expect } from '@playwright/test';

test('초기 안내창 상태 및 실제 UI 구조 수집', async ({ page }, testInfo) => {
  const pageErrors = [];
  const consoleErrors = [];
  const httpErrors = [];
  const failedRequests = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() });
  });
  page.on('requestfailed', request => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#map')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1000);

  const onboardingBeforeRemoval = await page.locator('#dj860-onboarding').count();
  await page.evaluate(() => {
    document.querySelectorAll('#dj860-onboarding').forEach(node => node.remove());
  });
  await page.waitForTimeout(300);

  const inventory = await page.evaluate(() => {
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    return {
      title: document.title,
      viewport: { width: innerWidth, height: innerHeight },
      mapVisible: visible(document.querySelector('#map')),
      bottomNavVisible: visible(document.querySelector('#bottom-nav')),
      mapCanvasCount: document.querySelectorAll('#map canvas').length,
      buttons: [...document.querySelectorAll('button,[role="button"],[role="tab"]')]
        .filter(visible)
        .slice(0, 180)
        .map(element => ({
          tag: element.tagName,
          text: (element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
          id: element.id || null,
          ariaLabel: element.getAttribute('aria-label'),
          expanded: element.getAttribute('aria-expanded')
        }))
    };
  });

  const report = { onboardingBeforeRemoval, inventory, pageErrors, consoleErrors, httpErrors, failedRequests };
  await testInfo.attach('ui-inventory.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json'
  });
  await page.screenshot({ path: testInfo.outputPath('ui-inventory.png') });
  console.log(JSON.stringify(report, null, 2));
  expect(inventory.mapVisible).toBe(true);
  expect(inventory.bottomNavVisible).toBe(true);
  expect(pageErrors).toEqual([]);
});
