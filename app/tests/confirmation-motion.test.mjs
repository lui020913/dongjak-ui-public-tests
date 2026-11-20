import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIRM_MOTION,TAB_MOTION,tabMotionFrameDelta,confirmMotionOpacity,WINDOW_MOTION,windowMotionFrame} from '../src/mobile-window-motion.js';
test('confirmation fade is stationary and independent from opaque slide policy',()=>{assert.deepEqual(CONFIRM_MOTION,{open:200,close:180});assert.equal(confirmMotionOpacity(0,true),0);assert.equal(confirmMotionOpacity(1,true),1);assert.equal(confirmMotionOpacity(0,false),1);assert.equal(confirmMotionOpacity(1,false),0);assert.ok(Math.abs(confirmMotionOpacity(.5,true)-.5)<.001);assert.deepEqual(WINDOW_MOTION,{open:350,close:300,easing:'cubic-bezier(.25,.20,.40,1)'});assert.equal(windowMotionFrame(.5,true,400,400,true).opacity,1);});

test('dock fade uses 250ms without changing sheet or confirmation policy',()=>{assert.deepEqual(TAB_MOTION,{open:145,close:105});assert.equal(TAB_MOTION.open+TAB_MOTION.close,250);});

test('short dock fade retains intermediate frames under compositor stalls',()=>{assert.equal(tabMotionFrameDelta(16),16);assert.equal(tabMotionFrameDelta(120),32);assert.equal(tabMotionFrameDelta(-10),0);for(const duration of [TAB_MOTION.open,TAB_MOTION.close]){const intermediate=[];for(let elapsed=0;elapsed<duration;elapsed+=tabMotionFrameDelta(120))if(elapsed>0)intermediate.push(confirmMotionOpacity(elapsed/duration,true));assert.ok(intermediate.length>=2);assert.ok(intermediate.every(o=>o>0&&o<1));}});
