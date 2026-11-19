import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isSeoulBusNoResult} from '../src/transport-data.js';
import {onRequest} from '../functions/api/transport/[[path]].js';

const hit=(path,env={})=>onRequest({request:new Request('https://example.pages.dev/api/transport/'+path),env});

test('v6.0.1: a no-results bus station response is not a server/auth failure',async()=>{
  const orig=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify({msgHeader:{headerCd:4,headerMsg:'결과가 없습니다.'},msgBody:{}}));
    const res=await hit('bus/stops-nearby?lat=37.501&lng=126.953',{SEOUL_BUS_SERVICE_KEY:'TEST_ONLY_KEY'});
    assert.equal(res.status,200);
    const data=await res.json();
    assert.deepEqual(data.items,[]);
    assert.equal(data.lookupStatus,'empty');
    assert.ok(!JSON.stringify(data).includes('TEST_ONLY_KEY'));
  }finally{globalThis.fetch=orig;}
});

test('v6.0.1: empty-response helper distinguishes auth failure and success',()=>{
  assert.equal(isSeoulBusNoResult({msgHeader:{headerCd:4,headerMsg:'결과가 없습니다.'}}),true);
  assert.equal(isSeoulBusNoResult({msgHeader:{headerCd:7,headerMsg:'인증키 오류'}}),false);
  assert.equal(isSeoulBusNoResult({msgHeader:{headerCd:0,headerMsg:'결과가 없습니다'}}),false);
  assert.equal(isSeoulBusNoResult({msgHeader:{headerCd:99,headerMsg:'서버 점검'}}),false);
});

test('v6.0.1: 500 on large exit query triggers two smaller bounded requests',async()=>{
  const orig=globalThis.fetch,requests=[];
  try{
    globalThis.fetch=async url=>{
      const u=new URL(String(url)); requests.push(u);
      const count=Number(u.searchParams.get('resultRecordCount'));
      if(count===2000)return new Response('Temporary server error',{status:500});
      assert.equal(count,1000);
      return new Response(JSON.stringify({features:[{
        geometry:{x:126.946,y:37.501},attributes:{sub_ent_sn:'101',entrc_no:'1번',stn_nm:'상도'}
      }]}),{status:200});
    };
    const res=await hit('accessibility');
    assert.equal(res.status,200);
    const data=await res.json();
    assert.equal(data.sourceStatus.exits,1);
    assert.equal(requests.length,3);
    assert.ok(data.features.features.some(f=>f.properties.type==='exit'));
  }finally{globalThis.fetch=orig;}
});

test('v6.0.1: local proxy includes limited no-result handling and smaller exit retry',()=>{
  const text=readFileSync(new URL('../server/transport-proxy.mjs',import.meta.url),'utf8');
  assert.match(text,/fetchOfficial\(target,\{allowEmptyResult:true\}\)/);
  assert.match(text,/fetchExitArcgisResilient/);
  assert.match(text,/resultRecordCount:String\(count\)/);
});
