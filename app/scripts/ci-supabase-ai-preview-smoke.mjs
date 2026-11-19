/** Focused nonproduction AI UI smoke. Does not authenticate or modify user data. */
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const site=process.env.AI_PREVIEW_URL||'';
if(!/^https:\/\/[a-z0-9-]+\.dongjak-walk-safety-preview\.pages\.dev$/.test(site))throw Error('Unexpected AI Preview host');
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage();
const out='ai-preview-audit';
try{
  await mkdir(out,{recursive:true});
  const response=await page.goto(site,{waitUntil:'domcontentloaded',timeout:50000});
  if(!response||response.status()!==200)throw Error('AI Preview entry did not serve 200');
  const entry=page.locator('#dj-ai-search-entry');
  await entry.waitFor({state:'attached',timeout:140000});
  const startup=page.locator('#map-startup-overlay');
  const continueButton=page.locator('#map-startup-continue');
  try{
    if(await startup.isVisible()){
      await Promise.race([
        startup.waitFor({state:'hidden',timeout:85000}),
        continueButton.waitFor({state:'visible',timeout:85000})
      ]);
      if(await continueButton.isVisible()){
        const rect=await continueButton.boundingBox();
        if(!rect)throw Error('Continue button has no layout');
        await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
      }
      await startup.waitFor({state:'hidden',timeout:35000});
    }
  }catch(e){throw Error('Map startup did not complete before AI smoke: '+String(e).slice(0,200));}
  const tour=page.locator('#dj860-onboarding');
  if(await tour.isVisible()){
    const skip=tour.locator('.dj860-skip');
    await skip.waitFor({state:'visible',timeout:20000});
    const rect=await skip.boundingBox();
    if(!rect)throw Error('Onboarding skip hit area missing');
    await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
    await tour.waitFor({state:'hidden',timeout:20000});
  }
  // On phones the original #map-safety-toggle is intentionally hidden.
  // Click the REAL visible proxy used by the existing V794 mobile toolbar.
  const safety=page.locator('#dj-v794-safety');
  await safety.waitFor({state:'visible',timeout:30000});
  const safetyHit=await safety.boundingBox();
  if(!safetyHit||safetyHit.width<36||safetyHit.height<36)throw Error('Mobile safety proxy physical hit target missing');
  await page.mouse.click(safetyHit.x+safetyHit.width/2,safetyHit.y+safetyHit.height/2);
  await page.locator('#app.map-safety-open').waitFor({state:'attached',timeout:30000});
  await entry.waitFor({state:'visible',timeout:30000});
  await entry.click({timeout:30000});
  const dialog=page.locator('#dj-ai-search-modal[open]');
  await dialog.waitFor({state:'visible',timeout:20000});
  await page.screenshot({path:out+'/ai-modal-open.jpg',type:'jpeg',quality:82,timeout:45000});
  await page.locator('#dj-ai-query').fill('상도1동 어린이 보호구역');
  await page.locator('button.dj-ai-submit').click();
  const status=page.locator('.dj-ai-status');
  await page.waitForFunction(()=>{
    const t=document.querySelector('.dj-ai-status')?.textContent||'';
    return /로그인|Supabase 연결/.test(t);
  },null,{timeout:18000});
  await page.screenshot({path:out+'/ai-guest-login-required.jpg',type:'jpeg',quality:82,timeout:45000});
  console.log('PASS: Mobile real AI entry and dialog, guest access prompts login; no user credentials consumed.');
}finally{await context.close();await browser.close();}
