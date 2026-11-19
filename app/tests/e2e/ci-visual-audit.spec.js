import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/**
 * Passive evidence collection. Visual heuristics report warnings, not proofs of
 * defects. Mandatory interactions are asserted separately in ci-critical-paths.
 */
const VIEWPORTS = [
  { project: 'desktop', name: 'pc-1920', width: 1920, height: 1080 },
  { project: 'desktop', name: 'pc-1440', width: 1440, height: 900 },
  { project: 'desktop', name: 'pc-1366', width: 1366, height: 768 },
  { project: 'desktop', name: 'pc-1024', width: 1024, height: 768 },
  { project: 'mobile', name: 'mobile-430', width: 430, height: 932 },
  { project: 'mobile', name: 'mobile-390', width: 390, height: 844 },
  { project: 'mobile', name: 'mobile-375', width: 375, height: 812 },
  { project: 'mobile', name: 'mobile-360', width: 360, height: 780 },
  { project: 'mobile', name: 'mobile-320', width: 320, height: 700 }
];
const PANELS = [
  '#app', '#map', '#bottom-nav', '#route-panel', '#participation-panel',
  '#news-panel', '#mine-panel', '#detail-sheet', '#map-advanced-controls',
  '#map-safety-controls', '#dj-mobile-utilities', '#dj860-onboarding',
  '#version-history-modal'
];

