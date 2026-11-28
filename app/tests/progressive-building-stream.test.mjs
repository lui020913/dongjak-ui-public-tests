import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {prepareBuildingChunks,nextBuildingStage,waitForBuildingSource,coalesceBuildingOwnership,createBuildingWarmCache} from '../src/progressive-building-stream.mjs';
test('large building sheet preparation yields and retains feature order and identity',async()=>{const rows=Array.from({length:18446},(_,id)=>({id}));let yields=0;const out=await prepareBuildingChunks(rows,f=>f.id%2===0?f:null,{yieldFrame:async()=>{yields++}});assert.equal(out.length,9223);assert.equal(out[0],rows[0]);assert.equal(out.at(-1),rows[18444]);assert.ok(yields>=48);});
test('camera change aborts preparation without publishing partial ownership',async()=>{let active=true;const out=await prepareBuildingChunks([1,2,3,4],x=>x,{batch:2,canContinue:()=>active,yieldFrame:async()=>{active=false}});assert.equal(out,null);});
test('closest eligible sheet only, completed and retry-blocked sheets are skipped',()=>{const rows=[1,2,3,4].map(sheet=>({sheet}));assert.equal(nextBuildingStage(rows,{isComplete:id=>id===1,isLoading:id=>id===2,retryAt:id=>id===3?200:0,now:100}).sheet,4);assert.equal(nextBuildingStage(rows,{isComplete:()=>true}),null);});
test('waits for source readiness before next stage',async()=>{let cb,removed=false;const map={getSource:()=>({}),isSourceLoaded:()=>false,on:(n,f)=>cb=f,off:()=>{removed=true}};const p=waitForBuildingSource(map,'a');cb({sourceId:'b',isSourceLoaded:true});assert.equal(removed,false);cb({sourceId:'a',isSourceLoaded:true});await p;assert.equal(removed,true);});
test('main schedules a single detailed sheet per pass and preserves complete ownership guard',()=>{const s=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');assert.match(s,/const sheet=next\(\);/);assert.match(s,/await waitForBuildingSource/);assert.match(s,/info.complete&&info.count>0/);assert.match(s,/prepareBuildingChunks\(features/);});

test('source event bursts reconcile once; idle invalidates queued callbacks without delaying ownership',()=>{
 const queued=[];let calls=0;
 const work=coalesceBuildingOwnership(()=>calls++,{enqueue:fn=>queued.push(fn)});
 for(let i=0;i<100;i++)work.request();
 assert.equal(queued.length,1);queued.shift()();assert.equal(calls,1);
 work.request();work.flush();assert.equal(calls,2);work.request();
 queued.shift()();assert.equal(calls,2);queued.shift()();assert.equal(calls,3);
});
test('warm cache preserves recent parsed tiles and rejects stale failure eviction',async()=>{
 const jobs=[];const cache=createBuildingWarmCache(sheet=>new Promise((resolve,reject)=>jobs.push({id:sheet.sheet,resolve,reject})),{limit:2});
 const a=cache.load({sheet:'a'});const b=cache.load({sheet:'b'});await Promise.resolve();
 assert.equal(cache.load({sheet:'a'}),a);
 const c=cache.load({sheet:'c'});await Promise.resolve();
 assert.equal(cache.has('b'),false);assert.equal(cache.has('a'),true);
 const newerB=cache.load({sheet:'b'});await Promise.resolve();
 jobs[1].resolve({successfulSources:0,totalSources:1});await b;
 assert.equal(cache.has('b'),true);assert.equal(cache.load({sheet:'b'}),newerB);
 for(const i of [0,2,3])jobs[i].resolve({successfulSources:1,totalSources:1});
 await Promise.all([a,c,newerB]);
});
