import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const width=Number(process.env.WIDTH||390),height=Number(process.env.HEIGHT||844);
const site='https://dongjak-walk-safety-preview.pages.dev';
const out=`multisurface-proof/${width}`;mkdirSync(out,{recursive:true});
const report={width,height,cases:[],errors:[]};
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const marker=async()=>{const r=await fetch(site+'/release-source.json');if(!r.ok)throw Error('release marker unavailable');return r.json();};
report.baseline=await marker();
if(report.baseline.application_version!=='8.9.8')throw Error('Expected v8.9.8 baseline; inspect changed release before proceeding');
try{
for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<1100,locale:'ko-KR',colorScheme:theme});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#map-startup-overlay').waitFor({state:'hidden',timeout:60000});
 const skip=page.locator('[data-dj860-action="skip"]');if(await skip.isVisible())await skip.click();
 const later=page.locator('.dj-webapp-tip-later');if(await later.isVisible())await later.click();
 await page.locator('#bottom-nav').waitFor({state:'visible'});
 await page.waitForTimeout(600);
 const capture=async name=>{
  await page.waitForTimeout(450);
  const data=await page.evaluate(()=>{
   const box=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {id:e.id,cls:e.className,text:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,80),x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,display:s.display,visibility:s.visibility,font:s.fontSize,animation:s.animationName,overflow:s.overflowY};};
   const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden]');};
   const controls=[...document.querySelectorAll('#app button,#bottom-nav .nav-tab')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {...box(e),hit:!!hit&&(e===hit||e.contains(hit)),clipped:r.x<-.5||r.right>innerWidth+.5||r.y<-.5||r.bottom>innerHeight+.5};});
   const panels=[...document.querySelectorAll('#app .page-panel,#app .floating-sheet,#app .transport-sheet,#app #dj-mobile-utilities,#app #map-advanced-controls')].filter(visible).map(box);
   return {theme:document.documentElement.dataset.theme,overflow:document.documentElement.scrollWidth-innerWidth,nav:box(document.querySelector('#bottom-nav')),panels,controls};
  });
  report.cases.push({theme,name,...data});
  await page.screenshot({path:`${out}/${theme}-${name}.png`,animations:'disabled'});
  console.log(JSON.stringify({width,theme,name,overflow:data.overflow,panels:data.panels,clipped:data.controls.filter(x=>x.clipped),small:data.controls.filter(x=>x.w<43.5||x.h<43.5).map(x=>({id:x.id,text:x.text,w:x.w,h:x.h}))}));
 };
 await capture('map');
 for(const t of ['route','participate','news','mine']){
  await page.locator(`#bottom-nav .nav-tab[data-tab="${t}"]`).click();await capture(t);
 }
 await page.locator('#bottom-nav .nav-tab[data-tab="map"]').click();
 const more=page.locator('#dj-v794-more');
 if(await more.isVisible()){await more.click();await capture('more');}
 else{const tools=page.locator('#map-tools-toggle');if(await tools.isVisible()){await tools.click();await capture('tools');}}
 await context.close();
}
report.after=await marker();
if(JSON.stringify(report.after)!==JSON.stringify(report.baseline))throw Error('Production changed during capture');
}finally{writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
