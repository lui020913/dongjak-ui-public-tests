import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBusServiceKey,classifyBusStopsError,onRequest} from '../functions/api/transport/[[path]].js';

const invoke=(key='x')=>onRequest({request:new Request('https://test.pages.dev/api/transport/bus/stops-nearby?lat=37.4955&lng=126.954&radius=180'),env:{SEOUL_BUS_SERVICE_KEY:key}});

test('bus key encoded /+ padding is URL encoded exactly once',()=>{
  assert.equal(normalizeBusServiceKey(' key%2Babc%2Fxyz%3D '),'key+abc/xyz=');
  assert.equal(normalizeBusServiceKey('key+abc/xyz='),'key+abc/xyz=');
  assert.equal(normalizeBusServiceKey('100%NO'),'100%NO');
});
test('bus API errors distinguish auth, rate limit and legitimate no-result code',()=>{
  assert.deepEqual(classifyBusStopsError(new Error('BUS_API_7')).reason,'BUS_HEADER_7');
  assert.equal(classifyBusStopsError(new Error('BUS_API_8')).code,'BUS_API_RATE_LIMIT');
  assert.equal(classifyBusStopsError(new Error('BUS_API_4')).code,'BUS_STOPS_LOOKUP_ERROR');
  assert.equal(classifyBusStopsError(new Error('UPSTREAM_HTTP_403')).reason,'HTTP_403');
});
test('upstream HTTP 403 returns reason without exposing secret',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async ()=>new Response('Forbidden',{status:403});
  try{
    const r=await invoke('VERY_PRIVATE_KEY');
    assert.equal(r.status,503);
    const b=await r.json();
    assert.equal(b.code,'BUS_API_AUTH');
    assert.equal(b.reason,'HTTP_403');
    assert.ok(!JSON.stringify(b).includes('VERY_PRIVATE_KEY'));
  }finally{globalThis.fetch=original;}
});
