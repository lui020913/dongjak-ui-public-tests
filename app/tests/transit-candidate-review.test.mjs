import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTransitWalks,recommendReviewedTransit,transitReviewPairs,reviewAllTransitCandidates,formatTransitReview} from '../src/transit-candidate-review.mjs';
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

test('tiny observed links do not expose a null risk as a comparable score',()=>{assert.equal(summarizeTransitWalks([walk(10,20,1)]).comparable,false);});

test('all fourteen candidates are reviewed once with bounded parallelism and incremental results',async()=>{
 const plans=Array.from({length:14},(_,i)=>i),seen=[];let active=0,peak=0;
 await reviewAllTransitCandidates(plans,{review:async p=>{active++;peak=Math.max(active,peak);await Promise.resolve();active--;if(p===3)throw Error('unavailable');return {walkM:p};},onResult:(p,s)=>seen.push([p,s])});
 assert.equal(seen.length,14);assert.equal(new Set(seen.map(x=>x[0])).size,14);assert.equal(peak,2);assert.equal(seen.find(x=>x[0]===3)[1],null);
});
test('cancellation prevents stale review results and further requests',async()=>{
 const c=new AbortController(),seen=[];let calls=0;
 await reviewAllTransitCandidates([1,2,3,4],{signal:c.signal,review:async()=>{calls++;c.abort();return {};},onResult:x=>seen.push(x)});
 assert.equal(calls,1);assert.deepEqual(seen,[]);
});
test('pending, unavailable and unobserved walking evidence stay distinct',()=>{
 assert.match(formatTransitReview(undefined,false),/조회 중/);
 assert.equal(formatTransitReview(null,true),'도보 연결 확인 불가');
 assert.match(formatTransitReview({walkM:366,walkMinutes:5,coverage:0,comparable:false},true),/보행안전 데이터 미확보/);
});

test('compact card review hides redundant zero coverage but never invents a safety score',()=>{
 assert.equal(formatTransitReview({walkM:1190,walkMinutes:15,coverage:0,comparable:false},true),'도보 1.19km · 보행안전 데이터 미확보');
 assert.match(formatTransitReview({walkM:200,walkMinutes:3,coverage:.8,comparable:true,risk:32},true),/PRI 32.0점 \(관측 80%\)/);
});

test('partial coverage is distinguished from no acquired walking safety data',()=>{assert.match(formatTransitReview({walkM:200,walkMinutes:3,coverage:.3,comparable:false},true),/보행안전 데이터 부족/);});
