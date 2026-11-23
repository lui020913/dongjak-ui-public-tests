import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Read-only, anonymous capture of the deployed application.
// Do not submit forms, change account settings, or publish user data.
const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 }
];
const tabs = [
  ['route', 'route-panel'], ['participate', 'participation-panel'],
  ['news', 'news-panel'], ['mine', 'mine-panel'], ['map', 'map']
];
const output = 'quality-report/screen-captures';
mkdirSync(output, { recursive: true });

// Real screen capture with explicit bounded font readiness. Never hide an
// application defect or use a synthetic screenshot as visual evidence.
async function capture(page,path) {
  const fonts=await page.evaluate(async()=>{
    const result=await Promise.race([
      document.fonts.ready.then(()=>true),
      new Promise(resolve=>setTimeout(()=>resolve(false),20000))
    ]);
    return {ready:result,status:document.fonts.status};
  });
  // Playwright normally waits indefinitely for font loading. If the site
  // cannot finish loading fonts, preserve a diagnostic-only screenshot.
  if(!fonts.ready) console.warn('AUDIT fonts not ready: '+path);
  await page.screenshot({path,fullPage:false,animations:'disabled',timeout:30000});
  return fonts;
}
async function navigationControl(page,tab) {
  const normal=page.locator('#bottom-nav .nav-tab[data-tab="'+tab+'"]');
  if(tab==='map'&&!await normal.isVisible().catch(()=>false)) {
    return page.getByRole('navigation',{name:'앱 주요 기능'}).getByRole('button',{name:/안전지도/});
  }
  return normal;
}
// Browser first-run presents a top-layer install/web chooser before the tour.
 // Select the real Web action; never force-click onboarding under a dialog.
async function selectBrowserWeb(page){
  const welcome=page.locator('dialog#dj-install-menu[open]');
  if(!await welcome.isVisible().catch(()=>false))return;
  await welcome.getByRole('button',{name:/웹에서 바로 이용하기/}).click({timeout:20000,noWaitAfter:true});
  await expect(welcome).toBeHidden({timeout:12000});
}
async function dismissTour(page) {
  const tour = page.locator('#dj860-onboarding');
  for (let i = 0; i < 3; i++) {
    if (!await tour.isVisible().catch(() => false)) return;
    const skip = tour.locator('[data-dj860-action="skip"]');
    if (!await skip.isVisible().catch(() => false)) return;
    await skip.click({ timeout: 20000, noWaitAfter: true });
    await expect(tour).toBeHidden({ timeout: 7000 });
  }
}

for (const viewport of viewports) {
 for (const theme of ['light']) {
  test('anonymous deployed screen audit: ' + viewport.name + ' / ' + theme, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile');
    test.setTimeout(240000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({colorScheme: theme});
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('#map')).toBeVisible({ timeout: 30000 });
    const startup = page.locator('#map-startup-overlay');
    if (await startup.count()) await expect(startup).toBeHidden({ timeout: 60000 });
    await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state', /^(signed-out|signed-in)$/, { timeout: 30000 });
    await selectBrowserWeb(page);
    await dismissTour(page);
    const app = page.locator('#app');
    const report = { viewport, theme, themeSetup: 'supported-light-default', source: page.url(), captured_at: new Date().toISOString(), screens: [] };
    const save=()=>writeFileSync(output + '/' + viewport.name + '-' + theme + '.json',JSON.stringify(report,null,2));
    try {
    // Use the verified user-facing theme confirmation flow.
    // Manual light/dark theme switching was intentionally removed from the app.
    // Night-visibility remains a separate, opt-in map layer.
    await expect(app).toHaveAttribute('data-theme', theme, {timeout:30000});
    for (const [tab, panel] of [['initial-map', 'map'], ...tabs]) {
      try {
      await dismissTour(page);
      if (tab !== 'initial-map') {
        const control = await navigationControl(page,tab);
        if (!await control.isVisible().catch(() => false)) {
          report.screens.push({ tab, status: 'not-visible', reason: 'No visible public navigation control' });
          continue;
        }
        try {
          await control.click({ timeout: 10000, noWaitAfter: true });
          await expect(page.locator('#app')).toHaveAttribute('data-tab', tab, { timeout: 15000 });
          await page.locator('#'+panel).waitFor({state:'visible',timeout:15000});
        } catch (e) {
          report.screens.push({ tab, status: 'interaction-failed', reason: String(e).slice(0, 220) });
          continue;
        }
      }
      await page.waitForTimeout(550);
      const metrics = await page.evaluate((panelId) => {
        const rect = el => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1), bottom: +r.bottom.toFixed(1) };
        };
        const visible = el => el && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
        const nav = document.querySelector('#bottom-nav');
        const target = document.getElementById(panelId);
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          nav: rect(nav),
          panel: visible(target) ? rect(target) : null,
          activeTab: document.querySelector('#app')?.getAttribute('data-tab'),
          visibleDialogCount: [...document.querySelectorAll('[role="dialog"]')].filter(visible).length
        };
      }, panel);
      const file = viewport.name + '-' + theme + '-' + tab + '.png';
      const fonts=await capture(page,output+'/'+file);
      report.screens.push({ tab, status: fonts.ready?'captured':'font-loading-incomplete', file, metrics, fonts });
      } catch(error) {
        report.screens.push({tab,status:'capture-failed',reason:String(error).slice(0,600)});
      } finally {save();}
    }
    } catch(error) {
      report.setupError=String(error).slice(0,1200);
      throw error;
    } finally {save();}
    expect(report.screens.filter(s=>s.status==='captured').length,'All six actual screens must be captured with ready fonts').toBe(6);
  });
}
}


