import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {dismissOnboarding,clickRealPointer} from './e2e/helpers.js';
const root=resolve('app/dist'),out=resolve('audit-campus-building-output');
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


 const sites=[
  {key:'central-university',center:[126.95676,37.50439]},
  {key:'heukseok-north',center:[126.9612375,37.5115729]}
 ];
 for(const site of sites){
  await page.evaluate(({center})=>window.__qaMap.jumpTo({center,zoom:18,pitch:0,bearing:0}),site);
  await page.waitForFunction(()=>{const m=window.__qaMap;return m.isStyleLoaded()&&m.getStyle().layers.some(l=>l.id.startsWith('dongjak-buildings-footprint-')&&m.isSourceLoaded(l.source));},{},{timeout:90000});
  await page.waitForTimeout(1000);
  const paint=await page.evaluate(()=>{
   const m=window.__qaMap,style=m.getStyle();
   const fills=style.layers.filter(l=>l.type==='fill'&&l['source-layer']==='transportation'&&!/rail|metro|subway|tram|water|river|lake|pier|ferry|bridge|tunnel|contour/i.test(l.id));
   const ids=fills.map(l=>l.id);
   const hits=ids.length?m.queryRenderedFeatures({layers:ids}):[];
   const features=hits.map(f=>({id:f.id,layer:f.layer.id,class:f.properties?.class,subclass:f.properties?.subclass,geometry:f.geometry?.type,paint:m.getPaintProperty(f.layer.id,'fill-color')}));
   const remaining=m.queryRenderedFeatures().filter(f=>f.layer?.type==='fill'&&f.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type)).map(f=>({id:f.layer.id,sourceLayer:f.sourceLayer,class:f.properties?.class,color:m.getPaintProperty(f.layer.id,'fill-color')}));
   const bridgeLines=style.layers.filter(l=>l.type==='line'&&l['source-layer']==='transportation'&&/bridge/i.test(l.id)&&m.getLayoutProperty(l.id,'visibility')!=='none').map(l=>l.id);
   const bridgeHits=bridgeLines.length?m.queryRenderedFeatures({layers:bridgeLines}).length:0;
   const rawBridge=m.querySourceFeatures('openmaptiles',{sourceLayer:'transportation'}).filter(f=>f.properties?.class==='bridge'||f.properties?.brunnel==='bridge').length;
   return {bridgeLines,bridgeHits,rawBridge,fills:fills.map(l=>({id:l.id,color:m.getPaintProperty(l.id,'fill-color'),filter:l.filter})),features,remaining:[...new Map(remaining.map(x=>[x.id+':'+x.class,x])).values()],overlay:!!m.getLayer('dj-reviewed-base-road-fill')};
  });
  console.log('CAMPUS_FILL_EVIDENCE',site.key,JSON.stringify(paint));
  assert.equal(paint.overlay,false);
  assert.ok(paint.fills.length,'native transportation polygon layers must be present');
  // The quiet basemap deliberately excludes vehicle area polygons (native
  // road centerlines remain). Check the current palette AND the rendered
  // class restriction rather than asserting an obsolete white vehicle fill.
  const pedestrianClasses=['path','pedestrian','footway','cycleway','steps'];
  const expectedPaint=['match',['coalesce',['get','class'],''],pedestrianClasses,'#e7e9e2','#ffffff'];
  for(const fill of paint.fills){
   assert.deepEqual(fill.color,expectedPaint,'pedestrian pavement palette');
   assert.ok(JSON.stringify(fill.filter).includes(JSON.stringify(pedestrianClasses)),'vehicle polygon exclusion must remain active');
  }
  assert.ok(paint.features.every(f=>pedestrianClasses.includes(f.class)),'non-pedestrian vehicle polygons must not render');
  await page.screenshot({path:out+'/'+site.key+'-plan.png'});
  await page.evaluate(()=>window.__qaMap.jumpTo({pitch:30}));
  await page.waitForFunction(()=>{const m=window.__qaMap;return m.getStyle().layers.some(l=>l.id.startsWith('dongjak-buildings-3d-')&&m.getLayoutProperty(l.id,'visibility')==='visible'&&m.isSourceLoaded(l.source));},{},{timeout:90000});
  const motion=await page.evaluate(async()=>{
   const m=window.__qaMap,ids=m.getStyle().layers.filter(l=>l.id.startsWith('dongjak-buildings-3d-')&&m.getLayoutProperty(l.id,'visibility')==='visible').map(l=>l.id);
   const samples=[],read=()=>{samples.push({pitch:m.getPitch(),zoom:m.getZoom(),moving:m.isMoving(),visible:ids.filter(id=>m.getLayer(id)&&m.getLayoutProperty(id,'visibility')==='visible').length,planVisible:ids.filter(id=>m.getLayer(id.replace('-3d-','-footprint-'))&&m.getLayoutProperty(id.replace('-3d-','-footprint-'),'visibility')==='visible').length});};
   m.on('render',read);
   try{
    // Real animated pan/tilt at oblique angles, plus a deliberately slow
    // render event sequence to exercise the former FPS-driven fallback.
    const done=new Promise(resolve=>m.once('moveend',resolve));
    m.easeTo({center:[m.getCenter().lng+.00012,m.getCenter().lat+.00008],pitch:43,bearing:18,duration:900});
    await done;read();
    m.fire('movestart');for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,65));m.fire('render');}m.fire('moveend');read();
    for(const pitch of [30,12,10.2,9.7,10.1,8,7.2,6,8,10.2,30]){
     m.jumpTo({pitch});read();
    }
    return {ids,samples};
   }finally{m.off('render',read);}
  });
  console.log('BUILDING_MOTION_EVIDENCE',site.key,JSON.stringify(motion));
  assert.ok(motion.ids.length>0&&motion.samples.length>=12);
  const firstFlat=motion.samples.findIndex(s=>s.pitch<=7);
  assert.ok(firstFlat>=0);
  assert.ok(motion.samples.slice(0,firstFlat).every(s=>s.visible===motion.ids.length&&s.planVisible===0),'loaded extrusion visibility must remain stable during slow motion and pitch jitter');
  const flat=motion.samples.filter(s=>s.pitch===6);
  assert.ok(flat.length&&flat.every(s=>s.visible===0&&s.planVisible===motion.ids.length),'2D only when actually returning to overhead');
  assert.ok(motion.samples.at(-1).visible===motion.ids.length&&motion.samples.at(-1).planVisible===0);
  await page.screenshot({path:out+'/'+site.key+'-pitched.png'});
  results.push({site:site.key,paint,motion});
 }
 assert.ok(results[0].paint.features.some(f=>f.class==='path'&&f.subclass==='pedestrian'),'actual central university pedestrian pavement required');
 assert.ok(results[1].paint.rawBridge>0,'actual bridge geometry must exist in source');
 assert.ok(results[1].paint.bridgeHits>0,'bridge line must remain rendered after vehicle polygon suppression');
 assert.equal(reviewRequests.length,0);assert.deepEqual(errors,[]);
 console.log('CAMPUS_AND_BUILDING_MOTION_REGRESSION_OK',JSON.stringify(results.map(r=>({site:r.site,pavement:r.paint.features.length,frames:r.motion.samples.length}))));
}finally{writeFileSync(out+'/results.json',JSON.stringify({results,errors,reviewRequests},null,2));await ctx.close();await browser.close();server.close();}
