import test from 'node:test';
import assert from 'node:assert/strict';
import {nearbySearchResults,groupVisibleFacilities,searchResultSubtitle,searchResultKey,captureVisibleFacilityArea,visibleFacilityResults,visibleAreaContains,fetchVisibleOfficialPlaces} from '../src/map-search-refinement.js';
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

test('visible map facility search requires zoom 16 and clips a rotated view rather than bbox alone',()=>{
 const map={getZoom:()=>15,getCanvas:()=>({clientWidth:400,clientHeight:800}),unproject:([x,y])=>({lng:126.95+(x/400+y/800-1)*.003,lat:37.5+(x/400-y/800)*.003})};
 assert.equal(captureVisibleFacilityArea(map),null);
 map.getZoom=()=>16;
 const area=captureVisibleFacilityArea(map);assert.ok(area);
 assert.equal(visibleAreaContains(area,{lng:126.9529,lat:37.5029}),false);
 const rows=visibleFacilityResults(area,[{name:'중심',lng:126.95,lat:37.5,distanceMeters:15},{name:'화면 안',lng:126.951,lat:37.5},{name:'화면 밖',lng:126.9529,lat:37.5029}]);
 assert.deepEqual(rows.items.map(p=>p.name),['중심','화면 안']);assert.equal(rows.items[0].distanceMeters,undefined);
 assert.equal(rows.total,2);
});
test('visible map facility search limits output without misreporting total',()=>{
 const area={polygon:[{lng:126.94,lat:37.49},{lng:126.96,lat:37.49},{lng:126.96,lat:37.51},{lng:126.94,lat:37.51}],center:{lng:126.95,lat:37.5}};
 const rows=visibleFacilityResults(area,[{name:'A',lng:126.951,lat:37.5},{name:'B',lng:126.95,lat:37.5}],{limit:1});
 assert.equal(rows.total,2);assert.equal(rows.items[0].name,'B');
});

test('visible facilities group by known category and preserve every displayed row',()=>{
 const rows=[{name:'A',category:'restaurant'},{name:'B',category:'bus'},{name:'C',category:'음식점'},{name:'D',kind:'subway'},{name:'E',category:'unknown'},{name:'F',category:'cafe'}];
 const groups=groupVisibleFacilities(rows);
 assert.deepEqual(groups.map(g=>g.label),['지하철·철도역','버스정류장','음식점','카페','일반 시설']);
 assert.deepEqual(groups.find(g=>g.label==='음식점').rows.map(p=>p.name),['A','C']);
 assert.equal(groups.reduce((n,g)=>n+g.rows.length,0),rows.length);
 assert.deepEqual(groupVisibleFacilities([]),[]);
});

import {readFileSync} from 'node:fs';
test('map area categories use one horizontal rail and a single filtered result list',()=>{
 const js=readFileSync(new URL('../src/map-quick-search.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/map-search-refinement.css',import.meta.url),'utf8');
 assert.match(js,/groups=\[\{label:'전체',rows:items\},\.\.\.groupVisibleFacilities\(items\)\]/);
 assert.match(js,/results\.replaceChildren\(\.\.\.groups\[index\]\.rows\.map\(makeResultButton\)\)/);
 assert.match(js,/setAttribute\('aria-pressed',String\(i===index\)\)/);
 assert.match(css,/\.dj-visible-facility-rail\{[^}]*overflow-x:auto!important;overflow-y:hidden!important/);
 assert.match(css,/\.dj-visible-facility-tab\{[^}]*flex:0 0 auto!important/);
});
