import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDesign} from '../scripts/live-qa-release-gate.mjs';
const report=(extras={})=>({run:{code:0},scenes:[{title:'03 길찾기',status:'passed',frames:25,metrics:{samples:50},checkpoints:[{},{}],flags:[],designReview:{status:'reviewed'},vision:{findings:[]},...extras}]});
test('no design evidence or provider response cannot silently pass',()=>{assert.equal(evaluateDesign(report({checkpoints:[]}),3).status,'evidence-unavailable');assert.equal(evaluateDesign(report({designReview:{status:'unavailable'}}),3).status,'vision-unavailable');assert.equal(evaluateDesign(report(),2).status,'evidence-unavailable');});
test('known route clipping blocks promotion even if model is unavailable',()=>{assert.equal(evaluateDesign(report({designReview:{status:'unavailable'},flags:[{kind:'surface-horizontal-clipping',selector:'#route-map-card',px:171,count:39,t:10,end:16810}]}),3).status,'defect');});
test('subjective suggestions remain advisory; corroborable critical candidates hold promotion',()=>{assert.equal(evaluateDesign(report({vision:{findings:[{severity:'suggestion',summary:'style',evidence:['1','2']}]}}),3).status,'pass');assert.equal(evaluateDesign(report({vision:{findings:[{severity:'critical',summary:'clipped',evidence:['1','1']}]}}),3).status,'pass');assert.equal(evaluateDesign(report({vision:{findings:[{severity:'critical',summary:'clipped',evidence:['1','2']}]}}),3).status,'defect');});

test('genuine 429 quota exhaustion skips ONLY the AI review, with manual review flag',()=>{
 const quota=report({designReview:{status:'unavailable',reason:'Provider HTTP 429 (daily-quota)'},vision:undefined});
 const reviewed=evaluateDesign(quota,3);
 assert.equal(reviewed.status,'quota-skipped');assert.equal(reviewed.manualReviewRequired,true);
 assert.equal(reviewed.reason,'Provider HTTP 429 (daily-quota)');
 for(const name of ['minute-request-quota','minute-token-quota','quota-type-unknown'])
  assert.equal(evaluateDesign(report({designReview:{status:'unavailable',reason:'Provider HTTP 429 ('+name+')'}}),3).status,'quota-skipped');
});
test('quota skip never conceals missing capture, real clipping, or a real critical finding',()=>{
 const unavailable={status:'unavailable',reason:'Provider HTTP 429 (daily-quota)'};
 assert.equal(evaluateDesign(report({checkpoints:[],designReview:unavailable}),3).status,'evidence-unavailable');
 assert.equal(evaluateDesign(report({designReview:unavailable,flags:[{kind:'surface-horizontal-clipping',selector:'#route-map-card',px:9,count:4,t:10,end:300}]}),3).status,'defect');
 assert.equal(evaluateDesign(report({designReview:{status:'reviewed'},vision:{findings:[{severity:'critical',summary:'unusable',evidence:['E01','E02']}]}}),3).status,'defect');
 for(const reason of ['Provider HTTP 403','Provider HTTP 500','Provider HTTP 400 (schema rejected)','Model unavailable'])
  assert.equal(evaluateDesign(report({designReview:{status:'unavailable',reason}}),3).status,'vision-unavailable');
});
