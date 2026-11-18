import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/transport/[[path]].js';

const req=(path,env={})=>onRequest({request:new Request('https://test.pages.dev/api/transport/'+path),env});

test('Pages API: status works without local Node server and does not expose keys',async()=>{
  const res=await req('status',{SEOUL_BUS_SERVICE_KEY:'SECRET-BUS',SEOUL_SUBWAY_API_KEY:'SECRET-SUBWAY'});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.bus,true);assert.equal(data.subway,true);
  assert.equal(data.service,'dongjak-cloudflare-pages-functions');
  assert.ok(!JSON.stringify(data).includes('SECRET'));
});
test('Pages API: missing secret is diagnosed accurately',async()=>{
  let res=await req('bus?arsId=12345');
  assert.equal(res.status,503);
  assert.equal((await res.json()).code,'MISSING_BUS_KEY');
  res=await req('subway?station=%EB%85%B8%EB%9F%89%EC%A7%84');
  assert.equal(res.status,503);
  assert.equal((await res.json()).code,'MISSING_SUBWAY_KEY');
});
test('Pages API: invalid input is rejected and POST is not allowed',async()=>{
  let res=await req('bus?arsId=abc',{SEOUL_BUS_SERVICE_KEY:'B'});
  assert.equal(res.status,400);
  res=await onRequest({request:new Request('https://test.pages.dev/api/transport/status',{method:'POST'}),env:{}});
  assert.equal(res.status,405);
});
test('Pages API: subway, bus and routes preserve existing client shapes',async()=>{
  const old=globalThis.fetch;
  try{
    globalThis.fetch=async url=>{
      if(String(url).includes('realtimeStationArrival'))return new Response(JSON.stringify({errorMessage:{code:'INFO-000'},realtimeArrivalList:[{subwayId:'1009',updnLine:'상행',arvlMsg2:'2분 후 도착',barvlDt:'120',recptnDt:new Date(Date.now()+9*3600e3).toISOString().replace('T',' ').slice(0,19)}]}));
      if(String(url).includes('getStationByUid'))return new Response(JSON.stringify({msgHeader:{headerCd:0},msgBody:{itemList:[{rtNm:'501',arrmsg1:'곧 도착'}]}}));
      if(String(url).includes('getRouteByStation'))return new Response(JSON.stringify({msgHeader:{headerCd:0},msgBody:{itemList:[{busRouteNm:'501'},{busRouteNm:'750A'}]}}));
      throw new Error('Unexpected upstream '+url);
    };
    const env={SEOUL_BUS_SERVICE_KEY:'BUS',SEOUL_SUBWAY_API_KEY:'SUBWAY'};
    let res=await req('subway?station=%EB%85%B8%EB%9F%89%EC%A7%84',env);
    assert.equal(res.status,200);
    assert.equal((await res.json()).items[0].line,'9호선');
    res=await req('bus?arsId=12345',env);
    assert.equal(res.status,200);
    assert.equal((await res.json()).items[0].route,'501');
    res=await req('bus/routes?arsId=12345',env);
    assert.equal(res.status,200);
    assert.deepEqual((await res.json()).routes,['501','750A']);
  }finally{globalThis.fetch=old;}
});
test('Pages API: upstream errors never include API keys',async()=>{
  const old=globalThis.fetch;
  try{
    globalThis.fetch=async()=>{throw new Error('SECRET-BUS in internal diagnostics');};
    const res=await req('bus?arsId=12345',{SEOUL_BUS_SERVICE_KEY:'SECRET-BUS'});
    assert.equal(res.status,502);
    assert.ok(!(await res.text()).includes('SECRET-BUS'));
  }finally{globalThis.fetch=old;}
});
