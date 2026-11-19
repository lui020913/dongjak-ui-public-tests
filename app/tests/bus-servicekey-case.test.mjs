import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/transport/[[path]].js';

const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');

test('all bus API request builders use case-sensitive ServiceKey',()=>{
  const pages=read('../functions/api/transport/[[path]].js');
  const local=read('../server/transport-proxy.mjs');
  const diagnostic=read('../scripts/check-bus-key-local.mjs');
  for(const body of [pages,local]){
    assert.match(body,/getStationByPos\?ServiceKey=/);
    assert.match(body,/getStationByUid\?ServiceKey=/);
    assert.match(body,/getRouteByStation\?ServiceKey=/);
    assert.doesNotMatch(body,/\?serviceKey=/);
  }
  assert.match(diagnostic,/searchParams\.set\('ServiceKey',key\)/);
  assert.doesNotMatch(diagnostic,/searchParams\.set\('serviceKey',key\)/);
});

test('deployed bus stops route sends ServiceKey and does not leak it',async()=>{
  const oldFetch=globalThis.fetch;
  let seenUrl;
  globalThis.fetch=async(input)=>{
    seenUrl=new URL(String(input));
    return new Response(JSON.stringify({msgHeader:{headerCd:'0'},msgBody:{itemList:[]}}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const result=await onRequest({
      request:new Request('https://example.pages.dev/api/transport/bus/stops-nearby?lat=37.4955&lng=126.954&radius=180'),
      env:{SEOUL_BUS_SERVICE_KEY:'SENSITIVE_KEY'},
    });
    assert.equal(result.status,200);
    assert.equal(seenUrl.searchParams.get('ServiceKey'),'SENSITIVE_KEY');
    assert.equal(seenUrl.searchParams.has('serviceKey'),false);
    assert.ok(!(await result.text()).includes('SENSITIVE_KEY'));
  }finally{globalThis.fetch=oldFetch;}
});
