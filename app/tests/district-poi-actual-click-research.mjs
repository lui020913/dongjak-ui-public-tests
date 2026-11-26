import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
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
const registry=JSON.parse(readFileSync(resolve('app/public/data/transport/seoul-bus-stops.json'),'utf8'));
const boundary=JSON.parse(readFileSync(resolve('app/public/data/dongjak_sig_reference.geojson'),'utf8')).features[0].geometry;
const polygons=boundary.type==='Polygon'?[boundary.coordinates]:boundary.coordinates;
function ring(p,r){let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
const district=registry.stops.filter(p=>polygons.some(r=>ring([p.lng,p.lat],r[0])&&!r.slice(1).some(h=>ring([p.lng,p.lat],h))));
assert.equal(district.length,451);
const referenceExpected=district.map(p=>p.arsId).sort();
const targetNames=['밤골.상도역롯데캐슬파크엘','흑석자이.유앤미아파트','이수힐스테이트.이수푸르지오','자이아파트상가앞','신대방경남아파트'];
const sites=targetNames.map(name=>{const stop=district.find(s=>s.name===name);assert.ok(stop,name);return stop;});
const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
const page=await ctx.newPage();const errors=[];
page.on('pageerror',e=>{const detail=e.stack||String(e);errors.push(detail);console.log('POI_CLICK_PAGE_ERROR',detail);});
await page.addInitScript(()=>{const original=Node.prototype.insertBefore;Node.prototype.insertBefore=function(node,reference){try{return original.call(this,node,reference);}catch(error){console.error('POI_INSERT_BEFORE_DIAGNOSTIC',JSON.stringify({parent:this.id||this.className||this.nodeName,node:node?.id||node?.className||node?.nodeName,reference:reference?.id||reference?.className||reference?.nodeName,actualParent:reference?.parentNode?.id||reference?.parentNode?.className||reference?.parentNode?.nodeName,stack:new Error().stack}));throw error;}};});
page.on('console',m=>{if(m.text().startsWith('POI_INSERT_BEFORE_DIAGNOSTIC'))console.log(m.text());});
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


 await page.waitForFunction(async()=>{const s=window.__qaMap?.getSource('transport-bus');if(!s)return false;const d=typeof s.getData==='function'?await s.getData():s._data;return d?.features?.length>=400;},{},{timeout:90000});
 await page.waitForTimeout(1500);
 const liveBoundary=await page.evaluate(async()=>{const s=window.__qaMap.getSource('district-outline');const d=typeof s.getData==='function'?await s.getData():s._data;return d.features[0].geometry;});
 const activePolygons=liveBoundary.type==='Polygon'?[liveBoundary.coordinates]:liveBoundary.coordinates;
 const expected=registry.stops.filter(p=>activePolygons.some(r=>ring([p.lng,p.lat],r[0])&&!r.slice(1).some(h=>ring([p.lng,p.lat],h)))).map(p=>p.arsId).sort();
 assert.ok(expected.length>=400);
 console.log('ACTIVE_BOUNDARY_ARS_COMPARISON',JSON.stringify({reference:referenceExpected.length,active:expected.length,excluded:referenceExpected.filter(id=>!expected.includes(id)),added:expected.filter(id=>!referenceExpected.includes(id))}));
 const registryState=()=>page.evaluate(async()=>{const m=window.__qaMap,s=m.getSource('transport-bus'),d=typeof s.getData==='function'?await s.getData():s._data;return {ids:d.features.map(f=>String(f.properties.arsId||'')).sort(),fallback:m.getFilter('dj-basemap-bus-pictogram'),apartment:m.getFilter('dj-apartment-label-poi')};});
 const initial=await registryState();assert.deepEqual(initial.ids,expected,'all distinct official ARS points are retained, without unregistered copies');
 for(const site of sites){
   await page.evaluate(({lng,lat})=>window.__qaMap.jumpTo({center:[lng,lat],zoom:18.8,pitch:0}),site);
   await page.waitForFunction(({arsId,lng,lat})=>{const m=window.__qaMap,p=m.project([lng,lat]),layer='dj-transport-bus-pictogram';return m.getLayer(layer)&&m.queryRenderedFeatures(p,{layers:[layer]}).some(f=>String(f.properties.arsId)===arsId);},site,{timeout:60000});
   await page.waitForTimeout(1100);
   const hit=await page.evaluate(({lng,lat,arsId})=>{const m=window.__qaMap,p=m.project([lng,lat]),layers=['dj-transport-bus-pictogram','dj-basemap-bus-pictogram','dj-apartment-label-poi'].filter(id=>m.getLayer(id));return {x:p.x,y:p.y,features:m.queryRenderedFeatures(p,{layers}).map(f=>({layer:f.layer.id,name:f.properties.name,arsId:f.properties.arsId,class:f.properties.class,subclass:f.properties.subclass})),fallbackCount:m.getLayer('dj-basemap-bus-pictogram')?m.queryRenderedFeatures({layers:['dj-basemap-bus-pictogram']}).length:0};},site);
   assert.ok(hit.features.some(f=>f.layer==='dj-transport-bus-pictogram'&&f.arsId===site.arsId));
   assert.equal(hit.fallbackCount,0);
   assert.ok(!hit.features.some(f=>f.layer==='dj-apartment-label-poi'&&(f.class==='bus'||f.subclass==='bus_stop')));
   await page.touchscreen.tap(hit.x,hit.y);
   await page.locator('#transport-sheet[data-kind="bus"]').waitFor({state:'visible',timeout:15000});
   await page.waitForTimeout(700);
   const title=await page.locator('#transport-title').innerText();
   assert.ok(title.includes(site.name)||title.replace(/[.·\s]/g,'')===site.name.replace(/[.·\s]/g,''),'actual selected bus title: '+title);
   assert.equal(await page.locator('.dj-place-detail:visible').count(),0,'no apartment/facility popup may steal the bus hit');
   await page.screenshot({path:out+'/bus-'+site.arsId+'.png'});
   results.push({arsId:site.arsId,name:site.name,title,hit,transportSheet:true,facilityPopup:false});
   await page.locator('#transport-close').click();await page.locator('#transport-sheet').waitFor({state:'hidden',timeout:15000});
 }
 assert.deepEqual((await registryState()).ids,expected);
 console.log('POI_CLICK_ASSERTIONS_PASSED',JSON.stringify({officialStops:expected.length,results:results.map(r=>({arsId:r.arsId,title:r.title}))}));
 assert.deepEqual(errors,[]);
 console.log('DISTRICT_POI_ACTUAL_CLICK_OK',JSON.stringify({officialStops:expected.length,referenceStops:referenceExpected.length,results}));
}finally{writeFileSync(out+'/results.json',JSON.stringify({results,errors},null,2));await ctx.close();await browser.close();server.close();}
