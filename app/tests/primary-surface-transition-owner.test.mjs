import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrimarySurfaceTransition} from '../src/primary-surface-transition.js';
function fixture(){
 const nodes=new Map(),frames=new Map(),timers=new Map();let seq=0,now=0;
 const app={dataset:{tab:'news'},inert:false,querySelector:()=>null};
 for(const [key,id] of [['news','news-panel'],['participate','participation-panel']]){
   const vals=new Map();
   nodes.set(id,{id,dataset:{page:key},hidden:key==='participate',style:{getPropertyValue:k=>vals.get(k)?.[0]||'',getPropertyPriority:k=>vals.get(k)?.[1]||'',setProperty:(k,v,p)=>vals.set(k,[v,p]),removeProperty:k=>vals.delete(k)}});
 }
 const doc={getElementById:id=>nodes.get(id)||null,querySelector:()=>null};
 const win={performance:{now:()=>now},getComputedStyle:()=>({display:'flex',visibility:'visible'}),requestAnimationFrame:f=>{frames.set(++seq,f);return seq;},cancelAnimationFrame:i=>frames.delete(i),setTimeout:f=>{timers.set(++seq,f);return seq;},clearTimeout:i=>timers.delete(i)};
 const news=nodes.get('news-panel'),community=nodes.get('participation-panel');
 const ctrl=createPrimarySurfaceTransition({doc,win,app,reduced:()=>false,replay:button=>{app.dataset.tab=button.dataset.tab;news.hidden=true;community.hidden=true;return true;}});
 const tick=t=>{now=t;const entries=[...frames];frames.clear();for(const [,f] of entries)f(t);};
 return {app,news,community,ctrl,tick,frames,timers,setClock:t=>{now=t;}};
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

test('sparse frames cannot extend the outgoing panel watchdog; the committed tab remains usable',()=>{
 const {app,news,community,ctrl,tick,frames,timers}=fixture();
 ctrl.dissolvePrimary({dataset:{tab:'participate'}},'news',news);
 const [deadline]=timers.keys();assert.ok(deadline);
 tick(0);tick(1100);tick(2400);tick(3700);
 assert.deepEqual([...timers.keys()],[deadline],'the same absolute deadline survives every sparse frame');
 assert.equal(news.hidden,false);assert.equal(community.hidden,false);
 timers.get(deadline)();
 assert.equal(app.dataset.tab,'participate');assert.equal(news.hidden,true);assert.equal(community.hidden,false);
 assert.equal(news.dataset.djTabOutgoing,undefined);assert.equal(news.dataset.djPrimaryTransition,undefined);
 assert.equal(news.style.getPropertyValue('display'),'');assert.equal(app.dataset.djPrimaryDissolving,undefined);assert.equal(frames.size,0);
});


test('a late watchdog after a blocked event loop gives the live transition one bounded recovery window',()=>{
 const {app,news,community,ctrl,tick,frames,timers,setClock}=fixture();
 ctrl.dissolvePrimary({dataset:{tab:'participate'}},'news',news);
 tick(0);tick(32);tick(64);
 const [deadline]=timers.keys();const onDeadline=timers.get(deadline);
 setClock(7800);timers.delete(deadline);onDeadline();
 assert.equal(news.hidden,false);assert.equal(community.hidden,false);
 const [grace]=timers.keys();assert.notEqual(grace,deadline);
 tick(7800);tick(7832);tick(7864);
 assert.ok(Number(community.style.getPropertyValue('opacity'))>.12);
 assert.equal(news.style.getPropertyValue('opacity'),'1');
 for(let i=7896;i<=8184;i+=32)tick(i);
 assert.equal(news.hidden,true);assert.equal(community.hidden,false);
 assert.equal(frames.size,0);assert.equal(timers.size,0);
 assert.equal(app.dataset.djPrimaryDissolving,undefined);
});
test('the recovery deadline releases the outgoing surface even if rendering remains blocked',()=>{
 const {news,community,ctrl,tick,timers,frames,setClock}=fixture();
 ctrl.dissolvePrimary({dataset:{tab:'participate'}},'news',news);
 tick(0);const [deadline]=timers.keys();const onDeadline=timers.get(deadline);
 setClock(8000);timers.delete(deadline);onDeadline();
 const [grace]=timers.keys();setClock(16000);timers.get(grace)();
 assert.equal(news.hidden,true);assert.equal(community.hidden,false);
 assert.equal(frames.size,0);assert.equal(timers.size,0);
});
