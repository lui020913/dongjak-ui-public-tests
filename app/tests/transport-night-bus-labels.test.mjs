import test from 'node:test';
import assert from 'node:assert/strict';
import {guardSubwayProxyArrival} from '../src/transport-freshness.js';
import {busStopLabelPalette,applyBusStopLabelTheme,BUS_STOP_LABEL_IDS} from '../src/bus-stop-label-theme.js';
import {parseSeoulBusArrival} from '../src/transport-data.js';
import {onRequest} from '../functions/api/transport/[[path]].js';

const now=Date.parse('2026-11-10T02:54:00+09:00');
const live={items:[{line:'7호선',message:'9분 후'}],sourceStatus:'ok',sourceTimestamp:'2026-11-09T17:53:30.000Z',updatedAt:'02:53'};
test('client at 02:54 hides stale 7 line arrival even when a proxy falsely returns items',()=>{
  const gone=guardSubwayProxyArrival({...live,sourceTimestamp:'2026-11-09T15:21:00.000Z'},{nowMs:now});
  assert.equal(gone.sourceStatus,'stale');
  assert.deepEqual(gone.items,[]);
  assert.match(gone.emptyMessage,/생성 시각/);
});
test('client refuses old proxy without full source timestamp',()=>{
  const gone=guardSubwayProxyArrival({items:live.items,checkedAt:'02:54',updatedAt:'02:54'},{nowMs:now});
  assert.equal(gone.items.length,0);
  assert.equal(gone.sourceStatus,'unverified');
});
test('client still displays genuinely fresh, verified late-night trains',()=>{
  assert.equal(guardSubwayProxyArrival(live,{nowMs:now}).items.length,1);
});
test('bus arrival parsing prefers official vehicle direction over current stop name',()=>{
  const [item]=parseSeoulBusArrival({msgBody:{itemList:[{rtNm:'750',adirection:'서울역',stNm:'숭실대입구',arrmsg1:'운행종료'}]}});
  assert.equal(item.destination,'서울역');
  assert.equal(item.message,'운행종료');
});
test('dark mode applies pale text and dark thin halo to every active bus-stop name layer',()=>{
  const used=new Map();
  const map={getLayer:id=>BUS_STOP_LABEL_IDS.includes(id)?{id}:undefined,
    setPaintProperty:(id,k,v)=>used.set(`${id}:${k}`,v)};
  assert.equal(applyBusStopLabelTheme(map,'dark'),4);
  for(const id of BUS_STOP_LABEL_IDS){
    assert.equal(used.get(`${id}:text-color`),'#EEF7FB');
    assert.equal(used.get(`${id}:text-halo-color`),'#10252E');
    assert.ok(used.get(`${id}:text-halo-width`)<=1.1);
  }
  assert.notEqual(busStopLabelPalette('light').halo,busStopLabelPalette('dark').halo);
});
test('Pages server includes verifiable source timestamp and never substitutes check time',async()=>{
  const old=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify({errorMessage:{code:'INFO-000'},
      realtimeArrivalList:[{subwayId:'1007',updnLine:'상행',arvlMsg2:'9분 후',barvlDt:'540',
        recptnDt:new Date(Date.now()+9*3600000).toISOString().replace('T',' ').slice(0,19)}]}));
    const res=await onRequest({request:new Request('https://test.pages.dev/api/transport/subway?station=%EC%88%AD%EC%8B%A4%EB%8C%80%EC%9E%85%EA%B5%AC'),
      env:{SEOUL_SUBWAY_API_KEY:'SECRET'}});
    const out=await res.json();
    assert.equal(out.sourceStatus,'ok');
    assert.match(out.sourceTimestamp,/Z$/);
    assert.ok(out.updatedAt);
    assert.equal(out.items[0].line,'7호선');
  }finally{globalThis.fetch=old;}
});
