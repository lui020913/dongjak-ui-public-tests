import {test,expect} from '@playwright/test';

const productionUrl=process.env.DONGJAK_TARGET_URL||'https://dongjak-walk-safety-preview.pages.dev/';

async function openPreviewGate(page){
  await page.goto(productionUrl,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#dj-mobile-only-screen')).toBeVisible({timeout:45000});
  await expect(page.locator('#dj-install-menu')).toBeVisible({timeout:45000});
  const marker=await page.evaluate(async()=>await (await fetch('/release-source.json',{cache:'no-store'})).json());
  expect(marker.source_commit).toBe(process.env.DONGJAK_EXPECTED_SOURCE_SHA);
  expect(marker.application_version).toBe(process.env.DONGJAK_EXPECTED_VERSION);
  expect(marker.release_status).toBe('CANDIDATE_PREVIEW_NOT_PRODUCTION');
}

test('PC install gate keeps device illustration, darkens buttons quickly and reveals QR only after PWA action',async({page})=>{
  await openPreviewGate(page);
  await expect(page.locator('#dj-mobile-only-screen .dj-mobile-only-devices')).toBeVisible();
  await expect(page.locator('#dj-install-menu .dj-install-choice')).toHaveCount(5);
  await expect(page.locator('#dj-install-menu .dj-install-qr')).toHaveCount(0);

  const web=page.locator('#dj-install-menu .dj-install-choice').filter({hasText:'웹에서 바로 이용하기'});
  const bounds=await web.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await expect.poll(()=>web.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(232, 238, 235)');
  expect(await web.evaluate(el=>getComputedStyle(el).transitionDuration)).toContain('0.07s');

  await page.locator('#dj-install-menu .dj-install-choice').filter({hasText:'홈 화면에 웹앱 추가'}).click();
  const qr=page.locator('#dj-install-menu .dj-install-info .dj-install-qr');
  await expect(qr).toBeVisible();
  await expect(qr).toHaveAttribute('src','/install-qr.png');
});

test('PC Android installation guidance is readable when the verified APK is available',async({page})=>{
  await openPreviewGate(page);
  await page.locator('#dj-install-menu .dj-install-choice').filter({hasText:'Android 앱 다운로드'}).click();
  const guide=page.locator('#dj-install-menu .dj-install-info[data-android-guide]');
  if(await guide.count()===0){
    test.skip(true,'The verified Production APK asset is not available yet; source-level guide layout is covered by Node regression tests.');
  }
  await expect(guide).toBeVisible();
  await expect(guide.locator('ol.dj-install-guide-steps li')).toHaveCount(4);
  const fontSize=await guide.locator('ol.dj-install-guide-steps li').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(15);
});

test('Android tablet gate keeps device illustration and defers QR until home-screen action',async({browser})=>{
  const context=await browser.newContext({
    viewport:{width:820,height:1180},
    deviceScaleFactor:1,
    userAgent:'Mozilla/5.0 (Linux; Android 15; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
  });
  const page=await context.newPage();
  try{
    await openPreviewGate(page);
    await expect(page.locator('#dj-mobile-only-screen .dj-mobile-only-devices')).toBeVisible();
    await expect(page.locator('#dj-install-menu .dj-install-qr')).toHaveCount(0);
    await page.locator('#dj-install-menu .dj-install-choice').filter({hasText:'홈 화면에 웹앱 추가'}).click();
    await expect(page.locator('#dj-install-menu .dj-install-info .dj-install-qr')).toBeVisible();
  }finally{
    await context.close();
  }
});
