import test from 'node:test';
import assert from 'node:assert/strict';
import {crosswalkRisk100,sharedRoadRisk100,sharedRoadBinaryRisk100,scaleTenPointRisk,priRiskBand} from '../src/pri-new-factor-rules.mjs';

test('crosswalk: each of four submitted categories is 5/15/25 and missing stays null',()=>{
  const all={discontinuity:'high',terrain:'high',vulnerable:'high',nightAccident:'high'};
  assert.equal(crosswalkRisk100(all),100);
  assert.equal(crosswalkRisk100({...all,discontinuity:'safe',terrain:'safe',vulnerable:'safe',nightAccident:'safe'}),20);
  assert.equal(crosswalkRisk100({...all,terrain:'caution'}),90);
  assert.equal(crosswalkRisk100({...all,nightAccident:null}),null);
  assert.equal(priRiskBand(70),'high');
  assert.equal(priRiskBand(69),'caution');
  assert.equal(priRiskBand(39),'low');
  assert.equal(priRiskBand(null),'unassessed');
});

test('bocha: detailed 4+3+2+1 converts 10 to 100, unknown never receives zero',()=>{
  const all={separation:4,refuge:3,sight:2,speedCalming:1};
  assert.equal(sharedRoadRisk100(all),100);
  assert.equal(sharedRoadRisk100({separation:0,refuge:0,sight:0,speedCalming:0}),0);
  assert.equal(sharedRoadRisk100({...all,separation:0}),60);
  assert.equal(sharedRoadRisk100({...all,refuge:null}),null);
  assert.equal(sharedRoadRisk100({...all,refuge:2}),null,'source defines only extremes; no invented 2-point rubric');
  assert.equal(scaleTenPointRisk(7),70);
  assert.equal(scaleTenPointRisk(10.1),null);
  assert.equal(sharedRoadBinaryRisk100('verified-mixed'),100);
  assert.equal(sharedRoadBinaryRisk100('verified-separated'),0);
  assert.equal(sharedRoadBinaryRisk100('unverified'),null);
});
