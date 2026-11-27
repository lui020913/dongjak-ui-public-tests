import {chromium,webkit} from '@playwright/test';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5199,strictPort:true},logLevel:'error'});
await server.listen();
const base='http://127.0.0.1:5199';
const html='<meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font:14px system-ui;background:#edf3ef}#app{height:100dvh}@layer request-completion{#route-map-card{position:fixed;bottom:4px;left:12px;right:12px;max-height:55dvh;overflow:hidden;padding:14px;background:#fff;border-radius:23px;display:flex;flex-direction:column}}#app button{font:inherit}</style><div id="app" data-tab="map" data-dj-route-stage="preview" data-dj-transit-preview="true"><section id="route-map-card"><div class="actions route-map-card-actions" style="display:flex!important"><button id="route-guide-start" style="display:block!important">안내 시작</button></div></section></div><script type="module">import "/src/route-experience.css"; import {mountTransitDetail} from "/src/transit-route-detail.js"; const app=document.querySelector("#app"),mapCard=document.querySelector("#route-map-card");mountTransitDetail({doc:document,win:window,app,mapCard,actions:mapCard.querySelector(".actions")});window.detailMounted=true;</script>';
const walk=(meters,minutes)=>({meters,minutes,priChoice:'observed-comparison'});
const pri={risk:25,coverage:.9};
const detail={kind:'mixed',railQuality:'mixed',from:'테스트 출발지',to:'테스트 목적지',legs:[
 {kind:'bus',route:'테스트마을01',routeType:'2',origin:'테스트 승차 정류장',destination:'흑석역',arsId:'20001',routeId:'100000001',stops:['테스트 승차 정류장','흑석역'],firstTime:'05:00',lastTime:'23:00'},
 {kind:'rail',lines:['9','9'],origin:'흑석',destination:'노량진',stops:['흑석','노들','노량진']},
 {kind:'bus',route:'테스트간선02',routeType:'3',origin:'노량진역',destination:'테스트 하차 정류장',arsId:'20002',routeId:'100000002',stops:['노량진역','테스트 하차 정류장']}
],walks:[walk(240,4),walk(100,2),walk(120,2),walk(180,3)],priLegs:[pri,pri,pri,pri],targets:Array.from({length:8},()=>({lat:37.50,lng:126.95}))};
await mkdir('test-results/transit-mobile',{recursive:true});
try{
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch({headless:true});
  try{
   for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await page.route(base+'/transit-detail-fixture',r=>r.fulfill({contentType:'text/html',body:html}));
    await page.goto(base+'/transit-detail-fixture');
    await page.waitForFunction(()=>window.detailMounted===true);
    await page.evaluate(d=>window.dispatchEvent(new CustomEvent('dongjak:transit-detail',{detail:d})),detail);
    const root=page.locator('#dj-transit-detail');
    await root.waitFor({state:'visible'});
    assert.equal(await root.locator('.dj-tr-leg').count(),8);
    assert.match(await root.locator('.dj-tr-heading').innerText(),/환승 2회/);
    assert.match(await root.locator('.dj-tr-fare').innerText(),/도보 640m · 약 11분/);
    assert.doesNotMatch(await root.innerText(),/기본운임|운임 기준|전체 시간/);
    const geometry=await root.evaluate(n=>{const track=n.querySelector('.dj-tr-order');return {width:n.clientWidth,scroll:n.scrollWidth,trackWidth:track.clientWidth,trackScroll:track.scrollWidth};});
    assert.ok(geometry.scroll<=geometry.width+1&&geometry.trackScroll<=geometry.trackWidth+1,engine+' '+width+' horizontal overflow');
    assert.equal(await page.locator('#route-guide-start').isVisible(),false);
    assert.equal(await root.getByRole('button',{name:'단계별 이동안 보기',exact:true}).count(),0);
    const boundaries=()=>root.evaluate(n=>{const h=n.querySelector('.dj-tr-fixed-head').getBoundingClientRect(),b=n.querySelector('.dj-tr-scroll'),r=b.getBoundingClientRect(),f=n.querySelector('.dj-tr-footer').getBoundingClientRect(),p=n.closest('#route-map-card').getBoundingClientRect();return {head:h.top,headBottom:h.bottom,body:r.top,bodyBottom:r.bottom,footer:f.top,footerBottom:f.bottom,cardBottom:p.bottom,scroll:b.scrollHeight,client:b.clientHeight};});
    const before=await boundaries();assert.ok(before.client>0&&before.scroll>before.client&&before.headBottom<=before.body+1&&before.bodyBottom<=before.footer+1&&before.footerBottom<=before.cardBottom+1,engine+' '+width+' fixed head and footer bounds '+JSON.stringify(before));
    await root.locator('.dj-tr-scroll').evaluate(n=>{n.scrollTop=n.scrollHeight;});
    const after=await boundaries();assert.ok(Math.abs(after.head-before.head)<1&&Math.abs(after.footer-before.footer)<1,engine+' '+width+' header/footer moved');
    await root.locator('.dj-tr-scroll').evaluate(n=>{n.scrollTop=0;});
    await root.locator('.dj-tr-stops summary').first().click();
    assert.ok(await root.locator('.dj-tr-stops').first().evaluate(n=>n.open));
    await root.locator('.dj-tr-stops summary').first().click();
    assert.equal(await page.getByRole('button',{name:'안내 시작',exact:true}).count(),1);
    await page.evaluate(()=>{window.addEventListener('dongjak:transit-gps-start',e=>{window.fixtureGpsSignal=e.detail.signal;window.fixtureGpsFix=e.detail.onPosition;},{once:true});});
    await root.locator('.dj-tr-start').click();
    assert.match(await root.locator('.dj-tr-progress').innerText(),/1 \/ 8/);
    assert.equal(await root.locator('[data-step-next],[data-step-prev],.dj-tr-gps-toggle').count(),0);
    await page.evaluate(()=>{const now=Date.now();for(const timestamp of [now-300,now-200])window.fixtureGpsFix({timestamp,coords:{latitude:37.5,longitude:126.95,accuracy:10}});});
    assert.match(await root.locator('.dj-tr-progress').innerText(),/2 \/ 8/);
    await page.evaluate(()=>{const now=Date.now();window.fixtureGpsFix({timestamp:now-100,coords:{latitude:37.5,longitude:126.95,accuracy:10}});window.fixtureGpsFix({timestamp:now,coords:{latitude:37.5,longitude:126.95,accuracy:10}});});
    assert.match(await root.locator('.dj-tr-progress').innerText(),/3 \/ 8/);
    await page.screenshot({path:'test-results/transit-mobile/'+engine+'-'+width+'.png'});
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:transit-detail',{detail:null})));
    assert.equal(await root.isVisible(),false);
    assert.equal(await page.locator('#route-guide-start').evaluate(n=>n.style.getPropertyValue('display')),'block');
    assert.equal(await page.locator('.route-map-card-actions').evaluate(n=>n.style.getPropertyValue('display')),'flex');
    await page.evaluate(()=>{delete document.getElementById('app').dataset.djTransitPreview;});
    assert.equal(await page.locator('#route-guide-start').isVisible(),true);
    assert.equal(await page.evaluate(()=>window.fixtureGpsSignal.aborted),true);
    console.log('TRANSIT_DETAIL_PASS',engine,width,height);
    await page.close();
   }
  }finally{await browser.close();}
 }
}finally{await server.close();}
