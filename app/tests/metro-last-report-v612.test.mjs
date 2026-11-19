import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSeoulSubwayFeed,guardSubwayProxyArrival} from '../src/transport-freshness.js';
import {parseSeoulSubwayArrival} from '../src/transport-data.js';
import {formatMetroArrivalCard} from '../src/metro-arrival-display.js';
import {onRequest} from '../functions/api/transport/[[path]].js';
const t=Date.parse('2026-11-10T10:05:00+09:00');
const date='2026-11-10 10:04:07'; // source is 53 seconds old
const row=(overrides={})=>({
  subwayId:'1001',statnNm:'노량진',recptnDt:date,barvlDt:'0',
  arvlCd:'3',arvlMsg2:'전역 출발',updnLine:'상행',trainLineNm:'인천행',
  ...overrides
});
test('0-second arrival is NEVER resurrected as a countdown, but a recent last-report status is retained',()=>{
  const result=validateSeoulSubwayFeed({realtimeArrivalList:[row()]},{nowMs:t});
  assert.equal(result.state,'status-only');
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].barvlDt,'');
  assert.match(result.rows[0].arvlMsg2,/최근 수신: 전역 출발 · 도착시간 미확인/);
  assert.doesNotMatch(result.rows[0].arvlMsg2,/\d+분 후/);
  assert.equal(result.diagnostics.missingEtaCount,1);
});
test('expired ETAs with identifiable train state do not turn into fictitious new ETAs',()=>{
  const result=validateSeoulSubwayFeed({realtimeArrivalList:[
    row({subwayId:'1001',barvlDt:'10',arvlCd:'99',arvlMsg2:'9분 후'}),
    row({subwayId:'1094',barvlDt:'0',arvlCd:'4',arvlMsg2:'전역 진입'})
  ]},{nowMs:t});
  assert.equal(result.state,'status-only');
  assert.equal(result.rows.length,2);
  assert.deepEqual(result.rows.map(x=>x.subwayId),['1001','1094']);
  assert.match(result.rows[0].arvlMsg2,/운행 중/);
  assert.equal(result.diagnostics.expiredEtaCount,1);
  assert.equal(result.diagnostics.missingEtaCount,1);
  const items=parseSeoulSubwayArrival({realtimeArrivalList:result.rows});
  assert.equal(items[0].line,'1호선');assert.equal(items[1].line,'신림선');
  assert.ok(items.every(x=>/도착시간 미확인/.test(x.message)));
  assert.equal(formatMetroArrivalCard({message:items[0].message,directionType:'상행'}).heading,'최근 열차 보고');
});
test('numeric ETA-only with no train state remains expired instead of pretending to be active',()=>{
  const result=validateSeoulSubwayFeed({realtimeArrivalList:[row({barvlDt:'10',arvlCd:'',arvlMsg2:'7분 후'})]},{nowMs:t});
  assert.equal(result.state,'expired'); assert.equal(result.rows.length,0);
});
test('past midnight or stale last reports remain hidden',()=>{
  const result=validateSeoulSubwayFeed({realtimeArrivalList:[row({recptnDt:'2026-11-09 23:43:10'})]},{nowMs:t});
  assert.equal(result.state,'stale'); assert.equal(result.rows.length,0);
});
test('fresh status-only proxy data is displayable but becomes stale on browser later',()=>{
  const result=validateSeoulSubwayFeed({realtimeArrivalList:[row()]},{nowMs:t});
  const body={sourceStatus:result.state,sourceTimestamp:result.sourceTimestamp,
    items:parseSeoulSubwayArrival({realtimeArrivalList:result.rows})};
  const fresh=guardSubwayProxyArrival(body,{nowMs:t});
  assert.equal(fresh.items.length,1);
  const old=guardSubwayProxyArrival(body,{nowMs:t+190000});
  assert.equal(old.items.length,0); assert.equal(old.sourceStatus,'stale');
});
test('Cloudflare forwards safe diagnostic counts and source status for a recently reported train',async()=>{
  const oldFetch=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify({errorMessage:{code:'INFO-000'},realtimeArrivalList:[row()]}));
    // Date.now() must match fixture for source-time freshness.
    const real=Date.now;Date.now=()=>t;
    try{
      const res=await onRequest({request:new Request('https://example.pages.dev/api/transport/subway?station=%EB%85%B8%EB%9F%89%EC%A7%84&line=1%ED%98%B8%EC%84%A0'),
        env:{SEOUL_SUBWAY_API_KEY:'MASKED'}});
      const data=await res.json();
      assert.equal(res.status,200);assert.equal(data.sourceStatus,'status-only');
      assert.equal(data.sourceDiagnostics.rawCount,1);
      assert.equal(data.items.length,1);
      assert.match(data.items[0].message,/최근 수신/);
    }finally{Date.now=real;}
  }finally{globalThis.fetch=oldFetch;}
});
