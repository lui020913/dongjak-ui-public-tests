import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIRM_MOTION,TAB_MOTION,confirmMotionOpacity,WINDOW_MOTION,windowMotionFrame} from '../src/mobile-window-motion.js';
test('confirmation fade is stationary and independent from opaque slide policy',()=>{assert.deepEqual(CONFIRM_MOTION,{open:200,close:180});assert.equal(confirmMotionOpacity(0,true),0);assert.equal(confirmMotionOpacity(1,true),1);assert.equal(confirmMotionOpacity(0,false),1);assert.equal(confirmMotionOpacity(1,false),0);assert.ok(Math.abs(confirmMotionOpacity(.5,true)-.5)<.001);assert.deepEqual(WINDOW_MOTION,{open:350,close:300,easing:'cubic-bezier(.25,.20,.40,1)'});assert.equal(windowMotionFrame(.5,true,400,400,true).opacity,1);});

test('dock fade stays within 160ms without changing sheet or confirmation policy',()=>{assert.deepEqual(TAB_MOTION,{open:95,close:65});assert.equal(TAB_MOTION.open+TAB_MOTION.close,160);});
