import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {completedApartmentDisplayEdits} from '../src/completed-apartment-display-edits.mjs';
import {dismissOnboarding,clickRealPointer} from './e2e/helpers.js';
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
const pack=JSON.parse(readFileSync(resolve('app/public/data/building-display-road-trims.json'),'utf8'));
const geometryKey=g=>JSON.stringify(g?.coordinates);
const sites=[
 {key:'nodeul-sayuksin',center:[126.94865,37.5122],sheet:2},
 {key:'sangdo-elementary',center:[126.93615,37.50235],sheet:2},
 {key:'district-reference',center:[126.92402,37.50021],sheet:1}
];
try{
 for(const enabled of [false,true]){
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   if(!enabled)await page.route('**/data/building-display-road-trims.json',route=>route.fulfill({status:404,body:'QA baseline: trim asset unavailable'}));
   await page.goto(url+'/',{waitUntil:'domcontentloaded'});
   const menu=page.locator('#dj-install-menu');await menu.waitFor({state:'attached',timeout:30000});
   if(await menu.isVisible()){await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();await menu.waitFor({state:'hidden'});}
   const startup=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
   await page.waitForFunction(()=>{const o=document.querySelector('#map-startup-overlay'),n=document.querySelector('#map-startup-continue');return !o||!o.getClientRects().length||n?.getClientRects().length>0;},{},{timeout:90000});
   if(await startup.isVisible()&&await next.isVisible())await clickRealPointer(page,next,'startup continue');
   await startup.waitFor({state:'hidden',timeout:45000});
   await dismissOnboarding(page);
   await page.waitForFunction(()=>window.__qaMap?.getStyle()?.sources?.openmaptiles,{},{timeout:90000});
   if(enabled&&completedApartmentDisplayEdits.edits.length){
    const sitesByName=new Map();
    for(const e of completedApartmentDisplayEdits.edits)if(!sitesByName.has(e.site))sitesByName.set(e.site,e);
    for(const [name,edit] of sitesByName){
     const ring=edit.original.type==='Polygon'?edit.original.coordinates[0]:edit.original.coordinates[0][0];
     const center=[ring.reduce((n,p)=>n+p[0],0)/ring.length,ring.reduce((n,p)=>n+p[1],0)/ring.length];
     const source='dongjak-buildings-data-'+edit.sheet,plan='dongjak-buildings-footprint-'+edit.sheet,extrusion='dongjak-buildings-3d-'+edit.sheet;
     const originals=completedApartmentDisplayEdits.edits.filter(e=>e.sheet===edit.sheet).map(e=>e.original);
     await page.evaluate(center=>window.__qaMap.jumpTo({center,zoom:17.6,pitch:0}),center);
     await page.waitForFunction(({source,plan})=>{const m=window.__qaMap;return m.getSource(source)&&m.isSourceLoaded(source)&&m.getLayer(plan)&&m.getLayoutProperty(plan,'visibility')==='visible'&&m.queryRenderedFeatures({layers:[plan]}).length>0;},{source,plan},{timeout:90000});
     const inspect=()=>page.evaluate(async({source,originals,plan,extrusion})=>{const m=window.__qaMap,s=m.getSource(source),data=typeof s.getData==='function'?await s.getData():s._data;const keys=new Set(data?.features?.map(f=>JSON.stringify(f.geometry)));return {count:data?.features?.length,removedStillPresent:originals.filter(g=>keys.has(JSON.stringify(g))).length,plan:m.getLayoutProperty(plan,'visibility'),extrusion:m.getLayoutProperty(extrusion,'visibility')};},{source,originals,plan,extrusion});
     const two=await inspect();assert.ok(two.count>0);assert.equal(two.removedStillPresent,0,name+' removed GIS footprints in 2D');
     await page.evaluate(()=>window.__qaMap.jumpTo({pitch:45}));
     await page.waitForFunction(id=>window.__qaMap.getLayoutProperty(id,'visibility')==='visible',extrusion,{timeout:90000});
     const three=await inspect();assert.equal(three.removedStillPresent,0,name+' removed GIS footprints in 3D');assert.equal(three.count,two.count);
     console.log('COMPLETED_APARTMENT_ACTUAL_APP '+JSON.stringify({name,two,three}));
    }
    const planData=JSON.parse(readFileSync(resolve('app/public/data/redevelopment/confirmed-projects-202609.geojson'),'utf8'));
    const feature=planData.features.find(f=>f.properties.name==='디에이치 켄트로나인')||planData.features[0];
    const ring=feature.geometry.type==='Polygon'?feature.geometry.coordinates[0]:feature.geometry.coordinates[0][0];
    const center=[ring.reduce((n,p)=>n+p[0],0)/ring.length,ring.reduce((n,p)=>n+p[1],0)/ring.length];
    await page.evaluate(center=>window.__qaMap.jumpTo({center,zoom:17.6,pitch:0}),center);
    await page.waitForFunction(()=>{const m=window.__qaMap;return m.getSource('dj-confirmed-development-areas')&&m.isSourceLoaded('dj-confirmed-development-areas')&&m.queryRenderedFeatures({layers:['dj-confirmed-development-fill']}).length>0;},{},{timeout:90000});
    const ordering=await page.evaluate(()=>{const l=window.__qaMap.getStyle().layers;const fill=l.findIndex(x=>x.id==='dj-confirmed-development-fill');return {fill,road:l.findIndex((x,i)=>i>fill&&x['source-layer']==='transportation'),label:l.some(x=>x.id==='dj-confirmed-development-label')};});
    assert.ok(ordering.fill>=0&&ordering.road>ordering.fill&&ordering.label,'planned fill must remain below transport');
    console.log('CONFIRMED_PLAN_ACTUAL_APP '+JSON.stringify(ordering));
   }
   for(const site of sites){
    const layer='dongjak-buildings-footprint-'+site.sheet,extrusion='dongjak-buildings-3d-'+site.sheet,source='dongjak-buildings-data-'+site.sheet;
    await page.evaluate(({center})=>window.__qaMap.jumpTo({center,zoom:17.6,pitch:0}),site);
    await page.waitForFunction(({source,layer})=>{const m=window.__qaMap;return m.getSource(source)&&m.isSourceLoaded(source)&&m.getLayer(layer)&&m.queryRenderedFeatures({layers:[layer]}).length>0;},{source,layer},{timeout:90000});
    const edits=Object.entries(pack.sheets).filter(([k])=>k.startsWith(site.sheet+':')).flatMap(([,v])=>v.edits);
    const read=()=>page.evaluate(async({source,layer,extrusion,edits})=>{const m=window.__qaMap,s=m.getSource(source),data=typeof s.getData==='function'?await s.getData():s._data;const keys=new Set(data?.features?.map(f=>JSON.stringify(f.geometry?.coordinates)));return {trimmed:edits.filter(e=>keys.has(JSON.stringify(e.display.coordinates))).length,original:edits.filter(e=>keys.has(JSON.stringify(e.original.coordinates))).length,count:data?.features?.length,plan:m.getLayoutProperty(layer,'visibility'),extrusion:m.getLayoutProperty(extrusion,'visibility'),rendered:m.queryRenderedFeatures({layers:[layer,extrusion]}).length,center:m.getCenter().toArray(),zoom:m.getZoom(),nativeSource:document.querySelector('#app')?.dataset.djBasemapSource};},{source,layer,extrusion,edits});
    const two=await read();assert.ok(two.count>0);assert.equal(two.plan,'visible');assert.equal(two.extrusion,'none');assert.ok(two.rendered>0);assert.equal(two.nativeSource,'openfreemap-bright');
    await page.screenshot({path:out+'/'+site.key+'-'+(enabled?'on':'off')+'-2d.png',timeout:30000});
    await page.evaluate(()=>window.__qaMap.jumpTo({pitch:45}));
    await page.waitForFunction(({extrusion})=>{const m=window.__qaMap;return m.getLayoutProperty(extrusion,'visibility')==='visible'&&m.queryRenderedFeatures({layers:[extrusion]}).length>0;},{extrusion},{timeout:90000});
    const three=await read();assert.equal(three.count,two.count);assert.equal(three.trimmed,two.trimmed);assert.equal(three.original,two.original);assert.equal(three.plan,'none');assert.equal(three.extrusion,'visible');assert.ok(three.rendered>0);
    await page.screenshot({path:out+'/'+site.key+'-'+(enabled?'on':'off')+'-3d.png',timeout:30000});
    results.push({site:site.key,enabled,two,three,errors:[...errors]});
    writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
   }
  }catch(e){
    const diagnostic=await page.evaluate(()=>{const m=window.__qaMap;if(!m)return null;return {center:m.getCenter().toArray(),zoom:m.getZoom(),pitch:m.getPitch(),layers:m.getStyle()?.layers?.filter(l=>l.id.startsWith('dongjak-buildings')).map(l=>({id:l.id,visibility:l.layout?.visibility,source:l.source})),basemap:document.querySelector('#app')?.dataset.djBasemapSource};}).catch(()=>null);
    results.push({enabled,error:String(e),diagnostic,errors});
    await page.screenshot({path:out+'/'+(enabled?'on':'off')+'-failure.png'}).catch(()=>{});
    throw e;
  }finally{writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await ctx.close();}
 }
 for(const site of sites){
  const off=results.find(r=>r.site===site.key&&!r.enabled),on=results.find(r=>r.site===site.key&&r.enabled);
  assert.equal(on.two.count,off.two.count,'no buildings removed by trims in '+site.key);
  assert.equal(off.two.trimmed,0);assert.ok(on.two.trimmed>0,'verified display geometries applied in '+site.key);
  assert.ok(on.two.original<off.two.original,'original overlapping footprint replaced in '+site.key);
  assert.equal(on.two.trimmed,off.two.original-on.two.original,'exact substitution count in '+site.key);
 }
 console.log('BUILDING_ROAD_TRIM_ACTUAL_APP_RESULT',JSON.stringify(results));
}finally{await browser.close();server.close();}
