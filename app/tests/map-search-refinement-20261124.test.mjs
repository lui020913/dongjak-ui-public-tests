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
