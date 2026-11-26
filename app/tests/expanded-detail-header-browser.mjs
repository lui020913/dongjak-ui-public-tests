import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const css=await readFile(new URL('../src/mobile-first-layout.css',import.meta.url),'utf8');
const helper=await readFile(new URL('../src/popup-close-input.js',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [375,390,430]){
  const page=await browser.newPage({viewport:{width,height:812},hasTouch:true,isMobile:true});
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>#app{position:relative;height:100vh}#map{position:absolute;inset:0;z-index:0}.topbar,#djNext-toolbar{position:fixed;inset:0 0 auto;height:140px;z-index:6000;background:rgba(0,0,0,.01)}#djNext-toolbar{top:35px}.sheet{position:fixed;inset:10px 0 70px;background:white;z-index:20}.transport-panel-head,.dj-place-header{display:flex;align-items:center;justify-content:space-between;padding:20px}.dj-place-edge-drag,.dj856-transport-edge-drag{position:absolute;inset:0;z-index:100}#bottom-nav{position:fixed;bottom:0;height:60px;width:100%;z-index:9000}</style><div id="app" data-tab="map"><div id="map"><div id="facility" class="sheet dj-place-detail-popup dj871-sheet-expanded"><div class="dj-place-header"><span class="dj-place-edge-drag"></span><span>중앙대학교</span><button class="dj-place-header-close">X</button></div></div></div><div class="topbar"><input id="map-quick-search"></div><div id="djNext-toolbar"></div><section id="transport-sheet" class="sheet" hidden><div class="transport-panel-head"><span class="dj856-transport-edge-drag"></span><span>상도역</span><button id="transport-close">X</button></div></section><nav id="bottom-nav"></nav></div>');
  await page.addStyleTag({content:css});
  await page.addScriptTag({type:'module',content:helper+'\nwindow.bindClose=bindReliablePopupClose;'});
  await page.waitForFunction(()=>window.bindClose);
  await page.evaluate(()=>{const f=document.querySelector('#facility'),t=document.querySelector('#transport-sheet');window.closed=0;window.bindClose(f.querySelector('button'),()=>{window.closed++;f.remove();});window.closeTransit=window.bindClose(t.querySelector('button'),()=>{window.closed++;t.hidden=true;t.classList.remove('dj871-sheet-expanded');});});
  for(const selector of ['.dj-place-header-close','#transport-close']){
   if(selector.startsWith('#'))await page.evaluate(()=>{const t=document.querySelector('#transport-sheet');t.hidden=false;t.classList.add('dj871-sheet-expanded');});
   const button=page.locator(selector);
   const hit=await button.evaluate(b=>{const r=b.getBoundingClientRect(),p=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {hit:b.contains(p),w:r.width,h:r.height};});
   assert.ok(hit.hit&&hit.w>=44&&hit.h>=44,JSON.stringify({width,selector,hit}));
   await button.tap();
   await page.waitForFunction(n=>window.closed===n,selector.startsWith('#')?2:1);
  }
  assert.equal(await page.locator('.topbar').evaluate(n=>getComputedStyle(n).visibility),'visible');
  console.log('EXPANDED_HEADER_BROWSER_PASS',width);
  await page.close();
 }
}finally{await browser.close();}
