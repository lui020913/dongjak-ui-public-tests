import test from 'node:test';
import assert from 'node:assert/strict';
import {directBusPairs,busSegment,findTransitOptions,transferCandidates} from '../src/transit-route-planner.mjs';
const a={seq:1,arsId:'20001',lng:126.95,lat:37.50},b={seq:2,arsId:'20002',lng:126.951,lat:37.50},c={seq:3,arsId:'20003',lng:126.952,lat:37.50};
test('direct bus follows official stop order and rejects reverse travel',()=>{
 assert.equal(directBusPairs([c,a,b],new Set([a.arsId]),new Set([c.arsId]))[0].stopCount,2);
 assert.deepEqual(directBusPairs([a,b,c],new Set([c.arsId]),new Set([a.arsId])),[]);
});
test('geometry requires every boarding/intermediate/alighting stop in order',()=>{
 const coords=[[a.lng,a.lat],[b.lng,b.lat],[c.lng,c.lat]];
 assert.deepEqual(busSegment(coords,[a,b,c]),coords);
 assert.equal(busSegment(coords,[c,b,a]),null);
 assert.equal(busSegment(coords,[a,{...b,lat:37.6},c]),null);
});

test('official candidate retains vehicle type and no fabricated transit duration',async()=>{
 const fixture={source:'서울시 버스정류소 위치정보',sourceDate:'2026-11-01',stops:[
  {...a,name:'승차 정류소'},{...b,name:'중간 정류소'},{...c,name:'하차 정류소'},
  ...Array.from({length:1000},(_,i)=>({arsId:String(30000+i),name:'다른 정류소 '+i,lng:127.1,lat:37.6}))
 ]};
 const response=data=>({ok:true,json:async()=>data});
 const options=await findTransitOptions(a,c,{fetcher:async url=>{
  if(url.startsWith('/data/'))return response(fixture);
  if(url.includes('/bus?'))return response({items:[{routeId:'100000001',route:'동작01',routeType:'7'}]});
  if(url.includes('/bus/route-path?'))return response({routeId:'100000001',coordinates:[[a.lng,a.lat],[b.lng,b.lat],[c.lng,c.lat]],stops:[{...a,name:'승차'},{...b,name:'중간'},{...c,name:'하차'}]});
  throw Error('unexpected request');
 }});
 assert.equal(options.bus.length,1);
 assert.equal(options.bus[0].routeType,'7');
 assert.equal(options.bus[0].route,'동작01');
 assert.equal(options.bus[0].minutes,undefined);
});
test('malformed coordinate points never become a verified segment',()=>{
 assert.equal(busSegment([[a.lng,a.lat,0],[b.lng,b.lat,0],[c.lng,c.lat,0]],[a,b,c]),null);
});

test('one bus transfer uses two ordered verified vehicle legs and nearby transfer stops',()=>{
 const stop=(seq,arsId,lng,lat=37.50)=>({seq,arsId,lng,lat,name:arsId});
 const x=stop(1,'20001',126.950),y=stop(2,'20002',126.953),z=stop(1,'20003',126.9532),w=stop(2,'20004',126.956);
 const record=(id,stops)=>({id,name:id,routeType:'7',stops,coordinates:stops.map(s=>[s.lng,s.lat])});
 const records=[record('100000001',[x,y]),record('100000002',[z,w])];
 const result=transferCandidates(records,x,w,new Set([x.arsId]),new Set([w.arsId]));
 assert.equal(result.busTransfer.length,1);
 assert.deepEqual(result.busTransfer[0].legs.map(l=>l.routeId),['100000001','100000002']);
 assert.equal(result.busTransfer[0].changes,1);
 assert.equal(result.busTransfer[0].minutes,undefined);
 assert.equal(transferCandidates(records,x,w,new Set([x.arsId]),new Set([w.arsId]),{maxTransferM:1}).busTransfer.length,0);
 assert.equal(transferCandidates(records,w,x,new Set([w.arsId]),new Set([x.arsId])).busTransfer.length,0);
});
test('bus to rail candidate uses known station order and does not fabricate total duration',()=>{
 const x={seq:1,arsId:'20001',lng:126.961,lat:37.501,name:'출발 정류장'};
 const y={seq:2,arsId:'20002',lng:126.963708,lat:37.50877,name:'흑석역 정류장'};
 const to={lng:126.941005,lat:37.513534};
 const records=[{id:'100000001',name:'버스',routeType:'7',stops:[x,y],coordinates:[[x.lng,x.lat],[y.lng,y.lat]]}];
 const result=transferCandidates(records,x,to,new Set([x.arsId]),new Set());
 const plan=result.mixed.find(p=>p.legs[0].kind==='bus');
 assert.ok(plan);
 assert.equal(plan.legs[1].kind,'rail');
 assert.equal(plan.legs[1].stops[0],'흑석');
 assert.equal(plan.minutes,undefined);
});

test('bus–rail–bus candidate supports two ordered transfers without a synthetic ETA',()=>{
 const a={seq:1,arsId:'20001',lng:126.961,lat:37.501,name:'출발'};
 const b={seq:2,arsId:'20002',lng:126.963708,lat:37.50877,name:'흑석'};
 const c={seq:1,arsId:'20003',lng:126.941005,lat:37.513534,name:'노량진'};
 const d={seq:2,arsId:'20004',lng:126.937,lat:37.508,name:'도착'};
 const record=(id,stops)=>({id,name:id,routeType:'7',stops,coordinates:stops.map(p=>[p.lng,p.lat])});
 const result=transferCandidates([record('100000001',[a,b]),record('100000002',[c,d])],a,d,new Set([a.arsId]),new Set([d.arsId]));
 const plan=result.mixed.find(p=>p.legs.length===3);
 assert.ok(plan);
 assert.deepEqual(plan.legs.map(l=>l.kind),['bus','rail','bus']);
 assert.equal(plan.changes,2);
 assert.equal(plan.minutes,undefined);
});
