import {test,expect} from '@playwright/test';

const target=process.env.DONGJAK_TARGET_URL;
async function openGate(page){
  if(!target)throw new Error('DONGJAK_TARGET_URL is required');
  await page.goto(target,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#dj-mobile-only-screen')).toBeVisible({timeout:45000});
  await expect(page.locator('#dj-install-menu')).toBeVisible({timeout:45000});
  const marker=await page.evaluate(async()=>await (await fetch('/release-source.json',{cache:'no-store'})).json());
  expect(marker.source_commit).toBe(process.env.DONGJAK_EXPECTED_SOURCE_SHA);
  expect(marker.application_version).toBe(process.env.DONGJAK_EXPECTED_VERSION);
  expect(marker.release_status).toBe('CANDIDATE_PREVIEW_NOT_PRODUCTION');
}

test('PC install gate marks the selected option and always shows Google Play external APK warnings',async({page})=>{
  await openGate(page);
  await expect(page.locator('#dj-mobile-only-screen .dj-mobile-only-devices')).toBeVisible();
  const choices=page.locator('#dj-install-menu .dj-install-choice');
  await expect(choices).toHaveCount(4);
  await expect(page.locator('#dj-install-menu .dj-install-qr')).toHaveCount(0);
  const android=choices.filter({hasText:'Android 앱 다운로드'});
  await expect(android).toHaveAttribute('aria-pressed','false');
  await android.click();
  await expect(android).toHaveAttribute('aria-pressed','true');
  await expect(android.locator('.dj-install-selected')).toBeVisible();
  await expect(choices.filter({hasText:'웹에서 바로 이용하기'})).toHaveAttribute('aria-pressed','false');
  const guide=page.locator('#dj-install-menu .dj-install-info[data-android-guide]');
  await expect(guide).toBeVisible();
  await expect(guide.locator('.dj-install-guide-intro')).toContainText('Google Play 스토어 외부');
  await expect(guide.locator('.dj-install-guide-intro')).toContainText('테스트용 APK');
  await expect(guide.locator('.dj-install-guide-notice')).toContainText('Play Protect');
  await expect(guide.locator('.dj-install-guide-notice')).toContainText('설치하지 마세요');
  await expect(guide.locator('ol.dj-install-guide-steps li')).toHaveCount(4);
  if(await guide.locator('.dj-install-guide-unavailable').count()){
    await expect(guide.locator('.dj-install-guide-unavailable')).toContainText('준비 중');
    await expect(guide.getByRole('button',{name:'APK 다운로드'})).toHaveCount(0);
  }else{
    await expect(guide.getByRole('button',{name:'APK 다운로드'})).toBeVisible();
  }
  const pwa=choices.filter({hasText:'홈 화면에 웹앱 추가'});
  await pwa.click();
  await expect(pwa).toHaveAttribute('aria-pressed','true');
  await expect(android).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#dj-install-menu .dj-install-qr')).toBeVisible();
});

test('Android tablet install gate keeps selected state and the same external-download warning',async({browser})=>{
  const context=await browser.newContext({
    viewport:{width:820,height:1180},
    deviceScaleFactor:1,
    userAgent:'Mozilla/5.0 (Linux; Android 15; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
  });
  const page=await context.newPage();
  try{
    await openGate(page);
    const android=page.locator('#dj-install-menu .dj-install-choice').filter({hasText:'Android 앱 다운로드'});
    await android.click();
    await expect(android).toHaveAttribute('aria-pressed','true');
    await expect(android.locator('.dj-install-selected')).toBeVisible();
    const guide=page.locator('#dj-install-menu .dj-install-info[data-android-guide]');
    await expect(guide).toBeVisible();
    await expect(guide.locator('.dj-install-guide-intro')).toContainText('Google Play 스토어 외부');
    await expect(guide.locator('.dj-install-guide-notice')).toContainText('Play Protect');
  }finally{
    await context.close();
  }
});
