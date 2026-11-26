import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>console.error('ROAD_PREVIEW_PAGE_CRASH'));page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('ROAD_PREVIEW_NAVIGATION',f.url())});
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('BROWSER',m.text().slice(0,500))});
 await page.goto('http://127.0.0.1:8193/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>Boolean(window.__roadPreview?.selective),{},{timeout:180000});
 await page.waitForFunction(()=>window.__roadPreview.map.loaded(),{},{timeout:90000});
 const initial=await page.evaluate(()=>{const {map,selective,eligibility}=window.__roadPreview;return {valid:selective.valid,ids:eligibility.eligible_id_count,filters:map.getStyle().layers.filter(l=>l['source-layer']==='transportation').map(l=>[l.id,map.getFilter(l.id)??null])}});
 assert.equal(initial.ids,259);assert.equal(initial.valid,true,'style fingerprint and source must match');
 await page.locator('#selective').click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('개 스타일 레이어 적용'),{},{timeout:90000});
 const selective=await page.evaluate(()=>{const {map}=window.__roadPreview;return {filters:map.getStyle().layers.filter(l=>l['source-layer']==='transportation').map(l=>[l.id,map.getFilter(l.id)??null]),hybrid:map.getLayoutProperty('preview-hybrid','visibility')}});
 const baseline=new Map(initial.filters);const changed=selective.filters.filter(([id,f])=>JSON.stringify(f)!==JSON.stringify(baseline.get(id)));
 assert.ok(changed.length>0);assert.equal(selective.hybrid,'visible');
 for(const [id,f] of changed){assert.ok(!/bridge|tunnel|rail|tram|subway|ferry|aerial/i.test(id));assert.ok(JSON.stringify(f).includes('"within"'));assert.ok(JSON.stringify(f).includes('"brunnel"'))}
 await page.locator('#pitch').click();
 await page.waitForFunction(()=>window.__roadPreview.map.getPitch()>40,{},{timeout:15000});
 assert.equal(await page.evaluate(()=>window.__roadPreview.map.getLayoutProperty('preview-hybrid','visibility')),'visible');
 await page.locator('#old').click();
 const restored=await page.evaluate(()=>window.__roadPreview.map.getStyle().layers.filter(l=>l['source-layer']==='transportation').map(l=>[l.id,window.__roadPreview.map.getFilter(l.id)??null]));
 assert.deepEqual(restored,initial.filters);
 await page.locator('#selective').click();
 console.log('SELECTIVE_RESTORE_BEFORE_ZOOM_OK',JSON.stringify({changedLayers:changed.length,protectedLayers:initial.filters.length-changed.length,threeD:true}));
 // jumpTo returns the live Map object. Never serialize its WebGL context,
 // worker state, or DOM graph through Playwright's evaluate result.
 await page.evaluate(()=>{window.__roadPreview.map.jumpTo({zoom:15,pitch:0});});
 await page.waitForFunction(()=>window.__roadPreview.map.getZoom()===15&&window.__roadPreview.map.getPitch()===0);
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('원본 유지'),{},{timeout:20000});
 const low=await page.evaluate(()=>{const {map}=window.__roadPreview;return {filters:map.getStyle().layers.filter(l=>l['source-layer']==='transportation').map(l=>[l.id,map.getFilter(l.id)??null]),hybrid:map.getLayoutProperty('preview-hybrid','visibility')}});
 assert.deepEqual(low.filters,initial.filters);assert.equal(low.hybrid,'none');
 assert.deepEqual(errors,[]);
 console.log('SELECTIVE_ACTUAL_MAP_BROWSER_OK',JSON.stringify({changedLayers:changed.length,protectedLayers:initial.filters.length-changed.length,restore:true,zoomGuard:true,threeD:true}));
}finally{await browser.close()}
