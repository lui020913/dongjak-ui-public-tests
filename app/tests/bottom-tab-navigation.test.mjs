import test from 'node:test';import assert from 'node:assert/strict';import {installBottomTabNavigation,TAB_TRANSITION} from '../src/bottom-tab-navigation.js';
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
 assert.deepEqual(TAB_TRANSITION,{contentReveal:260,mapReturn:220});
 destroy();
});


test('dock navigation registers click only and leaves horizontal gestures to the browser',()=>{
 const handlers=new Map();const app={dataset:{tab:'route'}};
 const button={dataset:{tab:'participate'},isConnected:true,disabled:false,click(){app.dataset.tab='participate';}};
 const nav={dataset:{},querySelector:()=>button};const doc={getElementById:key=>key==='bottom-nav'?nav:null,querySelector:()=>null};
 const win={matchMedia:q=>({matches:q.includes('max-width')}),addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:type=>handlers.delete(type),setTimeout:()=>1,clearTimeout(){}};
 const dispose=installBottomTabNavigation({doc,win,app});
 for(const type of ['pointerdown','pointerup','pointercancel','mousedown','mouseup','touchstart','touchend'])assert.equal(handlers.has(type),false,type);
 assert.equal(app.dataset.tab,'route');
 handlers.get('click')({target:{closest:sel=>sel==='#bottom-nav .nav-tab[data-tab]'?button:null},preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(app.dataset.tab,'participate');dispose();assert.equal(handlers.size,0);
});

test('map return keeps only a non-interactive fading page and rapid tab reentry clears it',()=>{
 const handlers=new Map(),timers=new Map(),frames=new Map();let clock=0,key=0;
 const app={dataset:{tab:'mine'}};
 const values=new Map([['display','flex'],['visibility','visible']]);const panel={dataset:{page:'mine'},hidden:false,classList:{add(){},remove(){}},style:{getPropertyValue:k=>values.get(k)||'',getPropertyPriority:k=>values.has(k)?'important':'',setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)},removeAttribute:k=>{if(k==='data-dj-tab-outgoing')delete panel.dataset.djTabOutgoing;}};
 const buttons=['map','mine'].map(tab=>({dataset:{tab},disabled:false,isConnected:true,click(){app.dataset.tab=tab;panel.hidden=tab!=='mine'&&panel.dataset.djTabOutgoing!=='true';}}));
 const nav={dataset:{},querySelectorAll:()=>buttons,querySelector:()=>buttons[0]};
 const doc={getElementById:k=>k==='bottom-nav'?nav:null,querySelector:sel=>sel.includes('data-page="mine"')&&!panel.hidden?panel:null};
 const win={matchMedia:q=>({matches:q.includes('max-width')}),addEventListener:(n,fn)=>handlers.set(n,fn),removeEventListener(){},setTimeout:fn=>{timers.set(++key,fn);return key;},clearTimeout:k=>timers.delete(k),requestAnimationFrame:fn=>{frames.set(++key,fn);return key;},cancelAnimationFrame:k=>frames.delete(k),performance:{now:()=>clock}};
 const dispose=installBottomTabNavigation({doc,win,app});
 const click=tab=>handlers.get('click')({target:{closest:sel=>sel==='#bottom-nav .nav-tab[data-tab]'?buttons.find(b=>b.dataset.tab===tab):null},preventDefault(){},stopImmediatePropagation(){}});
 click('map');assert.equal(app.dataset.tab,'map');assert.equal(panel.hidden,false);assert.equal(values.get('pointer-events'),'none');
 const tick=t=>{const [id,step]=[...frames.entries()][0];frames.delete(id);clock=t;step(t);};
 tick(500);assert.equal(Number(values.get('opacity')),1,'a delayed first frame must not skip the dissolve');
 tick(540);tick(580);tick(610);assert.equal(Number(values.get('opacity')),.5);
 click('mine');assert.equal(app.dataset.tab,'mine');assert.equal(panel.hidden,false);assert.equal(panel.dataset.djTabOutgoing,undefined);assert.equal(values.has('display'),false,'active display override must not survive outgoing cleanup');assert.equal(values.has('visibility'),false);
 // The mock now supports style reads, so the incoming map-to-tab fade runs too.
 assert.equal(Number(values.get('opacity')),0);assert.equal(frames.size,1);
 for(let t=650;t<=970;t+=40)tick(t);
 assert.equal(values.has('opacity'),false);assert.equal(frames.size,0);
 dispose();
});


test('route return fades the actual V3 overlay instead of retaining the legacy route adapter',()=>{
 const handlers=new Map(),frames=new Map(),timers=new Map();let key=0;
 const app={dataset:{tab:'route'}},values=new Map();
 const host={id:'dj-route-v3',dataset:{},hidden:false,inert:false,style:{setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)},removeAttribute:k=>{if(k==='data-dj-tab-outgoing')delete host.dataset.djTabOutgoing;}};
 const legacy={dataset:{page:'route'},hidden:false};
 const map={dataset:{tab:'map'},isConnected:true,disabled:false,click(){app.dataset.tab='map';legacy.hidden=true;host.hidden=host.dataset.djTabOutgoing!=='true';}};
 const nav={dataset:{},querySelectorAll:()=>[map],querySelector:()=>map};
 const doc={getElementById:k=>k==='bottom-nav'?nav:k==='dj-route-v3'?host:null,querySelector:()=>legacy};
 const win={matchMedia:q=>({matches:q.includes('max-width')}),addEventListener:(n,fn)=>handlers.set(n,fn),removeEventListener(){},setTimeout:fn=>{timers.set(++key,fn);return key;},clearTimeout:k=>timers.delete(k),requestAnimationFrame:fn=>{frames.set(++key,fn);return key;},cancelAnimationFrame:k=>frames.delete(k),performance:{now:()=>0}};
 const dispose=installBottomTabNavigation({doc,win,app});
 handlers.get('click')({target:{closest:sel=>sel==='#bottom-nav .nav-tab[data-tab]'?map:null},preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(legacy.hidden,true);assert.equal(legacy.dataset.djTabOutgoing,undefined);
 assert.equal(host.hidden,false);assert.equal(host.inert,true);
 const tick=t=>{const [id,step]=[...frames.entries()][0];frames.delete(id);step(t);};
 tick(0);tick(40);tick(80);tick(110);
 assert.equal(Number(values.get('opacity')),.5);
 tick(150);tick(190);tick(220);
 assert.equal(host.hidden,true);assert.equal(host.inert,false);assert.equal(values.has('opacity'),false);
 dispose();
});
