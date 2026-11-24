import test from 'node:test';
import assert from 'node:assert/strict';
import {revealSurface,exitSurface,cancelSurfaceMotion} from '../src/surface-motion-fallback.js';
function fixture(reduced=false){
 const timers=new Map();let id=0,animation;
 const win={matchMedia:q=>({matches:q.includes('max-width')||reduced}),setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:key=>timers.delete(key)};
 const node={hidden:false,animate:()=>animation={cancel(){},onfinish:null,oncancel:null},getAnimations:()=>[]};
 return {node,win,timers,animation:()=>animation};
}
test('explicit close commits exactly once even when animationend is unavailable',()=>{
 const f=fixture();let closed=0;
 assert.equal(exitSurface(f.node,()=>closed++,{win:f.win}),true);
 assert.equal(exitSurface(f.node,()=>closed++,{win:f.win}),false);
 const finish=f.animation().onfinish;[...f.timers.values()][0]();finish();
 assert.equal(closed,1);assert.equal(f.timers.size,0);
});
test('reopen cancels stale close and reduced motion closes immediately',()=>{
 const f=fixture();let closed=0;exitSurface(f.node,()=>closed++,{win:f.win});
 cancelSurfaceMotion(f.node);assert.equal(closed,0);assert.equal(f.timers.size,0);
 revealSurface(f.node,{win:f.win});cancelSurfaceMotion(f.node);
 const g=fixture(true);exitSurface(g.node,()=>closed++,{win:g.win});assert.equal(closed,1);
});
test('already animated windows are not animated twice',()=>{
 const f=fixture();f.node.getAnimations=()=>[{playState:'running'}];let closed=0;
 assert.equal(exitSurface(f.node,()=>closed++,{win:f.win}),false);assert.equal(closed,1);
});
