import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCES,korean1985ToWgs84,normalizeSeoulPlace,isOperating,parseSeoulResponse,dedupePlaces} from '../functions/lib/seoul-facility-core.mjs';
import {officialFeatures,officialSearchPlaces} from '../src/seoul-official-facilities.js';
import {onRequestGet} from '../functions/api/seoul-facilities.js';
import worker,{syncFacilitySource} from '../src/workers/seoul-facility-sync.mjs';

test('EPSG:5174 -> WGS84, PROJ reference sample (<2e-6 degrees)',()=>{
 const actual=korean1985ToWgs84(197956.2,449638.5);
 assert.ok(Math.abs(actual[0]-126.97765986708187)<2e-6);
 assert.ok(Math.abs(actual[1]-37.54900851413168)<2e-6);
 assert.equal(korean1985ToWgs84(null,'bad'),null);
});
test('four independently verified Seoul Dongjak service names',()=>{
 assert.deepEqual(SOURCES.map(x=>x.service),['LOCALDATA_010106_DJ','LOCALDATA_020302_DJ','LOCALDATA_072404_DJ','LOCALDATA_072405_DJ']);
});
test('closed and suspended facilities never appear',()=>{
 assert.equal(isOperating({TRDSTATEGBN:'01',TRDSTATENM:'정상영업'}),true);
 assert.equal(isOperating({TRDSTATEGBN:'03',TRDSTATENM:'폐업'}),false);
 assert.equal(isOperating({TRDSTATEGBN:'01',DTLSTATENM:'휴업'}),false);
 assert.equal(isOperating({}),false);
});
test('normalize: categories, name, address, source, coordinates',()=>{
 const row={MGTNO:'100',BPLCNM:'테스트 카페',TRDSTATEGBN:'01',TRDSTATENM:'정상',UPTAENM:'커피숍',X:197956.2,Y:449638.5,RDNWHLADDR:'서울특별시 동작구 상도로 3',SITETEL:'02-123-4567'};
 const p=normalizeSeoulPlace(row,SOURCES[3]);
 assert.equal(p.category,'카페');assert.equal(p.id,'cafe:100');assert.equal(p.name,'테스트 카페');assert.equal(p.address,'서울특별시 동작구 상도로 3');
 assert.equal(normalizeSeoulPlace({...row,TRDSTATEGBN:'03'},SOURCES[3]),null);
 assert.equal(normalizeSeoulPlace({...row,RDNWHLADDR:'서울특별시 강남구 도산대로 3'},SOURCES[3]),null);
 assert.equal(normalizeSeoulPlace({...row,X:9999},SOURCES[3]),null);
});
test('official features strictly filter Polygon and dedupe coordinates',()=>{
 const boundary={type:'Polygon',coordinates:[[[126.94,37.48],[126.96,37.48],[126.96,37.5],[126.94,37.5],[126.94,37.48]]]};
 const places=[{id:'1',name:'약국',lng:126.95,lat:37.49,category:'약국'},
   {id:'2',name:' 약국 ',lng:126.950000001,lat:37.49,category:'약국'},
   {id:'3',name:'동작 밖',lng:126.99,lat:37.49}];
 assert.equal(officialFeatures(places,boundary).features.length,1);
 assert.equal(officialSearchPlaces('약국',places).length,2);
 assert.equal(dedupePlaces(places).length,2);
});
test('upstream error and row count detected, no false success',()=>{
 assert.throws(()=>parseSeoulResponse({LOCALDATA_010106_DJ:{RESULT:{CODE:'INFO-100'}}},SOURCES[0].service),/INFO-100/);
 assert.deepEqual(parseSeoulResponse({LOCALDATA_010106_DJ:{RESULT:{CODE:'INFO-000'},list_total_count:1,row:[{MGTNO:'a'}]}},SOURCES[0].service).total,1);
});
test('unconfigured Pages read API returns 503 without secret leak',async()=>{
 const res=await onRequestGet({request:new Request('https://example.com/api/seoul-facilities'),env:{}});
 assert.equal(res.status,503);assert.equal((await res.json()).configured,false);
});
test('Worker health does not expose API key',async()=>{
 const res=await worker.fetch(new Request('https://example.com/health'),{SEOUL_OPEN_API_KEY:'MY_FAKE_SECRET'});
 const body=await res.text();assert.equal(JSON.parse(body).keyConfigured,true);assert.ok(!body.includes('MY_FAKE_SECRET'));
 const bad=await worker.fetch(new Request('https://example.com/admin/sync',{method:'POST'}),{SEOUL_SYNC_TOKEN:'secure'.repeat(8)});
 assert.equal(bad.status,401);
});
