import test from 'node:test';import assert from 'node:assert/strict';
import {createFrameCoalescer} from '../src/frame-coalescer.js';
function harness(){
 let seq=0;const frames=new Map(),calls=[];let pitch=0;
 const win={requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq},cancelAnimationFrame:id=>frames.delete(id)};
 const queue=createFrameCoalescer(()=>calls.push(pitch),{win});
 return {queue,frames,calls,setPitch:n=>{pitch=n},frame:()=>{const [id,fn]=frames.entries().next().value;frames.delete(id);fn()}};
}
test('burst of pitch events applies only latest state once per frame',()=>{
 const h=harness();for(let i=1;i<=20;i++){h.setPitch(i);h.queue.schedule();}
 assert.equal(h.frames.size,1);assert.deepEqual(h.calls,[]);h.frame();assert.deepEqual(h.calls,[20]);
 h.setPitch(42);h.queue.schedule();h.frame();assert.deepEqual(h.calls,[20,42]);
});
test('gesture end flushes pending final state and removes stale frame',()=>{
 const h=harness();h.setPitch(35);h.queue.schedule();h.setPitch(40);h.queue.flush();h.queue.flush();
 assert.deepEqual(h.calls,[40]);assert.equal(h.frames.size,0);
});
test('map destruction cancels pending presentation; no-rAF fallback is synchronous',()=>{
 const h=harness();h.queue.schedule();h.queue.cancel();assert.equal(h.frames.size,0);assert.deepEqual(h.calls,[]);
 let calls=0;const fallback=createFrameCoalescer(()=>calls++,{win:{}});fallback.schedule();fallback.flush();assert.equal(calls,1);
});
