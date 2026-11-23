import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Read-only, anonymous capture of the deployed application.
// Do not submit forms, change account settings, or publish user data.
const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 }
];
const tabs = [
  ['route', 'route-panel'], ['participate', 'participation-panel'],
  ['news', 'news-panel'], ['mine', 'mine-panel'], ['map', 'map']
];
const output = 'quality-report/screen-captures';
mkdirSync(output, { recursive: true });

// Real screen capture with explicit bounded font readiness. Never hide an
// application defect or use a synthetic screenshot as visual evidence.
async function capture(page,path) {
  const fonts=await page.evaluate(async()=>{
    const result=await Promise.race([
      document.fonts.ready.then(()=>true),
      new Promise(resolve=>setTimeout(()=>resolve(false),20000))
    ]);
    return {ready:result,status:document.fonts.status};
  });
  // Playwright normally waits indefinitely for font loading. If the site
  // cannot finish loading fonts, preserve a diagnostic-only screenshot.
  if(!fonts.ready) console.warn('AUDIT fonts not ready: '+path);
  await page.screenshot({path,fullPage:false,animations:'disabled',timeout:30000});
  return fonts;
}
async function navigationControl(page,tab) {
  const normal=page.locator('#bottom-nav .nav-tab[data-tab="'+tab+'"]');
  if(tab==='map'&&!await normal.isVisible().catch(()=>false)) {
    return page.getByRole('navigation',{name:'앱 주요 기능'}).getByRole('button',{name:/안전지도/});
  }
  return normal;
}
// Browser first-run presents a top-layer install/web chooser before the tour.
 // Select the real Web action; never force-click onboarding under a dialog.
async function selectBrowserWeb(page){
  const welcome=page.locator('dialog#dj-install-menu[open]');
  if(!await welcome.isVisible().catch(()=>false))return;
  await welcome.getByRole('button',{name:/웹에서 바로 이용하기/}).click({timeout:20000,noWaitAfter:true});
  await expect(welcome).toBeHidden({timeout:12000});
}
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
 for (const theme of ['light']) {
  test('anonymous deployed screen audit: ' + viewport.name + ' / ' + theme, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile');
    test.setTimeout(240000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({colorScheme: theme});
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('#map')).toBeVisible({ timeout: 30000 });
    const startup = page.locator('#map-startup-overlay');
    if (await startup.count()) await expect(startup).toBeHidden({ timeout: 60000 });
    await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state', /^(signed-out|signed-in)$/, { timeout: 30000 });
    await selectBrowserWeb(page);
    await dismissTour(page);
    const app = page.locator('#app');
    const report = { viewport, theme, themeSetup: 'light-only', source: page.url(), captured_at: new Date().toISOString(), screens: [] };
    const save=()=>writeFileSync(output + '/' + viewport.name + '-' + theme + '.json',JSON.stringify(report,null,2));
    try {
    // Ordinary interface is light-only. Night vision is separately controlled.
    await expect(app).toHaveAttribute('data-theme','light',{timeout:30000});
    for (const [tab, panel] of [['initial-map', 'map'], ...tabs]) {
      try {
      await dismissTour(page);
      if (tab !== 'initial-map') {
        const control = await navigationControl(page,tab);
        if (!await control.isVisible().catch(() => false)) {
          report.screens.push({ tab, status: 'not-visible', reason: 'No visible public navigation control' });
          continue;
        }
        try {
          await control.click({ timeout: 10000, noWaitAfter: true });
          await expect(page.locator('#app')).toHaveAttribute('data-tab', tab, { timeout: 15000 });
          await page.locator('#'+panel).waitFor({state:'visible',timeout:15000});
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
      const fonts=await capture(page,output+'/'+file);
      report.screens.push({ tab, status: fonts.ready?'captured':'font-loading-incomplete', file, metrics, fonts });
      } catch(error) {
        report.screens.push({tab,status:'capture-failed',reason:String(error).slice(0,600)});
      } finally {save();}
    }
    } catch(error) {
      report.setupError=String(error).slice(0,1200);
      throw error;
    } finally {save();}
    expect(report.screens.filter(s=>s.status==='captured').length,'All six actual screens must be captured with ready fonts').toBe(6);
  });
}
}
