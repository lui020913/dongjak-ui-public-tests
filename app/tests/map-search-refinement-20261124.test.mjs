import test from 'node:test';
import assert from 'node:assert/strict';
import {nearbySearchResults,searchResultSubtitle,searchResultKey} from '../src/map-search-refinement.js';
test('bus direction is authoritative and no ARS ID appears in subtitle',()=>{
 assert.equal(searchResultSubtitle({kind:'bus',direction:'상도역',arsId:'123'}),'버스정류장 · 상도역 방면');
 assert.equal(searchResultSubtitle({kind:'bus',arsId:'123'}),'버스정류장 · 방면 미확인');
 assert.notEqual(searchResultKey({kind:'bus',arsId:'1'}),searchResultKey({kind:'bus',arsId:'2'}));
});
test('nearby results are radius filtered, sorted, and unique',()=>{
 const origin={lng:126.95,lat:37.5},near={name:'시설 A',lng:126.951,lat:37.5},further={name:'시설 B',lng:126.953,lat:37.5},far={name:'시설 C',lng:127,lat:37.5};
 const rows=nearbySearchResults(origin,[far,further,near,near]);
 assert.deepEqual(rows.map(p=>p.name),['시설 A','시설 B']);assert.ok(rows[0].distanceMeters<rows[1].distanceMeters);
});

test('map tile bus categories and other POIs have Korean labels without technical source text',()=>{
 assert.equal(searchResultSubtitle({category:'bus',address:'지도에 등록된 OpenStreetMap 시설 · 운영 여부 미확인'}),'버스정류장 · 방면 미확인');
 assert.equal(searchResultSubtitle({category:'cafe',address:'지도에 등록된 OpenStreetMap 시설 · 운영 여부 미확인'}),'카페');
 assert.equal(searchResultSubtitle({category:'unknown',address:'서울 동작구 상도로 10 · © OpenStreetMap 기여자'}),'일반 시설 · 서울 동작구 상도로 10');
 assert.equal(searchResultSubtitle({kind:'bus',direction:'상도역',distanceMeters:120}),'버스정류장 · 상도역 방면 · 120m');
});
