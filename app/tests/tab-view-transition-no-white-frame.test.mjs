import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TAB_TRANSITION,installBottomTabNavigation} from '../src/bottom-tab-navigation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

function harness({canTransition=true,reduced=false}={}){
 const events=new Map();
 const navEvents=new Map();
 const button={disabled:false,isConnected:true,dataset:{tab:'news'},clicks:0,click(){this.clicks++;app.dataset.tab='news';}};
 const nav={dataset:{},querySelectorAll:()=>[button],querySelector:()=>button,
   addEventListener:(n,fn)=>navEvents.set(n,fn),removeEventListener:n=>navEvents.delete(n)};
 const app={dataset:{tab:'map'}};
 let update=null,done=null,started=0,skipped=0;
 const doc={
  getElementById:()=>nav,
  startViewTransition:canTransition?fn=>{
   started++;update=fn;
   const finished=new Promise(resolve=>{done=resolve;});
   return {finished,skipTransition(){skipped++;fn();done();},updateCallbackDone:Promise.resolve()};
  }:undefined
 };
 const win={matchMedia:query=>({matches:query.includes('reduced-motion')?reduced:true}),
   addEventListener:(n,fn)=>events.set(n,fn),
   removeEventListener:n=>events.delete(n),
   setTimeout:()=>1,clearTimeout:()=>{}};
 const cleanup=installBottomTabNavigation({doc,win,app});
 const click=()=>events.get('click')({target:{closest:s=>s.includes('.nav-tab')?button:null},
    preventDefault(){},stopImmediatePropagation(){},isTrusted:true});
 return {click,button,app,cleanup,flush:()=>{if(update)update();if(done)done();},
   started:()=>started,skipped:()=>skipped};
}
test('native View Transition snapshots are used instead of any white intermediate DOM surface',async()=>{
 const h=harness();
 h.click();
 assert.equal(h.started(),1);
 assert.equal(h.button.clicks,0,'native callback, not a timed white mask, swaps DOM');
 h.flush();
 assert.equal(h.button.clicks,1);
 await Promise.resolve();
 h.cleanup();
 const js=read('src/bottom-tab-navigation.js');
 assert.equal(js.includes("createElement('div')"),false);
 assert.equal(js.includes('curtain.hidden=false'),false);
 assert.equal(TAB_TRANSITION.crossfade,170);
});
test('unsupported native animation updates page directly instead of showing an empty frame',()=>{
 const h=harness({canTransition:false});
 h.click();
 assert.equal(h.button.clicks,1);
 assert.equal(h.started(),0);
 h.cleanup();
});
test('prefers-reduced-motion bypasses transitions and retains navigation',()=>{
 const h=harness({reduced:true});
 h.click();
 assert.equal(h.button.clicks,1);
 assert.equal(h.started(),0);
 h.cleanup();
});
