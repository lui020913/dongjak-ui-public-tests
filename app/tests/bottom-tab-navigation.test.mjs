import test from 'node:test';import assert from 'node:assert/strict';import {adjacentTabIndex,installBottomTabNavigation,TAB_TRANSITION} from '../src/bottom-tab-navigation.js';
test('horizontal dock swipes select one adjacent tab, without wrapping or responding to vertical drag',()=>{assert.equal(adjacentTabIndex(2,5,-85,5),3);assert.equal(adjacentTabIndex(2,5,85,5),1);assert.equal(adjacentTabIndex(0,5,80,0),-1);assert.equal(adjacentTabIndex(4,5,-80,0),-1);assert.equal(adjacentTabIndex(2,5,-25,0),-1);assert.equal(adjacentTabIndex(2,5,-60,65),-1);});

test('clicking a phone tab renders the destination in the same event with no root View Transition',()=>{
 const handlers=new Map();
 const getSet=()=>({values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)}});
 const routeClasses=getSet(),mineClasses=getSet();
 const panels={
  route:{dataset:{page:'route'},hidden:true,classList:routeClasses},
  mine:{dataset:{page:'mine'},hidden:true,classList:mineClasses}
 };
 const app={dataset:{tab:'map'}};
 const calls=[];
 const buttons=['route','mine','map'].map(name=>({
  dataset:{tab:name},isConnected:true,disabled:false,
  click(){calls.push(name);app.dataset.tab=name;for(const p of Object.values(panels))p.hidden=p.dataset.page!==name;}
 }));
 const nav={
  dataset:{},querySelectorAll:()=>buttons,querySelector:sel=>buttons.find(b=>sel.includes(b.dataset.tab))||null,
  addEventListener(){},removeEventListener(){}
 };
 const doc={
  getElementById:key=>key==='bottom-nav'?nav:null,
  querySelector:selector=>Object.values(panels).find(p=>selector.includes('data-page="'+p.dataset.page+'"')&&!p.hidden)||null,
  startViewTransition(){throw Error('root transition must never be called');}
 };
 const win={
  matchMedia:q=>({matches:q.includes('max-width')}),
  addEventListener:(name,cb)=>handlers.set(name,cb),
  removeEventListener:name=>handlers.delete(name),
  setTimeout:()=>1,
  clearTimeout:()=>{}
 };
 const destroy=installBottomTabNavigation({doc,win,app});
 function click(name){
  const button=buttons.find(b=>b.dataset.tab===name);
  let prevented=false;
  handlers.get('click')({
   target:{closest:sel=>sel==='#bottom-nav .nav-tab[data-tab]'?button:null},
   preventDefault(){prevented=true},
   stopImmediatePropagation(){}
  });
  assert.equal(prevented,true);
  assert.equal(app.dataset.tab,name,'no deferred destination state');
 }
 click('route');
 assert.equal(panels.route.hidden,false);
 assert.equal(routeClasses.values.has('dj-tab-content-enter'),true);
 click('mine');
 assert.equal(panels.route.hidden,true);
 assert.equal(panels.mine.hidden,false);
 assert.equal(routeClasses.values.has('dj-tab-content-enter'),false);
 assert.equal(mineClasses.values.has('dj-tab-content-enter'),true);
 click('map');
 assert.equal(panels.mine.hidden,true);
 assert.equal(mineClasses.values.has('dj-tab-content-enter'),false);
 assert.deepEqual(calls,['route','mine','map']);
 assert.deepEqual(TAB_TRANSITION,{contentReveal:140});
 destroy();
});


test('swiping the dock is handled at window capture even when a tab intercepts bubbling pointer events',()=>{
 const handlers=new Map(),registered=[];
 const app={dataset:{tab:'route'}};
 const buttons=['map','route','participate','news','mine'].map(name=>({
  dataset:{tab:name},disabled:false,isConnected:true,
  click(){app.dataset.tab=name;}
 }));
 const nav={dataset:{},querySelectorAll:()=>buttons,querySelector:()=>buttons[0],
  addEventListener(){throw Error('do not depend on bubbling pointerdown');},
  removeEventListener(){}};
 const doc={getElementById:key=>key==='bottom-nav'?nav:null,querySelector:()=>null};
 const win={
  matchMedia:()=>({matches:true}),
  addEventListener:(type,fn,options)=>{handlers.set(type,fn);registered.push({type,options});},
  removeEventListener:(type)=>handlers.delete(type),
  setTimeout:()=>1,clearTimeout:()=>{}
 };
 const dispose=installBottomTabNavigation({doc,win,app});
 assert.ok(registered.some(x=>x.type==='pointerdown'&&x.options===true),
  'gesture starts must be received before child handlers can stop propagation');
 const target={closest:selector=>selector==='#bottom-nav'?nav:null};
 handlers.get('pointerdown')({target,pointerId:3,button:0,isPrimary:true,clientX:210,clientY:800});
 handlers.get('pointerup')({pointerId:3,clientX:125,clientY:802,cancelable:true,preventDefault(){}});
 assert.equal(app.dataset.tab,'participate');
 handlers.get('pointerdown')({target:{closest:()=>null},pointerId:4,button:0,isPrimary:true,clientX:300,clientY:400});
 handlers.get('pointerup')({pointerId:4,clientX:200,clientY:400,cancelable:true,preventDefault(){}});
 assert.equal(app.dataset.tab,'participate','swipes outside the dock cannot change tabs');
 dispose();
});

