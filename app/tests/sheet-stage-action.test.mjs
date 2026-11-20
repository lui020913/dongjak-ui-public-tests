import test from 'node:test';
import assert from 'node:assert/strict';
import {sheetStageAction} from '../src/mobile-window-motion.js';
test('compact expands; expanded always returns to compact first; second downward drag dismisses',()=>{assert.equal(sheetStageAction(-90,0,false),'expand');assert.equal(sheetStageAction(180,3,true),'collapse');assert.equal(sheetStageAction(110,0,false),'dismiss');assert.equal(sheetStageAction(15,0,true),'settle');assert.equal(sheetStageAction(-90,0,false,false),'settle');});