/**
 * Anonymous interaction/motion inventory (QA only).
 * Visit each main tab, enumerate genuine visible interactive controls, click
 * each non-destructive control in an isolated reload, inspect newly disclosed
 * child controls and capture real motion/layout evidence.
 * Never submit posts, change user accounts, install software or follow links.
 */
const MATRIX_TABS=['map','route','participate','news','mine'];
const UNSAFE_CONTROL=/(로그인|로그아웃|가입|탈퇴|삭제|신고\s*제출|제보\s*등록|게시|발행|전송|업로드|다운로드|설치|전화|공유|위치\s*허용|마이크\s*허용|푸시\s*허용|카카오|구글|애플|Google|Apple|Kakao|구매|결제|초기화|전체\s*삭제|비밀번호|인증|계정\s*연결|저장\s*완료)/i;
function safeControl(c){return !UNSAFE_CONTROL.test(c.label)&&!c.disabled&&!c.external&&!c.outside;}
async function screenControls(page){
 return page.evaluate(()=>{
  const query='button,[role="button"],[role="switch"],[role="tab"],input[type="button"]';
  const path=el=>{
   if(el.id)return '#'+CSS.escape(el.id);
   const parts=[];
   for(let n=el;n&&n!==document.documentElement;n=n.parentElement){
    if(n.id){parts.unshift('#'+CSS.escape(n.id));break;}
    const siblings=n.parentElement?[...n.parentElement.children].filter(x=>x.tagName===n.tagName):[];
    parts.unshift(n.tagName.toLowerCase()+':nth-of-type('+(siblings.indexOf(n)+1)+')');
   }
   return parts.join(' > ');
  };
  return [...document.querySelectorAll(query)].map(el=>{
   const cs=getComputedStyle(el),r=el.getBoundingClientRect();
   const x=Math.max(1,Math.min(innerWidth-2,r.left+r.width/2)),y=Math.max(1,Math.min(innerHeight-2,r.top+r.height/2));
   const hit=document.elementFromPoint(x,y),shown=cs.display!=='none'&&cs.visibility==='visible'&&Number(cs.opacity)>.1&&r.width>=8&&r.height>=8;
   const label=(el.getAttribute('aria-label')||el.getAttribute('title')||el.innerText||el.textContent||el.value||'').replace(/\s+/g,' ').trim().slice(0,100);
   const ancestor=el.closest('[hidden],[aria-hidden="true"],[inert]');
   const outside=r.right<0||r.bottom<0||r.left>=innerWidth||r.top>=innerHeight;
   const external=!!el.closest('a[href]');
   return {path:path(el),label:label||el.id||el.tagName,kind:el.tagName,role:el.getAttribute('role'),visible:shown&&!ancestor&&!outside,covered:!(hit&&(el===hit||el.contains(hit))),disabled:el.disabled||el.getAttribute('aria-disabled')==='true',outside,external,rect:{x:r.x,y:r.y,w:r.width,h:r.height},transition:cs.transitionDuration,animation:cs.animationName};
  }).filter(x=>x.visible);
 });
}
async function layoutAndMotion(page){
 return page.evaluate(()=>{
  const app=document.querySelector('#app');
  const dialogs=[...document.querySelectorAll('[role="dialog"],dialog[open]')].filter(e=>{
   const r=e.getBoundingClientRect(),s=getComputedStyle(e);
   return r.width>10&&r.height>10&&s.visibility==='visible'&&s.display!=='none';
  }).map(e=>({id:e.id||null,rect:(()=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()}));
  const animations=document.getAnimations().filter(a=>a.playState==='running').slice(0,40).map(a=>({element:a.effect?.target?.id||a.effect?.target?.className?.toString()?.slice(0,65)||'',time:a.currentTime,playState:a.playState}));
  return {tab:app?.dataset.tab,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,dialogs,animations,bodyBackground:getComputedStyle(document.body).backgroundColor};
 });
}
for(const targetTab of MATRIX_TABS){
 test('anonymous safe button and motion matrix / '+targetTab,async({page},info)=>{
  test.skip(info.project.name!=='mobile');
  test.setTimeout(900000);
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({colorScheme:'light'});
  const report={tab:targetTab,target:'anonymous deployed app',at:new Date().toISOString(),controls:[],interactions:[],errors:[],untested:[]};
  const file=output+'/interaction-matrix-'+targetTab+'.json';
  const save=()=>writeFileSync(file,JSON.stringify(report,null,2));
  page.on('pageerror',e=>report.errors.push(String(e).slice(0,400)));
  async function enter(){
   const response=await page.goto('/',{waitUntil:'domcontentloaded',timeout:40000});
   if(!response||response.status()>=400)throw Error('App endpoint failed');
   await expect(page.locator('#map')).toBeVisible({timeout:30000});
   const startup=page.locator('#map-startup-overlay');
   if(await startup.count())await expect(startup).toBeHidden({timeout:60000});
   await selectBrowserWeb(page);await dismissTour(page);
   if(targetTab!=='map'){
    const nav=await navigationControl(page,targetTab);
    await nav.click({timeout:20000,noWaitAfter:true});
    await expect(page.locator('#app')).toHaveAttribute('data-tab',targetTab,{timeout:15000});
   }
  }
  try{
   await enter();
   const initial=await screenControls(page);
   report.controls=initial;
   const candidates=initial.filter(safeControl);
   report.untested=initial.filter(c=>!safeControl(c)).map(c=>({label:c.label,path:c.path,reason:'unsafe/external/disabled/offscreen'}));
   // Every visible, non-destructive parent control is attempted; no arbitrary
   // top-level button cap and no synthetic event dispatch.
   for(let i=0;i<candidates.length;i++){
    const c=candidates[i],entry={label:c.label,path:c.path,initialRect:c.rect,status:'not-attempted'};
    report.interactions.push(entry);save();
    try{
     await enter();
     const loc=page.locator(c.path).first();
     if(!await loc.isVisible({timeout:1500}).catch(()=>false)){entry.status='not-visible-after-reset';continue;}
     await loc.click({timeout:8000,noWaitAfter:true});
     await page.waitForTimeout(75);
     entry.motion75=await layoutAndMotion(page);
     if(i<18)await page.screenshot({path:output+'/matrix-'+targetTab+'-'+String(i).padStart(2,'0')+'-motion.png',animations:'allow',timeout:20000});
     await page.waitForTimeout(320);
     entry.settled=await layoutAndMotion(page);
     const current=await screenControls(page);
     entry.newControls=current.filter(v=>!initial.some(a=>a.path===v.path));
     entry.status='clicked';
     // Opened submenus must be exercised, including close buttons and safe
     // switches. Each remains confined to the anonymous test browser.
     const child=entry.newControls.filter(safeControl);
     entry.childActions=[];
     for(const d of child){
      const action={label:d.label,path:d.path,status:'not-attempted'};
      entry.childActions.push(action);
      try{
       const el=page.locator(d.path).first();
       if(!await el.isVisible({timeout:1000}).catch(()=>false)){action.status='hidden';continue;}
       await el.click({timeout:3000,noWaitAfter:true});
       await page.waitForTimeout(100);
       action.motion=await layoutAndMotion(page);
       action.status='clicked';
      }catch(e){action.status='failed';action.reason=String(e).slice(0,250);}
     }
    }catch(e){entry.status='failed';entry.reason=String(e).slice(0,400);}
    finally{save();}
   }
   report.coverage={visible:initial.length,eligible:candidates.length,clicked:report.interactions.filter(i=>i.status==='clicked').length,failed:report.interactions.filter(i=>i.status==='failed').length,childClicked:report.interactions.flatMap(i=>i.childActions||[]).filter(x=>x.status==='clicked').length};
   save();
   expect(report.coverage.eligible,'No eligible visible buttons were discovered').toBeGreaterThan(0);
   expect(report.coverage.failed,'At least one visible non-destructive button could not be clicked').toBe(0);
  }finally{save();}
 });
}
