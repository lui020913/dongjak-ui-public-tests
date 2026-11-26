import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrimarySurfaceTransition} from '../src/primary-surface-transition.js';
function fixture(){
 const nodes=new Map(),frames=new Map(),timers=new Map();let seq=0;
 const app={dataset:{tab:'news'},inert:false,querySelector:()=>null};
 for(const [key,id] of [['news','news-panel'],['participate','participation-panel']]){
   const vals=new Map();
   nodes.set(id,{id,dataset:{page:key},hidden:key==='participate',style:{getPropertyValue:k=>vals.get(k)?.[0]||'',getPropertyPriority:k=>vals.get(k)?.[1]||'',setProperty:(k,v,p)=>vals.set(k,[v,p]),removeProperty:k=>vals.delete(k)}});
 }
 const doc={getElementById:id=>nodes.get(id)||null,querySelector:()=>null};
 const win={getComputedStyle:()=>({display:'flex',visibility:'visible'}),requestAnimationFrame:f=>{frames.set(++seq,f);return seq;},cancelAnimationFrame:i=>frames.delete(i),setTimeout:f=>{timers.set(++seq,f);return seq;},clearTimeout:i=>timers.delete(i)};
 const news=nodes.get('news-panel'),community=nodes.get('participation-panel');
 const ctrl=createPrimarySurfaceTransition({doc,win,app,reduced:()=>false,replay:button=>{app.dataset.tab=button.dataset.tab;news.hidden=true;community.hidden=true;return true;}});
 const tick=t=>{const entries=[...frames];frames.clear();for(const [,f] of entries)f(t);};
 return {app,news,community,ctrl,tick,frames};
}
test('stable primary IDs retain direct cross dissolve even when legacy hides the logical panels',()=>{
 const {news,community,ctrl,tick,frames}=fixture();
 news.hidden=true;
 ctrl.dissolvePrimary({dataset:{tab:'participate'}},'news',null);
 assert.equal(news.hidden,false);assert.equal(community.hidden,false);
 assert.equal(news.style.getPropertyValue('opacity'),'1');assert.equal(community.style.getPropertyValue('opacity'),'0');
 tick(0);community.hidden=true;tick(32);tick(64);tick(96);
 assert.equal(community.hidden,false);assert.ok(Number(community.style.getPropertyValue('opacity'))>.12);
 assert.equal(news.style.getPropertyValue('opacity'),'1');
 for(let i=128;i<=352;i+=32)tick(i);
 assert.equal(news.hidden,true);assert.equal(community.hidden,false);assert.equal(frames.size,0);
 assert.equal(community.dataset.djPrimaryTransition,undefined);
});
test('explicit logical tab changes cancel stale primary transitions',()=>{
 const {app,news,community,ctrl,tick,frames}=fixture();
 ctrl.dissolvePrimary({dataset:{tab:'participate'}},'news',news);
 community.hidden=true;app.dataset.tab='map';tick(0);
 assert.equal(community.hidden,true);assert.equal(news.hidden,true);assert.equal(frames.size,0);
});
test('explicit composer ownership cancels the underlying dissolve',()=>{
 const {app,news,community,ctrl,tick,frames}=fixture();
 ctrl.dissolvePrimary({dataset:{tab:'participate'}},'news',news);
 app.inert=true;tick(0);
 assert.equal(frames.size,0);assert.equal(news.hidden,true);assert.equal(community.dataset.djPrimaryTransition,undefined);
});

test('explicit report-location dismissal cannot be reopened by compositor frames',()=>{
 const {app,news,community,ctrl,tick,frames}=fixture();
 app.dataset.tab='participate';community.hidden=false;news.hidden=true;
 ctrl.dissolvePrimary({dataset:{tab:'news'}},'participate',community);
 assert.equal(community.hidden,false);
 app.dataset.communityFeedLocked='true';community.hidden=true;
 tick(32);
 assert.equal(community.hidden,true);assert.equal(frames.size,0);
 app.dataset.tab='participate';
 ctrl.dissolvePrimary({dataset:{tab:'map'}},'participate',community);
 assert.equal(community.hidden,true);assert.equal(frames.size,0);
});
