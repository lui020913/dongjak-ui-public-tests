import test from 'node:test';
import assert from 'node:assert/strict';
import {indexPriSegments,assessPriRoute,recommendPriVariant} from '../src/pri-route-exposure.mjs';
const segment=(id,score,coords,modeled=false)=>({id,
 geometry:{type:'LineString',coordinates:coords},lengthM:18,
 scores:{lighting:100-score,accidents:100-score},evidence:modeled?{lighting:{modeled:true},accidents:{modeled:true}}:{}});
const a=[126.95,37.5],b=[126.9502,37.5],c=[126.9504,37.5];
test('risk increases with dangerous observed PRI scores; 0 means low risk',()=>{
 const index=indexPriSegments({segments:[segment('road',80,[a,b])]});
 const evidence=assessPriRoute([a,b],index);
 assert.ok(evidence.coverage>=.9,JSON.stringify(evidence));
 assert.equal(evidence.meanRisk,80);
 assert.equal(evidence.meanObservedFactors,2);
 assert.equal(evidence.ofFactors,6);
});
test('missing and modeled scores never become a fake zero-risk segment',()=>{
 const index=indexPriSegments({segments:[segment('unknown',0,[a,b],true)]});
 const evidence=assessPriRoute([a,b],index);
 assert.equal(evidence.meanRisk,null);assert.equal(evidence.coverage,0);
});
test('no proximity match means unavailable, not safe',()=>{
 const index=indexPriSegments({segments:[segment('distant',10,[a,b])]});
 const evidence=assessPriRoute([[126.96,37.5],[126.9602,37.5]],index);
 assert.equal(evidence.meanRisk,null);assert.equal(evidence.coverage,0);
});
test('recommendation requires comparable coverage, lower risk and acceptable detour',()=>{
 const shape1=[a,b],shape2=[a,c];
 const one={coords:shape1,kilometers:0.2,priEvidence:{meanRisk:65,coverage:.9,meanObservedFactors:3}};
 const two={coords:shape2,kilometers:0.21,priEvidence:{meanRisk:30,coverage:.92,meanObservedFactors:3}};
 assert.equal(recommendPriVariant(one,two).preferred,'gentle');
 assert.equal(recommendPriVariant({...one,priEvidence:{...one.priEvidence,coverage:.2}},two).preferred,null);
 assert.equal(recommendPriVariant(one,{...two,kilometers:.3}).preferred,null);
 assert.equal(recommendPriVariant(one,{...two,priEvidence:{...two.priEvidence,meanRisk:63}}).preferred,null);
});
