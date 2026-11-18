import { expect } from '@playwright/test';

/**
 * Wait for the app's startup gate to finish. On slow CI runners the map
 * container becomes visible before the map is interactive; if the loader
 * offers its explicit "continue" action, use that real button instead of
 * interacting with controls behind the loading surface.
 */
async function waitForStartupOverlay(page) {
  const startup = page.locator('#map-startup-overlay');
  if (!(await startup.count())) return;

  const continueButton = page.locator('#map-startup-continue');
  await expect.poll(async () => {
    const visible = await startup.isVisible().catch(() => false);
    const canContinue = await continueButton.isVisible().catch(() => false);
    return !visible || canContinue;
  }, { timeout: 60000 }).toBe(true);

  if (await startup.isVisible().catch(() => false)
      && await continueButton.isVisible().catch(() => false)) {
    await continueButton.click({ timeout: 10000 });
  }
  await expect(startup).toBeHidden({ timeout: 15000 });
}

/**
 * Physically click the tested control with a Chromium pointer. Locator.click()
 * also waits for any scheduled navigation after mouseup; some map UI updates
 * register unrelated navigation work under software-WebGL CI environments.
 * Keep a strict hit-target guard and assert the resulting UI state in tests.
 * This does not dispatch synthetic DOM events, force through overlays, or
 * remove elements to make a test pass.
 */
export async function clickRealPointer(page, locator, label='control') {
  await expect(locator).toBeVisible();
  const hit = await locator.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const x = (rect.left + rect.right) / 2;
    const y = (rect.top + rect.bottom) / 2;
    const top = button.ownerDocument.elementFromPoint(x, y);
    return {
      x, y,
      ownsPoint: top === button || button.contains(top),
      topTag: top?.tagName || '',
      topId: top?.id || '',
      topClass: typeof top?.className === 'string' ? top.className : ''
    };
  });
  expect(hit.ownsPoint, label + ' must own the physical hit target: ' + JSON.stringify(hit)).toBe(true);
  await page.mouse.click(hit.x, hit.y);
}

/** Close the real first-run onboarding using a real pointer click. */
export async function dismissOnboarding(page) {
  const onboarding = page.locator('#dj860-onboarding');
  await expect(onboarding).toBeVisible({ timeout: 15000 });
  const skip = onboarding.locator('.dj860-skip');
  await expect(skip).toBeVisible();
  // Native Playwright click retains visibility, stability and hit-target
  // checks; noWaitAfter prevents delayed map/navigation work from blocking
  // the dismissal assertion. Never force through an overlay.
  // 1920px software-rendered Chromium sometimes needs much longer to finish
  // hit-target/actionability checks while the live MapLibre canvas is active.
  // Never force the click: retain the real action and explicit hidden assertion.
  await skip.click({ noWaitAfter: true, timeout: 90000 });
  await expect(onboarding).toBeHidden({ timeout: 12000 });
  await expect(page.locator('#app')).not.toHaveAttribute('data-dj860-onboarding-open', 'true');
}

/**
 * Open a fresh app page. The startup gate and delayed first-run onboarding
 * must settle before any navigation or map control is used.
 *
 * Set dismissOnboarding:false only in tests that explicitly exercise the
 * onboarding close interaction.
 */
export async function openMapPage(page, { dismissOnboarding: closeTour = true } = {}) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('#map')).toBeVisible({ timeout: 30000 });
  await waitForStartupOverlay(page);

  const onboarding = page.locator('#dj860-onboarding');
  await expect(onboarding).toBeAttached({ timeout: 15000 });
  await expect(onboarding).toBeVisible({ timeout: 15000 });
  if (closeTour) await dismissOnboarding(page);
}

export function visibleMapOptionsClose(page) {
  return page.locator(
    '#map-options-desktop-close:visible, #map-options-mobile-close:visible'
  ).first();
}

/** Locate the stable native bottom-navigation button by its data-tab key. */
export function navTab(page, key) {
  if (!['map', 'route', 'participate', 'news', 'mine'].includes(key)) {
    throw new Error('Unknown navigation tab: ' + key);
  }
  return page.locator('#bottom-nav > .nav-tab[data-tab="' + key + '"]');
}
