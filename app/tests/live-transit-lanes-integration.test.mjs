import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDongjakMetroLines} from '../src/features/liveTransit/integrate.js';
import {metroToFeatures} from '../src/features/liveTransit/normalize.js';
import {trainFacing,trainRotation} from '../src/features/liveTransit/index.js';
import {trainLaneOffset} from '../src/features/liveTransit/train-lanes.js';
const now=Date.parse('2026-11-20T14:00:00Z');
const row=(over={})=>({id:'test',line:'2호선',trainNo:'123',station:'신림',status:'2',observedAt:new Date(now-30000).toISOString(),...over});
test('2호선 inner next stop is 신대방, outer is 봉천',()=>{
  const lines=buildDongjakMetroLines();
  const [inner]=metroToFeatures([row({direction:'0',destination:'봉천'})],lines,now);
  const [outer]=metroToFeatures([row({direction:'1',destination:'신대방'})],lines,now);
  assert.equal(inner.properties.nextStation,'신대방');
  assert.equal(outer.properties.nextStation,'봉천');
  assert.equal(inner.properties.travelDirection,'up');assert.equal(outer.properties.travelDirection,'down');
  assert(inner.properties.headingKnown&&outer.properties.headingKnown);
  const [unknown]=metroToFeatures([row({direction:'',destination:'봉천'})],lines,now);
  assert.equal(unknown.properties.headingKnown,false);
});
test('opposite train directions have distinct lanes without changing geometry',()=>{
  for(const line of ['1호선','7호선']){
    const a=[126.94,37.5],b=[126.95,37.5];
    const cfg={[line]:{stations:[{name:'A',lngLat:a},{name:'B',lngLat:b}],geometry:{coordinates:[a,b]},segmentTimeSeconds:60}};
    const [up,down]=metroToFeatures([row({line,station:'A',direction:'0',id:'up'}),row({line,station:'B',direction:'1',id:'down'})],cfg,now);
    assert(Math.abs(up.geometry.coordinates[0]-down.geometry.coordinates[0])<1e-8);
    assert.equal(up.geometry.coordinates[1],down.geometry.coordinates[1]);
    for(const f of [up,down])assert.equal(trainRotation({},f.properties,trainFacing({},f.properties)),0);
    const u=trainLaneOffset(line,trainFacing({},up.properties),up.properties.headingKnown);
    const d=trainLaneOffset(line,trainFacing({},down.properties),down.properties.headingKnown);
    assert.equal(u,line==='1호선'?-8:8);assert.equal(d,-u);
  }
});
