
import test from 'node:test';import assert from 'node:assert/strict';
import {phoneProfile,nextBudget,offscreenEvictionIds,coalesceViewportWork,installPhoneRenderBudget} from '../src/adaptive-phone-map-budget.mjs';
test('Note9 uses economy, recent iPhone unchanged',()=>{assert.equal(phoneProfile({phone:true,ua:'Android 10; SM-N960N'}),'economy');assert.equal(phoneProfile({phone:true,ua:'Android 15',memory:3}),'economy');assert.equal(phoneProfile({phone:true,ua:'iPhone OS 18',memory:4}),'normal');assert.equal(phoneProfile({phone:false,ua:'Android 10'}),'normal');});
test('slow frames lower budget and sustained fast frames recover',()=>{let s={level:'normal'};for(let i=0;i<7;i++)s=nextBudget(s,35);assert.equal(s.level,'normal');s=nextBudget(s,35);assert.equal(s.level,'economy');for(let i=0;i<119;i++)s=nextBudget(s,16);assert.equal(s.level,'economy');s=nextBudget(s,16);assert.equal(s.level,'normal');});
test('visible sheets protected',()=>{assert.deepEqual(offscreenEvictionIds(['a','b','c','d','e'],['b','e'],1),['a','c']);assert.deepEqual(offscreenEvictionIds(['a','b'],['a','b'],0),[]);});
test('viewport events coalesce',()=>{let cb,moving=true,calls=[];const w=coalesceViewportWork(f=>calls.push(f),{isMoving:()=>moving,setTimer:f=>(cb=f,1),clearTimer:()=>{cb=null;}});w.request();w.request(true);w.request();cb();assert.deepEqual(calls,[]);moving=false;cb();assert.deepEqual(calls,[true]);w.cancel();});
test('resolution changes only at gesture end',()=>{const handlers=new Map(),ratios=[];let t=0;const map={on:(k,v)=>handlers.set(k,v),off:k=>handlers.delete(k),setPixelRatio:r=>ratios.push(r),getPixelRatio:()=>1.5};const app={dataset:{},classList:{toggle(){},remove(){}}};const b=installPhoneRenderBudget({map,app,now:()=>t});handlers.get('movestart')();for(let i=0;i<12;i++){t+=40;handlers.get('render')();}assert.deepEqual(ratios,[]);handlers.get('moveend')();assert.deepEqual(ratios,[1]);assert.equal(b.stats().profile,'economy');b.destroy();assert.equal(handlers.size,0);});

test('primary style, elevation, night building occlusion and emergency status remain distinct',async()=>{
 const {readFileSync}=await import('node:fs');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/style: 'https:\/\/tiles\.openfreemap\.org\/styles\/bright'/);
 assert.match(main,/map\.setTerrain\(\{source:'dongjak-terrain-dem',exaggeration:1\.0\}\)/);
 assert.match(main,/djBasemapSource=mapStyleRecovered\?'emergency-osm':'openfreemap-bright'/);
 assert.match(main,/if\(mapStyleRecovered\)toast\(/);
 assert.match(main,/if\(!interactiveMoving\|\|movementIsSlow\|\|!baseBuildingsVisible\|\|app\.dataset\.sangdoNight==='on'/);
 assert.match(main,/if\(app\.dataset\.sangdoNight==='on'\)movementIsSlow=false/);
});
