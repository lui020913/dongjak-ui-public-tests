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
  await expect(choices).toHaveCount(5);
  const guidebook=choices.last();
  await expect(guidebook).toHaveText(/가이드북 다운로드.*PDF/);
  await expect(guidebook).toHaveAttribute('href','/dongjak-guidebook.pdf');
  await expect(guidebook).toHaveAttribute('download','동작하는 안전지도 가이드북.pdf');
  const pdf=await page.request.get(new URL('/dongjak-guidebook.pdf',target).href);
  expect(pdf.ok()).toBe(true);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect(pdf.headers()['content-disposition']).toContain('attachment');
  const pdfBytes=await pdf.body();
  expect(pdfBytes.subarray(0,5).toString()).toBe('%PDF-');
  const size=pdfBytes.length>=1000000?(pdfBytes.length/1000000).toFixed(1)+' MB':Math.max(1,Math.round(pdfBytes.length/1000))+' KB';
  await expect(guidebook.locator('.dj-install-status')).toHaveText('PDF · '+size);
  await expect(page.locator('#dj-install-menu .dj-install-performance')).not.toContainText('태블릿은 별도 모드');
  const [download]=await Promise.all([page.waitForEvent('download'),guidebook.click()]);
  expect(await download.failure()).toBeNull();
  await expect(page.locator('#dj-install-menu .dj-install-qr')).toHaveCount(0);
  const android=choices.filter({hasText:'Android 앱 다운로드'});
  await expect(android).toHaveAttribute('aria-pressed','false');
  await android.click();
  await expect(android).toHaveAttribute('aria-pressed','true');
  await expect(android.locator('.dj-install-selected')).toHaveCount(0);
  await expect(android.locator('.dj-install-status')).toBeVisible();
  await expect(choices.filter({hasText:'웹에서 바로 이용하기'})).toHaveAttribute('aria-pressed','false');
  const guide=page.locator('#dj-install-menu .dj-install-info[data-android-guide]');
  await expect(guide).toBeVisible();
  await expect(guide.locator('.dj-install-guide-intro')).toContainText('Google Play 스토어 외부');
  await expect(guide.locator('.dj-install-guide-intro')).toContainText('테스트용 APK');
  await expect(guide.locator('.dj-install-guide-context')).toContainText('설치 제한이나 보안 안내');
  await expect(guide.locator('.dj-install-guide-notice')).toContainText('악성·유해 앱');
  await expect(guide.locator('.dj-install-guide-notice')).toContainText('Play Protect');
  await expect(guide.locator('.dj-install-guide-notice')).toContainText('설치하지 마세요');
  await expect(guide.locator('ol.dj-install-guide-steps li')).toHaveCount(4);
  await expect(guide.locator('ol.dj-install-guide-steps')).toBeHidden();
  await guide.locator('summary').click();
  await expect(guide.locator('ol.dj-install-guide-steps')).toBeVisible();
  await guide.locator('summary').click();
  await expect(guide.locator('ol.dj-install-guide-steps')).toBeHidden();
  await expect(android.locator('.dj-install-status')).not.toHaveText('확인 중',{timeout:30000});
  if(await guide.locator('.dj-install-guide-unavailable').count()){
    await expect(guide.locator('.dj-install-guide-unavailable')).toContainText('확인하지 못했습니다');
    await expect(guide.getByRole('button',{name:'다시 확인',exact:true})).toBeEnabled();
    await expect(guide.getByRole('button',{name:'Dongjak Safety Map.apk 다운로드'})).toHaveCount(0);
    await expect(guide.locator('.dj-install-apk-meta')).toHaveCount(0);
  }else{
    await expect(guide.getByRole('button',{name:'Dongjak Safety Map.apk 다운로드'})).toBeVisible();
  }
  const pwa=choices.filter({hasText:'홈 화면에 웹앱 추가'});
  await pwa.click();
  await expect(pwa).toHaveAttribute('aria-pressed','true');
  await expect(android).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#dj-install-menu .dj-install-qr')).toBeVisible();
  await pwa.click();await expect(pwa).toHaveAttribute('aria-pressed','false');await expect(page.locator('#dj-install-menu .dj-install-info')).toBeHidden();await expect(page.locator('#dj-install-menu .dj-install-qr')).toHaveCount(0);
  const web=choices.filter({hasText:'웹에서 바로 이용하기'});await web.click();await expect(page.locator('#dj-install-menu .dj-install-info')).toBeVisible();await web.click();await expect(web).toHaveAttribute('aria-pressed','false');await expect(page.locator('#dj-install-menu .dj-install-info')).toBeHidden();
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
    await expect(android.locator('.dj-install-selected')).toHaveCount(0);
  await expect(android.locator('.dj-install-status')).toBeVisible();
    const guide=page.locator('#dj-install-menu .dj-install-info[data-android-guide]');
    await expect(guide).toBeVisible();
    await expect(guide.locator('.dj-install-guide-intro')).toContainText('Google Play 스토어 외부');
    await expect(guide.locator('.dj-install-guide-notice')).toContainText('Play Protect');
    await android.click();await expect(android).toHaveAttribute('aria-pressed','false');await expect(page.locator('#dj-install-menu .dj-install-info')).toBeHidden();await expect(page.locator('#dj-install-menu [data-android-guide]')).toHaveCount(0);
  }finally{
    await context.close();
  }
});


test('installed iPad PWA and ordinary iPad Safari both remain restricted',async({browser})=>{
  for(const standalone of [false,true]){
    const context=await browser.newContext({viewport:{width:1024,height:1366},hasTouch:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'});
    try{
      await context.addInitScript(({standalone})=>{
        Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'MacIntel'});
        Object.defineProperty(navigator,'maxTouchPoints',{configurable:true,get:()=>5});
        Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>standalone});
      },{standalone});
      const page=await context.newPage();
      if(standalone){
        await page.goto(target,{waitUntil:'domcontentloaded'});
        await expect(page.locator('#dj-install-menu')).toHaveCount(0);
      }else{
        await openGate(page);
        await page.locator('#dj-install-menu').getByRole('button',{name:'웹에서 바로 이용하기'}).click();
      }
      await expect(page.locator('html')).toHaveAttribute('data-dj-mobile-only','blocked');
      await expect(page.locator('#dj-mobile-only-screen')).toBeVisible({timeout:45000});
      await expect(page.locator('#app')).toBeHidden();
      for(const viewport of [{width:1366,height:1024},{width:390,height:844}]){
        await page.setViewportSize(viewport);
        await expect(page.locator('html')).toHaveAttribute('data-dj-mobile-only','blocked');
        await expect(page.locator('#app')).toBeHidden();
      }
    }finally{await context.close();}
  }
});
