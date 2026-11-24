import test from 'node:test';
import assert from 'node:assert/strict';
import {routeStationMatches,mergeRouteSearchResults,routeResultSubtitle} from '../src/route-search-results.js';
test('rail result is available offline and precedes same-named bus stops',()=>{
 const stations=routeStationMatches('노량진역');
 const rail=stations.find(p=>p.name==='노량진역');
 assert.deepEqual(rail.lines,['1호선','9호선']);
 const bus={name:'노량진역',kind:'bus',arsId:'20011',lng:126.941,lat:37.5135};
 const other={...bus,arsId:'20012'};
 const merged=mergeRouteSearchResults('노량진역',[bus,other],stations);
 assert.equal(merged[0].kind,'subway');
 assert.equal(merged.filter(p=>p.kind==='bus').length,2);
});
test('directions use known metadata and never expose ARS',()=>{
 assert.equal(routeResultSubtitle({kind:'bus',arsId:'20011',direction:'대방역'}),'버스정류장 · 대방역 방면');
 assert.equal(routeResultSubtitle({kind:'bus',address:'ARS 20011'}),'버스정류장 · 방면 정보 없음');
});
test('general places and addresses remain searchable alongside transit',()=>{
 const place={name:'동작구청',category:'공공시설',lng:126.94,lat:37.51};
 assert.equal(mergeRouteSearchResults('동작구청',[place])[0].name,place.name);
});
