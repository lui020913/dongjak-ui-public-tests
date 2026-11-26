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
const sites=[{key:'jangseungbaegi',center:[126.9387,37.5051],zoom:17.9},{key:'soongsil',center:[126.9571,37.4969],zoom:16.9},{key:'bamgol',center:[126.945759775,37.50198445],zoom:18.4}];
const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
const page=await ctx.newPage();const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
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
  await page.evaluate(({center,zoom})=>window.__qaMap.jumpTo({center,zoom,pitch:0}),site);
  await page.waitForFunction(()=>window.__qaMap.isStyleLoaded(),{},{timeout:90000});
  await page.waitForTimeout(1800);
  const detail=await page.evaluate(()=>{const m=window.__qaMap,layers=m.getStyle().layers.filter(l=>l.type==='fill'),rows=[];
   const ids=layers.map(l=>l.id);
   const features=m.queryRenderedFeatures({layers:ids});
   for(const layer of layers){
    const hits=features.filter(f=>f.layer.id===layer.id);if(!hits.length)continue;
    const paint=m.getPaintProperty(layer.id,'fill-color');
    rows.push({id:layer.id,sourceLayer:layer['source-layer'],paint,opacity:m.getPaintProperty(layer.id,'fill-opacity'),count:hits.length,examples:hits.slice(0,12).map(f=>({id:f.id,properties:f.properties,geometry:f.geometry}))});
   }
   return {overlay:!!m.getLayer('dj-reviewed-base-road-fill'),rows};
  });
  const stats=await page.evaluate(async()=>{const m=window.__qaMap;const methodNames=['querySourceFeatures','queryRenderedFeatures','setData','setFilter','setPaintProperty','setLayoutProperty'];const counts={},times={},restore=[];for(const k of methodNames){if(typeof m[k]!=='function')continue;const orig=m[k];m[k]=function(...args){const t=performance.now();try{return orig.apply(this,args);}finally{counts[k]=(counts[k]||0)+1;times[k]=(times[k]||0)+performance.now()-t;}};restore.push(()=>{m[k]=orig;});}const frames=[];let last=performance.now(),start=last;const tick=()=>{const n=performance.now();frames.push(n-last);last=n;};m.on('render',tick);for(const offset of [[50,10],[-80,30],[30,-40]]){m.panBy(offset,{duration:400});await new Promise(r=>setTimeout(r,800));}await new Promise(r=>setTimeout(r,1100));m.off('render',tick);restore.forEach(fn=>fn());return {counts,times,frames:frames.length,meanFrameMs:frames.length?frames.reduce((a,b)=>a+b,0)/frames.length:null,elapsed:performance.now()-start};});
  results.push({site:site.key,detail,stats});console.log('WHITE_SURFACE_DIAGNOSTIC',JSON.stringify({site:site.key,overlay:detail.overlay,layers:detail.rows.map(({id,sourceLayer,paint,opacity,count,examples})=>({id,sourceLayer,paint,opacity,count,classes:[...new Set(examples.map(f=>f.properties.class||f.properties.subclass||''))]})),stats}));
  await page.screenshot({path:out+'/'+site.key+'.png'});
 }
 console.log('WHITE_SURFACE_AUDIT_DONE',JSON.stringify({sites:results.length,errors}));
}finally{writeFileSync(out+'/results.json',JSON.stringify({results,errors},null,2));await ctx.close();await browser.close();server.close();}
