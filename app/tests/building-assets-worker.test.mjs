import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuildingTileLoader} from '../src/building-assets.js';

test('worker results preserve feature identity used for geometry review',async()=>{
  let creations=0,localCalls=0;
  const feature={geometry:{type:'Polygon',coordinates:[]}};
  const result={features:[feature],reviewCandidates:[feature],displayGeometries:new Map([[feature,{type:'Polygon'}]])};
  const worker={postMessage({id}){queueMicrotask(()=>this.onmessage({data:structuredClone({id,result})}));},terminate(){}};
  const load=createBuildingTileLoader({makeWorker:()=>{creations++;return worker;},local:async()=>{localCalls++;}});
  const [a,b]=await Promise.all([load({file:'/a'}),load({file:'/b'})]);
  for(const data of [a,b]){assert.equal(data.features[0],data.reviewCandidates[0]);assert.ok(data.displayGeometries.has(data.features[0]));}
  assert.equal(creations,1);assert.equal(localCalls,0);
});
test('worker infrastructure failure falls back once and keeps custom loaders local',async()=>{
  let creations=0,terminated=0,localCalls=0;
  const worker={postMessage(){queueMicrotask(()=>this.onerror());},terminate(){terminated++;}};
  const load=createBuildingTileLoader({makeWorker:()=>{creations++;return worker;},local:async()=>++localCalls});
  assert.equal(await load({file:'/a'}),1);
  assert.equal(await load({file:'/b'}),2);
  assert.equal(creations,1);assert.equal(terminated,1);
  assert.equal(await load({file:'/c'},async()=>{}),3);
});
test('real worker data errors do not retry the same request on the UI thread',async()=>{
  let localCalls=0;
  const worker={postMessage({id}){queueMicrotask(()=>this.onmessage({data:{id,error:'HTTP failure'}}));},terminate(){}};
  const load=createBuildingTileLoader({makeWorker:()=>worker,local:async()=>{localCalls++;}});
  await assert.rejects(load({file:'/a'}),/HTTP failure/);assert.equal(localCalls,0);
});
