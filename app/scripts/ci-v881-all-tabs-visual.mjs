/** v8.8.0 — actual PC/mobile navigation surface smoke.
 * Read-only: no fake button events, mock passwords, user-data writes or
 * functional app code alterations. Outputs real Chromium screenshots.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const site=String(process.env.UX_AUDIT_URL||'').trim();
if(!/^https:\/\/[a-z0-9-]+\.dongjak-walk-safety-preview\.pages\.dev\/?$/i.test(site))
  throw Error('Unexpected nonproduction preview URL');
const devices=[
 {id:'pc1280',width:1280,height:800,mobile:false},
 {id:'mobile390',width:390,height:844,mobile:true}
];
const requested=String(process.env.UX_AUDIT_DEVICE||'').trim();
if(requested && !devices.some(d=>d.id===requested))throw Error('Invalid requested UX viewport');
const selected=requested?devices.filter(d=>d.id===requested):devices;
const dir=path.join(process.cwd(),'ux-audit');
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const results=[];
function ownCardRect(r,w,h){
 return !!r&&r.width>100&&r.height>100&&r.x<w-40&&(r.x+r.width)>40&&r.y<h-70&&(r.y+r.height)>70;
}
async function touch(page,selector){
 const e=page.locator(selector);
 await e.waitFor({state:'visible',timeout:60000});
 const r=await e.boundingBox();
 if(!r||r.width<32||r.height<32)throw Error('Visible tap target missing: '+selector);
 await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
}
try{
 for(const d of selected){
  const ctx=await browser.newContext({viewport:{width:d.width,height:d.height},deviceScaleFactor:1,isMobile:d.mobile,hasTouch:d.mobile,colorScheme:'light'});
  const page=await ctx.newPage();page.setDefaultTimeout(60000);
  try {
   const res=await page.goto(site,{waitUntil:'domcontentloaded',timeout:50000});
   if(res?.status()!==200)throw Error('Site HTTP status '+res?.status());
   await page.locator('#map').waitFor({state:'visible',timeout:75000});
   const overlay=page.locator('#map-startup-overlay');
   const cont=page.locator('#map-startup-continue');
   if(await overlay.isVisible()){
    await Promise.race([overlay.waitFor({state:'hidden',timeout:95000}),cont.waitFor({state:'visible',timeout:95000})]);
    if(await cont.isVisible())await touch(page,'#map-startup-continue');
    await overlay.waitFor({state:'hidden',timeout:50000});
   }
   const tour=page.locator('#dj860-onboarding');
   if(await tour.isVisible()){
    await touch(page,'#dj860-onboarding .dj860-skip');
    await tour.waitFor({state:'hidden',timeout:35000});
   }
   async function capture(label){
    const m=await page.evaluate(()=>{
     const a=document.getElementById('app');
     const nav=[...document.querySelectorAll('#bottom-nav>.nav-tab')].map(n=>{
      const r=n.getBoundingClientRect();return {tab:n.dataset.tab,x:Math.round(r.x),right:Math.round(r.right),width:Math.round(r.width),height:Math.round(r.height)};
     });
     return {tab:a?.dataset.tab||'',width:innerWidth,height:innerHeight,
      rootScroll:document.documentElement.scrollWidth,
      overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),nav};
    });
    const file=d.id+'-'+label+'.jpg';
    await page.screenshot({path:path.join(dir,file),type:'jpeg',quality:84,animations:'disabled',timeout:160000});
    if(m.overflow>2)throw Error(label+' horizontal scroll '+m.overflow+'px');
    for(const n of m.nav)if(n.x<-2||n.right>m.width+2||n.width<35||n.height<35)
      throw Error(label+' invalid nav hit rectangle '+JSON.stringify(n));
    results.push({device:d.id,label,file,...m});
    await fs.writeFile(path.join(dir,'metrics.json'),JSON.stringify(results,null,2));
   }
   await capture('map');
   for(const [tab,selector] of [['route','#route-panel'],['participate','#participation-panel'],['news','#news-panel'],['mine','#mine-panel']]){
    await touch(page,'#bottom-nav>.nav-tab[data-tab="'+tab+'"]');
    await page.locator('#app[data-tab="'+tab+'"]').waitFor({state:'attached',timeout:60000});
    const panel=page.locator(selector);
    await panel.waitFor({state:'visible',timeout:70000});
    await page.waitForFunction(sel=>{
      const e=document.querySelector(sel);
      if(!e||e.hidden)return false;
      const r=e.getBoundingClientRect(),s=getComputedStyle(e);
      return s.visibility!=='hidden'&&parseFloat(s.opacity)>0&&
        r.width>100&&r.height>100&&r.left<innerWidth-40&&r.right>40&&
        r.top<innerHeight-70&&r.bottom>70;
    },selector,{timeout:65000});
    const r=await panel.boundingBox();
    if(!ownCardRect(r,d.width,d.height))throw Error(tab+' panel not on screen: '+JSON.stringify(r));
    await page.waitForTimeout(350);
    await capture(tab);
   }
   await touch(page,'#bottom-nav>.nav-tab[data-tab="map"]');
   await page.locator('#app[data-tab="map"]').waitFor({state:'attached',timeout:45000});
   const safety=d.mobile?'#dj-v794-safety':'#map-safety-toggle';
   await touch(page,safety);
   const safetyPanel=page.locator('#map-safety-controls');
   await safetyPanel.waitFor({state:'visible',timeout:50000});
   await capture('safety');
   console.log(d.id+': 5 bottom tabs + real safety controls, visible on screen, no document horizontal scroll.');
  }finally{await ctx.close();}
 }
}finally{await browser.close();}
await fs.writeFile(path.join(dir,'metrics.json'),JSON.stringify(results,null,2));
console.log('PASS: '+results.length+' real UI screenshots, PC and mobile tab navigation.');
