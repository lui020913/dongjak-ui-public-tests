import {chromium} from '@playwright/test';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('app/dist'),out=resolve('audit-render-output');
mkdirSync(out,{recursive:true});
const assets=readdirSync(root+'/assets').filter(x=>x.endsWith('.js'));
const entry=assets.find(x=>readFileSync(root+'/assets/'+x,'utf8').includes('style:"https://tiles.openfreemap.org/styles/bright"'));
assert.ok(entry,'app map entry');
const src=readFileSync(root+'/assets/'+entry,'utf8');
const mark=src.match(/([\w$]+)=new [\w$]+\(\{container:"map",attributionControl:!1,style:"https:\/\/tiles\.openfreemap\.org\/styles\/bright"[\s\S]{0,1200}?\}\);/);
assert.ok(mark,'test-only map handle insertion point');
const instrumented=src.replace(mark[0],mark[0]+'globalThis.__qaMap='+mark[1]+';');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
 let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/')pathname='/index.html';
 const file=resolve(root,'.'+pathname);
 if(!file.startsWith(root+'/')){res.writeHead(403);return res.end();}
 try{
  if(!statSync(file).isFile())throw Error();
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
  res.end(pathname==='/assets/'+entry?instrumented:readFileSync(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const style={version:8,sources:{forest:{type:'geojson',data:url+'/qa-forest.geojson'},park:{type:'geojson',data:url+'/qa-park.geojson'}},layers:[{id:'background',type:'background',paint:{'background-color':'#e6e7df'}},{id:'park',type:'fill',source:'park',paint:{'fill-color':'#a5ca92'}},{id:'forest',type:'fill',source:'forest',paint:{'fill-color':'#92bd86'}}]};
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const results=[];
try{
 for(const enabled of [false,true]){
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
  await ctx.addInitScript(()=>sessionStorage.setItem('dj-install-menu-v1','1'));
  await ctx.route('**/*',r=>r.request().url().includes('tiles.openfreemap.org/styles/bright')?r.fulfill({json:style,headers:{'Access-Control-Allow-Origin':'*'}}):r.request().url().startsWith(url)?r.continue():r.abort());
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.goto(url+'/?greenBuildingPreview='+(enabled?'1':'0'),{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__qaMap?.isStyleLoaded(),{},{timeout:45000});
   await page.evaluate(()=>window.__qaMap.jumpTo({center:[126.9474508,37.4978813],zoom:17.5,pitch:0}));
   await page.waitForFunction(()=>window.__qaMap?.getSource('dongjak-buildings-data-6'),{},{timeout:60000});
   await page.waitForFunction(()=>window.__qaMap.isSourceLoaded('dongjak-buildings-data-6'),{},{timeout:30000});
   const read=()=>page.evaluate(async()=>{const m=window.__qaMap,s=m.getSource('dongjak-buildings-data-6'),data=typeof s.getData==='function'?await s.getData():s._data;return {count:data?.features?.length,plan:m.getLayoutProperty('dongjak-buildings-footprint-6','visibility'),extrusion:m.getLayoutProperty('dongjak-buildings-3d-6','visibility'),rendered:m.queryRenderedFeatures({layers:['dongjak-buildings-footprint-6','dongjak-buildings-3d-6']}).length};});
   // Source readiness does not guarantee that a rendered frame contains its features.
   // Wait for the actual visible layer instead of accepting an empty canvas.
   await page.waitForFunction(()=>{const m=window.__qaMap;return m.getLayoutProperty('dongjak-buildings-footprint-6','visibility')==='visible'&&m.queryRenderedFeatures({layers:['dongjak-buildings-footprint-6']}).length>0;},{},{timeout:30000});
   const two=await read();assert.ok(two.count>0);assert.equal(two.plan,'visible');assert.equal(two.extrusion,'none');assert.ok(two.rendered>0);
   await page.locator('#map canvas').first().screenshot({path:out+'/'+(enabled?'on':'off')+'-2d.png',timeout:15000});
   await page.evaluate(()=>window.__qaMap.jumpTo({pitch:45}));
   await page.waitForFunction(()=>window.__qaMap.getLayoutProperty('dongjak-buildings-3d-6','visibility')==='visible',{},{timeout:30000});
   await page.waitForTimeout(1200);
   const three=await read();assert.equal(three.count,two.count);assert.equal(three.plan,'none');assert.equal(three.extrusion,'visible');assert.ok(three.rendered>0);
   await page.locator('#map canvas').first().screenshot({path:out+'/'+(enabled?'on':'off')+'-3d.png',timeout:15000});
   results.push({enabled,two,three,errors});
  }catch(e){await page.screenshot({path:out+'/'+(enabled?'on':'off')+'-failure.png'}).catch(()=>{});results.push({enabled,error:String(e),errors});throw e;}finally{writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await ctx.close();}
 }
 assert.ok(results[1].two.count<results[0].two.count,'preview excludes audited footprints');
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();server.close();}
