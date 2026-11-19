/** Visual-only regression for v8.8.0 Supabase AI modal refresh.
 * Real clicks open the safety tools and dialog. The dark CSS test changes only
 * #app's theme *state* (not click behavior) to verify the dialog is synced.
 * Do not treat it as a test of the site's actual theme-toggle implementation.
 */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const base=process.env.DESIGN_PREVIEW_URL||'';
if(!/^https:\/\/[a-z0-9-]+\.dongjak-walk-safety-preview\.pages\.dev$/.test(base))
  throw Error('Unexpected nonproduction Pages Preview URL');
const out='design-qa';
await fs.mkdir(out,{recursive:true});
const scenarios=[{id:'mobile390',width:390,height:844,mobile:true},
                 {id:'pc1280',width:1280,height:800,mobile:false}];
const b=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const result=[];
const centerClick=async (page,locator)=>{
  const rect=await locator.boundingBox();
  if(!rect||rect.width<28||rect.height<28)throw Error('Physical hit target too small/missing');
  await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
};
try{
 for(const device of scenarios){
  const ctx=await b.newContext({viewport:{width:device.width,height:device.height},isMobile:device.mobile,hasTouch:device.mobile,deviceScaleFactor:1,colorScheme:'light'});
  const page=await ctx.newPage();
  try{
   const res=await page.goto(base,{waitUntil:'domcontentloaded',timeout:50000});
   if(!res||res.status()!==200)throw Error('Preview HTTP '+res?.status());
   const entry=page.locator('#dj-ai-search-entry');
   await entry.waitFor({state:'attached',timeout:140000});
   const startup=page.locator('#map-startup-overlay');
   const cont=page.locator('#map-startup-continue');
   if(await startup.isVisible()){
    await Promise.race([startup.waitFor({state:'hidden',timeout:85000}),cont.waitFor({state:'visible',timeout:85000})]);
    if(await cont.isVisible())await centerClick(page,cont);
    await startup.waitFor({state:'hidden',timeout:40000});
   }
   const onboarding=page.locator('#dj860-onboarding');
   if(await onboarding.isVisible()){
    await centerClick(page,onboarding.locator('.dj860-skip'));
    await onboarding.waitFor({state:'hidden',timeout:30000});
   }
   const openSafety=page.locator(device.mobile?'#dj-v794-safety':'#map-safety-toggle');
   await openSafety.waitFor({state:'visible',timeout:30000});
   await centerClick(page,openSafety);
   await entry.waitFor({state:'visible',timeout:30000});
   // Playwright locator.click performs a real pointer click, but also waits for
   // stable hit testing and reports overlay interception. Coordinate-only
   // clicks can land on overlapping MapLibre controls and silently do nothing.
   await page.screenshot({path:out+'/'+device.id+'-before-open.jpg',type:'jpeg',quality:74,timeout:65000});
   await entry.click({timeout:30000});
   const modal=page.locator('#dj-ai-search-modal[open]');
   await modal.waitFor({state:'visible',timeout:35000});
   await page.waitForTimeout(330);
   const measure=()=>page.evaluate(()=>{
    const dialog=document.querySelector('#dj-ai-search-modal'),r=dialog.getBoundingClientRect();
    const title=dialog.querySelector('.dj-ai-search-names h2');
    const field=dialog.querySelector('#dj-ai-query');
    const disclaimer=dialog.querySelector('.dj-ai-disclaimer');
    const examples=dialog.querySelector('.dj-ai-examples');
    const chips=[...dialog.querySelectorAll('.dj-ai-example')].map(x=>{
      const rect=x.getBoundingClientRect();return {top:Math.round(rect.top),width:Math.round(rect.width),height:Math.round(rect.height)};
    });
    return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,
      dialog:{x:Math.round(r.x),y:Math.round(r.y),right:Math.round(r.right),bottom:Math.round(r.bottom),height:Math.round(r.height)},
      titleFont:parseFloat(getComputedStyle(title).fontSize),
      inputFont:parseFloat(getComputedStyle(field).fontSize),
      disclaimerFont:parseFloat(getComputedStyle(disclaimer).fontSize),
      background:getComputedStyle(dialog).backgroundColor,
      textColor:getComputedStyle(dialog).color,
      chipLayout:chips,chipScrollWidth:examples.scrollWidth,chipClientWidth:examples.clientWidth,
      overflowX:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
   });
   const light=await measure();
   if(light.overflowX>2||light.dialog.right>device.width+2||light.dialog.x<-2)
     throw Error('Dialog horizontal clipping: '+JSON.stringify(light));
   if(light.titleFont<18||light.inputFont<14||light.disclaimerFont<12)
     throw Error('Typography below accessible target: '+JSON.stringify(light));
   if(device.mobile&&Math.max(...light.chipLayout.map(x=>x.top))-Math.min(...light.chipLayout.map(x=>x.top))>3)
     throw Error('Mobile example chips wrapped into multiple rows');
   await page.screenshot({path:out+'/'+device.id+'-light.jpg',type:'jpeg',quality:82,animations:'disabled',timeout:90000});
   // Verify style propagation, not a theme-toggle interaction test. The real
   // application's theme event is separately covered by its regression suite.
   await page.evaluate(()=>{document.getElementById('app').dataset.theme='dark';});
   await page.waitForTimeout(160);
   const dark=await measure();
   if(dark.background===light.background||dark.textColor===light.textColor)
     throw Error('Detached AI dialog did not follow #app dark theme');
   await page.screenshot({path:out+'/'+device.id+'-dark.jpg',type:'jpeg',quality:82,animations:'disabled',timeout:90000});
   result.push({device:device.id,light,dark});
   console.log(device.id+': PASS light/dark AI dialog, typography, chip layout and horizontal overflow');
  }finally{await ctx.close();}
 }
}finally{await b.close();}
await fs.writeFile(out+'/metrics.json',JSON.stringify(result,null,2));
console.log('PASS: 2 actual viewports x 2 color themes, 4 screenshots. No app function changes.');
