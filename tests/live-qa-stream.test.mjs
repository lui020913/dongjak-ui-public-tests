import test from 'node:test';
import assert from 'node:assert/strict';
import {liveRole,liveMessage} from '../qa-relay/live-stream.mjs';
import worker,{QASession} from '../qa-relay/worker.mjs';
const writer='w'.repeat(64),viewer='v'.repeat(64);
function req(lane,role,key,origin='https://qa.example'){
 return new Request('https://qa.example/api/live?lane='+lane,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'qa-v2.'+role+', '+key,Origin:origin}});
}
test('live stream authorizes separate role credentials and lane IDs without forwarding the key',async()=>{
 const routed=[];
 const env={QA_WRITER_KEY:writer,QA_VIEWER_KEY:viewer,QA_SESSION:{idFromName:x=>x,get:id=>({fetch:r=>{routed.push([id,r]);return new Response('ok')}})}};
 assert.equal((await worker.fetch(req(1,'viewer',writer),env)).status,401);
 assert.equal((await worker.fetch(req(1,'viewer',viewer,'https://evil.example'),env)).status,400);
 assert.equal((await worker.fetch(req(21,'writer',writer),env)).status,400);
 assert.equal((await worker.fetch(req(20,'writer',writer),env)).status,200);
 assert.equal((await worker.fetch(req(2,'viewer',viewer),env)).status,200);
 assert.deepEqual(routed.map(x=>x[0]),['live-lane-20','live-lane-2']);
 assert.equal(routed[0][1].headers.get('Sec-WebSocket-Protocol'),'qa-v2.writer');
 assert.equal(routed[0][1].headers.get('X-QA-Role'),'writer');
 assert.equal(liveRole(req(0,'writer',writer)),null);
});
test('only writers may submit bounded images and state; viewers may only control pause',()=>{
 const data=new ArrayBuffer(8);
 assert.equal(liveMessage('writer',data).type,'frame');
 assert.equal(liveMessage('viewer',data),null);
 assert.equal(liveMessage('writer',new ArrayBuffer(225001)),null);
 assert.equal(liveMessage('writer','{"type":"pause","paused":true}'),null);
 assert.equal(liveMessage('viewer','{"type":"pause","paused":true}').paused,true);
 assert.equal(liveMessage('writer','{"type":"state","run":"abc","lane":1}').type,'state');
});
test('viewer triggers stream demand, pause and resume; closing viewer clears pause',()=>{
 function s(role){return {data:{role,paused:false},messages:[],send(m){this.messages.push(m)},serializeAttachment(d){this.data=d},deserializeAttachment(){return this.data},close(){}}}
 const w=s('writer'),v=s('viewer'),ctx={storage:{},getWebSockets:role=>role==='writer'?[w]:[v]};
 const relay=new QASession(ctx);
 relay.liveControl();assert.deepEqual(JSON.parse(w.messages.at(-1)),{type:'control',watching:true,paused:false});
 relay.webSocketMessage(v,'{"type":"pause","paused":true}');assert.equal(JSON.parse(w.messages.at(-1)).paused,true);
 const frame=new ArrayBuffer(22);relay.webSocketMessage(w,frame);assert.equal(v.messages.at(-1),frame);
 relay.webSocketClose(v,1000);assert.deepEqual(JSON.parse(w.messages.at(-1)),{type:'control',watching:false,paused:false});
});
