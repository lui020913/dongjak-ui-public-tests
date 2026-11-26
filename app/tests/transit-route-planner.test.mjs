import test from 'node:test';
import assert from 'node:assert/strict';
import {directBusPairs,busSegment} from '../src/transit-route-planner.mjs';
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
