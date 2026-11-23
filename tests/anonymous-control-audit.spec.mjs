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

/**
 * Anonymous read-only control census of the actual deployed UI.
 * Deliberately does NOT submit forms, change accounts, log in, publish posts,
 * perform GET links, or contact any write endpoint.
 * Each click starts from a clean visible navigation state. Failed clicks are
 * recorded rather than hidden by force-clicking or changing production DOM.
 * This is a bounded census, not a claim that every authenticated flow is tested.
 */
for(const auditTab of ['map','route','participate','news','mine']) {
test('anonymous control census '+auditTab+' (isolated)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  test.skip(Boolean(process.env.DONGJAK_AUDIT_TAB)&&process.env.DONGJAK_AUDIT_TAB!==auditTab);
  test.skip(testInfo.project.name !== 'mobile');
  test.setTimeout(900_000);
  const selector = 'button:visible, [role="button"]:visible, [role="switch"]:visible';
  const denied = /(로그인|회원가입|탈퇴|로그아웃|삭제|등록하기|등록 완료|게시|전송|제출|결제|다운로드|외부|공유|신고 접수|리뷰 작성|설치하기)/i;
  const viewport = {width:390,height:844};
  const sliceFrom=Number(process.env.DONGJAK_AUDIT_FROM||0);
  const sliceTo=Number(process.env.DONGJAK_AUDIT_TO||48);
  if(!Number.isInteger(sliceFrom)||!Number.isInteger(sliceTo)||sliceFrom<0||sliceTo<=sliceFrom)throw Error('Invalid audit slice');

  await page.setViewportSize(viewport);
  await page.emulateMedia({colorScheme:'light'});
  const report={
    audit:'anonymous read-only control census', viewport,
    source:'live deployed application; exact release marker checked by workflow',
    selectedSlice:{from:sliceFrom,to:sliceTo},
    timestamp:new Date().toISOString(),
    tabs:[], failedClicks:[], warnings:[], counts:{discovered:0,attempted:0,clicked:0,skipped:0,nested:0}
  };
  const errors=[];
  const context=page.context();
  const attachHandlers=p=>{
    p.on('pageerror',e=>errors.push(String(e).slice(0,200)));
    p.on('dialog',d=>d.dismiss().catch(()=>{}));
    p.on('popup',popup=>popup.close().catch(()=>{}));
  };
  attachHandlers(page);
  context.on('page',attachHandlers);
  await context.route('**/*', route=>{
    const method=route.request().method().toUpperCase();
    if(['GET','HEAD','OPTIONS'].includes(method)) return route.continue();
    report.warnings.push({kind:'write-request-blocked',method,url:route.request().url().split('?')[0].slice(0,140)});
    return route.abort('blockedbyclient');
  });
  const summarize=async()=>page.evaluate(()=>{
    const rect=node=>{if(!node)return null;const b=node.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};};
    const seen=node=>{if(!node)return false;const s=getComputedStyle(node),b=node.getBoundingClientRect();return s.visibility==='visible'&&s.display!=='none'&&b.width>0&&b.height>0;};
    const overlays=[...document.querySelectorAll('[role="dialog"],dialog[open],.dj-place-detail-popup,#transport-sheet,#djNext-layer-panel,#dj854-weather-sheet,#ped-tools-panel,#dj-ai-search-modal,#version-history-modal')]
      .filter(seen).slice(0,12).map(n=>({id:n.id||n.className,rect:rect(n)}));
    const animations=[...document.getAnimations()].filter(a=>a.playState==='running').slice(0,20)
      .map(a=>({name:a.effect?.getKeyframes?.().length||0,playState:a.playState,currentTime:Math.round(Number(a.currentTime)||0)}));
    return {tab:document.querySelector('#app')?.getAttribute('data-tab'),
      documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
      nav:rect(document.querySelector('#bottom-nav')),overlays,animations};
  });
  const inventory=async()=>page.locator(selector).evaluateAll(nodes=>nodes.map((n,index)=>{
    const b=n.getBoundingClientRect(),s=getComputedStyle(n);
    const label=(n.getAttribute('aria-label')||n.title||n.innerText||n.textContent||'').replace(/\s+/g,' ').trim().slice(0,95);
    const cx=Math.max(1,Math.min(innerWidth-2,b.left+b.width/2));
    const cy=Math.max(1,Math.min(innerHeight-2,b.top+b.height/2));
    const hit=document.elementFromPoint(cx,cy);
    return {index,label,id:n.id||'',tag:n.tagName,role:n.getAttribute('role')||'',
      visible:s.visibility==='visible'&&s.display!=='none',
      disabled:n.disabled||n.getAttribute('aria-disabled')==='true',
      width:Math.round(b.width),height:Math.round(b.height),x:Math.round(b.x),y:Math.round(b.y),
      hit:!!(hit&&(n===hit||n.contains(hit)))};
  }));
  const prepare=async tab=>{
    // Independent page isolates in-flight app navigation and PWA restoration.
    if(page&&!page.isClosed()) await page.close({runBeforeUnload:false});
    page=await context.newPage();
    await page.setViewportSize(viewport);
    await page.emulateMedia({colorScheme:'light'});
    await page.goto('/',{waitUntil:'domcontentloaded',timeout:30000});
    await expect(page.locator('#map')).toBeVisible({timeout:30000});
    // The map DOM is present while an opaque startup overlay still intercepts
    // every touch. Wait for its actual removal, not only map element visibility.
    const startup=page.locator('#map-startup-overlay');
    if(await startup.count())await expect(startup).toBeHidden({timeout:60000});
    await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state',/^(signed-out|signed-in)$/,{timeout:30000});
    await selectBrowserWeb(page);
    await dismissTour(page);
    await page.waitForTimeout(300);
    if(tab!=='map'){
      const target=await navigationControl(page,tab);
      await target.click({timeout:12000,noWaitAfter:true});
      await expect(page.locator('#app')).toHaveAttribute('data-tab',tab,{timeout:15000});
    }
  };
  const persist=()=>writeFileSync(output+'/anonymous-control-audit-'+auditTab+'-'+sliceFrom+'-'+sliceTo+'.json',JSON.stringify(report,null,2));
  for(const tab of [auditTab]){
    const section={tab,controls:[],outcome:[],setupError:null};
    report.tabs.push(section);
    try{await prepare(tab);}
    catch(e){section.setupError=String(e).slice(0,700);report.failedClicks.push({tab,kind:'tab-navigation',reason:section.setupError});persist();continue;}
    const start=await inventory();
    section.controls=start;
    report.counts.discovered+=start.length;
    section.auditCoverage='read-only anonymous, no authentication or write operations';
    const maxPerTab=48;
    const started=Date.now();
    const selected=start.slice(sliceFrom,Math.min(sliceTo,maxPerTab));
    section.selectedControls=selected.map(x=>({index:x.index,label:x.label,id:x.id}));
    for(const candidate of selected){
      if(Date.now()-started>750000){section.outcome.push({status:'budget-exhausted',remaining:start.length-section.outcome.length});report.counts.skipped++;break;}
      if(tab!=='map' && (/^(동작하는 안전지도 앱 정보와 버전|음성 장소 검색|AI 보행안전정보 검색 열기|길찾기|커뮤니티|동작 소식|내 정보)$/.test(candidate.label) || candidate.label.startsWith('안전지도:'))){report.counts.skipped++;section.outcome.push({label:candidate.label,status:'shared-covered-in-map'});continue;}
      if(candidate.disabled||!candidate.width||!candidate.height||denied.test(candidate.label)){
        report.counts.skipped++;section.outcome.push({label:candidate.label,status:'safety-skipped'});continue;
      }
      try{await prepare(tab);}
      catch(e){section.outcome.push({label:candidate.label,status:'reset-failed',error:String(e).slice(0,250)});report.failedClicks.push({tab,label:candidate.label,kind:'reset-failed'});continue;}
      // A dynamic UI may insert/remove buttons between reloads.
      // Resolve by accessible label rather than the previous DOM index.
      const target=candidate.id
        ? page.locator('[id='+JSON.stringify(candidate.id)+']')
        : page.getByRole(candidate.role==='switch'?'switch':'button',{name:candidate.label,exact:true}).first();
      const current=await target.evaluate(n=>(n.getAttribute('aria-label')||n.title||n.innerText||n.textContent||'').replace(/\s+/g,' ').trim().slice(0,95)).catch(()=>null);
      if(current===null||(current!==candidate.label&&!(/^날씨/.test(candidate.label)&&/^날씨/.test(current)))){
        report.counts.skipped++;
        section.outcome.push({label:candidate.label,status:'dynamic-index-skipped',current});continue;
      }
      // An HTML details element can have children with nonzero geometry
      // while they are not user-clickable until the summary is expanded.
      const inClosedDetails=await target.evaluate(el=>Boolean(el.closest('details:not([open])'))).catch(()=>false);
      if(inClosedDetails){
        const parent=target.locator('xpath=ancestor::details[1]');
        await parent.locator('summary').click({timeout:12000,noWaitAfter:true});
        await expect(parent).toHaveAttribute('open','',{timeout:7000});
      }
      if(!(await target.isVisible().catch(()=>false))){
        section.outcome.push({label:candidate.label,status:'not-visible'});report.counts.skipped++;continue;
      }
      const item={label:candidate.label,id:candidate.id,initialHit:candidate.hit};
      report.counts.attempted++;
      try{
        // User-reachable scroll is mandatory: community category chips extend
        // horizontally beyond the initial viewport. Scrolling is not a forced click.
        await target.scrollIntoViewIfNeeded({timeout:7000});
        await page.waitForTimeout(180);
        const bounds=await target.boundingBox();
        if(!bounds||bounds.width<1||bounds.height<1)throw Error('Target has no visible pointer area');
        const point={x:Math.max(1,Math.min(viewport.width-2,bounds.x+bounds.width/2)),
          y:Math.max(1,Math.min(viewport.height-2,bounds.y+bounds.height/2))};
        const unobstructed=await target.evaluate((el,p)=>{const hit=document.elementFromPoint(p.x,p.y);return !!hit&&(el===hit||el.contains(hit));},point);
        if(!unobstructed)throw Error('Actual finger point is occluded by another surface');
        await page.touchscreen.tap(point.x,point.y);
        report.counts.clicked++;
        item.status='clicked';
        item.immediate=await summarize();
        await page.waitForTimeout(130);
        item.motion130=await summarize();
        await page.waitForTimeout(350);
        item.settled=await summarize();
        if(item.settled.documentWidth>item.settled.viewportWidth+3)
          report.warnings.push({tab,label:item.label,kind:'horizontal-overflow',width:item.settled.documentWidth});
        if(section.outcome.filter(x=>x.screenshot).length<8){
          const filename='control-'+tab+'-'+String(candidate.index).padStart(2,'0')+'.png';
          await page.screenshot({path:output+'/'+filename,animations:'allow',timeout:15000});
          item.screenshot=filename;
        }
        const next=await inventory();
        const existing=new Set(start.map(x=>x.label));
        const extras=next.filter(x=>x.hit&&!x.disabled&&!denied.test(x.label)&&
          x.label&&!existing.has(x.label)&&x.width>=18&&x.height>=18).slice(0,4);
        item.nestedControls=extras.map(x=>({label:x.label,id:x.id}));
        for(const extra of extras){
          const entry=item.nestedControls.find(x=>x.label===extra.label);
          try{
            // A nested control click can dismiss its parent sheet. Reopen
            // the parent independently before every nested touch.
            await prepare(tab);
            const parent=candidate.id
              ? page.locator('[id='+JSON.stringify(candidate.id)+']')
              : page.getByRole('button',{name:candidate.label,exact:true}).first();
            await parent.scrollIntoViewIfNeeded({timeout:7000});
            await page.waitForTimeout(120);
            const parentBox=await parent.boundingBox({timeout:5000});
            if(!parentBox)throw Error('Nested parent not visible after reset');
            const px=Math.max(1,Math.min(viewport.width-2,parentBox.x+parentBox.width/2));
            const py=Math.max(1,Math.min(viewport.height-2,parentBox.y+parentBox.height/2));
            const parentHit=await parent.evaluate((el,p)=>{const n=document.elementFromPoint(p.x,p.y);return !!n&&(el===n||el.contains(n));},{x:px,y:py});
            if(!parentHit){entry.status='parent-occluded';continue;}
            await page.touchscreen.tap(px,py);
            await page.waitForTimeout(380);
            const sub=extra.id
              ? page.locator('[id='+JSON.stringify(extra.id)+']')
              : page.getByRole('button',{name:extra.label,exact:true}).first();
            if(await sub.evaluate(n=>Boolean(n.closest('details:not([open])'))).catch(()=>false)){
              const parent=sub.locator('xpath=ancestor::details[1]');
              await parent.locator('summary').click({timeout:12000,noWaitAfter:true});
              await expect(parent).toHaveAttribute('open','',{timeout:7000});
            }
            if(!await sub.isVisible().catch(()=>false)){entry.status='not-present-on-reopen';continue;}
            await sub.scrollIntoViewIfNeeded({timeout:7000});
            await page.waitForTimeout(140);
            const b=await sub.boundingBox({timeout:5000});
            if(!b){entry.status='not-visible-after-reopen';continue;}
            const x=Math.max(1,Math.min(viewport.width-2,b.x+b.width/2));
            const y=Math.max(1,Math.min(viewport.height-2,b.y+b.height/2));
            const hit=await sub.evaluate((el,p)=>{const node=document.elementFromPoint(p.x,p.y);return !!node&&(el===node||el.contains(node));},{x,y});
            if(!hit){entry.status='touch-occluded';report.failedClicks.push({tab,parent:item.label,label:extra.label,kind:'nested-touch-occluded'});continue;}
            await page.touchscreen.tap(x,y);
            entry.immediate=await summarize();
            await page.waitForTimeout(130);
            entry.motion130=await summarize();
            await page.waitForTimeout(350);
            entry.settled480=await summarize();
            report.counts.nested++;
            entry.status='clicked';
          }catch(e){entry.status='test-unverified';entry.reason=String(e).slice(0,180);}
        }
      }catch(e){
        item.status='click-failed';item.error=String(e).slice(0,430);
        report.failedClicks.push({tab,label:item.label,kind:'button-click',reason:item.error});
      }
      section.outcome.push(item);
      persist();
    }
    section.omittedByBound=Math.max(0,start.length-maxPerTab);
    section.outsideSlice=Math.max(0,start.length-selected.length);
    section.sliceCoverage='This job audits only the selected slice; other slices are verified in their own jobs or previous evidence';
    if(section.outcome.some(x=>x.status==='budget-exhausted'))section.incomplete=true;
    persist();
  }
  report.pageErrors=errors.slice(0,30);
  persist();
  await testInfo.attach('anonymous-control-census-'+auditTab+'-'+sliceFrom+'-'+sliceTo+'.json',{body:Buffer.from(JSON.stringify(report,null,2)),contentType:'application/json'});
  expect(report.counts.clicked,'At least one selected, safe real user click must succeed').toBeGreaterThan(0);
  expect(report.failedClicks, 'Real blocked controls (inspect evidence, do not force-click)').toEqual([]);
  expect(report.tabs.some(x=>x.incomplete), 'Budget exhaustion prevents complete audited-tab coverage').toBe(false);
});
}
