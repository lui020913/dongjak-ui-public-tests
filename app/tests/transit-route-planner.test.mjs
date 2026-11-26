import test from 'node:test';
import assert from 'node:assert/strict';
import {directBusPairs,busSegment,findTransitOptions} from '../src/transit-route-planner.mjs';
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
