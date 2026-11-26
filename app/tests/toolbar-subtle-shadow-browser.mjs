import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('../index.html');
const policy=html.match(/\/\* DJ_INTERACTION_FOCUS_START \*\/([\s\S]*?)\/\* DJ_INTERACTION_FOCUS_END \*\//)?.[1];
assert.ok(policy);
const css=['style.css','mobile-toolbar-v794.css'].map(p=>read('../src/'+p)).join('\n')+'\n'+read('../../frontend/production/mobile-next.css');
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${policy}\n${css}</style></head><body><div id="app" data-tab="map"><nav id="djNext-toolbar"><div id="djNext-rail"><div id="djNext-scroll"><button class="djNext-tool">주변정보</button><button class="djNext-tool">위험제보</button><button class="djNext-tool">추가</button></div><button id="djNext-layers" class="djNext-tool">레이어</button></div></nav></div></body></html>`);
  for(const theme of ['light','dark']){
   await page.evaluate(t=>document.getElementById('app').dataset.theme=t,theme);
   const vals=await page.evaluate(()=>({containers:['djNext-toolbar','djNext-rail','djNext-scroll'].map(id=>{const s=getComputedStyle(document.getElementById(id));return [s.boxShadow,s.filter]}),buttons:[...document.querySelectorAll('.djNext-tool')].map(n=>{const s=getComputedStyle(n);return [s.boxShadow,s.filter]})}));
   assert.ok(vals.containers.every(v=>v[0]==='none'&&v[1]==='none'),JSON.stringify(vals));
   for(const [shadow,filter] of vals.buttons){assert.equal(filter,'none');assert.match(shadow,/0px 1px 3px/);assert.match(shadow,theme==='dark'?/0\.12\)/:/0\.055\)/);}
   console.log(engine.name(),theme,'subtle toolbar elevation verified');
  }
 }finally{await browser.close()}
}
