import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICIAL_RAIL_PROXY_URL,fetchOfficialRailPaths,makeOfficialRailQueryUrl} from '../src/rail-official-shapes.js';
import {officialRailUpstreamUrl,onRequestGet} from '../functions/api/rail-geometry.js';
const coordinates=[[126.981,37.49],[126.982,37.491],[126.983,37.492]];
const valid={features:[{attributes:{sub_nm:'서울7호선'},geometry:{paths:[coordinates]}}]};
const response=(data,status=200)=>({ok:status===200,status,headers:new Headers(),json:async()=>data,text:async()=>JSON.stringify(data)});
test('same-origin railway endpoint is bounded to the fixed official source and allowed lines',()=>{
 const url=new URL(officialRailUpstreamUrl());
 assert.equal(url.origin,'https://portal.esrikr.com');
 assert.equal(url.pathname.endsWith('/MOIS_KR_Subway/FeatureServer/2/query'),true);
 assert.equal(url.searchParams.get('geometry'),'126.855,37.438,127.055,37.562');
 assert.equal(url.searchParams.get('outSR'),'4326');
 assert.equal(url.searchParams.get('outFields'),'sub_nm');
 assert.ok(url.searchParams.get('where').includes('서울7호선'));
 assert.equal(OFFICIAL_RAIL_PROXY_URL,'/api/rail-geometry');
 assert.ok(makeOfficialRailQueryUrl().includes('outSR=4326'));
});
test('same-origin proxy returns verified public geometry and rejects arbitrary source names',async()=>{
 const request=new Request('https://example.com/api/rail-geometry?url=https://attacker.example');
 let fetched='';
 const served=await onRequestGet({request,fetchImpl:async url=>{fetched=url;return response({...valid,features:[...valid.features,{attributes:{sub_nm:'기타노선'},geometry:{paths:[coordinates]}}]});}});
 assert.equal(served.status,200);
 assert.equal(fetched,officialRailUpstreamUrl());
 const body=await served.json();
 assert.equal(body.features.length,1);
 assert.equal(body.source,'MOIS_KR_Subway_2026');
 assert.equal((await onRequestGet({request:new Request('https://example.com/api/other'),fetchImpl:async()=>{throw Error('must not call network');}})).status,404);
});
test('invalid upstream keeps schematic fallback and does not fake geometry',async()=>{
 const request=new Request('https://example.com/api/rail-geometry');
 const served=await onRequestGet({request,fetchImpl:async()=>response({features:[]})});
 assert.equal(served.status,502);
 assert.match((await served.json()).error.message,/기존 안내 선형/);
});
test('client uses same-origin proxy and falls back to public Esri when unavailable',async()=>{
 const seen=[];
 const result=await fetchOfficialRailPaths(async url=>{
  seen.push(url);
  return url===OFFICIAL_RAIL_PROXY_URL?response({},502):response(valid);
 },500);
 assert.equal(seen[0],OFFICIAL_RAIL_PROXY_URL);
 assert.ok(seen[1].includes('portal.esrikr.com'));
 assert.equal(result.length,1);
 assert.equal(result[0].line,'7');
});
test('client never declares success for missing or invalid geometry',async()=>{
 await assert.rejects(fetchOfficialRailPaths(async()=>response({features:[]}),500),/인식 가능한 노선/);
});
