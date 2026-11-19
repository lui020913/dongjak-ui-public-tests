import test from 'node:test';
import assert from 'node:assert/strict';
import {createInFlightRequests} from '../src/arrival-request-coordinator.js';
test('same station and line shares one active request; different line stays independent',async()=>{
 const requests=createInFlightRequests();let calls=0,resolve;
 const load=()=>{calls++;return new Promise(r=>{resolve=r;});};
 const a=requests.run('노량진:1',load);
 const b=requests.run('노량진:1',load);
 const c=requests.run('노량진:9',()=>{calls++;return 'nine';});
 assert.equal(a,b);assert.equal(requests.has('노량진:1'),true);
 await Promise.resolve();resolve('one');
 assert.deepEqual(await Promise.all([a,b,c]),['one','one','nine']);
 assert.equal(calls,2);assert.equal(requests.has('노량진:1'),false);
 assert.equal(await requests.run('노량진:1',()=>{calls++;return 'new';}),'new');
 assert.equal(calls,3);
});
test('failed requests release their key and can retry',async()=>{
 const requests=createInFlightRequests();
 await assert.rejects(requests.run('bus:12345',()=>{throw Error('offline');}),/offline/);
 assert.equal(requests.has('bus:12345'),false);
 assert.equal(await requests.run('bus:12345',()=>42),42);
});
