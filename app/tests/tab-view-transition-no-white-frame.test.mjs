import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {TAB_TRANSITION,installBottomTabNavigation} from '../src/bottom-tab-navigation.js';
import {createPrimarySurfaceTransition} from '../src/primary-surface-transition.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

function harness({canTransition=true,reduced=false}={}){
 const events=new Map(),navEvents=new Map(),classNames=new Set();
 const values=new Map(),priorities=new Map(),frames=new Map(),listeners=new Map();let nextFrame=0;
 const panel={hidden:true,dataset:{page:'news'},
  classList:{add:value=>classNames.add(value),remove:value=>classNames.delete(value)},
  style:{getPropertyValue:k=>values.get(k)||'',getPropertyPriority:k=>priorities.get(k)||'',setProperty(k,v,p){values.set(k,v);priorities.set(k,p);},removeProperty(k){values.delete(k);priorities.delete(k);}},
  getBoundingClientRect:()=>({width:390,height:844}),
  addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
 const app={dataset:{tab:'map'}};
 const button={disabled:false,isConnected:true,dataset:{tab:'news'},clicks:0,click(){
  this.clicks++;app.dataset.tab='news';panel.hidden=false;
 }};
 const nav={dataset:{},querySelectorAll:()=>[button],querySelector:()=>button,
  addEventListener:(n,fn)=>navEvents.set(n,fn),removeEventListener:n=>navEvents.delete(n)};
 let started=0,delayed=0,reset=null;
 const doc={
  getElementById:id=>id==='bottom-nav'?nav:null,
  querySelector:selector=>selector.includes('data-page="news"')&&!panel.hidden?panel:null,
  startViewTransition:canTransition?()=>{started++;throw Error('GPU snapshot must be bypassed');}:undefined
 };
 const win={matchMedia:q=>({matches:q.includes('reduced-motion')?reduced:true}),
  addEventListener:(n,fn)=>events.set(n,fn),
  removeEventListener:n=>events.delete(n),
  setTimeout:fn=>{delayed++;reset=fn;return delayed;},
  clearTimeout:()=>{},getComputedStyle:()=>({display:'flex',visibility:'visible',opacity:'1'}),
  requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id)};
 const cleanup=installBottomTabNavigation({doc,win,app});
 const click=()=>events.get('click')({target:{closest:s=>s.includes('.nav-tab')?button:null},
  preventDefault(){},stopImmediatePropagation(){},isTrusted:true});
 return {click,button,app,panel,classNames,cleanup,flush:()=>reset?.(),
  started:()=>started,delayed:()=>delayed,values,tick:(now=0)=>{const [id,fn]=frames.entries().next().value||[];if(fn){frames.delete(id);fn(now);}},end:()=>listeners.get('transitionend')?.({target:panel,propertyName:'opacity'})};
}

