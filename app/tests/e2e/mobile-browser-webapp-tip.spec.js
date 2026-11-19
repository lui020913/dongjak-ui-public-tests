import {test,expect} from '@playwright/test';
test('mobile browser offers an optional web-app tip and respects dismissal',async({page},testInfo)=>{
  // Map startup and the intentional install-hint delay exceed the generic 45s E2E budget.
  test.setTimeout(90000);
  test.skip(testInfo.project.name!=='mobile','mobile browsers only');
  await page.addInitScript(()=>{
    try{
      localStorage.setItem('dongjak_onboarding_seen_v860','1');
      sessionStorage.setItem('dj-map-guide-initial-shown-v7121','1');
      if(sessionStorage.getItem('dj-webapp-tip-test-init')!=='1'){
        localStorage.removeItem('dj-browser-webapp-hint-snooze-v1');
        sessionStorage.setItem('dj-webapp-tip-test-init','1');
      }
    }catch{}
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const tip=page.locator('#dj-browser-webapp-tip');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.djRunMode)).toBe('browser');
  // The local CI fixture intentionally does not start transport APIs, and
  // its map loading overlay can stay visible indefinitely. Model a completed
  // map load without changing production code, then finish any guest tour.
  const startup=page.locator('#map-startup-overlay');
  await expect(startup).toHaveCount(1);
  await startup.evaluate(node=>{node.hidden=true;node.setAttribute('aria-busy','false');});
  const onboarding=page.locator('#dj860-onboarding');
  await page.waitForTimeout(1200);
  if(await onboarding.isVisible()){
    await expect(tip).toBeHidden();
    await onboarding.getByRole('button',{name:'건너뛰기'}).click();
    await expect(onboarding).toBeHidden();
  }
  await expect(tip).toBeVisible({timeout:18000});
  await expect(tip.getByText('웹앱으로 더 편리하게')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.getElementById('app')?.dataset.djWebappTipVisible)).toBe('true');
  await expect(page.locator('#dj840-map-tip')).toBeHidden();
  await tip.getByRole('button',{name:'설치 방법 보기'}).click();
  await expect(page.locator('#dj-webapp-tip-steps')).toBeVisible();
  await expect(tip.getByRole('button',{name:'설치 방법 접기'})).toHaveAttribute('aria-expanded','true');
  await tip.getByRole('button',{name:'나중에'}).click();
  await expect(tip).toBeHidden();
  expect(await page.evaluate(()=>Number(localStorage.getItem('dj-browser-webapp-hint-snooze-v1')))).toBeGreaterThan(Date.now());
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#dj-browser-webapp-tip')).toBeHidden();
});
test('installed iPhone PWA never shows the web-app suggestion',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile','mobile PWA only');
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});
    try{localStorage.setItem('dongjak_onboarding_seen_v860','1');}catch{}
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.djRunMode)).toBe('pwa');
  await expect(page.locator('#dj-browser-webapp-tip')).toBeHidden();
});
