import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/transport/[[path]].js';
const fixed=Date.parse('2026-11-10T02:54:00+09:00');
const src=(d)=>({subwayId:'1007',statnNm:'숭실대입구',updnLine:'상행',arvlMsg2:'9분 후',barvlDt:'540',recptnDt:d});
test('subway API exposes sourceTimestamp and never converts query-time into source-time',async()=>{
 const prev=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({errorMessage:{code:'INFO-000'},realtimeArrivalList:[src('2026-11-09 23:00:00')]}));
  const r=await onRequest({request:new Request('https://example.pages.dev/api/transport/subway?station=%EC%88%AD%EC%8B%A4%EB%8C%80%EC%9E%85%EA%B5%AC'),env:{SEOUL_SUBWAY_API_KEY:'dummy'}});
  const j=await r.json();
  assert.equal(j.items.length,0);assert.equal(j.sourceStatus,'stale');
  assert.equal(j.sourceTimestamp,'');
  assert.ok(j.checkedAt);assert.equal(r.headers.get('Cache-Control'),'no-store');
 }finally{globalThis.fetch=prev;}
});
test('bus API returns query time and does not claim source timestamps',async()=>{
 const prev=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({msgHeader:{headerCd:0},msgBody:{itemList:[{rtNm:'501',arrmsg1:'운행종료'}]}}));
  const r=await onRequest({request:new Request('https://example.pages.dev/api/transport/bus?arsId=12345'),env:{SEOUL_BUS_SERVICE_KEY:'dummy'}});
  const j=await r.json();assert.equal(j.sourceStatus,'unverified');assert.equal(j.sourceTimestamp,'');
  assert.equal(j.items[0].message,'운행종료');
 }finally{globalThis.fetch=prev;}
});
