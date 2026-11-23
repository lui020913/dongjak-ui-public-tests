import test from 'node:test';
import assert from 'node:assert/strict';
import {installMobileSurfaceCoordinator} from '../src/public-ui-mobile-surface-coordinator.js';

test('mobile surface controller shares one lifetime across repeated boots and cleans up once',()=>{
 const registered=new Map(),removed=new Map();
 const key=(target,event)=>target+':'+event;
 const mark=(set,target,event)=>{const name=key(target,event);set.set(name,(set.get(name)||0)+1);};
 let observes=0,disconnects=0,mutations=0,mutationDisconnects=0;
 let rafs=0,cancels=0;
 const viewport={
  addEventListener(type){mark(registered,'viewport',type);},
  removeEventListener(type){mark(removed,'viewport',type);}
 };
 const app={
  dataset:{},style:{getPropertyValue:()=>'',removeProperty(){}},
  getAttribute:()=>null,hasAttribute:()=>false,removeAttribute(){}
 };
 const nav={};
 const doc={
  getElementById:id=>id==='app'?app:id==='bottom-nav'?nav:null,
  addEventListener(type){mark(registered,'doc',type);},
  removeEventListener(type){mark(removed,'doc',type);}
 };
 const win={
  visualViewport:viewport,innerHeight:740,
  matchMedia:()=>({matches:true}),
  getComputedStyle:()=>({visibility:'visible',display:'block'}),
  addEventListener(type){mark(registered,'win',type);},
  removeEventListener(type){mark(removed,'win',type);},
  requestAnimationFrame(){rafs++;return rafs;},
  cancelAnimationFrame(){cancels++;},
  ResizeObserver:class{observe(){observes++;}disconnect(){disconnects++;}},
  MutationObserver:class{observe(){mutations++;}disconnect(){mutationDisconnects++;}}
 };
 const a=installMobileSurfaceCoordinator(doc,win);
 const b=installMobileSurfaceCoordinator(doc,win);
 assert.equal(app.dataset.djUserSurfaceReady,'1');
 assert.equal(registered.get('win:resize'),1,'no duplicate window resize listener');
 assert.equal(registered.get('doc:focusin'),1,'no duplicate form focus observer');
 assert.equal(registered.get('viewport:scroll'),1);
 assert.equal(observes,1);assert.equal(mutations,1);
 a();a();
 assert.equal(app.dataset.djUserSurfaceReady,'1','first release must not detach active second consumer');
 assert.equal(disconnects,0);assert.equal(mutationDisconnects,0);
 assert.equal(removed.get('win:resize')||0,0);
 b();b();
 assert.equal(app.dataset.djUserSurfaceReady,undefined);
 assert.equal(disconnects,1);assert.equal(mutationDisconnects,1);
 assert.equal(removed.get('win:resize'),1);
 assert.equal(removed.get('doc:focusin'),1);
 assert.equal(removed.get('viewport:scroll'),1);
 assert.equal(cancels,1,'pending repaint is cancelled when the last lease is released');
 const c=installMobileSurfaceCoordinator(doc,win);
 assert.equal(registered.get('win:resize'),2,'after disposal, a new boot can register once');
 c();
 assert.equal(disconnects,2);
});

test('missing map shell never installs observers or causes an exception',()=>{
 const doc={getElementById:()=>null};
 const win={};
 const end=installMobileSurfaceCoordinator(doc,win);
 assert.equal(typeof end,'function');
 end();end();
});
