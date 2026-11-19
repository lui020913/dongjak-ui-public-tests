import test from 'node:test';
import assert from 'node:assert/strict';
import {rubberBand,sheetDragOffset,projectedDrag,continuationOffset,INTERACTION_MOTION} from '../src/mobile-window-motion.js';
test('drag follows finger and resists beyond expansion limit',()=>{
 assert.equal(sheetDragOffset(60,120),60);assert.equal(sheetDragOffset(-80,120),-80);
 assert.ok(sheetDragOffset(-180,120)>-180);assert.ok(sheetDragOffset(-180,120)<-120);
 assert.equal(rubberBand(0),0);assert.ok(Math.abs(rubberBand(10000))<72);
 assert.ok(sheetDragOffset(-40,0,false)>-40);
});
test('velocity projection is bounded and directionally consistent',()=>{
 assert.equal(projectedDrag(50,1),160);assert.equal(projectedDrag(-50,-1),-160);
 assert.equal(projectedDrag(0,100),180);assert.equal(projectedDrag(0,-100),-180);
});
test('reversal starts exactly at the interrupted frame and reaches the endpoint',()=>{
 for(const offset of [0,15,180,300]){
  assert.equal(continuationOffset(offset,0,true,350),offset);assert.equal(continuationOffset(offset,1,true,350),0);
  assert.equal(continuationOffset(offset,0,false,350),offset);assert.equal(continuationOffset(offset,1,false,350),350);
  assert.ok(continuationOffset(offset,.5,false,350)>=offset);
 }
 assert.equal(INTERACTION_MOTION.press,100);
});
