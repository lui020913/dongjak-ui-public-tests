import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseTransitWalk} from '../src/transit-walk-priority.mjs';
const pair={standard:{coords:[[0,0],[1,1]],kilometers:.2},gentle:{coords:[[0,0],[2,2]],kilometers:.23}};
const assessment={reason:'observed-comparison',recommendation:'gentle',standard:{risk:60,coverage:.9},gentle:{risk:42,coverage:.9}};
test('only observed PRI comparison can select the lower-risk walking alternative',()=>{
 assert.equal(chooseTransitWalk(pair,assessment).transitWalkMode,'gentle');
 assert.equal(chooseTransitWalk(pair,assessment).transitPriChoice,'observed-comparison');
 assert.equal(chooseTransitWalk(pair,{...assessment,reason:'insufficient'}).transitWalkMode,'standard');
 assert.equal(chooseTransitWalk(pair,assessment,{preferPri:false}).transitWalkMode,'standard');
});
test('district validation is not bypassed by PRI recommendation',()=>{
 assert.equal(chooseTransitWalk(pair,assessment,{valid:r=>r===pair.standard}).transitWalkMode,'standard');
 assert.equal(chooseTransitWalk(pair,assessment,{valid:()=>false}),null);
});
