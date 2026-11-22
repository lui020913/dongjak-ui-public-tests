import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evidenceSchema,validateReview,reviewWithRetry,classifyBadRequest,classifyQuotaError,visionRetryDelayMs} from '../scripts/live-qa-vision-retry.mjs';
const ids=['E01','E02'];
const good={findings:[{severity:'critical',summary:'화면 잘림',evidence:ids}]};
const ok=value=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]})});
const noWait=async()=>{};
test('provider grammar is constant; local check restricts evidence to exactly captured IDs',()=>{const schema=evidenceSchema(ids);assert.deepEqual(schema,evidenceSchema(Array.from({length:12},(_,i)=>'E'+String(i+1).padStart(2,'0'))));assert.deepEqual(schema.properties.findings.items.properties.evidence,{type:'ARRAY',items:{type:'STRING'}});assert.equal(schema.properties.findings.maxItems,undefined);assert.throws(()=>validateReview({findings:[{severity:'major',summary:'문제',evidence:['fake']}]},ids));assert.throws(()=>evidenceSchema(['E01','E01']));});
test('HTTP 503 then invalid evidence both retry; valid defect returned unchanged',async()=>{let n=0;const r=await reviewWithRetry({ids,wait:noWait,send:async()=>++n===1?{ok:false,status:503}:n===2?ok({findings:[{severity:'critical',summary:'문제',evidence:['fake']}]}):ok(good)});assert.equal(r.status,'reviewed');assert.equal(r.attempts,3);assert.deepEqual(r.review,good);assert.deepEqual(r.failures,['Provider HTTP 503','Unverifiable review evidence']);});
test('valid finding is never rerolled; permanent HTTP and repeated invalid output fail closed',async()=>{let n=0;const r=await reviewWithRetry({ids,wait:noWait,send:async()=>{n++;return ok(good)}});assert.equal(n,1);assert.equal(r.review.findings[0].severity,'critical');const p=await reviewWithRetry({ids,wait:noWait,send:async()=>({ok:false,status:403})});assert.equal(p.attempts,1);assert.equal(p.status,'unavailable');const b=await reviewWithRetry({ids,wait:noWait,send:async()=>ok({findings:[{severity:'major',summary:'문제',evidence:['bad']}]})});assert.equal(b.attempts,3);assert.equal(b.status,'unavailable');assert.equal(b.review,undefined);});

test('HTTP 400 is classified without leaking raw provider details or retrying malformed requests',async()=>{let n=0;const r=await reviewWithRetry({ids,wait:noWait,send:async()=>{n++;return {ok:false,status:400,json:async()=>({error:{message:'schema produces too many states; private detail'}})}}});assert.equal(n,1);assert.equal(r.reason,'Provider HTTP 400 (schema rejected)');assert.equal(classifyBadRequest('invalid image data'),'image rejected');assert.equal(classifyBadRequest('private string'),'invalid request; no sensitive provider details logged');});

test('429 diagnostic distinguishes daily quota, rate quota, and unknown quota safely',()=>{
 assert.equal(classifyQuotaError({error:{message:'quota exhausted per day'}}),'daily-quota');
 assert.equal(classifyQuotaError({error:{details:[{violations:[{quotaId:'GenerateRequestsPerMinutePerProjectPerModel'}]}]}}),'minute-request-quota');
 assert.equal(classifyQuotaError({error:{details:[{violations:[{quotaMetric:'TokensPerMinute'}]}]}}),'minute-token-quota');
 assert.equal(classifyQuotaError({error:{message:'resource exhausted'}}),'quota-type-unknown');
});

test('429 only retries short throttle once, never retries daily quota or a long reset',async()=>{
 assert.equal(visionRetryDelayMs({status:429,attempt:1}),3000);
 assert.equal(visionRetryDelayMs({status:429,attempt:1,headers:{get:()=> '18'}}),18000);
 assert.equal(visionRetryDelayMs({status:429,attempt:1,headers:{get:()=> '120'}}),120000);
 assert.equal(visionRetryDelayMs({status:429,attempt:1,payload:{error:{details:[{retryDelay:'12s'}]}}}),12000);
 assert.equal(visionRetryDelayMs({status:503,attempt:1}),3000);
 let calls=0;
 const daily=await reviewWithRetry({ids,maxAttempts:5,wait:noWait,send:async()=>{calls++;return {ok:false,status:429,json:async()=>({error:{message:'Quota exceeded per day'}})};}});
 assert.equal(calls,1);assert.equal(daily.attempts,1);assert.match(daily.reason,/daily-quota/);
 const shortDelays=[];calls=0;
 const transient=await reviewWithRetry({ids,maxAttempts:5,wait:async ms=>shortDelays.push(ms),send:async()=>{calls++;return {ok:false,status:429,json:async()=>({error:{message:'per minute'}})};}});
 assert.equal(transient.attempts,2);assert.equal(calls,2);assert.deepEqual(shortDelays,[3000]);
 calls=0;
 const long=await reviewWithRetry({ids,maxAttempts:5,wait:noWait,send:async()=>{calls++;return {ok:false,status:429,headers:{get:()=> '90'},json:async()=>({error:{message:'per minute'}})};}});
 assert.equal(calls,1);assert.equal(long.attempts,1);
});
test('Gemini image request keeps the six distinct lane goals but caps image inputs',()=>{
 const source=readFileSync(new URL('../scripts/live-qa-analyze.mjs',import.meta.url),'utf8');
 assert.match(source,/8-snapshots\.length/);
 assert.match(source,/const snapshots=checkpoints\.length<=4/);
 assert.match(source,/Math\.floor\(2\*\(checkpoints\.length-1\)\/3\)/);
 assert.match(source,/maxAttempts:3/);
});
