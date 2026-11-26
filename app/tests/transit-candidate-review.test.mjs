import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTransitWalks,recommendReviewedTransit,transitReviewPairs} from '../src/transit-candidate-review.mjs';
const walk=(m,r,c)=>({kilometers:m/1000,seconds:m,transitPri:r===null?null:{risk:r,coverage:c}});
test('aggregate walking PRI weights observed distance, not vehicle travel',()=>{
 const s=summarizeTransitWalks([walk(100,20,1),walk(300,60,.8)]);
 assert.equal(s.walkM,400);assert.equal(s.coverage,.85);
 assert.ok(Math.abs(s.risk-48.2352941176)<.001);assert.equal(s.comparable,true);
});
test('one unobserved walking leg prevents comparative recommendation',()=>{
 const s=summarizeTransitWalks([walk(1000,20,1),walk(40,null,0)]);
 assert.equal(s.comparable,false);
 const a={plan:'a',summary:s},b={plan:'b',summary:summarizeTransitWalks([walk(1000,60,1)])};
 assert.equal(recommendReviewedTransit([a,b]),null);
});
test('recommendation requires comparable coverage, risk separation and bounded detour',()=>{
 const a={plan:'a',summary:summarizeTransitWalks([walk(100,20,.9)])};
 const b={plan:'b',summary:summarizeTransitWalks([walk(100,40,.9)])};
 assert.equal(recommendReviewedTransit([a,b]),'a');
 assert.equal(recommendReviewedTransit([a,{...b,summary:{...b.summary,coverage:.7}}]),null);
 assert.equal(recommendReviewedTransit([a,{...b,summary:{...b.summary,walkM:50}}]),null);
});
test('three transit legs produce four independent walking links',()=>{
 const legs=[{origin:'a',destination:'b'},{origin:'c',destination:'d'},{origin:'e',destination:'f'}];
 assert.deepEqual(transitReviewPairs({legs},'start','end'),[['start','a'],['b','c'],['d','e'],['f','end']]);
});
