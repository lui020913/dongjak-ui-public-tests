import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const url='https://global-v880-ux-polish.dongjak-walk-safety-preview.pages.dev';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const out='safety-on-screen';
await fs.mkdir(out,{recursive:true});
try{
 const result=await page.goto(url,{waitUntil:'domcontentloaded',timeout:50000});
 if(result.status()!==200)throw Error('Preview not HTTP 200');
 await page.locator('#dj-v794-safety').waitFor({state:'visible',timeout:140000});
 const startup=page.locator('#map-startup-overlay');
 if(await startup.isVisible()){
   const cont=page.locator('#map-startup-continue');
   await Promise.race([startup.waitFor({state:'hidden',timeout:95000}),cont.waitFor({state:'visible',timeout:95000})]);
   if(await cont.isVisible())await cont.click({timeout:30000});
   await startup.waitFor({state:'hidden',timeout:35000});
 }
 const tour=page.locator('#dj860-onboarding');
 if(await tour.isVisible()){
   await tour.locator('.dj860-skip').click({timeout:30000});
   await tour.waitFor({state:'hidden',timeout:35000});
 }
 await page.locator('#dj-v794-safety').click({timeout:30000});
 await page.waitForTimeout(850);
 const data=await page.evaluate(()=>{
   const app=document.querySelector('#app');
   const target=document.querySelector('#map-safety-controls');
   const backdrop=document.querySelector('#map-safety-backdrop');
   const button=document.querySelector('#dj-v794-safety');
   const props=e=>{
     if(!e)return null;
     const r=e.getBoundingClientRect(),c=getComputedStyle(e);
     return {rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},
       display:c.display,visibility:c.visibility,opacity:c.opacity,zIndex:c.zIndex,
       position:c.position,transform:c.transform,translate:c.translate,
       bottom:c.bottom,top:c.top,maxHeight:c.maxHeight,overflow:c.overflow};
   };
   return {appClass:app.className,mapTab:app.dataset.tab,viewport:{width:innerWidth,height:innerHeight},
     cssVars:{nav:getComputedStyle(app).getPropertyValue('--dj-mobile-nav-h'),header:getComputedStyle(app).getPropertyValue('--dj-header-h')},
     button:props(button),safety:props(target),backdrop:props(backdrop),
     floatingTip:props(document.getElementById('dj840-map-tip')),
     atCenter:document.elementFromPoint(innerWidth/2,innerHeight*.58)?.id};
 });
 await fs.writeFile(out+'/safety-geometry.json',JSON.stringify(data,null,2));
 await page.screenshot({path:out+'/mobile390-safety-real.jpg',type:'jpeg',quality:90,timeout:90000});
 console.log('ACTUAL_GEO '+JSON.stringify(data));
 const r=data.safety?.rect;
 if(!r||r.width<100||r.height<100||r.x>=390||r.right<35||r.y>=844-110||r.bottom<=90)
   throw Error('Safety panel not visible inside mobile viewport despite active toolbar');
 const tip=data.floatingTip;
 if(tip&&tip.display!=='none'&&tip.visibility!=='hidden'&&Number(tip.opacity)>0.02)
   throw Error('Map TIP is still visible and can overlap the safety drawer: '+JSON.stringify(tip));
 console.log('PASS: physical mobile safety panel onscreen; floating TIP suppressed while drawer open.');
}finally{await browser.close();}
