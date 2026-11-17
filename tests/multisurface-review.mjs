import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const width=Number(process.env.WIDTH),height=Number(process.env.HEIGHT);
if(!width||!height)throw Error('Explicit viewport dimensions are required');
const site='https://dongjak-walk-safety-preview.pages.dev';
const candidate=readFileSync('frontend/production/dongjak-production-overlay.css','utf8');
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
 page.setDefaultTimeout(20000);
 page.on('dialog',dialog=>/테마|theme/i.test(dialog.message())?dialog.accept():dialog.dismiss());
 page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#map-startup-overlay').waitFor({state:'hidden',timeout:60000});
 const skip=page.locator('[data-dj860-action="skip"]');if(await skip.isVisible())await skip.click();
 const later=page.locator('.dj-webapp-tip-later');if(await later.isVisible())await later.click();
 await page.locator('#bottom-nav').waitFor({state:'visible'});
 await page.waitForTimeout(600);
 if(await page.locator('#app').getAttribute('data-theme')!==theme){
  const headerTheme=page.locator('#theme-toggle');
  if(await headerTheme.isVisible())await headerTheme.click();
  else{
   await page.locator('#bottom-nav .nav-tab[data-tab="mine"]').click();
   await page.getByRole('button',{name:/화면 테마/}).click();
  }
  await page.waitForFunction(t=>document.querySelector('#app').dataset.theme===t||[...document.querySelectorAll('[role="dialog"],dialog,.dj-confirm')].some(e=>e.getBoundingClientRect().width>0),theme,{timeout:10000}).catch(()=>{});
  if(await page.locator('#app').getAttribute('data-theme')!==theme){
   const confirm=page.getByRole('button',{name:/^(확인|전환|변경|예|계속|전환하기|변경하기)$/}).filter({visible:true}).last();
   await confirm.click();
  }
  await page.waitForFunction(t=>document.querySelector('#app').dataset.theme===t,theme,{timeout:15000});
  await page.locator('#bottom-nav .nav-tab[data-tab="map"]').click();
 }
 if(await page.locator('#app').getAttribute('data-theme')!==theme)throw Error('Theme did not apply');
 const capture=async (name,stage)=>{
  const later=page.locator('.dj-webapp-tip-later');
  if(await later.isVisible())await later.click();
  await page.waitForTimeout(1000);
  await page.screenshot({path:`${out}/${theme}-${name}-${stage}.png`,animations:'disabled'});
  const data=await page.evaluate(()=>{
   const box=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {id:e.id,cls:e.className,text:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,80),x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,display:s.display,visibility:s.visibility,font:s.fontSize,animation:s.animationName,overflow:s.overflowY,after:(()=>{const a=getComputedStyle(e,'::after');return {content:a.content,width:a.width,maxWidth:a.maxWidth,opacity:a.opacity,visibility:a.visibility,position:a.position}})()};};
   const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden]');};
   const controls=[...document.querySelectorAll('#app button,#bottom-nav .nav-tab')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {...box(e),hit:!!hit&&(e===hit||e.contains(hit)),hitTarget:hit?{id:hit.id,cls:hit.className,tag:hit.tagName}:null,pointerEvents:getComputedStyle(e).pointerEvents,clipped:r.x<-.5||r.right>innerWidth+.5||r.y<-.5||r.bottom>innerHeight+.5};});
   const panels=[...document.querySelectorAll('#app .page-panel,#app .floating-sheet,#app .transport-sheet,#app #dj-mobile-utilities,#app #map-advanced-controls')].filter(visible).map(box);
   return {theme:document.querySelector('#app').dataset.theme,overflow:document.documentElement.scrollWidth-innerWidth,nav:box(document.querySelector('#bottom-nav')),panels,controls};
  });
  report.cases.push({requestedTheme:theme,name,stage,...data});
  console.log(JSON.stringify({width,theme,name,stage,overflow:data.overflow,panels:data.panels,clipped:data.controls.filter(x=>x.clipped),small:data.controls.filter(x=>x.w<43.5||x.h<43.5).map(x=>({id:x.id,text:x.text,w:x.w,h:x.h}))}));
 };
 const compare=async name=>{
  await capture(name,'before');
  const injected=await page.addStyleTag({content:candidate});
  // Force style resolution before timing the inherited opacity transition.
  await page.evaluate(()=>document.querySelector('#app').getBoundingClientRect().width);
  if(name==='map'&&width<700)await page.waitForFunction(()=>getComputedStyle(document.querySelector('#dj-v794-safety'),'::after').opacity==='1',{timeout:10000});
  await capture(name,'after');
  const last=report.cases.at(-1);
  if(last.theme!==theme)throw Error('Capture theme mismatch');
  if(last.overflow>1)throw Error('Candidate horizontal document overflow');
  if(name==='participate'&&width<700){
   const filters=await page.locator('.community-filter').evaluateAll(es=>es.map(e=>({w:e.clientWidth,sw:e.scrollWidth,h:e.getBoundingClientRect().height,whiteSpace:getComputedStyle(e).whiteSpace})));
   if(filters.length!==4||filters.some(x=>x.sw>x.w+1||x.h<44||x.whiteSpace!=='nowrap'))throw Error('Community filter still wraps, clips or is too small');
  }
  if(name==='map'&&width<700){
   for(const id of ['dj-v794-safety','dj-v794-night','dj-user-map-options']){
    const a=last.controls.find(x=>x.id===id)?.after;
    if(!a||a.opacity!=='1'||!a.content||a.content==='none'||a.maxWidth==='0px')throw Error('Map shortcut label remains invisible: '+id);
   }
  }
  if(name==='map'&&width>=700&&width<=1079){
   for(const id of ['dj-about-pc','dj887-ai-quick-entry','map-quick-search-submit','weather-label','theme-toggle','dj-settings-pc']){
    const c=last.controls.find(x=>id==='map-quick-search-submit'?x.cls.split(' ').includes('map-quick-search-submit'):x.id===id);
    if(!c||c.w<43.5||c.h<43.5||!c.hit)throw Error('Tablet header target is small or obscured: '+id);
   }
  }
  if(name==='news'){
   const links=await page.locator('#news-panel .dongjak-news-open').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
   if(links.some(h=>h<44))throw Error('News action target is too small');
  }
  await injected.evaluate(e=>e.remove());
 };
 await compare('map');
 for(const t of ['route','participate','news','mine']){
  await page.locator(`#bottom-nav .nav-tab[data-tab="${t}"]`).click();await compare(t);
 }
 await page.locator('#bottom-nav .nav-tab[data-tab="map"]').click();
 const more=page.locator('#dj-v794-more');
 if(await more.isVisible()){await more.click();await compare('more');}
 else{const tools=page.locator('#map-tools-toggle');if(await tools.isVisible()){await tools.click();await compare('tools');}}
 await context.close();
}
report.after=await marker();
if(JSON.stringify(report.after)!==JSON.stringify(report.baseline))throw Error('Production changed during capture');
}finally{writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
