/**
 * Read-only paired baseline/candidate browser benchmark.
 * Usage: node scripts/compare-ui-performance.mjs BASE_URL CANDIDATE_URL [rounds]
 * Both URLs must expose release-source.json. No authentication, production
 * writes, screenshots or per-frame DOM reads. Results are browser-lab
 * indicators, NOT physical device FPS or input-to-photon measurements.
 */
import {chromium,webkit} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const [baseline,candidate,roundsArg='3']=process.argv.slice(2);
const rounds=Number(roundsArg);
if(!baseline||!candidate||!Number.isInteger(rounds)||rounds<1||rounds>10)throw Error('Provide baseline URL, candidate URL, rounds 1–10');
const origins=[baseline,candidate].map(s=>{const u=new URL(s);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Invalid benchmark URL');return u.origin;});
const engine=process.env.DONGJAK_PERF_BROWSER==='webkit'?'webkit':'chromium';

const percentile=(values,q)=>{if(!values.length)return null;const a=[...values].sort((x,y)=>x-y);return Number(a[Math.floor((a.length-1)*q)].toFixed(2));};
const summary=values=>({samples:values.length,p50:percentile(values,.5),p95:percentile(values,.95),max:percentile(values,1)});
const results=[];
async function marker(url){const res=await fetch(url+'/release-source.json',{cache:'no-store'});if(!res.ok)throw Error('Release marker unavailable: '+url);const j=await res.json();if(!j.application_version||!j.public_ui_source_commit||!j.build_run)throw Error('Incomplete release provenance');return {version:j.application_version,commit:j.public_ui_source_commit,build:String(j.build_run)};}
const markers=await Promise.all(origins.map(marker));
for(const [index,key] of ['DONGJAK_PERF_BASELINE_COMMIT','DONGJAK_PERF_CANDIDATE_COMMIT'].entries())if(process.env[key]&&markers[index].commit!==process.env[key])throw Error('Unexpected release commit: '+key);
if(markers[0].commit===markers[1].commit)throw Error('Baseline and candidate must be different commits');
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{}:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
async function ready(page,url){
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 const menu=page.locator('#dj-install-menu');
 await menu.waitFor({state:'attached',timeout:25000}).catch(()=>{});
 if(await menu.isVisible())await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();
 await page.locator('#map').waitFor({state:'visible',timeout:60000});
 const next=page.locator('#map-startup-continue');
 const startup=page.locator('#map-startup-overlay');
 await Promise.race([startup.waitFor({state:'hidden',timeout:60000}),next.waitFor({state:'visible',timeout:60000})]);
 if(await startup.isVisible()&&await next.isVisible())await next.click();
 await startup.waitFor({state:'hidden',timeout:30000});
 const tour=page.locator('#dj860-onboarding');
 await tour.waitFor({state:'visible',timeout:45000}).catch(()=>{});
 if(await tour.isVisible())await tour.locator('[data-dj860-action="skip"]').click();
 await tour.waitFor({state:'hidden',timeout:30000});
 await page.locator('#bottom-nav').waitFor({state:'visible'});
 // Warmup outside each measurement, identical for both versions.
 await page.waitForTimeout(1200);
}
async function run(url,round,variant){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
 const page=await context.newPage();
 try{
  // Install the capture listener before app handlers can stop propagation.
  await page.addInitScript(()=>{
   if(window.top!==window)return;
   let last=null,active=null;const records=[];let observer=null;
   const longTaskSupported=globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')===true;
   if(longTaskSupported){
    observer=new PerformanceObserver(list=>{for(const e of list.getEntries())if(active&&active.start!==null&&e.startTime>=active.start)active.longTasks.push(e.duration);});
    observer.observe({entryTypes:['longtask']});
   }
   window.__djPerf={
    arm(name){if(active)throw Error('Measurement already active');last=null;active={name,start:null,frames:[],longTasks:[],inputDelay:null,firstFrame:null,longTaskSupported};},
    read(){return records.at(-1)||null;},
    dispose(){observer?.disconnect();}
   };
   window.addEventListener('click',e=>{
    if(!active||active.start!==null||!e.isTrusted)return;
    active.start=performance.now();const delay=active.start-e.timeStamp;active.inputDelay=delay>=0&&delay<60000?delay:null;
    const tick=t=>{
     if(!active)return;
     if(last===null)active.firstFrame=Math.max(0,t-active.start);
     else active.frames.push(t-last);
     last=t;
     if(t-active.start<900)requestAnimationFrame(tick);
     else{records.push(active);active=null;}
    };
    requestAnimationFrame(tick);
   },true);
  });
  await ready(page,url);
  const tab=(key)=>page.locator('#bottom-nav .nav-tab[data-tab="'+key+'"]');
  const mine=page.locator('#mine-panel');
  const ai=page.locator('#dj-ai-search-modal');
  async function tabState(key){
   const actual=await page.locator('#app').getAttribute('data-tab');
   if(actual!==key)throw Error('Navigation mismatch: '+actual+' != '+key);
  }
  const steps=[
   ['map-to-mine',tab('mine'),()=>tabState('mine')],
   ['settings-enter',mine.locator('[data-dj834-action="type"]'),()=>mine.locator('.dj834-detail-back').waitFor({state:'visible'})],
   ['settings-back',mine.locator('.dj834-detail-back'),()=>mine.locator('[data-dj834-action="type"]').waitFor({state:'visible'})],
   ['mine-to-news',tab('news'),()=>tabState('news')],
   ['news-to-map',tab('map'),()=>tabState('map')],
   ['map-to-route',tab('route'),()=>tabState('route')],
   ['route-to-map',tab('map'),()=>tabState('map')],
   ['ai-enter',page.locator('#dj890-ai-orb'),()=>ai.waitFor({state:'visible'})],
   ['ai-exit',ai.getByRole('button',{name:'AI 검색 닫기'}),()=>ai.waitFor({state:'hidden'})]
  ];
  for(const [name,control,verify] of steps){
   await control.waitFor({state:'visible',timeout:20000});
   await control.scrollIntoViewIfNeeded();
   await page.evaluate(name=>window.__djPerf.arm(name),name);
   await control.click();
   await page.waitForFunction(name=>window.__djPerf.read()?.name===name,name,{timeout:15000});
   const data=await page.evaluate(()=>window.__djPerf.read());
   await verify();
   if(!data.frames.length||!Number.isFinite(data.firstFrame))throw Error('Insufficient frame samples: '+variant+' '+name);
   results.push({round,variant,step:name,...data});
   await page.waitForTimeout(300);
  }
 }finally{await context.close();}
}
try{
 for(let i=0;i<rounds;i++){
  const order=i%2===0?[0,1]:[1,0];
  for(const index of order)await run(origins[index],i+1,index===0?'baseline':'candidate');
 }
 // A mutable alias may have been deployed during comparison. Reject it.
 const after=await Promise.all(origins.map(marker));
 if(JSON.stringify(after)!==JSON.stringify(markers))throw Error('Release provenance changed during comparison');
 const report={engine,viewport:'390x844',rounds,markers,notes:['900ms click-to-rAF sampling windows; no screenshot or per-frame DOM reads','Input delay is click dispatch delay, not input-to-photon','Software-rendered/headless browser results are not physical device measurements','Long tasks only reported when browser supports the API'],summary:{}};
 function summarize(rows){
  const frames=rows.flatMap(r=>r.frames);
  const over25=frames.filter(v=>v>25).length,over50=frames.filter(v=>v>50).length;
  return {frameIntervalMs:summary(frames),intervalsOver25ms:over25,intervalsOver50ms:over50,
   shareOver25msPct:frames.length?Number((100*over25/frames.length).toFixed(2)):null,
   shareOver50msPct:frames.length?Number((100*over50/frames.length).toFixed(2)):null,
   firstRafMs:summary(rows.map(r=>r.firstFrame).filter(Number.isFinite)),
   clickDispatchDelayMs:summary(rows.map(r=>r.inputDelay).filter(Number.isFinite)),
   longTasks:rows.every(r=>r.longTaskSupported)?summary(rows.flatMap(r=>r.longTasks)):null};
 }
 for(const variant of ['baseline','candidate']){
  const rows=results.filter(r=>r.variant===variant);
  report.summary[variant]={...summarize(rows),byScenario:Object.fromEntries([...new Set(rows.map(r=>r.step))].map(step=>[step,summarize(rows.filter(r=>r.step===step))]))};
 }
 report.samples=results;
 const out=process.env.DONGJAK_PERF_OUTPUT||'ui-performance-comparison.json';
 writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({markers,summary:report.summary,output:out},null,2));
}finally{await browser.close();}
