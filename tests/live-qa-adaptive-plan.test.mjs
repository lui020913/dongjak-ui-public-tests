import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGN, FUNCTIONAL, makePlan, appendHistory} from '../scripts/live-qa-adaptive-plan.mjs';

test('each release selects six distinct lane-bound design focuses and six function targets',()=>{
 const p=makePlan({seed:'run-1',purpose:'다크 테마 전환, 레이어 닫기'});
 assert.equal(p.design.length,6);
 assert.equal(p.functional.length,6);
 assert.deepEqual(p.design.map(x=>x.lane),[1,2,3,4,5,6]);
 assert.equal(new Set(p.design.map(x=>x.id)).size,6);
 assert.equal(new Set(p.functional.map(x=>x.id)).size,6);
 for(const kind of ['design','functional']){
  const counts={random:0,recent:0,regression:0};
  for(const x of p[kind])counts[x.mode]++;
  assert.deepEqual(counts,{random:4,recent:1,regression:1});
 }
 for(const x of p.design)assert(DESIGN[x.lane-1].some(v=>v.id===x.id));
 for(const x of p.functional)assert(FUNCTIONAL.some(v=>v.id===x.id));
});
test('a given release seed is reproducible',()=>{
 const p=makePlan({seed:'run-33',purpose:'AI 검색 창'});
 const q=makePlan({seed:'run-33',purpose:'AI 검색 창'});
 assert.deepEqual(p.design,q.design);
 assert.deepEqual(p.functional,q.functional);
});
test('the prior two rounds are excluded where candidates remain',()=>{
 const a=makePlan({seed:'first'});
 const b=makePlan({seed:'second',history:appendHistory({},a,'a')});
 const h=appendHistory(appendHistory({},a,'a'),b,'b');
 const c=makePlan({seed:'third',history:h});
 const recentDesign=new Set([...a.design,...b.design].map(x=>x.id));
 for(const x of c.design)assert(!recentDesign.has(x.id));
 const recentFunctional=new Set([...a.functional,...b.functional].map(x=>x.id));
 for(const x of c.functional)assert(!recentFunctional.has(x.id));
});
test('history is bounded and does not duplicate retries for the same run',()=>{
 let h={rounds:[]};
 for(let i=1;i<=19;i++)h=appendHistory(h,makePlan({seed:String(i)}),String(i));
 assert.equal(h.rounds.length,16);
 const next=appendHistory(h,makePlan({seed:'19'}),'19');
 assert.equal(next.rounds.length,16);
 assert.equal(next.rounds.filter(r=>r.runId==='19').length,1);
});
