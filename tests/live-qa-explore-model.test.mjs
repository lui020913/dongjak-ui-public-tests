import test from 'node:test';
import assert from 'node:assert/strict';
import {askGeminiModel} from '../scripts/live-qa-explore-model.mjs';
const key='test-only-key',parts=[{text:'safe anonymous UI evidence'}],schema={type:'OBJECT',properties:{action:{type:'STRING'}}};
const good=value=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]})});
test('transient HTTP 503 retries with backoff and keeps the real finding',async()=>{
 let n=0,delays=[],urls=[];
 const result=await askGeminiModel({key,parts,schema,send:async(u,o)=>{urls.push(u);assert.equal(o.headers['x-goog-api-key'],key);return ++n===1?{ok:false,status:503}:good({action:'map'});},wait:async ms=>delays.push(ms)});
 assert.deepEqual(result,{action:'map'});assert.equal(n,2);assert.deepEqual(delays,[2500]);
 assert(urls.every(x=>x.endsWith('/gemini-3.5-flash-lite:generateContent')));
});
test('network timeout retries without exposing exception internals',async()=>{
 let calls=0;
 const found=await askGeminiModel({key,parts,schema,maxAttempts:2,wait:async()=>{},send:async()=>{if(++calls===1){const e=Error('sensitive host detail');e.name='TimeoutError';throw e;}return good({action:'route'});}});
 assert.deepEqual(found,{action:'route'});assert.equal(calls,2);
});
test('403 is a permanent configuration issue and does not reroll',async()=>{
 let calls=0;
 await assert.rejects(askGeminiModel({key,parts,schema,send:async()=>{calls++;return {ok:false,status:403}},wait:async()=>{}}),/Model HTTP 403/);
 assert.equal(calls,1);
});
test('invalid model JSON retries but unavailable provider remains a hard failure',async()=>{
 let calls=0;
 const r=await askGeminiModel({key,parts,schema,send:async()=>++calls===1?good({action:'map'}):good({action:'route'}),wait:async()=>{}});
 assert.deepEqual(r,{action:'map'});assert.equal(calls,1);
 const delays=[];
 await assert.rejects(askGeminiModel({key,parts,schema,send:async()=>{throw Error('private network detail');},wait:async ms=>delays.push(ms)}),/Model unavailable after 3 attempt\(s\): Model network or response unavailable/);
 assert.deepEqual(delays,[2500,7000]);
});
test('missing key and arbitrary model IDs fail before outbound requests',async()=>{
 let n=0;const send=async()=>{n++;return good({action:'map'});};
 await assert.rejects(askGeminiModel({parts,schema,key:'',send}),/Model configuration unavailable/);
 await assert.rejects(askGeminiModel({parts,schema,key,model:'https://invalid',send}),/Model configuration unavailable/);
 assert.equal(n,0);
});
