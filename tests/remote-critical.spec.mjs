import { test, expect } from '@playwright/test';

// The deployed app may create the onboarding dialog more than once while initializing.
// Dismiss it through the real UI, never by removing DOM nodes or forcing hidden styles.
// A separate assertion below reports unwanted reappearance as a product defect.
async function dismissVisibleOnboarding(page) {
  const dialog = page.locator('#dj860-onboarding');
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.waitForTimeout(650);
    if (!await dialog.isVisible().catch(() => false)) return;
    const skip = dialog.locator('[data-dj860-action="skip"]');
    await expect(skip, 'Onboarding requires an accessible skip control').toBeVisible();
    // Validate the actual visible hit target and send a genuine pointer click
    // on both desktop and mobile. No force click, DOM removal, direct event
    // dispatch, or CSS overrides.
    const bounds = await skip.boundingBox();
    expect(bounds, 'Skip must have a visible hit-test region').toBeTruthy();
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const hit = await page.evaluate(({x,y}) => {
      const top = document.elementFromPoint(x,y);
      return Boolean(top?.closest?.('[data-dj860-action="skip"]'));
    }, {x,y});
    expect(hit, 'Skip center must not be covered by another element').toBe(true);
    await page.mouse.click(x,y);
    await expect(dialog, 'Onboarding must close when Skip is clicked').toBeHidden({ timeout: 8000 });
  }
  await expect(dialog, 'Onboarding is repeatedly reappearing').toBeHidden();
}

async function waitForAppReady(page) {
  // App startup and Supabase session resolution can finish after #map
  // becomes visible. A premature click would race the legitimate first tour.
  const startup = page.locator('#map-startup-overlay');
  if (await startup.count()) {
    await expect(startup, 'Startup overlay must finish before navigation tests')
      .toBeHidden({ timeout: 30000 });
  }
  await expect(page.locator('#app'), 'Authentication initialization must resolve')
    .toHaveAttribute('data-dj-auth-state', /^(signed-out|signed-in)$/, { timeout: 30000 });
  await page.waitForTimeout(350);
}

async function openPublishedMap(page) {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response, 'Published site returned no HTTP response').toBeTruthy();
  expect(response.status(), 'Published site returned an HTTP failure').toBeLessThan(400);
  await expect(page.locator('#app')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#map')).toBeVisible({ timeout: 30000 });
  await waitForAppReady(page);
  await dismissVisibleOnboarding(page);
}

test('published map opens and renders', async ({ page }) => {
  await openPublishedMap(page);
});

test('onboarding stays closed after one skip (regression guard)', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response).toBeTruthy();
  await expect(page.locator('#map')).toBeVisible({ timeout: 30000 });
  await waitForAppReady(page);
  const dialog = page.locator('#dj860-onboarding');
  // A deployed desktop session may not offer the guest tour during initial
  // auth checking. That state cannot prove a dismissal regression.
  const appeared = await dialog.waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true).catch(() => false);
  test.skip(!appeared, 'Onboarding did not appear in this anonymous session; dismissal not exercised.');
  const skip = dialog.locator('[data-dj860-action="skip"]');
  await skip.click();
  await expect(dialog).toBeHidden({ timeout: 9000 });
  // A late guest/auth refresh must not resurrect the tour after this-page dismissal.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dongjak:auth-state', { detail: { authenticated: false } })));
  await page.waitForTimeout(3500);
  await expect(dialog, 'Onboarding must not automatically reopen after dismissal or a late auth event').toBeHidden();
});

test('five bottom tabs switch content and return to map', async ({ page }) => {
  await openPublishedMap(page);
  for (const [key, panel] of [
    ['route', '#route-panel'], ['participate', '#participation-panel'],
    ['news', '#news-panel'], ['mine', '#mine-panel']
  ]) {
    await dismissVisibleOnboarding(page);
    const tab = page.locator('#bottom-nav .nav-tab[data-tab="' + key + '"]');
    await expect(tab, key + ' tab must be visible').toBeVisible();
    await tab.click();
    await expect(page.locator('#app')).toHaveAttribute('data-tab', key);
    await expect(page.locator(panel)).toBeVisible();
  }
  await dismissVisibleOnboarding(page);
  // The desktop rail and the current panel have coordinated top/enter
  // transitions. Wait for the transition to settle, then hit-test the actual
  // map-tab target and click it with the mouse instead of waiting on a CSS
  // stability heuristic that can outlive the visible transition.
  await page.waitForTimeout(450);
  const mapTab = page.locator('#bottom-nav .nav-tab[data-tab="map"]');
  await expect(mapTab, 'Map tab must remain visible while another page is open').toBeVisible();
  const bounds = await mapTab.boundingBox();
  expect(bounds, 'Map tab must have a clickable hit region').toBeTruthy();
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const hit = await page.evaluate(({x,y}) => {
    const top = document.elementFromPoint(x,y);
    return Boolean(top?.closest?.('#bottom-nav .nav-tab[data-tab="map"]'));
  }, {x,y});
  expect(hit, 'Map tab center must not be covered by another element').toBe(true);
  await page.mouse.click(x,y);
  await expect(page.locator('#app')).toHaveAttribute('data-tab', 'map');
});

test('map tools or mobile more menu opens and closes', async ({ page }, info) => {
  await openPublishedMap(page);
  await dismissVisibleOnboarding(page);
  if (info.project.name === 'mobile') {
    await page.locator('#dj-v794-more').click();
    await expect(page.locator('#dj-mobile-utilities')).toBeVisible();
    await page.locator('#dj-mobile-utilities-close').click();
    await expect(page.locator('#dj-mobile-utilities')).toBeHidden();
  } else {
    await page.locator('#map-tools-toggle').click();
    await expect(page.locator('#map-advanced-controls')).toBeVisible();
    await page.locator('#map-options-desktop-close:visible, #map-options-mobile-close:visible').first().click();
    await expect(page.locator('#map-advanced-controls')).toBeHidden();
  }
});

test('text preferences are interactive without freezing the app', async ({ page }) => {
  await openPublishedMap(page);
  await dismissVisibleOnboarding(page);
  await page.locator('#bottom-nav .nav-tab[data-tab="mine"]').click();
  const trigger = page.locator('#mine-panel [data-dj834-action="type"]');
  await expect(trigger).toBeVisible();
  await dismissVisibleOnboarding(page);
  await trigger.click();
  // v8.8.1 moved typography controls from legacy selects to the
  // v8.8.5 segmented choice buttons in My Info. Assert the user-facing UI,
  // then verify the legacy select state that still persists the preference.
  const scale = page.locator('#mine-panel [data-dj885-type="scale"][data-value="large"]');
  const weight = page.locator('#mine-panel [data-dj885-type="weight"][data-value="bold"]');
  await expect(scale).toBeVisible();
  await expect(weight).toBeVisible();
  await scale.click();
  await expect(scale).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#dj-type-scale')).toHaveValue('large');
  await weight.click();
  await expect(weight).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#dj-type-weight')).toHaveValue('bold');
});
