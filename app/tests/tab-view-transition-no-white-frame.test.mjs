import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {TAB_TRANSITION,installBottomTabNavigation} from '../src/bottom-tab-navigation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

function harness({canTransition=true,reduced=false}={}){
 const events=new Map(),navEvents=new Map(),classNames=new Set();
 const panel={hidden:true,dataset:{page:'news'},
  classList:{add:value=>classNames.add(value),remove:value=>classNames.delete(value)}};
 const app={dataset:{tab:'map'}};
 const button={disabled:false,isConnected:true,dataset:{tab:'news'},clicks:0,click(){
  this.clicks++;app.dataset.tab='news';panel.hidden=false;
 }};
 const nav={dataset:{},querySelectorAll:()=>[button],querySelector:()=>button,
  addEventListener:(n,fn)=>navEvents.set(n,fn),removeEventListener:n=>navEvents.delete(n)};
 let started=0,delayed=0,reset=null;
 const doc={
  getElementById:()=>nav,
  querySelector:selector=>selector.includes('data-page="news"')&&!panel.hidden?panel:null,
  startViewTransition:canTransition?()=>{started++;throw Error('GPU snapshot must be bypassed');}:undefined
 };
 const win={matchMedia:q=>({matches:q.includes('reduced-motion')?reduced:true}),
  addEventListener:(n,fn)=>events.set(n,fn),
  removeEventListener:n=>events.delete(n),
  setTimeout:fn=>{delayed++;reset=fn;return delayed;},
  clearTimeout:()=>{}};
 const cleanup=installBottomTabNavigation({doc,win,app});
 const click=()=>events.get('click')({target:{closest:s=>s.includes('.nav-tab')?button:null},
  preventDefault(){},stopImmediatePropagation(){},isTrusted:true});
 return {click,button,app,panel,classNames,cleanup,flush:()=>reset?.(),
  started:()=>started,delayed:()=>delayed};
}

test('phone tab switches real DOM immediately and animates content, never white root snapshots',()=>{
 const h=harness();
 h.click();
 assert.equal(h.started(),0,'GPU root snapshot engine must not be invoked');
 assert.equal(h.button.clicks,1,'tab state updates within same user event');
 assert.equal(h.app.dataset.tab,'news');
 assert.equal(h.panel.hidden,false);
 assert.equal(h.classNames.has('dj-tab-content-enter'),true);
 assert.equal(h.delayed(),1,'timer only cleans up content class');
 h.flush();
 assert.equal(h.classNames.has('dj-tab-content-enter'),false);
 const js=read('src/bottom-tab-navigation.js');
 const built=new URL('../src/mobile-next.css',import.meta.url);
 const css=readFileSync(existsSync(built)?built:new URL('../../frontend/production/mobile-next.css',import.meta.url),'utf8');
 assert.equal(js.includes('startViewTransition'),false);
 assert.equal(js.includes("createElement('div')"),false);
 assert.doesNotMatch(css,/::view-transition-(old|new)\(root\)/);
 assert.match(css,/\.page-panel\.dj-tab-content-enter:not\(\[hidden\]\)/);
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
