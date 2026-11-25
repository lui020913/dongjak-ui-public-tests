import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArrivals,validDate,extractRows,fetchArrivalHistory} from '../server/bus-arrival-history.mjs';
const query={routeId:'100100012',stationId:'207000427',seq:'1',date:'20211219'};
const row={routeId:query.routeId,stdrDe:query.date,sttnId:query.stationId,sttnSn:'1',runSn:'1',planId:'1',arvlDt:'20211219041000'};
test('exact route, stop, sequence, date; reject ETA and invalid dates',()=>{
 assert.equal(validDate('20260230'),false);
 assert.deepEqual(normalizeArrivals([row,row,{...row,sttnSn:'2'},{...row,routeId:'100000001'},{...row,arvlDt:'곧 도착'}],query),[{date:'20211219',time:'04:10:00',run:'1'}]);
 assert.throws(()=>extractRows({error:'denied'}),/HISTORY_FORMAT/);
});
test('paginated measured rows, never send key to client',async()=>{
 let calls=0;const r=await fetchArrivalHistory(query,'secret',{pageSize:1,fetcher:async url=>{assert.equal(url.searchParams.get('routeId'),query.routeId);return new Response(JSON.stringify(calls++?[ ]:[row]));}});
 assert.equal(r.complete,true);assert.equal(r.arrivals.length,1);assert.equal(JSON.stringify(r).includes('secret'),false);
});
test('pagination cap reports partial, not a complete timetable',async()=>{
 const r=await fetchArrivalHistory(query,'secret',{pageSize:1,maxPages:1,fetcher:async()=>new Response(JSON.stringify([row]))});
 assert.equal(r.status,'partial');assert.equal(r.complete,false);
});

test('same-origin trailing-slash redirect retains official query and rejects external redirects',async()=>{
 let calls=0;const r=await fetchArrivalHistory(query,'secret',{fetcher:async url=>{calls++;if(calls===1)return new Response(null,{status:302,headers:{Location:url.pathname+'/'}});assert.equal(url.searchParams.get('apikey'),'secret');return new Response(JSON.stringify([row]));}});assert.equal(r.arrivals.length,1);assert.equal(calls,2);
 await assert.rejects(fetchArrivalHistory(query,'secret',{fetcher:async()=>new Response(null,{status:302,headers:{Location:'https://example.com/'}})}),/HISTORY_REDIRECT/);
});
test('API error envelopes are not treated as empty arrival history',async()=>{
 await assert.rejects(fetchArrivalHistory(query,'secret',{fetcher:async()=>new Response(JSON.stringify({responseCode:403,message:'denied'}))}),/HISTORY_AUTH/);
});
