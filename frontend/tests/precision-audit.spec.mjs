import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Non-flaky geometry and state checks; extend with screenshot baselines after
// reviewing their expected appearance on each supported viewport.
const cases = [
  ['mobile-375', 375, 812],
  ['mobile-430', 430, 932],
  ['tablet-768', 768, 1024],
  ['tablet-1024', 1024, 768],
  ['desktop-1440', 1440, 900]
];

for (const [name, width, height] of cases) {
  test(`precision geometry and visual evidence: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('.topbar')).toBeVisible();

    const report = await page.evaluate(() => {
      const rect = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const css = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)),
          width: Number(r.width.toFixed(2)), height: Number(r.height.toFixed(2)),
          right: Number(r.right.toFixed(2)), bottom: Number(r.bottom.toFixed(2)),
          display: css.display, visibility: css.visibility,
          border: css.border, outline: css.outline, boxShadow: css.boxShadow,
          fontFamily: css.fontFamily
        };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        elements: Object.fromEntries(
          ['.topbar', '.brand', '.search-field', '.search-field button', '.top-actions',
           '.tool-stack', '.side-rail', '.bottom-nav', '.bottom-sheet']
            .map((selector) => [selector, rect(selector)])
        )
      };
    });

    const header = report.elements['.topbar'];
    const search = report.elements['.search-field'];
    const action = report.elements['.search-field button'];
    expect(report.page.width).toBeLessThanOrEqual(width + 1);
    expect(report.page.height).toBeLessThanOrEqual(height + 1);
    // The search is entirely inside the header and its submit control is
    // vertically centered. Numeric tolerance covers fractional CSS pixels.
    expect(search.x).toBeGreaterThanOrEqual(header.x - 2);
    expect(search.right).toBeLessThanOrEqual(header.right + 2);
    expect(search.y).toBeGreaterThanOrEqual(header.y - 2);
    expect(search.bottom).toBeLessThanOrEqual(header.bottom + 2);
    expect(Math.abs((search.y + search.height / 2) - (action.y + action.height / 2)))
      .toBeLessThanOrEqual(2);

    mkdirSync('visual-artifacts/precision', { recursive: true });
    writeFileSync(`visual-artifacts/precision/${name}.json`, JSON.stringify(report, null, 2));

    await page.locator('.top-actions [data-action="theme"]').click();
    await expect(page.locator('#app-shell')).toHaveClass(/theme-dark/);
    await page.screenshot({ path: `visual-artifacts/precision/${name}-dark.png`, animations: 'disabled' });
  });
}

test('reduced motion disables panel and sheet transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.bottom-nav [data-panel="route"]').click();
  await expect(page.locator('#sheet')).toHaveAttribute('data-stage', 'half');
  const seconds = await page.locator('#sheet').evaluate((el) =>
    getComputedStyle(el).transitionDuration.split(',').map((value) =>
      value.trim().endsWith('ms') ? Number.parseFloat(value) / 1000 : Number.parseFloat(value)
    )
  );
  expect(seconds.length).toBeGreaterThan(0);
  expect(Math.max(...seconds)).toBeLessThan(0.02);
});
