import test from 'node:test';
import assert from 'node:assert/strict';
import {startOpacityMotion,startStyleMotion,COMPOSITOR_MOTION} from '../src/compositor-motion.js';
function setup(){
 const frames=new Map(),timers=new Map();let seq=0,reads=0;
 const win={CSS:{supports:()=>true},getComputedStyle:n=>{reads++;return {opacity:n.style.getPropertyValue('opacity')}},
 requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq},cancelAnimationFrame:k=>frames.delete(k),
 setTimeout:fn=>{timers.set(++seq,fn);return seq},clearTimeout:k=>timers.delete(k)};
 function node(){
  const props=new Map(),listeners=new Map();let writes=0;
  return {props,listeners,style:{setProperty(k,v,p=''){writes++;props.set(k,[v,p])},removeProperty(k){writes++;props.delete(k)},getPropertyValue:k=>props.get(k)?.[0]||'',getPropertyPriority:k=>props.get(k)?.[1]||''},
   addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k),writes:()=>writes};
 }
 function tick(){const [id,fn]=frames.entries().next().value;frames.delete(id);fn(16)}
 return {win,node,frames,timers,tick,reads:()=>reads};
}
test('compositor motion performs only boundary writes and preserves original important styles',()=>{
 const h=setup(),n=h.node(),m=h.node();n.style.setProperty('opacity','.8','important');n.style.setProperty('transition-duration','120ms');
 let finished=0;const motion=startOpacityMotion([n,m],{win:h.win,from:.12,to:1,duration:COMPOSITOR_MOTION.tabEnter,onFinish:()=>{finished++}});
 assert.ok(motion);assert.equal(n.style.getPropertyValue('opacity'),'.12'.replace(/^\./,'0.'));assert.equal(h.reads(),2);
 h.tick();assert.equal(h.frames.size,0,'browser interpolates without a JS frame loop');
 assert.equal(n.style.getPropertyValue('transition-property'),'opacity');assert.equal(n.style.getPropertyValue('opacity'),'1');
 const writes=n.writes();assert.equal(n.writes(),writes);assert.equal(h.timers.size,1);
 n.listeners.get('transitionend')({target:n,currentTarget:n,propertyName:'opacity'});
 assert.equal(finished,1);assert.deepEqual(n.props.get('opacity'),['.8','important']);assert.deepEqual(n.props.get('transition-duration'),['120ms','']);
 assert.equal(n.props.has('will-change'),false);assert.equal(h.timers.size,0);motion.cancel();assert.equal(finished,1);
});
test('interrupted motion restores styles without running old close callback',()=>{
 const h=setup(),n=h.node();let closed=0;const motion=startOpacityMotion([n],{win:h.win,from:1,to:0,onFinish:()=>closed++});
 motion.cancel();assert.equal(closed,0);assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert.equal(n.props.size,0);
});
test('missing transitionend still commits once, unsupported browsers retain legacy fallback',()=>{
 const h=setup(),n=h.node();let closed=0;startOpacityMotion([n],{win:h.win,from:1,to:0,onFinish:()=>closed++});h.tick();
 const fn=[...h.timers.values()][0];fn();fn();assert.equal(closed,1);assert.equal(n.props.size,0);
 assert.equal(startOpacityMotion([n],{win:{}}),null);
});

 test('simple detail slide shares one boundary transition and ignores early opacity completion',()=>{
 const h=setup(),n=h.node();n.style.setProperty('translate','0 5px','important');let done=0;
 const motion=startStyleMotion([n],{win:h.win,from:{opacity:'.12',translate:'0 300px'},to:{opacity:'1',translate:'0 0px'},finishProperty:'translate',onFinish:()=>done++});
 assert.ok(motion);h.tick();assert.equal(h.frames.size,0);assert.equal(n.style.getPropertyValue('transition-property'),'opacity,translate');
 n.listeners.get('transitionend')({target:n,currentTarget:n,propertyName:'opacity'});assert.equal(done,0);
 n.listeners.get('transitionend')({target:n,currentTarget:n,propertyName:'translate'});assert.equal(done,1);assert.deepEqual(n.props.get('translate'),['0 5px','important']);
});
