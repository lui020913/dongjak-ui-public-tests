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
const stops=registry.stops.filter(s=>s.name.includes('밤골')&&s.name.includes('상도역롯데캐슬파크엘'));
assert.ok(stops.length>0,'exact reported bus stop must exist');
const center=[stops.reduce((s,p)=>s+p.lng,0)/stops.length,stops.reduce((s,p)=>s+p.lat,0)/stops.length];
const sites=[{key:'bamgol-lotte-castle',center},{key:'sangdo-elementary',center:[126.93615,37.50235]},{key:'nodeul-sayuksin',center:[126.94865,37.5122]}];
// Pick actual in-district stop locations across all intersecting building sheets.
const boundary=JSON.parse(readFileSync(resolve('app/public/data/dongjak_sig_reference.geojson'),'utf8')).features[0].geometry;
const polys=boundary.type==='Polygon'?[boundary.coordinates]:boundary.coordinates;
function ring(p,r){let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
const inside=p=>polys.some(r=>ring(p,r[0])&&!r.slice(1).some(h=>ring(p,h)));
const district=registry.stops.filter(s=>inside([s.lng,s.lat]));
assert.ok(district.length>100);
const sheets=JSON.parse(readFileSync(resolve('app/public/buildings/manifest.json'),'utf8')).sheets;
const sampled=[];
for(const sh of sheets){
 const [w,s,e,n]=sh.bbox,mid=[(w+e)/2,(s+n)/2];
 const eligible=district.filter(p=>p.lng>=w&&p.lng<=e&&p.lat>=s&&p.lat<=n);
 if(!eligible.length)continue;
 eligible.sort((a,b)=>Math.hypot(a.lng-mid[0],a.lat-mid[1])-Math.hypot(b.lng-mid[0],b.lat-mid[1]));
 const stop=eligible[0];
 for(const zoom of [16.4,18.8])sites.push({key:'sheet-'+sh.sheet+'-z'+zoom,center:[stop.lng,stop.lat],zoom});
 sampled.push({sheet:sh.sheet,stop:stop.name,eligible:eligible.length});
}
assert.ok(sampled.length>=4);
console.log('DISTRICT_IDLE_SAMPLING',JSON.stringify(sampled));
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

 for(const site of sites){
  await page.evaluate(({center,zoom})=>window.__qaMap.jumpTo({center,zoom:zoom||18.4,pitch:0}),site);
  await page.waitForFunction(()=>{const m=window.__qaMap;return m.isStyleLoaded()&&m.getStyle().layers.some(l=>l['source-layer']==='transportation'&&l.type==='line');},{},{timeout:90000});
  const read=()=>page.evaluate(()=>{const m=window.__qaMap,s=m.getStyle();return {overlay:!!m.getLayer('dj-reviewed-base-road-fill'),source:!!m.getSource('dj-reviewed-base-road-surfaces'),flag:document.querySelector('#app')?.dataset.djReviewedBaseRoads||null,nativeRoads:s.layers.filter(l=>l.type==='line'&&l['source-layer']==='transportation').map(l=>({id:l.id,filter:m.getFilter(l.id),visibility:m.getLayoutProperty(l.id,'visibility')})),center:m.getCenter().toArray(),zoom:m.getZoom()};});
  await page.evaluate(()=>{const m=window.__qaMap;const p=m.project(m.getCenter());m.panBy([18,0],{duration:250});});
  await page.waitForFunction(()=>!window.__qaMap.isMoving(),{},{timeout:10000});
  const frames=[];
  for(const delay of [0,500,1000,1500,2500]){
   if(delay)await page.waitForTimeout(delay);
   const f=await read();assert.equal(f.overlay,false);assert.equal(f.source,false);assert.equal(f.flag,null);assert.ok(f.nativeRoads.length>0);
   if(frames.length)assert.deepEqual(f.nativeRoads,frames[0].nativeRoads,'native road visibility/filter changed during idle');
   frames.push(f);
   if(delay===0||delay===2500)await page.screenshot({path:out+'/'+site.key+'-idle-'+delay+'.png'});
  }
  results.push({site:site.key,center:site.center,samples:frames.length,nativeRoads:frames[0].nativeRoads.length,overlayNeverVisible:true});
 }
 assert.equal(reviewRequests.length,0,'production must not request opaque road overlay assets');assert.deepEqual(errors,[]);
 console.log('DISTRICT_IDLE_ROAD_VISUAL_REGRESSION_OK',JSON.stringify(results));
}finally{writeFileSync(out+'/results.json',JSON.stringify({results,errors,reviewRequests},null,2));await ctx.close();await browser.close();server.close();}
