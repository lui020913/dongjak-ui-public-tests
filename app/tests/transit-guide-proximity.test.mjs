import test from 'node:test';
import assert from 'node:assert/strict';
import {transitProximity} from '../src/transit-guide-proximity.mjs';
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
