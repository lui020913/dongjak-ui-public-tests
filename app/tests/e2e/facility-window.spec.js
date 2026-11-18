import { test, expect } from '@playwright/test';
import { openMapPage, navTab, clickRealPointer } from './helpers.js';

const TEST_POINT = {
  id: 'playwright-e2e-point',
  title: 'Playwright 테스트 지점',
  category: '보행공간',
  observation: '자동 UI 테스트용 관찰 내용',
  improvement: '자동 UI 테스트용 개선 내용',
  lat: 37.50425,
  lng: 126.94029,
  favorite: false
};

test('내 정보 등록 지점 상세창 열기·X닫기', async ({ page }) => {
  test.setTimeout(165000);
  // Test data belongs to Playwright's isolated browser context, not the user's data.
  await page.addInitScript(point => {
    localStorage.setItem('dongjak_safety_navigation_v3', JSON.stringify([point]));
  }, TEST_POINT);
  await openMapPage(page);

  await clickRealPointer(page, navTab(page, 'mine'), 'My Info tab');
  await expect(page.locator('#app')).toHaveAttribute('data-tab', 'mine');

  // v8.8.0: records are one level below the My Info settings landing view.
  await clickRealPointer(page, page.locator('#mine-panel [data-dj834-action="records"]'), 'My records entry');
  await expect(page.locator('#mine-panel .dj834-my-detail')).toBeVisible();
  await expect(page.locator('#mine-panel .dj834-detail-title')).toHaveText('즐겨찾기 · 내 기록');

  const record = page.locator('#my-points .record-item').filter({ hasText: TEST_POINT.title });
  await expect(record).toBeVisible({ timeout: 15000 });
  await clickRealPointer(page, record, 'Saved point record');
  const detail = page.locator('#detail-sheet');
  await expect(detail).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#detail-title')).toHaveText(TEST_POINT.title);

  const close = detail.getByRole('button', { name: '상세정보 닫기' });
  await expect(close).toBeVisible();
  await clickRealPointer(page, close, 'Saved point detail close');
  await expect(detail).toBeHidden({ timeout: 10000 });
  await expect(page.locator('#app')).not.toHaveClass(/detail-open/);
});
