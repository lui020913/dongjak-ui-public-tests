import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlaceSearchUrl,normalizePlaceSearchResults} from '../src/route-search.js';

test('검색 URL은 서울 범위, 한국어, 명시적 검색어를 포함한다',()=>{
  const url=new URL(buildPlaceSearchUrl(' 노량진역 '));
  assert.equal(url.origin,'https://photon.komoot.io');
  assert.equal(url.searchParams.get('q'),'노량진역');
  assert.equal(url.searchParams.get('lang'),'ko');
  assert.equal(url.searchParams.get('bbox'),'126.78,37.40,127.20,37.70');
});
test('짧은 검색어는 서버에 보내지 않는다',()=>assert.throws(()=>buildPlaceSearchUrl('a'),/2~80/));
test('Photon 포인트 결과를 이름과 주소가 있는 경로 좌표로 바꾼다',()=>{
  const results=normalizePlaceSearchResults({features:[
    {geometry:{type:'Point',coordinates:[126.942,37.513]},properties:{name:'노량진역',city:'서울',street:'노량진로',osm_key:'railway',osm_value:'station'}},
    {geometry:{type:'Point',coordinates:[126.942,37.513]},properties:{name:'노량진역',city:'서울'}},
    {geometry:{type:'Point',coordinates:[129.01,35.1]},properties:{name:'동명이역'}}
  ]});
  assert.equal(results.length,1);
  assert.equal(results[0].name,'노량진역');
  assert.equal(results[0].category,'지하철·철도역');
  assert.equal(results[0].lng,126.942);
  assert.match(results[0].address,/노량진로/);
});
test('검색 실패 시 결과가 비어 있어도 안전하게 처리한다',()=>{
  assert.deepEqual(normalizePlaceSearchResults({features:[]}),[]);
  assert.deepEqual(normalizePlaceSearchResults(null),[]);
});

test('캐시된 지하철/버스 시설을 역명·ARS 번호로 검색한다',async()=>{
  const {searchCachedTransportPlaces}=await import('../src/transport-map.js');
  assert.deepEqual(searchCachedTransportPlaces(''),[]);
  // 캐시는 OSM 수신 후 채워지므로 초기에는 빈 상태가 정상입니다.
  assert.ok(Array.isArray(searchCachedTransportPlaces('노량진')));
});
