import test from 'node:test';
import assert from 'node:assert/strict';
import {
 currentVulnerabilityScore,currentVulnerabilityCoverage,
 currentFourFactorScore,currentFourFactorCoverage,
 currentSixFactorScore,currentSixFactorCoverage,
 observedFactorScore,CURRENT_VULNERABILITY_FACTORS,CURRENT_FOUR_FACTORS,CURRENT_SIX_FACTORS
} from '../src/pri-data.mjs';

const val=(scores={},evidence={})=>({scores,evidence});
const matrix=[
 {name:'all six observations',s:val({lighting:100,accidents:80,protectionGap:60,speed:40,crossing:20,sharedRoad:0}),cover:[3,4,6],mean:[80,70,50]},
 {name:'zero is observed (not missing)',s:val({lighting:0,accidents:0,protectionGap:0,speed:0,crossing:0,sharedRoad:0}),cover:[3,4,6],mean:[0,0,0]},
 {name:'one observation does not create a composite',s:val({lighting:77}),cover:[1,1,1],mean:[null,null,null]},
 {name:'two observations create a preliminary mean',s:val({lighting:100,accidents:0}),cover:[2,2,2],mean:[50,50,50]},
 {name:'modeled accident defaults are excluded',s:val({lighting:40,accidents:100,protectionGap:60,speed:80,crossing:20,sharedRoad:0},{accidents:{modeled:true}}),cover:[2,3,5],mean:[50,60,40]},
 {name:'undefined/non-finite evidence stays missing',s:val({lighting:20,accidents:NaN,protectionGap:40,speed:Infinity,crossing:undefined,sharedRoad:null}),cover:[2,2,2],mean:[30,30,30]},
 {name:'six-factor mean never divides by six when only two are observed',s:val({lighting:100,accidents:100,crossing:null,sharedRoad:null}),cover:[2,2,2],mean:[100,100,100]}
];
const scorers=[currentVulnerabilityScore,currentFourFactorScore,currentSixFactorScore];
const counters=[currentVulnerabilityCoverage,currentFourFactorCoverage,currentSixFactorCoverage];
test('3/4/6 legacy wrappers keep exact, modeled-safe, observed-only numeric semantics',()=>{
 assert.deepEqual(CURRENT_VULNERABILITY_FACTORS,['lighting','accidents','protectionGap']);
 assert.deepEqual(CURRENT_FOUR_FACTORS,['lighting','accidents','protectionGap','speed']);
 assert.deepEqual(CURRENT_SIX_FACTORS,['lighting','accidents','protectionGap','speed','crossing','sharedRoad']);
 for(const c of matrix)for(let i=0;i<3;i++){
  assert.equal(counters[i](c.s),c.cover[i],c.name+' coverage '+i);
  assert.equal(scorers[i](c.s),c.mean[i],c.name+' mean '+i);
 }
});
test('observedFactorScore has one authoritative NULL/modelled interpretation',()=>{
 assert.equal(observedFactorScore(val({lighting:0}),'lighting'),0);
 assert.equal(observedFactorScore(val({lighting:75},{lighting:{modeled:true}}),'lighting'),null);
 assert.equal(observedFactorScore(val({lighting:NaN}),'lighting'),null);
 assert.equal(observedFactorScore(val({lighting:Infinity}),'lighting'),null);
 assert.equal(observedFactorScore(val({}),'lighting'),null);
});