test('delayed native click from swipe does not return to the original tab; a new press remains usable',()=>{
 const handlers=new Map();
 const app={dataset:{tab:'route'}};
 const buttons=['map','route','participate','news','mine'].map(name=>({
  dataset:{tab:name},isConnected:true,disabled:false,
  click(){app.dataset.tab=name;}
 }));
 const nav={dataset:{},querySelectorAll:()=>buttons,
  querySelector:selector=>buttons.find(b=>selector.includes('data-tab="'+b.dataset.tab+'"'))||null,
  addEventListener(){},removeEventListener(){}};
 const doc={getElementById:key=>key==='bottom-nav'?nav:null,querySelector:()=>null};
 let lastGuard=0;
 const win={matchMedia:()=>({matches:true}),
  addEventListener:(name,fn)=>handlers.set(name,fn),
  removeEventListener:name=>handlers.delete(name),
  setTimeout:(_fn,ms)=>{if(ms===2200)lastGuard=ms;return 1;},clearTimeout:()=>{}};
 const dispose=installBottomTabNavigation({doc,win,app});
 const navTarget={closest:selector=>selector==='#bottom-nav'?nav:null};
 handlers.get('pointerdown')({target:navTarget,pointerId:1,button:0,isPrimary:true,clientX:220,clientY:795});
 handlers.get('pointerup')({pointerId:1,clientX:125,clientY:795,cancelable:true,preventDefault(){}});
 assert.equal(app.dataset.tab,'participate');
 assert.equal(lastGuard,2200);
 let blocked=false;
 handlers.get('click')({
  target:{closest:selector=>selector==='#bottom-nav'?nav:selector==='#bottom-nav .nav-tab[data-tab]'?buttons[1]:null},
  isTrusted:true,preventDefault(){blocked=true;},stopImmediatePropagation(){}
 });
 assert.equal(blocked,true,'the release click cannot undo the swipe navigation');
 assert.equal(app.dataset.tab,'participate');
 handlers.get('pointerdown')({target:navTarget,pointerId:2,button:0,isPrimary:true,clientX:130,clientY:795});
 handlers.get('click')({
  target:{closest:selector=>selector==='#bottom-nav .nav-tab[data-tab]'?buttons[3]:nav},
  isTrusted:true,preventDefault(){},stopImmediatePropagation(){}
 });
 assert.equal(app.dataset.tab,'news','a new deliberate press must still change tabs');
 dispose();
});


test('mouse-backed HOME icon swipe recovers even when pointerdown was cancelled by an iOS-style overlay',()=>{
 const handlers=new Map();
 const app={dataset:{tab:'route'}};
 const buttons=['route','participate','map','news','mine'].map(name=>({dataset:{tab:name},isConnected:true,disabled:false,click(){app.dataset.tab=name;}}));
 const nav={dataset:{},querySelectorAll:()=>buttons,querySelector:()=>null,addEventListener(){},removeEventListener(){}};
 const doc={getElementById:key=>key==='bottom-nav'?nav:null,querySelector:()=>null};
 const win={matchMedia:()=>({matches:true}),addEventListener:(type,fn)=>handlers.set(type,fn),
  removeEventListener:type=>handlers.delete(type),setTimeout:()=>1,clearTimeout(){}};
 const dispose=installBottomTabNavigation({doc,win,app});
 const icon={closest:selector=>selector==='#bottom-nav'?nav:null};
 handlers.get('mousedown')({target:icon,button:0,clientX:200,clientY:805});
 handlers.get('mouseup')({target:icon,button:0,clientX:115,clientY:805,cancelable:true,preventDefault(){}});
 assert.equal(app.dataset.tab,'participate');
 dispose();
});
