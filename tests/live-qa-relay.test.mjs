import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{QASession} from '../qa-relay/worker.mjs';
function harness(){
 const map=new Map();
 const storage={get:k=>map.get(k),put:(k,v)=>map.set(k,v),setAlarm:()=>{},deleteAll:()=>map.clear()};
 const relay=new QASession({storage});
 const env={QA_WRITER_KEY:'w'.repeat(48),QA_VIEWER_KEY:'v'.repeat(48),QA_SESSION:{idFromName:n=>n,get:()=>relay}};
 const call=(path,key,body,origin='https://qa.example')=>worker.fetch(new Request('https://qa.example'+path,{method:body?'POST':'GET',headers:{...(key?{Authorization:'Bearer '+key}:{}),Origin:origin},...(body?{body:JSON.stringify(body)}:{})}),env);
 return {env,call,map,relay};
}
const packet={run:'run1',image:'YWJj',scene:{title:'레이어 테스트'},summary:{result:null}};
test('relay denies unconfigured, anonymous and wrong-role requests',async()=>{
 const {env,call}=harness();
 assert.equal((await call('/api/watch')).status,401);
 assert.equal((await call('/api/watch',env.QA_WRITER_KEY)).status,401);
 assert.equal((await call('/api/publish',env.QA_VIEWER_KEY,packet)).status,401);
 env.QA_VIEWER_KEY='short';
 assert.equal((await call('/api/watch','short')).status,503);
});
test('relay transfers frames, isolates active runs, validates origin and expires records',async()=>{
 const {env,call,map,relay}=harness();
 assert.equal((await call('/api/publish',env.QA_WRITER_KEY,packet)).status,200);
 assert.equal((await (await call('/api/watch',env.QA_VIEWER_KEY)).json()).packet.image,packet.image);
 assert.equal((await call('/api/publish',env.QA_WRITER_KEY,{...packet,run:'run2'})).status,409);
 assert.equal((await call('/api/control',env.QA_VIEWER_KEY,{paused:true},'https://elsewhere.example')).status,403);
 assert.equal((await call('/api/control',env.QA_VIEWER_KEY,{paused:true})).status,200);
 assert.equal((await (await call('/api/runner',env.QA_WRITER_KEY)).json()).paused,true);
 map.get('packet').received=0;
 const old=await (await call('/api/watch',env.QA_VIEWER_KEY)).json();
 assert.equal(old.stale,true);assert.equal(old.packet,null);
 await relay.alarm();assert.equal(map.size,0);
});
test('relay bounds input and rejects invalid frame data',async()=>{
 const {env,call}=harness();
 assert.equal((await call('/api/publish',env.QA_WRITER_KEY,{...packet,image:'!'})).status,400);
 assert.equal((await call('/api/publish',env.QA_WRITER_KEY,{...packet,image:'A'.repeat(500000)})).status,413);
});
