import {chromium,webkit} from '@playwright/test';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5199,strictPort:true},logLevel:'error'});
await server.listen();
const base='http://127.0.0.1:5199';
const html='<meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font:14px system-ui;background:#edf3ef}#app{height:100dvh}#route-map-card{position:fixed;bottom:4px;left:12px;right:12px;max-height:55dvh;overflow:auto;padding:14px;background:#fff;border-radius:23px}#app button{font:inherit}</style><div id="app" data-tab="map"><section id="route-map-card"><div class="actions"></div></section></div><script type="module">import {mountTransitDetail} from "/src/transit-route-detail.js"; const app=document.querySelector("#app"),mapCard=document.querySelector("#route-map-card");mountTransitDetail({doc:document,win:window,app,mapCard,actions:mapCard.querySelector(".actions")});window.detailMounted=true;</script>';
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
    assert.match(await root.locator('.dj-tr-fare').innerText(),/1,550원/);
    const geometry=await root.evaluate(n=>{const track=n.querySelector('.dj-tr-order');return {width:n.clientWidth,scroll:n.scrollWidth,trackWidth:track.clientWidth,trackScroll:track.scrollWidth};});
    assert.ok(geometry.scroll<=geometry.width+1&&geometry.trackScroll<=geometry.trackWidth+1,engine+' '+width+' horizontal overflow');
    await root.locator('.dj-tr-stops summary').first().click();
    assert.ok(await root.locator('.dj-tr-stops').first().evaluate(n=>n.open));
    await root.locator('.dj-tr-stops summary').first().click();
    await root.locator('.dj-tr-start').click();
    assert.match(await root.locator('.dj-tr-progress').innerText(),/1 \/ 8/);
    const next=root.locator('[data-step-next]');
    await next.click();
    assert.match(await root.locator('.dj-tr-progress').innerText(),/2 \/ 8/);
    await page.evaluate(()=>{window.addEventListener('dongjak:transit-gps-start',e=>{window.fixtureGpsSignal=e.detail.signal;e.detail.onPosition({timestamp:Date.now()-100,coords:{latitude:37.5,longitude:126.95,accuracy:10}});e.detail.onPosition({timestamp:Date.now(),coords:{latitude:37.5,longitude:126.95,accuracy:10}});},{once:true});});
    await root.getByRole('button',{name:'위치 확인 켜기',exact:true}).click();
    assert.match(await root.locator('.dj-tr-gps-status').innerText(),/하차 예정 지점 근처/);
    await page.screenshot({path:'test-results/transit-mobile/'+engine+'-'+width+'.png'});
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dongjak:transit-detail',{detail:null})));
    assert.equal(await root.isVisible(),false);
    assert.equal(await page.evaluate(()=>window.fixtureGpsSignal.aborted),true);
    console.log('TRANSIT_DETAIL_PASS',engine,width,height);
    await page.close();
   }
  }finally{await browser.close();}
 }
}finally{await server.close();}
