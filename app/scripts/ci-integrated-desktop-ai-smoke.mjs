/** Nonproduction desktop 1280 UI + AI integration smoke.
 * No credential input, data mutation, or browser-injected artificial click. */
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const site=process.env.INTEGRATED_PREVIEW_URL||'';
if(!/^https:\/\/[a-z0-9-]+\.dongjak-walk-safety-preview\.pages\.dev$/i.test(site))throw Error('unexpected Pages Preview URL');
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
const page=await context.newPage();
const out='integration-desktop-audit';
await mkdir(out,{recursive:true});
try{
  const response=await page.goto(site,{waitUntil:'domcontentloaded',timeout:45000});
  if(response?.status()!==200)throw Error('Preview returned HTTP '+response?.status());
  const entry=page.locator('#dj-ai-search-entry');
  await entry.waitFor({state:'attached',timeout:130000});
  const startup=page.locator('#map-startup-overlay');
  const cont=page.locator('#map-startup-continue');
  if(await startup.isVisible()){
    await Promise.race([startup.waitFor({state:'hidden',timeout:80000}),cont.waitFor({state:'visible',timeout:80000})]);
    if(await cont.isVisible()){const r=await cont.boundingBox();if(!r)throw Error('No continue target');await page.mouse.click(r.x+r.width/2,r.y+r.height/2);}
    await startup.waitFor({state:'hidden',timeout:35000});
  }
  const tour=page.locator('#dj860-onboarding');
  if(await tour.isVisible()){
    const skip=tour.locator('.dj860-skip');const r=await skip.boundingBox();
    if(!r)throw Error('No tour-skip hitbox');await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
    await tour.waitFor({state:'hidden',timeout:30000});
  }
  const settings=page.locator('#dj-settings-pc'),help=page.locator('#map-gesture-guide-open');
  await settings.waitFor({state:'visible',timeout:35000});
  await help.waitFor({state:'visible',timeout:35000});
  const metrics=await page.evaluate(()=>{
    const s=document.getElementById('dj-settings-pc')?.getBoundingClientRect();
    const h=document.getElementById('map-gesture-guide-open')?.getBoundingClientRect();
    if(!s||!h)throw Error('settings or help missing');
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      settings:{x:s.x,y:s.y,width:s.width,height:s.height},
      help:{x:h.x,y:h.y,width:h.width,height:h.height},
      overlap:Math.max(0,Math.min(s.right,h.right)-Math.max(s.left,h.left))*Math.max(0,Math.min(s.bottom,h.bottom)-Math.max(s.top,h.top))};
  });
  await writeFile(out+'/geometry.json',JSON.stringify(metrics,null,2));
  if(metrics.overlap>1||metrics.scrollWidth>1282)throw Error('1280 header overlap or scroll: '+JSON.stringify(metrics));
  const safety=page.locator('#map-safety-toggle');await safety.waitFor({state:'visible',timeout:20000});
  const b=await safety.boundingBox();if(!b||b.width<35)throw Error('No visible desktop safety launch hitbox');
  await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
  await entry.waitFor({state:'visible',timeout:35000});
  await entry.click({timeout:25000});
  await page.locator('#dj-ai-search-modal[open]').waitFor({state:'visible',timeout:20000});
  const d=await page.locator('#dj-ai-search-modal').boundingBox();
  if(!d||d.width<350||d.right>1280||d.bottom>800)throw Error('Desktop AI dialog offscreen: '+JSON.stringify(d));
  await page.screenshot({path:out+'/desktop1280-ai-modal.jpg',type:'jpeg',quality:82,timeout:65000});
  await page.locator('#dj-ai-query').fill('상도1동 어린이 보호구역');
  await page.locator('button.dj-ai-submit').click({timeout:25000});
  await page.waitForFunction(()=>/로그인|Supabase 연결/.test(document.querySelector('.dj-ai-status')?.textContent||''),null,{timeout:15000});
  console.log('PASS: PC1280 real safety tools + Supabase AI guest dialog; no header collision or horizontal scroll.');
}finally{await context.close();await browser.close();}
