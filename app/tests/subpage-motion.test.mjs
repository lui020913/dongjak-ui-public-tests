import test from 'node:test';import assert from 'node:assert/strict';
import {createSubpageMotion} from '../src/subpage-motion.js';
function target(){const calls=[];return {calls,animate(frames,options){let resolve;const finished=new Promise(r=>resolve=r);const a={frames,options,finished,resolve,cancelled:0,cancel(){this.cancelled++;resolve();}};calls.push(a);return a;}}}
test('rapid forward/back cancels prior native transform and keeps correct direction',async()=>{
 const n=target(),m=target(),motion=createSubpageMotion();motion.enter(n);motion.enter(m,'back');
 assert.equal(n.calls[0].cancelled,1);assert.equal(m.calls[0].frames[0].transform,'translateX(-44px)');
 await Promise.resolve();motion.cancel();assert.equal(m.calls[0].cancelled,1);
});
test('reduced motion or unavailable WAAPI does not block navigation',()=>{
 const n=target(),motion=createSubpageMotion({reduced:()=>true});motion.enter(n);assert.equal(n.calls.length,0);
 createSubpageMotion().enter({});motion.cancel();
});
