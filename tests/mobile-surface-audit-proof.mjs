/**
 * Anonymous real-app visual interaction evidence. No posts are submitted,
 * no accounts touched, no actual device-location permission is granted.
 * Chromium keyboard bounds unit tests are not iPhone OS keyboard tests.
 */
import { chromium, devices } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const site=process.env.TARGET||'https://dongjak-walk-safety-preview.pages.dev';
const cssAll=readFileSync('candidate/frontend/production/dongjak-production-overlay.css','utf8');
const css=cssAll.slice(cssAll.indexOf('/* Mobile alignment:'));
const js=readFileSync('candidate/frontend/production/mobile-surface-coordinator.mjs','utf8');
const out='mobile-surface-proof';mkdirSync(out,{recursive:true});
const result={mode:'390px Chromium, real deployed baseline with isolated candidate CSS/JS; no production deployment',cases:[]};
const save=()=>writeFileSync(out+'/report.json',JSON.stringify(result,null,2));
const marker=async()=>{
  const r=await fetch(site+'/release-source.json?audit='+Date.now(),{signal:AbortSignal.timeout(20000),cache:'no-store'});
  if(!r.ok)throw Error('Live marker unavailable');const m=await r.json();
  if(m.release_status!=='DEPLOYED_PRODUCTION'||m.public_ui_source_commit!=='777d8cae655973815e694426ec560536cd116744'||m.public_ui_overlay_sha256!=='6fef095abbcfde431b26b648a2763cef3c27820548bc10b87a7e4fa2ffb833a5')throw Error('Exact live baseline changed; stop');
  return m;
};
const rect=(page,selector)=>page.locator(selector).evaluate(e=>{
 const r=e.getBoundingClientRect(),s=getComputedStyle(e);
 return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,opacity:s.opacity,display:s.display,visibility:s.visibility,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight};
});
const hit=async(page,selector)=>page.locator(selector).evaluate(e=>{
 const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
 const t=e.ownerDocument.elementFromPoint(x,y);
 return Boolean(t&&(t===e||e.contains(t)));
});
const gap=async(page,panel)=>Number(((await rect(page,'#bottom-nav')).top-(await rect(page,panel)).bottom).toFixed(2));
const click=async(page,selector)=>page.locator(selector).click({timeout:20000,noWaitAfter:true});
const shot=async(page,name)=>{
 const ready=await page.evaluate(()=>Promise.race([document.fonts.ready.then(()=>true),new Promise(r=>setTimeout(()=>r(false),20000))]));
 if(!ready)throw Error('Fonts not ready');
 await page.screenshot({path:out+'/'+name+'.png',animations:'disabled',timeout:35000});
};
const appReady=async page=>{
 await page.goto(site+'/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#map').waitFor({state:'visible',timeout:60000});
 await page.locator('#map-startup-overlay').waitFor({state:'hidden',timeout:60000});
 const tour=page.locator('#dj860-onboarding');
 if(await tour.isVisible()){await tour.locator('[data-dj860-action="skip"]').click({timeout:25000});await tour.waitFor({state:'hidden',timeout:15000});}
 const later=page.locator('#dj-browser-webapp-tip .dj-webapp-tip-later');if(await later.isVisible())await later.click({timeout:15000});
 await page.locator('#dj831-scrollport').waitFor({state:'visible',timeout:30000});
};
const install=async page=>{
 await page.addStyleTag({content:css});
 await page.addScriptTag({type:'module',content:js+'\nwindow.__djSurfaceDispose=installMobileSurfaceCoordinator(document,window);'});
 await page.waitForFunction(()=>document.querySelector('#app').dataset.djUserSurfaceReady==='1');
 await page.waitForTimeout(500);
};
const assertions=(value,message)=>{if(!value)throw Error(message);};
let browser;
try{
 result.baseline=await marker();save();
 browser=await chromium.launch({headless:true});
 // Separate contexts prevent unfinished prior animations or permission state
 // from contaminating the other cases.
 for(const name of ['community-compose','nearby','admin','map-hud','more-motion']){
   const row={name};result.cases.push(row);let ctx;
   try{
     ctx=await browser.newContext({...devices['Pixel 7'],viewport:{width:390,height:844},colorScheme:'light',locale:'ko-KR'});
     // Never supply user coordinates or grant geolocation access.
     const page=await ctx.newPage();await appReady(page);
     if(name==='community-compose'){
       await click(page,'#bottom-nav .nav-tab[data-tab="participate"]');
       await click(page,'#community-compose-toggle');
       await page.locator('#community-form').waitFor({state:'visible',timeout:20000});
       await page.waitForTimeout(500);
       await shot(page,name+'-before');await install(page);
       const outer=page.locator('#participation-panel > .dj-sheet-chrome');
       row.outerHeaderVisible=await outer.isVisible();
       row.closeVisible=await page.locator('#community-compose-close').isVisible();
       row.formVisible=await page.locator('#community-form').isVisible();
       row.firstFieldHit=await hit(page,'#community-category');
       assertions(row.firstFieldHit,'First editable field clipped or covered after opening composer');
       assertions(!row.outerHeaderVisible&&row.closeVisible&&row.formVisible,'Duplicate compose header or missing close');
       await shot(page,name+'-after');await click(page,'#community-compose-close');
       await page.locator('#community-form').waitFor({state:'hidden',timeout:10000});
       assertions(await outer.isVisible(),'Parent header not recovered after cancel');
       row.keyboard='Visual viewport bounds unit tested; actual iOS OS keyboard not exercised';
     }else if(name==='nearby'){
       const trigger=page.locator('#dj831-scrollport [data-dj831-feature="safe-nearby"]');
       await trigger.scrollIntoViewIfNeeded({timeout:15000});
       await trigger.click({timeout:20000});
       await page.locator('#ped-tools-panel').waitFor({state:'visible',timeout:20000});
       await page.waitForTimeout(550);row.beforeGenericVisible=await page.locator('#dj832-data-sheet').isVisible();
       await shot(page,name+'-before');await install(page);await page.waitForTimeout(600);
       row.afterNativeVisible=await page.locator('#ped-tools-panel').isVisible();
       row.afterGenericVisible=await page.locator('#dj832-data-sheet').isVisible();
       row.status=await page.locator('#ped-tools-status').innerText();
       row.closeHit=await hit(page,'#ped-tools-close');
       row.bannerVisible=await page.locator('#dj-browser-webapp-tip').isVisible();
       assertions(row.afterNativeVisible&&!row.afterGenericVisible&&row.closeHit&&!row.bannerVisible,'Native result is obscured or generic/install layer remains');
       await shot(page,name+'-after');
     }else if(name==='admin'){
       const trigger=page.locator('#dj831-scrollport [data-dj831-feature="map-dong"]');
       await trigger.scrollIntoViewIfNeeded({timeout:15000});await trigger.click({timeout:20000});
       await page.locator('#admin-dong-picker').waitFor({state:'visible',timeout:20000});
       await page.waitForTimeout(600);row.beforeGap=await gap(page,'#admin-dong-picker');
       await shot(page,name+'-before');await install(page);row.afterGap=await gap(page,'#admin-dong-picker');
       const button=page.locator('#admin-dong-clear');await button.scrollIntoViewIfNeeded({timeout:20000});
       const b=await rect(page,'#admin-dong-clear'),p=await rect(page,'#admin-dong-picker'),n=await rect(page,'#bottom-nav');
       row.clearInside=b.bottom<=p.bottom+2&&b.bottom<n.top;row.buttonCount=await page.locator('#admin-dong-list button').count();
       assertions(Math.abs(row.afterGap-8)<=3&&row.clearInside&&row.buttonCount===15,'District buttons or lower action remain clipped');
       await shot(page,name+'-after');
     }else if(name==='map-hud'){
       const tip=page.locator('#dj840-map-tip');await tip.waitFor({state:'visible',timeout:20000});
       await shot(page,name+'-before');await install(page);
       // Test the installation CTA collision separately from the normal HUD.
       const banner=page.locator('#dj-browser-webapp-tip');
       if(await banner.isVisible()){
         row.installCTAHit=await hit(page,'#dj-browser-webapp-tip .dj-webapp-tip-how');
         row.tipHiddenWhileInstall=!(await tip.isVisible());
         assertions(row.installCTAHit&&row.tipHiddenWhileInstall,'Install CTA is obscured');
         await shot(page,name+'-install-after');
         await click(page,'#dj-browser-webapp-tip .dj-webapp-tip-later');
         await banner.waitFor({state:'hidden',timeout:10000});
       }
       await page.waitForFunction(()=>{const t=document.getElementById('dj840-map-tip');if(!t||t.hidden)return false;const s=getComputedStyle(t);return s.visibility==='visible'&&Number(s.opacity)>.9;},{timeout:25000});
       row.scale=await rect(page,'#map .maplibregl-ctrl-bottom-left .maplibregl-ctrl-scale');row.tip=await rect(page,'#dj840-map-tip');
       assertions(row.tip.visibility==='visible'&&Number(row.tip.opacity)>.9&&row.scale.visibility==='visible','HUD is not actually visible');
       row.rail=await rect(page,'#dj831-scrollport');row.more=await rect(page,'#dj-v794-more');
       assertions(Math.abs(row.scale.height-row.tip.height)<=2&&row.tip.left>=row.scale.right+4&&Math.abs(row.scale.bottom-row.tip.bottom)<=3,'HUD scale/TIP lanes conflict');
       assertions(row.rail.right<=row.more.left+1,'Rail covers More');
       await shot(page,name+'-after');
     }else{
       await install(page);
       const collect=async (trigger,opening)=>{
         // Arm before the input but begin measuring on the actual click.
         // A slow Playwright locator or loaded runner cannot exhaust the
         // sampling interval before the real event occurs.
         await page.evaluate(({trigger,opening})=>{
           const button=document.querySelector(trigger);
           if(!button)throw Error('Motion trigger missing');
           window.__djMotionReport={events:0,samples:[],opening};
           const report=window.__djMotionReport;
           const record=()=>{
             const panel=document.getElementById('dj-mobile-utilities'),nav=document.getElementById('bottom-nav');
             if(!panel||!nav)return;
             const p=panel.getBoundingClientRect(),n=nav.getBoundingClientRect(),s=getComputedStyle(panel);
             report.samples.push({t:performance.now(),hidden:panel.hidden,bottom:p.bottom,navTop:n.top,opacity:Number(s.opacity),visibility:s.visibility,height:p.height,navHeight:n.height,animation:s.animationName,translate:s.translate,gap:n.top-p.bottom});
           };
           const handler=event=>{
             if(!(event.composedPath?.().includes(button)||button.contains(event.target)))return;
             for(const type of ['pointerdown','touchstart','click'])window.removeEventListener(type,handler,true);
             report.events++;
             // Capture immediately after the app's actual click handler.
             queueMicrotask(record);
             let frame=0,timer=0,observer;
             const start=performance.now();
             function tick(){record();if(performance.now()-start<1400)frame=requestAnimationFrame(tick);}
             observer=new MutationObserver(record);
             observer.observe(document.getElementById('dj-mobile-utilities'),{attributes:true,attributeFilter:['class','hidden','style']});
             frame=requestAnimationFrame(tick);
             timer=setInterval(record,35);
             setTimeout(()=>{observer.disconnect();cancelAnimationFrame(frame);clearInterval(timer);record();report.done=true;},1500);
           };
           for(const type of ['pointerdown','touchstart','click'])window.addEventListener(type,handler,{capture:true,passive:true});
         },{trigger,opening});
         await click(page,trigger);
         await page.waitForFunction(()=>window.__djMotionReport?.done===true,null,{timeout:20000});
         return page.evaluate(()=>window.__djMotionReport);
       };
       row.enter=await collect('#dj-v794-more',true);save();
       await page.locator('#dj-mobile-utilities').waitFor({state:'visible',timeout:15000});
       await shot(page,name+'-after-open');
       row.exit=await collect('#dj-mobile-utilities-close',false);save();
       await page.locator('#dj-mobile-utilities').waitFor({state:'hidden',timeout:15000});
       const visible=s=>!s.hidden&&s.visibility==='visible'&&s.opacity>.05&&s.height>0&&s.navHeight>0;
       const enter=row.enter.samples.filter(visible),exit=row.exit.samples.filter(visible);
       const samples=[...enter,...exit];
       row.minGap=samples.length?Math.min(...samples.map(s=>s.gap)):null;
       row.enterFadeObserved=row.enter.samples.some(s=>s.animation==='dj852-profile-fade-in'&&s.height>0);
       row.exitFadeObserved=row.exit.samples.some(s=>s.animation==='dj852-profile-fade-out'&&s.height>0);
       assertions(row.enter.events===1&&row.exit.events===1&&enter.length>=2&&exit.length>=2&&row.enterFadeObserved&&row.exitFadeObserved&&row.minGap>=-1,'Actual More fade/geometry evidence missing or dock was crossed');
     }
     row.result='pass';
   }catch(error){row.result='failed';row.error=String(error).slice(0,2000);}
   finally{await ctx?.close();save();}
 }
 result.baselineAfter=await marker();save();
 if(JSON.stringify(result.baseline)!==JSON.stringify(result.baselineAfter))throw Error('Baseline changed');
 if(result.cases.some(x=>x.result!=='pass'))throw Error('Some screenshot-specific acceptance checks failed');
}catch(e){result.error=String(e);save();throw e;}
finally{await browser?.close();}
