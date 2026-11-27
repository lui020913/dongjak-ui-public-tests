import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {dismissOnboarding,clickRealPointer} from './e2e/helpers.js';
import {nativeVehicleArea,quietNativeLine} from '../src/quiet-basemap.mjs';
const root=resolve('app/dist'),out=resolve('audit-render-output');
mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/')pathname='/index.html';
 const file=resolve(root,'.'+pathname);
 if(!file.startsWith(root+'/')){res.writeHead(403);return res.end();}
 try{
  if(!statSync(file).isFile())throw Error();
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const results=[];
const registry=JSON.parse(readFileSync(resolve('app/public/data/transport/seoul-bus-stops.json'),'utf8'));
const stops=registry.stops.filter(s=>s.name.includes('밤골')&&s.name.includes('상도역롯데캐슬파크엘'));
assert.ok(stops.length>0,'exact reported bus stop must exist');
const center=[stops.reduce((s,p)=>s+p.lng,0)/stops.length,stops.reduce((s,p)=>s+p.lat,0)/stops.length];
const sites=[{key:'bamgol-lotte-castle',center},{key:'sangdo-elementary',center:[126.93615,37.50235]},{key:'nodeul-sayuksin',center:[126.94865,37.5122]}];
const quiet=process.env.CHECK_QUIET_BASEMAP==='true';
if(quiet){
 const riverStops=registry.stops.filter(s=>s.name.includes('한강현대아파트')&&s.lng>126.94&&s.lng<126.99&&s.lat>37.49&&s.lat<37.53);
 const riverCenter=riverStops.length?[riverStops.reduce((sum,p)=>sum+p.lng,0)/riverStops.length,riverStops.reduce((sum,p)=>sum+p.lat,0)/riverStops.length]:[126.964,37.511];
 sites.push({key:'hangang-riverside-highway',center:riverCenter});
}
const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
const page=await ctx.newPage();const errors=[],reviewRequests=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('request',r=>{if(/\/data\/road-display-(review|repair)\//.test(r.url()))reviewRequests.push(r.url());});
try{
   await page.goto(url+'/',{waitUntil:'domcontentloaded'});
   const menu=page.locator('#dj-install-menu');await menu.waitFor({state:'attached',timeout:30000});
   if(await menu.isVisible()){await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();await menu.waitFor({state:'hidden'});}
   const startup=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
   await page.waitForFunction(()=>{const o=document.querySelector('#map-startup-overlay'),n=document.querySelector('#map-startup-continue');return !o||!o.getClientRects().length||n?.getClientRects().length>0;},{},{timeout:90000});
   if(await startup.isVisible()&&await next.isVisible())await clickRealPointer(page,next,'startup continue');
   await startup.waitFor({state:'hidden',timeout:45000});
   await dismissOnboarding(page);
   await page.waitForFunction(()=>window.__qaMap?.getStyle()?.sources?.openmaptiles,{},{timeout:90000});

 if(process.env.CHECK_ADMIN_RAIL==='true'){
  await page.evaluate(()=>window.__qaMap.jumpTo({center:[126.953,37.504],zoom:11.4,pitch:0}));
  await page.waitForFunction(()=>{const m=window.__qaMap;return m.getLayer('neighbor-district-names')&&m.queryRenderedFeatures({layers:['neighbor-district-names']}).length>=2;},{},{timeout:90000});
  const names=await page.evaluate(()=>window.__qaMap.queryRenderedFeatures({layers:['neighbor-district-names']}).map(f=>f.properties.name));assert.ok(names.every(n=>/[구시]$/.test(n)&&n!=='동작구'));
  await page.screenshot({path:out+'/admin-names-overview.png'});
  await page.evaluate(()=>window.__qaMap.jumpTo({center:[126.982,37.512],zoom:14,pitch:0}));
  await page.waitForFunction(()=>{const m=window.__qaMap;if(!m.getLayer('transport-schematic-subway'))return false;const p=m.project([126.9822,37.512]);return m.queryRenderedFeatures([[p.x-30,p.y-30],[p.x+30,p.y+30]],{layers:['transport-schematic-subway']}).some(f=>f.properties.line==='4호선'&&f.properties.schematic===false);},{},{timeout:90000});
  await page.screenshot({path:out+'/line4-dongjak-bridge.png'});console.log('ADMIN_RAIL_RENDER_OK',JSON.stringify(names));
 }
 if(process.env.CHECK_BRIDGE_LABELS==='true'){
  const names=['원효대교','한강철교','한강대교','동작대교','반포대교'];
  const centers=[[126.94588,37.52715],[126.95180,37.51960],[126.95780,37.51590],[126.98189,37.51070],[126.99600,37.51550]];
  for(let i=0;i<names.length;i++){
   await page.evaluate(center=>window.__qaMap.jumpTo({center,zoom:13.5,pitch:0}),centers[i]);
   await page.waitForFunction(name=>{const m=window.__qaMap,id='dj-hangang-bridge-osm-labels';return m.getLayer(id)&&m.queryRenderedFeatures({layers:[id]}).some(f=>f.properties.name===name);},names[i],{timeout:90000});
  }
  console.log('CURATED_BRIDGE_LABELS_RENDER_OK',JSON.stringify(names));
 }
 if(process.env.CHECK_STRICT_BUILDINGS==='true'){
  const native=()=>page.evaluate(()=>window.__qaMap.getStyle().layers.filter(l=>['fill','fill-extrusion','line'].includes(l.type)&&l['source-layer']==='building').map(l=>({id:l.id,visibility:window.__qaMap.getLayoutProperty(l.id,'visibility'),filter:window.__qaMap.getFilter(l.id)})));
  for(const center of [[126.891,37.503],[126.997,37.53],[126.947,37.5]])for(const zoom of [13.7,14.5,16,18])for(const pitch of [0,40]){
   await page.evaluate(v=>window.__qaMap.jumpTo(v),{center,zoom,pitch});
   const layers=await native();assert.ok(layers.length>0);assert.ok(layers.every(l=>l.visibility==='none'&&JSON.stringify(l.filter)==='["==",1,0]'));
  }
  console.log('STRICT_BUILDING_ZOOM_PITCH_OK');
 }
 for(const site of sites){
  await page.evaluate(({center})=>window.__qaMap.jumpTo({center,zoom:18.4,pitch:0}),site);
  await page.waitForFunction(()=>{const m=window.__qaMap;return m.isStyleLoaded()&&m.getStyle().layers.some(l=>l['source-layer']==='transportation'&&l.type==='line')&&m.getStyle().layers.some(l=>l.id.startsWith('dongjak-buildings-footprint-')&&m.isSourceLoaded(l.source));},{},{timeout:90000}).catch(async error=>{console.log('IDLE_MAP_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>{const m=window.__qaMap;return {styleLoaded:m.isStyleLoaded(),moving:m.isMoving(),layers:m.getStyle().layers.filter(l=>l.id.startsWith('dongjak-buildings-footprint-')).map(l=>({id:l.id,loaded:m.isSourceLoaded(l.source)})),boundary:document.querySelector('#app')?.dataset.djBoundaryReady};})));throw error;});
  const read=()=>page.evaluate(()=>{const m=window.__qaMap,s=m.getStyle();return {overlay:!!m.getLayer('dj-reviewed-base-road-fill'),source:!!m.getSource('dj-reviewed-base-road-surfaces'),flag:document.querySelector('#app')?.dataset.djReviewedBaseRoads||null,nativeRoads:s.layers.filter(l=>l.type==='line'&&l['source-layer']==='transportation').map(l=>({id:l.id,filter:m.getFilter(l.id),visibility:m.getLayoutProperty(l.id,'visibility')})),center:m.getCenter().toArray(),zoom:m.getZoom()};});
  await page.evaluate(()=>{const m=window.__qaMap;const p=m.project(m.getCenter());m.panBy([18,0],{duration:250});});
  await page.waitForFunction(()=>!window.__qaMap.isMoving(),{},{timeout:10000});
  const frames=[];
  for(const delay of [0,300,750,1500,3000]){
   if(delay)await page.waitForTimeout(delay);
   const f=await read();assert.equal(f.overlay,false);assert.equal(f.source,false);assert.equal(f.flag,null);assert.ok(f.nativeRoads.length>0);
   if(frames.length)assert.deepEqual(f.nativeRoads,frames[0].nativeRoads,'native road visibility/filter changed during idle');
   frames.push(f);
   if(quiet){
    const info=await page.evaluate(()=>{const m=window.__qaMap;return {layers:m.getStyle().layers.map(l=>({id:l.id,type:l.type,source:l.source,'source-layer':l['source-layer'],filter:m.getFilter(l.id),visibility:m.getLayoutProperty(l.id,'visibility')})),district:m.getLayer('district-border')?m.getPaintProperty('district-border','line-opacity'):null};});
    const nativeAreas=info.layers.filter(nativeVehicleArea),nativeQuiet=info.layers.filter(quietNativeLine);
    assert.ok(nativeAreas.length>0,'actual native road polygon layer must exist');
    assert.ok(nativeQuiet.some(l=>l['source-layer']==='boundary'),'actual native boundary line must exist');
    if(process.env.CHECK_FERRY_FADE==='true')assert.ok(nativeQuiet.some(l=>l.id==='ferry'||/ferry/.test(l.id)),'actual ferry line must exist and be hidden');
    assert.ok(nativeAreas.every(l=>JSON.stringify(l.filter).includes('pedestrian')),'native vehicle area must exclude road fills');
    assert.ok(nativeQuiet.every(l=>l.visibility==='none'),'decorative lines must remain hidden');
    assert.ok(info.district>0,'owned Dongjak district boundary must remain visible in safety mode');
    assert.ok(f.nativeRoads.some(l=>l.visibility!=='none'),'ordinary road lines must remain visible');
    const ids=nativeAreas.map(l=>l.id);
    const visible=await page.evaluate(ids=>window.__qaMap.queryRenderedFeatures({layers:ids}).map(f=>f.properties?.class||''),ids);
    assert.ok(visible.every(k=>['path','pedestrian','footway','cycleway','steps'].includes(k)),'vehicle road fill must not render');
   }
   if(delay===0||delay===3000)await page.screenshot({path:out+'/'+site.key+'-idle-'+delay+'.png'});
  }
  results.push({site:site.key,center:site.center,samples:frames.length,nativeRoads:frames[0].nativeRoads.length,overlayNeverVisible:true});
 }
 assert.equal(reviewRequests.length,0,'production must not request opaque road overlay assets');assert.deepEqual(errors,[]);
 console.log('IDLE_ROAD_VISUAL_REGRESSION_OK',JSON.stringify(results));
}finally{writeFileSync(out+'/results.json',JSON.stringify({results,errors,reviewRequests},null,2));await ctx.close();await browser.close();server.close();}
