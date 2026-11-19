import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIRM_MOTION,confirmMotionOpacity,WINDOW_MOTION,windowMotionFrame} from '../src/mobile-window-motion.js';
test('confirmation fade is stationary and independent from opaque slide policy',()=>{assert.deepEqual(CONFIRM_MOTION,{open:200,close:180});assert.equal(confirmMotionOpacity(0,true),0);assert.equal(confirmMotionOpacity(1,true),1);assert.equal(confirmMotionOpacity(0,false),1);assert.equal(confirmMotionOpacity(1,false),0);assert.ok(Math.abs(confirmMotionOpacity(.5,true)-.5)<.001);assert.deepEqual(WINDOW_MOTION,{open:420,close:320,easing:'cubic-bezier(.42,0,.58,1)'});assert.equal(windowMotionFrame(.5,true,400,400,true).opacity,1);});
