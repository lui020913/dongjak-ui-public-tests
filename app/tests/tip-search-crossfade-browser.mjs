import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('../index.html');
const policy=html.match(/\/\* DJ_INTERACTION_FOCUS_START \*\/([\s\S]*?)\/\* DJ_INTERACTION_FOCUS_END \*\//)?.[1];
assert.ok(policy);
const css=['style.css','v840-coordinated-ui.css','v854-integrated-ui.css','v869-safety-home-tip.css','map-search-refinement.css'].map(p=>read('../src/'+p)).join('\n')+'\n'+read('../../frontend/production/mobile-next.css');
const tipJS=read('../src/v854-tip-marquee.js').replace('export function','function');
const fadeJS=read('../src/map-toolbar-crossfade.js').replace('export function','function');
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  await page.clock.install();
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${policy}\n${css}</style></head><body><div id="app" data-tab="map"><nav id="djNext-toolbar"><div id="djNext-rail"><button class="djNext-tool">주변정보</button><button class="djNext-tool">레이어</button></div></nav><div id="dj-search-entry-actions" hidden><button>이 지도에서 검색</button><button>내 주변 검색</button></div><button id="dj840-map-tip" class="is-visible" style="position:fixed!important;left:12px!important;right:12px!important;top:250px!important;bottom:auto!important;width:calc(100% - 24px)!important;max-width:none!important"><strong>TIP</strong><span class="dj840-tip-copy-viewport"><span class="dj840-tip-copy">역이나 정류장을 누르면 대중교통 정보를 확인할 수 있습니다.</span></span></button><button id="dj-user-tip-close" style="position:fixed!important;right:20px!important;top:250px!important;bottom:auto!important;width:36px!important;height:36px!important">×</button></div></body></html>`);
  await page.addScriptTag({content:tipJS+'\n'+fadeJS+'\nwindow.testEntry=createSearchToolbarCrossfade(document.getElementById("app"),document.getElementById("dj-search-entry-actions"));'});
  await page.clock.runFor(150);
  const geometry=()=>page.evaluate(()=>{
   const n=document.querySelector('#dj840-map-tip'),c=n.querySelector('.dj840-tip-copy'),v=c.parentElement;
   const r=document.createRange();r.selectNodeContents(c);
   const text=r.getBoundingClientRect(),lane=v.getBoundingClientRect(),x=document.querySelector('#dj-user-tip-close').getBoundingClientRect();
   return {left:text.left,right:text.right,laneLeft:lane.left,laneRight:lane.right,xLeft:x.left,width:text.width,overflow:-parseFloat(n.style.getPropertyValue('--dj854-tip-overflow')),deadline:+n.dataset.djTipReadUntil,now:Date.now()};
  });
  const first=await geometry();
  assert.ok(first.overflow>0,JSON.stringify(first));
  assert.ok(first.laneRight<=first.xLeft-6,JSON.stringify(first));
  assert.ok(Math.abs(first.left-first.laneLeft)<3,JSON.stringify(first));
  const travel=Math.max(1.8,first.overflow/24);
  await page.clock.runFor(Math.ceil((1+travel+.2)*1000));
  const last=await geometry();
  assert.ok(last.left<first.left-10,JSON.stringify(last));
  assert.ok(last.right<=last.laneRight+2,JSON.stringify(last));
  assert.ok(last.right>=last.laneRight-4,JSON.stringify(last));
  assert.ok(last.deadline>last.now);
  await page.clock.runFor(Math.ceil((travel+1.3)*1000));
  const back=await geometry();assert.ok(Math.abs(back.left-first.left)<3,JSON.stringify(back));
  const toggle=visible=>page.evaluate(v=>{const app=document.getElementById('app');window.testEntry(v,true);if(v)app.dataset.djSearchEntry='1';else delete app.dataset.djSearchEntry;},visible);
  const get=()=>page.evaluate(()=>{const t=document.getElementById('djNext-toolbar'),s=document.getElementById('dj-search-entry-actions');return {toolbar:+getComputedStyle(t).opacity,chips:+getComputedStyle(s).opacity,hidden:s.hidden,phase:document.getElementById('app').dataset.djSearchCrossfade,toolbarDisplay:getComputedStyle(t).display};});
  await toggle(true);await page.clock.runFor(95);let state=await get();
  assert.ok(state.toolbar>0&&state.toolbar<1&&state.chips>0&&state.chips<1&&!state.hidden,JSON.stringify(state));
  assert.ok(Math.abs(state.toolbar+state.chips-1)<.01);
  await page.clock.runFor(150);state=await get();assert.equal(state.hidden,false);assert.equal(state.phase,undefined);
  await toggle(false);await page.clock.runFor(95);state=await get();assert.ok(state.toolbar>0&&state.toolbar<1&&state.chips>0&&state.chips<1&&!state.hidden,JSON.stringify(state));
  await toggle(true);await page.clock.runFor(250);state=await get();assert.equal(state.hidden,false);
  await toggle(false);await page.clock.runFor(250);state=await get();assert.equal(state.hidden,true);assert.equal(state.phase,undefined);
  console.log(engine.name()+' actual TIP start/end/return geometry and bidirectional search crossfade passed');
 }finally{await browser.close()}
}
