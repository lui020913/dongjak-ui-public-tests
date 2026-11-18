import { test, expect } from '@playwright/test';
import { openMapPage, navTab } from './helpers.js';

test('하단탭 페이지 전환 및 지도 복귀', async ({ page }) => {
  test.setTimeout(200000);
  await openMapPage(page);
  const app = page.locator('#app');

  const tabs = [
    { key: 'route', panel: '#route-panel' },
    { key: 'participate', panel: '#participation-panel' },
    { key: 'news', panel: '#news-panel' },
    { key: 'mine', panel: '#mine-panel' }
  ];

  for (const tab of tabs) {
    const button = navTab(page, tab.key);
    // Locator.click performs a physical pointer action with hit-target checks.
    // noWaitAfter avoids unrelated MapLibre navigation work stalling the test.
    await button.click({ noWaitAfter: true, timeout: 25000 });
    await expect(app).toHaveAttribute('data-tab', tab.key);
    await expect(button).toHaveAttribute('aria-current', 'page');
    await expect(page.locator(tab.panel)).toBeVisible();
  }

  await navTab(page, 'map').click({ noWaitAfter: true, timeout: 25000 });
  await expect(app).toHaveAttribute('data-tab', 'map');
  await expect(navTab(page, 'map')).toHaveAttribute('aria-current', 'page');
});
