import test from 'node:test';
import assert from 'node:assert/strict';
import {transitProximity,advanceTransitGps} from '../src/transit-guide-proximity.mjs';
const target={lat:37.5,lng:126.95};
const pos=(lat,accuracy)=>({coords:{latitude:lat,longitude:126.95,accuracy}});
test('two sufficiently accurate readings are required before nearby advisory',()=>{
 const a=transitProximity(pos(37.5,15),target);
 assert.equal(a.state,'tracking');assert.equal(a.count,1);
 const b=transitProximity(pos(37.5,15),target,a.count);assert.equal(b.state,'near');
 assert.equal(transitProximity(pos(37.502,15),target,b.count).state,'tracking');
});
test('poor accuracy or missing target never gives nearby advisory',()=>{
 assert.equal(transitProximity(pos(37.5,50),target,2).state,'uncertain');
 assert.equal(transitProximity(pos(37.5,10),null,2).count,0);
});

test('GPS progression requires fresh distinct accurate fixes and completes once at destination',()=>{
 const targets=[target,target,target,target],now=100000;
 const tick=(step,count,lastTimestamp,timestamp,accuracy=10)=>advanceTransitGps({position:{...pos(37.5,accuracy),timestamp},targets,step,rows:4,count,lastTimestamp,now});
 assert.equal(tick(0,0,null,now-100).step,0);
 assert.equal(tick(0,1,now-100,now-100).ignored,true);
 assert.equal(tick(0,1,now-100,now).step,1);
 assert.equal(tick(1,1,now-100,now,60).step,1);
 assert.equal(tick(2,1,now-100,now).arrived,true);
 assert.equal(tick(2,1,now-100,now).step,3);
 assert.equal(tick(0,1,null,now-16000).ignored,true);
});
