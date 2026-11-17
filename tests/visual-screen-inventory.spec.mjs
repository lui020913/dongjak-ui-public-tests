import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Read-only, anonymous capture of the deployed application.
// Do not submit forms, change account settings, or publish user data.
const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 }
];
const tabs = [
  ['route', 'route-panel'], ['participate', 'participation-panel'],
  ['news', 'news-panel'], ['mine', 'mine-panel'], ['map', 'map']
];
const output = 'quality-report/screen-captures';
mkdirSync(output, { recursive: true });

async function dismissTour(page) {
  const tour = page.locator('#dj860-onboarding');
  for (let i = 0; i < 3; i++) {
    if (!await tour.isVisible().catch(() => false)) return;
    const skip = tour.locator('[data-dj860-action="skip"]');
    if (!await skip.isVisible().catch(() => false)) return;
    await skip.click({ timeout: 20000, noWaitAfter: true });
    await expect(tour).toBeHidden({ timeout: 7000 });
  }
}

for (const viewport of viewports) {
 for (const theme of ['light', 'dark']) {
  test('anonymous deployed screen audit: ' + viewport.name + ' / ' + theme, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== (viewport.width < 700 ? 'mobile' : 'desktop'));
    test.setTimeout(180000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({colorScheme: theme});
    await page.addInitScript(selected => { localStorage.setItem('dongjak_safety_color_theme_v1', selected); }, theme);
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('#map')).toBeVisible({ timeout: 30000 });
    const startup = page.locator('#map-startup-overlay');
    if (await startup.count()) await expect(startup).toBeHidden({ timeout: 30000 });
    await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state', /^(signed-out|signed-in)$/, { timeout: 30000 });
    await page.screenshot({path: output + '/' + viewport.name + '-' + theme + '-startup.png', animations: 'disabled'});
    await dismissTour(page);
    const app = page.locator('#app');
    await expect(app).toHaveAttribute('data-theme', theme, {timeout: 7000});
    const report = { viewport, theme, source: page.url(), captured_at: new Date().toISOString(), screens: [] };
    for (const [tab, panel] of [['initial-map', 'map'], ...tabs]) {
      await dismissTour(page);
      if (tab !== 'initial-map') {
        const control = page.locator('#bottom-nav .nav-tab[data-tab="' + tab + '"]');
        if (!await control.isVisible().catch(() => false)) {
          report.screens.push({ tab, status: 'not-visible', reason: 'No visible public navigation control' });
          continue;
        }
        try {
          await control.click({ timeout: 10000, noWaitAfter: true });
          await expect(page.locator('#app')).toHaveAttribute('data-tab', tab, { timeout: 7000 });
        } catch (e) {
          report.screens.push({ tab, status: 'interaction-failed', reason: String(e).slice(0, 220) });
          continue;
        }
      }
      await page.waitForTimeout(550);
      const metrics = await page.evaluate((panelId) => {
        const rect = el => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1), bottom: +r.bottom.toFixed(1) };
        };
        const visible = el => el && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
        const nav = document.querySelector('#bottom-nav');
        const target = document.getElementById(panelId);
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          nav: rect(nav),
          panel: visible(target) ? rect(target) : null,
          activeTab: document.querySelector('#app')?.getAttribute('data-tab'),
          visibleDialogCount: [...document.querySelectorAll('[role="dialog"]')].filter(visible).length
        };
      }, panel);
      const file = viewport.name + '-' + theme + '-' + tab + '.png';
      await page.screenshot({ path: output + '/' + file, fullPage: false, animations: 'disabled' });
      report.screens.push({ tab, status: 'captured', file, metrics });
    }
    writeFileSync(output + '/' + viewport.name + '-' + theme + '.json', JSON.stringify(report, null, 2));
    expect(report.screens.every(s => s.status === 'captured')).toBe(true);
  });
}
}
