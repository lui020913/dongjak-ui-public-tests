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
