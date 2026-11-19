import test from 'node:test';
import assert from 'node:assert/strict';
import {filterBulkArrivalsForStation,permitsSubwayBulkRecovery,canonicalSubwayStationName} from '../src/subway-source-recovery.js';
import {nearbyOfficialStaticStops} from '../src/static-bus-stops.js';
import {validateSeoulSubwayFeed} from '../src/transport-freshness.js';
import {onRequestGet} from '../functions/api/transport/[[path]].js';

test('Alias matching accepts current subway station subtitle, not a neighbor',()=>{
  assert.equal(canonicalSubwayStationName('상도(LG전자사거리)역'),'상도');
  assert.equal(permitsSubwayBulkRecovery('상도(중앙대앞)'),true);
  assert.equal(permitsSubwayBulkRecovery('장승배기'),false);
  const source={realtimeArrivalList:[
    {statnNm:'상도(LG전자사거리)',subwayId:'1007',recptnDt:'2026-11-10 09:40:00'},
    {statnNm:'상도',subwayId:'1004'},
    {statnNm:'상도2',subwayId:'1007'},
    {statnNm:'숭실대입구(살피재)',subwayId:'1007'},
    {statnNm:'장승배기',subwayId:'1007'}]};
  assert.equal(filterBulkArrivalsForStation(source,'상도').length,1);
  assert.equal(filterBulkArrivalsForStation(source,'숭실대입구').length,1);
  assert.equal(filterBulkArrivalsForStation(source,'장승배기').length,0);
});

test('Static stops include name & ARS, never pretend to provide arrivals',()=>{
  const dataset={stops:[{arsId:'02001',name:'테스트 정류장',lat:37.4955,lng:126.954},
    {arsId:'02002',name:'너무 먼 정류장',lat:37.52,lng:126.98},
    {arsId:'1',name:'비정상',lat:37.4955,lng:126.954}]};
  const result=nearbyOfficialStaticStops(dataset,37.4955,126.954,130);
  assert.equal(result.length,1);
  assert.equal(result[0].arsId,'02001');
  assert.equal(result[0].name,'테스트 정류장');
  assert.equal(Object.hasOwn(result[0],'message'),false);
});

test('Cloudflare bulk mode validates exact station & source recptnDt',async()=>{
  const old=globalThis.fetch;
  const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date()).replace(',','');
  const stamp=now.replace(/, /,' ').replace(/\//g,'-');
  const body={realtimeArrivalList:[
    {statnNm:'상도',subwayId:'1007',recptnDt:stamp,barvlDt:'300',arvlMsg2:'5분 후',updnLine:'상행'},
    {statnNm:'장승배기',subwayId:'1007',recptnDt:stamp,barvlDt:'300'},
    {statnNm:'상도',subwayId:'1004',recptnDt:stamp,barvlDt:'300'}]};
  globalThis.fetch=async url=>{
    assert.match(String(url),/realtimeStationArrival\/ALL$/);
    return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const request=new Request('https://test.pages.dev/api/transport/subway?station='+encodeURIComponent('상도')+'&mode=bulk');
    const response=await onRequestGet({request,env:{SEOUL_SUBWAY_API_KEY:'test-secret'}});
    assert.equal(response.status,200);
    const parsed=await response.json();
    assert.equal(parsed.sourceMode,'bulk-verified');
    assert.equal(parsed.items.length,1);
    assert.equal(parsed.items[0].line,'7호선');
  }finally{globalThis.fetch=old;}
});


test('Cloudflare static fallback uses official offline file on bus upstream 401',async()=>{
  const old=globalThis.fetch;
  globalThis.fetch=async()=>new Response('{"error":"unauthorized"}',{status:401,headers:{'Content-Type':'application/json'}});
  const stops=Array.from({length:1001},(_,i)=>({arsId:String(10000+i),name:'정류소'+i,
    lat:i===0?37.4955:37.6,lng:i===0?126.954:127.1}));
  const env={SEOUL_BUS_SERVICE_KEY:'fake',ASSETS:{fetch:async()=>new Response(JSON.stringify({sourceDate:'2026-09-02',stops}),{status:200})}};
  try{
    const request=new Request('https://test.pages.dev/api/transport/bus/stops-nearby?lat=37.4955&lng=126.954&radius=180');
    const response=await onRequestGet({request,env});
    assert.equal(response.status,200);
    const parsed=await response.json();
    assert.equal(parsed.items.length,1);
    assert.equal(parsed.realtimeAvailable,false);
    assert.equal(parsed.sourceDate,'2026-09-02');
  }finally{globalThis.fetch=old;}
});

test('Non-allowed station cannot trigger arbitrary bulk scan',async()=>{
  const response=await onRequestGet({request:new Request('https://test.pages.dev/api/transport/subway?station=서울&mode=bulk'),
    env:{SEOUL_SUBWAY_API_KEY:'fake'}});
  assert.equal(response.status,400);
  assert.equal((await response.json()).code,'UNSUPPORTED_BULK_STATION');
});
