import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileChromeMetrics,installMobileLayoutCoordinator} from '../src/mobile-ui-coordinator.js';

test('mobile viewport math is unchanged across the shared coordinator',()=>{
 assert.deepEqual(mobileChromeMetrics({headerBottom:82.2,navHeight:65.2,viewportHeight:733.2}),{header:83,nav:66,viewport:734});
 assert.deepEqual(mobileChromeMetrics({}),{header:46,nav:48,viewport:320});
});

test('repeated mounts share one observer/listener and release only after the last owner',()=>{
 const prior={window:globalThis.window,MutationObserver:globalThis.MutationObserver,ResizeObserver:globalThis.ResizeObserver};
 const registered=new Map(),removed=new Map();const track=(m,n)=>m.set(n,(m.get(n)||0)+1);
 let resizeObserved=0,resizeDisposed=0,mutationObserved=0,mutationDisposed=0,onMap=0,offMap=0;
 const viewport={height:745,addEventListener(){},removeEventListener(){}};
 const mockWindow={
  innerHeight:760,visualViewport:viewport,
  requestAnimationFrame(){return 7;},cancelAnimationFrame(){},
  addEventListener(n){track(registered,n);},removeEventListener(n){track(removed,n);}
 };
 const header={getBoundingClientRect:()=>({bottom:82})},nav={getBoundingClientRect:()=>({height:66})};
 const app={
  querySelector:s=>s==='.topbar'?header:s==='#bottom-nav'?nav:null,
  style:{setProperty(){}},
  classList:{contains:()=>false,remove(){}}
 };
 const map={on(){onMap++;},off(){offMap++;}};
 globalThis.window=mockWindow;
 globalThis.ResizeObserver=class{observe(){resizeObserved++;}disconnect(){resizeDisposed++;}};
 globalThis.MutationObserver=class{observe(){mutationObserved++;}disconnect(){mutationDisposed++;}};
 let first,second,third;
 try{
  first=installMobileLayoutCoordinator({app,map});
  second=installMobileLayoutCoordinator({app,map});
  assert.equal(registered.get('resize'),1,'no duplicate resize listener');
  assert.equal(registered.get('orientationchange'),1);
  assert.equal(onMap,1);
  assert.equal(resizeObserved,2);
  assert.equal(mutationObserved,1);
  first();first();
  assert.equal(offMap,0,'one retained caller keeps observer active');
  assert.equal(removed.get('resize')||0,0);
  second();second();
  assert.equal(offMap,1);
  assert.equal(removed.get('resize'),1);
  assert.equal(resizeDisposed,1);
  assert.equal(mutationDisposed,1);
  third=installMobileLayoutCoordinator({app,map});
  assert.equal(registered.get('resize'),2,'after cleanup the coordinator can mount again');
  third();third=undefined;
  assert.equal(offMap,2);
  assert.equal(removed.get('resize'),2);
 }finally{
  first?.();second?.();third?.();
  for(const [name,value] of Object.entries(prior)){
   if(value===undefined)delete globalThis[name];else globalThis[name]=value;
  }
 }
});
