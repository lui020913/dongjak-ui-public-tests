import { test, expect } from '@playwright/test';
import { openMapPage } from './helpers.js';

test('온보딩 제외 후 지도 캔버스와 주요 도구 표시', async ({ page }, testInfo) => {
  const pageErrors = [];
  const httpErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) {
      httpErrors.push({ status: response.status(), url: response.url() });
    }
  });

  test.setTimeout(125000);
  await openMapPage(page);
  await expect(page.locator('#dj860-onboarding')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('#map canvas').first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#bottom-nav')).toBeVisible();

  const result = await page.evaluate(() => {
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 &&
        style.display !== 'none' && style.visibility !== 'hidden';
    };
    return {
      map: visible(document.querySelector('#map')),
      mapCanvasCount: document.querySelectorAll('#map canvas').length,
      bottomNav: visible(document.querySelector('#bottom-nav')),
      mapOptionsButton: visible(document.querySelector('#map-tools-toggle')),
      safetyButton: visible(document.querySelector('#map-safety-toggle')),
      onboardingHidden: (() => { const node = document.querySelector('#dj860-onboarding'); return !node || node.hidden || getComputedStyle(node).display === 'none'; })()
    };
  });

  expect(result.map).toBe(true);
  expect(result.mapCanvasCount).toBeGreaterThan(0);
  expect(result.bottomNav).toBe(true);
  expect(result.onboardingHidden).toBe(true);

  await testInfo.attach('map-screen-report.json', {
    body: JSON.stringify({ result, pageErrors, httpErrors }, null, 2),
    contentType: 'application/json'
  });
  await page.screenshot({ path: testInfo.outputPath('map-screen.png') });

  // HTTP 오류는 기록하되, 외부 뉴스/교통 API 상태 때문에 지도 표시 테스트가 실패하지 않게 분리한다.
  console.log('지도 화면 결과:', JSON.stringify({ result, pageErrors, httpErrors }, null, 2));
  expect(pageErrors).toEqual([]);
});
