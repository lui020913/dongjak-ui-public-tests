import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dockBottom,keyboardBounds,shouldClearMoreTranslate,tipHudPositions} from './mobile-surface-coordinator.mjs';
test('aligns to measured dock rather than historical 70px token',()=>{
  assert.equal(dockBottom(844,756),96);
  assert.equal(dockBottom(812,724),96);
  assert.equal(dockBottom(932,844),96);
  assert.equal(dockBottom(844,738),114);
});
test('unavailable, hidden or out-of-bounds dock is not used',()=>{
  for(const x of [0,-4,844,900,NaN,Infinity,undefined])assert.equal(dockBottom(844,x),null);
});
test('editor bounds stay above keyboard with visual viewport offset',()=>{
  assert.deepEqual(keyboardBounds(844,{height:482,offsetTop:0,scale:1},true),{top:8,bottom:370});
  assert.deepEqual(keyboardBounds(844,{height:482,offsetTop:36,scale:1},true),{top:44,bottom:334});
});
test('keyboard not assumed from pinch zoom, normal bars or unrelated focus',()=>{
  assert.equal(keyboardBounds(844,{height:480,offsetTop:0,scale:1.8},true),null);
  assert.equal(keyboardBounds(844,{height:790,offsetTop:0,scale:1},true),null);
  assert.equal(keyboardBounds(844,{height:480,offsetTop:0,scale:1},false),null);
});

test('legacy automatic More translate is cleared, native dragging and unrelated states are preserved',()=>{
 const state={mobile:true,hidden:false,dragging:false,automatic:true,translate:'0 9%'};
 assert.equal(shouldClearMoreTranslate(state),true);
 for(const override of [{mobile:false},{hidden:true},{dragging:true},{automatic:false},{translate:''},{translate:'none'}])assert.equal(shouldClearMoreTranslate({...state,...override}),false);
});

test('separates the physical map scale and dismissible TIP into a measured HUD stack',()=>{
  assert.deepEqual(tipHudPositions(844,756),{tipTop:708,scaleTop:660});
  assert.deepEqual(tipHudPositions(812,724),{tipTop:676,scaleTop:628});
  assert.deepEqual(tipHudPositions(932,844),{tipTop:796,scaleTop:748});
});
test('does not invent HUD coordinates for invalid dock geometry',()=>{
  for(const [height,top] of [[844,0],[844,-1],[844,844],[844,900],[NaN,400],[844,NaN]])assert.equal(tipHudPositions(height,top),null);
  assert.equal(tipHudPositions(844,756,0),null);
  assert.equal(tipHudPositions(844,756,36,0),null);
});
