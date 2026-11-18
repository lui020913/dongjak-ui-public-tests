import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const URL='https://ui-v880-audit-20261116.dongjak-walk-safety-preview.pages.dev';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
try {
 const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
 const page=await context.newPage();
 await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('#dj-settings-pc').waitFor({state:'visible',timeout:70000});
 await page.locator('#map-gesture-guide-open').waitFor({state:'visible',timeout:70000});
 await page.waitForTimeout(500);
 const geometry=await page.evaluate(()=>{
   const settings=document.querySelector('#dj-settings-pc');
   const help=document.querySelector('#map-gesture-guide-open');
   if(!settings||!help)throw Error('Required header control missing');
   const s=settings.getBoundingClientRect(),h=help.getBoundingClientRect();
   const overlapWidth=Math.max(0,Math.min(s.right,h.right)-Math.max(s.left,h.left));
   const overlapHeight=Math.max(0,Math.min(s.bottom,h.bottom)-Math.max(s.top,h.top));
   const topBar=document.querySelector('.topbar');
   return {
     settings:{left:s.left,right:s.right,top:s.top,bottom:s.bottom,width:s.width,height:s.height},
     help:{left:h.left,right:h.right,top:h.top,bottom:h.bottom,width:h.width,height:h.height},
     overlapWidth,overlapHeight,
     topbarWidth:topBar?.getBoundingClientRect()?.width??null,
     documentWidth:document.documentElement.scrollWidth,
     viewportWidth:window.innerWidth
   };
 });
 await fs.mkdir('ui-audit/header',{recursive:true});
 await fs.writeFile('ui-audit/header/pc1280-header-geometry.json',JSON.stringify(geometry,null,2));
 await page.screenshot({path:'ui-audit/header/pc1280-header.jpg',type:'jpeg',quality:88,
   clip:{x:850,y:0,width:430,height:110},animations:'disabled',timeout:35000});
 if(geometry.settings.width<35||geometry.help.width<35)throw Error('Header controls have inadequate hit width');
 if(geometry.overlapWidth>0&&geometry.overlapHeight>0)throw Error('Settings and help physically overlap '+JSON.stringify(geometry));
 if(geometry.settings.right>1280||geometry.settings.left<0)throw Error('Settings outside visible viewport '+JSON.stringify(geometry));
 if(geometry.documentWidth>1282)throw Error('Horizontal scrolling on 1280px '+geometry.documentWidth);
 console.log('PASS: 1280px Settings and help control geometry non-overlap; visible hit targets preserved.');
 console.log('Geometry: '+JSON.stringify(geometry));
}finally{await browser.close();}