for (const viewport of VIEWPORTS) {
  test('visual evidence ' + viewport.name, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== viewport.project, 'Different device class');
    // The passive audit captures up to nine real screenshots and attaches
    // JSON evidence. On software-WebGL CI runners this can exceed 125 seconds
    // without a failed interaction. Keep every capture and warning; extend
    // the watchdog rather than dropping any viewport or visual evidence.
    test.setTimeout(300000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const evidence = {
      viewport, steps: [], javascriptErrors: [], networkFailures: [],
      note: 'Layout heuristics are warnings. Functional expectations live in ci-critical-paths.spec.js.'
    };

    page.on('pageerror', error => {
      if (evidence.javascriptErrors.length < 20) evidence.javascriptErrors.push(String(error.message).slice(0, 240));
    });
    page.on('response', response => {
      if (response.status() < 400 || evidence.networkFailures.length >= 20) return;
      try {
        const url = new URL(response.url());
        // Never capture URL query parameters, credentials, request bodies or headers.
        evidence.networkFailures.push({ status: response.status(), hostname: url.hostname });
      } catch {}
    });

    async function capture(label) {
      const step = { label, screenshot: label + '.png' };
      try {
        step.layout = await page.evaluate(selectors => {
          const W = document.documentElement.clientWidth || innerWidth;
          const H = document.documentElement.clientHeight || innerHeight;
          const rect = el => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width),
              height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
          };
          const visible = el => {
            if (!el || el.closest('[hidden]')) return false;
            let p = el;
            while (p && p.nodeType === 1) {
              const s = getComputedStyle(p);
              if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
              p = p.parentElement;
            }
            const r = el.getBoundingClientRect();
            return r.width > 2 && r.height > 2;
          };
          const issues = [];
          const add = (type, severity, selector, detail) => {
            if (issues.length < 65) issues.push({ type, severity, selector, detail });
          };
          const boxes = selectors.map(selector => {
            const el = document.querySelector(selector);
            if (!el) return { selector, exists: false };
            const on = visible(el);
            const r = rect(el);
            if (on && !['#app', '#map'].includes(selector) &&
                r.right > 0 && r.x < W && r.bottom > 0 && r.y < H &&
                (r.x < -18 || r.right > W + 18)) {
              add('panel-horizontal-clipping', 'warning', selector, r);
            }
            return { selector, exists: true, visible: on, bounds: r };
          });
          const overflowPx = Math.max(0, document.documentElement.scrollWidth - W);
          if (overflowPx > 12) add('document-horizontal-overflow', 'warning', 'html', { px: overflowPx });

          const controls = Array.from(document.querySelectorAll('button,[role="button"]'))
            .filter(visible).filter(el => {
              const r = el.getBoundingClientRect();
              return r.right > 0 && r.left < W && r.bottom > 0 && r.top < H;
            }).slice(0, 180);
          const id = el => el.id ? '#' + el.id : el.classList.length ?
            el.tagName.toLowerCase() + '.' + Array.from(el.classList).slice(0, 2).join('.') : el.tagName.toLowerCase();
          for (const el of controls) {
            const r = rect(el);
            const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
            if (r.width < 20 || r.height < 20) add('tiny-control', 'warning', id(el), { label, bounds: r });
            const cs = getComputedStyle(el);
            if (label.length >= 3 && cs.whiteSpace === 'nowrap' &&
                el.scrollWidth > el.clientWidth + 6 && cs.textOverflow !== 'ellipsis') {
              add('text-overflow', 'warning', id(el), { label, extraPx: el.scrollWidth - el.clientWidth });
            }
            if (r.x < -8 || r.right > W + 8 || r.y < -8 || r.bottom > H + 8) {
              add('control-outside-viewport', 'warning', id(el), { label, bounds: r });
            }
          }
          // Only sibling interactive controls are compared. Overlay/map overlaps are intentional.
          for (let a = 0; a < controls.length; a++) {
            const ea = controls[a], ra = ea.getBoundingClientRect();
            if (ra.width < 16 || ra.height < 16) continue;
            for (let b = a + 1; b < controls.length; b++) {
              const eb = controls[b];
              if (ea.parentElement !== eb.parentElement) continue;
              if (ea.contains(eb) || eb.contains(ea)) continue;
              const rb = eb.getBoundingClientRect();
              const dx = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
              const dy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
              const overlap = dx * dy / Math.max(1, Math.min(ra.width * ra.height, rb.width * rb.height));
              if (overlap > 0.28) add('overlapping-sibling-buttons', 'warning', id(ea) + ' / ' + id(eb),
                { overlapRatio: Math.round(overlap * 100) / 100 });
            }
          }
          return {
            viewport: { width: W, height: H },
            documentOverflowPx: overflowPx,
            boxes, issues, visibleControlCount: controls.length
          };
        }, PANELS);
        const screenshotPath = testInfo.outputPath(viewport.name + '-' + label + '.png');
        await page.screenshot({ path: screenshotPath, animations: 'disabled', timeout: 12000 });
        await testInfo.attach(viewport.name + '-' + label + '.png', {
          path: screenshotPath, contentType: 'image/png'
        });
      } catch (error) {
        step.captureError = String(error.message || error).slice(0, 320);
      }
      evidence.steps.push(step);
    }

    async function attempt(label, action) {
      try {
        await action();
        await page.waitForTimeout(250);
      } catch (error) {
        evidence.steps.push({ label, interactionWarning: String(error.message || error).slice(0, 340) });
      }
      await capture(label);
    }

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await expect(page.locator('#map')).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(700);
      await capture('01-first-visit');
      const onboarding = page.locator('#dj860-onboarding');
      if (await onboarding.isVisible().catch(() => false)) {
        await attempt('02-close-onboarding', async () => {
          await onboarding.locator('[data-dj860-action="skip"]').click({ timeout: 6000 });
          await expect(onboarding).toBeHidden({ timeout: 8000 });
        });
      }
      await capture('03-map');
      for (const key of ['route', 'participate', 'news', 'mine', 'map']) {
        await attempt('tab-' + key, async () => {
          await page.locator('#bottom-nav .nav-tab[data-tab="' + key + '"]').click({ timeout: 5000 });
          await expect(page.locator('#app')).toHaveAttribute('data-tab', key, { timeout: 5000 });
        });
      }
      if (viewport.project === 'desktop') {
        await attempt('desktop-map-options', () => page.locator('#map-tools-toggle').click({ timeout: 5000 }));
      } else {
        await attempt('mobile-more-menu', () => page.locator('#dj-v794-more').click({ timeout: 5000 }));
      }
    } catch (error) {
      evidence.fatalError = String(error.message || error).slice(0, 520);
      await capture('fatal');
      throw error;
    } finally {
      const issueTotal = evidence.steps.reduce((n, step) => n + (step.layout?.issues?.length || 0), 0);
      evidence.summary = {
        capturedScreens: evidence.steps.filter(s => s.layout).length,
        layoutWarnings: issueTotal,
        interactionWarnings: evidence.steps.filter(s => s.interactionWarning).length,
        javascriptErrors: evidence.javascriptErrors.length
      };
      const auditFile = testInfo.outputPath(viewport.name + '-audit.json');
      writeFileSync(auditFile, JSON.stringify(evidence, null, 2), 'utf8');
      await testInfo.attach(viewport.name + '-audit.json', {
        path: auditFile, contentType: 'application/json'
      });
    }
  });
}