test('phone tab switches real DOM immediately and animates content, never white root snapshots',()=>{
 const h=harness();
 h.click();
 assert.equal(h.started(),0,'GPU root snapshot engine must not be invoked');
 assert.equal(h.button.clicks,1,'tab state updates within same user event');
 assert.equal(h.app.dataset.tab,'news');
 assert.equal(h.panel.hidden,false);
 assert.equal(h.classNames.has('dj-tab-content-enter'),false,'legacy entrance class is not applied');
 assert.equal(h.panel.dataset.djPrimaryTransition,'incoming');
 assert.equal(h.values.get('opacity'),'0');
 h.tick(0);h.tick(1000);
 assert.equal(h.values.get('transition'),'none');
 const a=Number(h.values.get('opacity'));
 assert.ok(a>0&&a<.2,'long renderer stall must not skip to the final frame');
 h.tick(2000);
 const b=Number(h.values.get('opacity'));
 assert.ok(b>a&&b<1,'second rendered frame must retain intermediate opacity');
 for(let i=3;i<=11;i++)h.tick(i*1000);
 assert.equal(h.panel.dataset.djPrimaryTransition,undefined);
 assert.equal(h.values.has('opacity'),false);
 assert.equal(h.values.has('transition'),false);
 assert.equal(h.app.dataset.djPrimaryDissolving,undefined);
 const primary=read('src/primary-surface-transition.js');
 const toolbar=read('src/v845-mobile-motion.js');
 assert.match(read('src/bottom-tab-navigation.js'),/createPrimarySurfaceTransition\(\{doc,win,app,replay,reduced\}\)/);
 assert.match(primary,/app\.dataset\.tab!==destination\|\|\(incoming&&incoming\.hidden\)/);
 assert.match(toolbar,/if\(primaryOwnsPaint\(\)\)/);
 const js=read('src/bottom-tab-navigation.js');
 const built=new URL('../src/mobile-next.css',import.meta.url);
 const css=readFileSync(existsSync(built)?built:new URL('../../frontend/production/mobile-next.css',import.meta.url),'utf8');
 assert.equal(js.includes('startViewTransition'),false);
 assert.equal(js.includes("createElement('div')"),false);
 assert.doesNotMatch(css,/::view-transition-(old|new)\(root\)/);
 assert.match(css,/\.page-panel\.dj-tab-content-enter:not\(\[hidden\]\)/);
 assert.match(js,/if\(communityNews\(previousTab\)\|\|communityNews\(destination\)\)\{dissolvePrimary/);
 assert.deepEqual(TAB_TRANSITION,{contentReveal:260,mapReturn:220});
 h.cleanup();
});

test('browser lacking native snapshot support renders the new tab on the same click',()=>{
 const h=harness({canTransition:false});
 h.click();
 assert.equal(h.button.clicks,1);
 assert.equal(h.started(),0);
 h.cleanup();
});

test('prefers-reduced-motion renders immediately without any visual animation',()=>{
 const h=harness({reduced:true});
 h.click();
 assert.equal(h.button.clicks,1);
 assert.equal(h.started(),0);
 assert.equal(h.classNames.has('dj-tab-content-enter'),false);
 assert.equal(h.delayed(),0);
 h.cleanup();
});

test('external navigation invalidates a pending primary presentation without reopening it',()=>{
 const h=harness();h.click();h.tick(0);
 h.app.dataset.tab='map';h.panel.hidden=true;h.tick(40);
 assert.equal(h.panel.hidden,true);
 assert.equal(h.app.dataset.djPrimaryDissolving,undefined);
 assert.equal(h.panel.dataset.djPrimaryTransition,undefined);
 assert.equal(h.values.has('opacity'),false);
 h.cleanup();
});


test('community and news directly dissolve incoming content above an opaque outgoing page in both directions',()=>{
 for(const [from,to] of [['participate','news'],['news','participate']]){
  const page=key=>{const values=new Map();return {hidden:false,dataset:{page:key},values,style:{getPropertyValue:k=>values.get(k)||'',getPropertyPriority:()=>'',setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)}};};
  const previous=page(from),incoming=page(to);incoming.hidden=true;
  const app={dataset:{tab:from}};let raf=null;let count=0;
  const win={requestAnimationFrame:fn=>{raf=fn;return ++count;},cancelAnimationFrame:()=>{},setTimeout:()=>1,clearTimeout:()=>{},getComputedStyle:()=>({display:'flex',visibility:'visible'})};
  const doc={getElementById:()=>null,querySelector:()=>incoming.hidden?null:incoming};
  const owner=createPrimarySurfaceTransition({doc,win,app,reduced:()=>false,replay:()=>{app.dataset.tab=to;incoming.hidden=false;return true;}});
  owner.dissolvePrimary({dataset:{tab:to}},from,previous);
  assert.equal(previous.hidden,false);assert.equal(previous.values.get('opacity'),'1');
  assert.equal(incoming.values.get('opacity'),'0');assert.ok(Number(incoming.values.get('z-index'))>Number(previous.values.get('z-index')));
  raf(0);raf(32);const a=Number(incoming.values.get('opacity'));assert.ok(a>0&&a<1);
  // A late legacy style/hidden write cannot blank or cover the old page.
  previous.hidden=true;previous.style.setProperty('opacity','0');incoming.style.setProperty('z-index','1');raf(64);
  assert.equal(previous.hidden,false);assert.equal(previous.values.get('opacity'),'1');assert.equal(incoming.values.get('z-index'),'7001');
  assert.ok(Number(incoming.values.get('opacity'))>a);
  for(let i=3;i<=11;i++)raf(i*32);
  assert.equal(previous.hidden,true);assert.equal(incoming.hidden,false);assert.equal(incoming.values.has('opacity'),false);assert.equal(app.dataset.djPrimaryDissolving,undefined);
 }
});
