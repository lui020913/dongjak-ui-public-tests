import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const src=await readFile(new URL('../src/map-hud-collision-guard.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/pilot-layer-selection.css',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [375,390,430,1024]){
  const page=await browser.newPage({viewport:{width,height:800}});
  await page.setContent('<style>body{margin:0}#app{position:relative;height:100vh}#djNext-active-layers{position:absolute;right:12px;bottom:70px;display:flex;flex-direction:column;gap:12px;padding:0}.djNext-active-layer-off{width:130px;height:40px;flex:none}#bottom-nav{position:absolute;bottom:0;height:50px;width:100%}#custom{position:fixed;top:0;left:0;background:white;z-index:9999}.map-actions{position:absolute;top:140px;right:12px}.map-actions button{height:38px;width:40px}#dj840-map-tip{position:absolute;left:12px;bottom:90px;width:110px;height:25px}</style><div id="app" data-tab="map"><div id="djNext-active-layers"><button id="one" class="djNext-active-layer-off">3D 건물 해제</button><button id="two" class="djNext-active-layer-off">실시간 지하철 해제</button></div><div class="map-actions"><button id="gps">GPS</button></div><div id="dj840-map-tip">TIP</div><div id="bottom-nav"></div><section id="custom" role="dialog" hidden></section></div>');
  await page.addStyleTag({content:css});
  await page.addScriptTag({type:'module',content:src+'\nwindow.disposeGuard=installMapHudCollisionGuard(document,window);'});
  await page.waitForFunction(()=>typeof window.disposeGuard==='function');
  const rect=await page.locator('#one').boundingBox();
  await page.evaluate(r=>{const el=document.getElementById('custom');Object.assign(el.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});el.hidden=false;},rect);
  await page.waitForFunction(()=>document.getElementById('one').getAttribute('data-dj-hud-occluded')==='true');
  assert.equal(await page.locator('#two').getAttribute('data-dj-hud-occluded'),null);
  assert.equal(await page.locator('#one').evaluate(n=>getComputedStyle(n).visibility),'hidden');
  const retained=await page.locator('#one').evaluate(n=>n.getBoundingClientRect().toJSON());
  assert.equal(retained.width,rect.width);
  await page.evaluate(()=>document.getElementById('custom').hidden=true);
  await page.waitForFunction(()=>!document.getElementById('one').hasAttribute('data-dj-hud-occluded'));
  const gps=await page.locator('#gps').boundingBox();
  await page.evaluate(r=>{const el=document.getElementById('custom');Object.assign(el.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});el.hidden=false;},gps);
  await page.waitForFunction(()=>document.getElementById('gps').hasAttribute('data-dj-hud-occluded'));
  await page.evaluate(()=>{document.getElementById('custom').style.left='-200px';});
  await page.waitForFunction(()=>!document.getElementById('gps').hasAttribute('data-dj-hud-occluded'));
  // Dynamic surface not on the built-in list: role/dialog and opt-in work.
  const tip=await page.locator('#dj840-map-tip').boundingBox();
  await page.evaluate(r=>{const el=document.createElement('aside');el.setAttribute('data-dj-collision-surface','');el.id='new-panel';Object.assign(el.style,{position:'fixed',left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});document.body.append(el);},tip);
  await page.waitForFunction(()=>document.getElementById('dj840-map-tip').hasAttribute('data-dj-hud-occluded'));
  await page.evaluate(()=>document.getElementById('new-panel').remove());
  await page.waitForFunction(()=>!document.getElementById('dj840-map-tip').hasAttribute('data-dj-hud-occluded'));
  await page.evaluate(()=>window.disposeGuard());await page.close();
  console.log('HUD_GEOMETRY_BROWSER_PASS',width);
 }
}finally{await browser.close();}
