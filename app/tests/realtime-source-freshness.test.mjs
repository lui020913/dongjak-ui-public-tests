import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSeoulSubwayFeed,parseSeoulArrivalTime,seoulHHMM} from '../src/transport-freshness.js';
import {parseSeoulSubwayArrival} from '../src/transport-data.js';
import {onRequest} from '../functions/api/transport/[[path]].js';
const LOCAL_NOW=Date.parse('2026-11-10T02:56:00+09:00');
const row=(source='2026-11-10 02:55:20',seconds='540')=>({
  subwayId:'1007',statnNm:'숭실대입구',updnLine:'상행',trainLineNm:'장암행',
  arvlMsg2:'9분 후',barvlDt:seconds,recptnDt:source
});
test('TOPIS recptnDt is parsed in Seoul local time, including day changes',()=>{
  assert.equal(parseSeoulArrivalTime('2026-11-10 02:55:20'),Date.parse('2026-11-10T02:55:20+09:00'));
  assert.equal(parseSeoulArrivalTime('2026-11-09 23:59:00'),Date.parse('2026-11-09T23:59:00+09:00'));
  assert.equal(parseSeoulArrivalTime('2026-02-30 02:55:20'),Number.NaN);
  assert.ok(Number.isNaN(parseSeoulArrivalTime('yesterday')));
  assert.equal(seoulHHMM(parseSeoulArrivalTime('2026-11-10 02:55:20')),'02:55');
});
test('a train from the previous evening is never displayed as live at 02:56',()=>{
  const result=validateSeoulSubwayFeed({realtimeArrivalList:[row('2026-11-09 23:43:10')]},{nowMs:LOCAL_NOW});
  assert.equal(result.state,'stale');
  assert.deepEqual(result.rows,[]);
  assert.equal(result.sourceAt,'23:43');
  assert.match(result.message,/오래/);
});
test('a fresh TOPIS row is retained and ETA reduced by source delay',()=>{
  const result=validateSeoulSubwayFeed({realtimeArrivalList:[row()]},{nowMs:LOCAL_NOW});
  assert.equal(result.state,'ok');
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].barvlDt,'500');
  assert.equal(parseSeoulSubwayArrival({realtimeArrivalList:result.rows})[0].message,'약 9분 후');
  assert.equal(result.sourceAt,'02:55');
});
test('missing timestamps, future timestamps and already-passed ETAs are hidden',()=>{
  assert.equal(validateSeoulSubwayFeed({realtimeArrivalList:[row('',540)]},{nowMs:LOCAL_NOW}).state,'unverified');
  assert.equal(validateSeoulSubwayFeed({realtimeArrivalList:[row('2026-11-10 03:10:00')]},{nowMs:LOCAL_NOW}).state,'stale');
  const expired=validateSeoulSubwayFeed({realtimeArrivalList:[row('2026-11-10 02:55:00','20')]},{nowMs:LOCAL_NOW});
  assert.equal(expired.state,'expired');
  assert.deepEqual(expired.rows,[]);
});
test('fresh/stale mixed response shows only fresh, without hiding special late-night services',()=>{
  const result=validateSeoulSubwayFeed({realtimeArrivalList:[row('2026-11-09 22:00:00'),row('2026-11-10 02:55:20')]},{nowMs:LOCAL_NOW});
  assert.equal(result.state,'ok');
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].recptnDt,'2026-11-10 02:55:20');
});
test('Pages backend refuses to relabel stale TOPIS source as new live data',async()=>{
  const prev=globalThis.fetch;
  try{
    globalThis.fetch=async url=>{
      if(!String(url).includes('realtimeStationArrival'))throw new Error('unexpected endpoint');
      return new Response(JSON.stringify({errorMessage:{code:'INFO-000'},realtimeArrivalList:[row('2024-01-01 22:00:00')]}));
    };
    const response=await onRequest({request:new Request('https://test.pages.dev/api/transport/subway?station=%EC%88%AD%EC%8B%A4%EB%8C%80%EC%9E%85%EA%B5%AC'),
      env:{SEOUL_SUBWAY_API_KEY:'SECRET'}});
    const data=await response.json();
    assert.equal(response.status,200);
    assert.equal(data.sourceStatus,'stale');
    assert.equal(data.updatedAt,'22:00');
    assert.equal(data.items.length,0);
    assert.match(data.emptyMessage,/오래/);
    assert.ok(data.checkedAt);
  } finally{globalThis.fetch=prev;}
});
test('Pages bus arrival uses official getStationByUid and labels query time separately',async()=>{
  const prev=globalThis.fetch;
  try{
    globalThis.fetch=async url=>{
      assert.match(String(url),/getStationByUid/);
      return new Response(JSON.stringify({msgHeader:{headerCd:0},msgBody:{itemList:[{rtNm:'501',arrmsg1:'운행종료',stNm:'방면'}]}}));
    };
    const response=await onRequest({request:new Request('https://test.pages.dev/api/transport/bus?arsId=12345'),env:{SEOUL_BUS_SERVICE_KEY:'KEY'}});
    const data=await response.json();
    assert.equal(data.items[0].message,'운행종료');
    assert.equal(data.sourceStatus,'unverified');
    assert.equal(data.updatedAt,'');
    assert.ok(data.checkedAt);
  } finally{globalThis.fetch=prev;}
});
