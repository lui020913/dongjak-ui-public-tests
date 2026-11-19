import test from 'node:test';
import assert from 'node:assert/strict';
import {bindHeaderDragInput} from '../src/mobile-header-input.js';
function fixture(){
 const header=new EventTarget(),win=new EventTarget(),calls=[];
 win.TouchEvent=function(){};
 const dispose=bindHeaderDragInput(header,win,{down:e=>{if(e.target.block)return false;calls.push(['down',e.pointerId,e.clientY]);return true},move:e=>calls.push(['move',e.pointerId,e.clientY]),up:e=>calls.push(['up',e.pointerId,e.clientY]),cancel:e=>calls.push(['cancel',e.pointerId,e.clientY])});
 const emit=(target,type,y,id=4)=>{
  const t={identifier:id,clientX:12,clientY:y},event=new Event(type,{cancelable:true});
  Object.defineProperties(event,{touches:{value:/end|cancel/.test(type)?[]:[t]},changedTouches:{value:[t]},pointerType:{value:'touch'},pointerId:{value:7},clientY:{value:y}});
  target.dispatchEvent(event);return event.defaultPrevented;
 };
 return {header,win,calls,dispose,emit};
}
test('native header owns one touch stream outside header; pointer duplicates ignored',()=>{
 const {header,win,calls,dispose,emit}=fixture();
 assert.equal(emit(header,'pointerdown',100),false);
 assert.equal(emit(header,'touchstart',100),true);
 assert.equal(emit(win,'touchmove',50),true);
 assert.equal(emit(win,'touchend',40),true);
 assert.deepEqual(calls,[['down','touch:4',100],['move','touch:4',50],['up','touch:4',40]]);
 dispose();assert.equal(emit(header,'touchstart',100),false);
});
test('unaccepted control taps and unrelated touch moves are never intercepted',()=>{
 const {header,win,calls,dispose,emit}=fixture();
 header.block=true;assert.equal(emit(header,'touchstart',100),false);assert.equal(emit(win,'touchmove',50),false);assert.deepEqual(calls,[]);
 header.block=false;emit(header,'touchstart',100);assert.equal(emit(win,'touchmove',60,99),false);emit(win,'touchcancel',70);
 assert.deepEqual(calls,[['down','touch:4',100],['cancel','touch:4',70]]);dispose();
});
