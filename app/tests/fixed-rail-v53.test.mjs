import test from 'node:test';
import assert from 'node:assert/strict';
import {fixedRailCollection,fixedMetroStations,insideBoundary,distanceFromDongjakMeters,railOpacityAtDistance} from '../src/fixed-rail-lines.js';
import {parseBusRouteList} from '../server/bus-route-list.mjs';
const geometry={type:'Polygon',coordinates:[[[126.92,37.49],[126.98,37.49],[126.98,37.515],[126.92,37.515],[126.92,37.49]]]};
test('필수 6개 호선은 외부 호출 없이 표시된다',()=>{
 const fc=fixedRailCollection(geometry);
 const lines=new Set(fc.features.map(f=>f.properties.line));
 for(const line of ['1호선','2호선','4호선','7호선','9호선','신림선'])assert.ok(lines.has(line),line);
 assert.ok(fc.features.every(f=>f.geometry.coordinates.length>=2));
 assert.ok(fc.features.every(f=>f.properties.opacity>0&&f.properties.opacity<=1));
});
test('동작구 경계 밖으로 갈수록 서서히 투명해진다',()=>{
 assert.equal(insideBoundary([126.95,37.5],geometry),true);
 assert.equal(distanceFromDongjakMeters([126.95,37.5],geometry),0);
 assert.ok(railOpacityAtDistance(400)>railOpacityAtDistance(1800));
 assert.ok(railOpacityAtDistance(3200)>0);
 assert.equal(railOpacityAtDistance(4900),0);
});
test('이수/총신대입구역은 동일 역으로 병합',()=>{
 const stations=fixedMetroStations();
 const merged=stations.filter(s=>s.name.includes('이수'));
 assert.equal(merged.length,1);
 assert.deepEqual(new Set(merged[0].lines),new Set(['4호선','7호선']));
});
test('버스 경유노선 JSON/XML 응답과 중복 처리',()=>{
 const expected=['501','750A'];
 assert.deepEqual(parseBusRouteList({msgHeader:{headerCd:0},msgBody:{itemList:[{busRouteNm:'750A'},{busRouteNm:'501'},{busRouteNm:'501'}]}}),expected);
 assert.deepEqual(parseBusRouteList('<ServiceResult><msgHeader><headerCd>0</headerCd></msgHeader><msgBody><itemList><busRouteNm>501</busRouteNm></itemList><itemList><busRouteNm>750A</busRouteNm></itemList></msgBody></ServiceResult>'),expected);
});

test('서울시 역사마스터 좌표로 동작·병무청·노량진·장승배기를 표시',async()=>{
 const {VERIFIED_STATIONS,railGeojson,FIXED_RAIL_STATION_ORDER,stationsGeojson}=await import('../src/fixed-rail-data.js');
 assert.deepEqual(VERIFIED_STATIONS['동작'],[126.978153,37.502878]);
 assert.deepEqual(VERIFIED_STATIONS['서울지방병무청'],[126.9227083,37.5060464]);
 assert.deepEqual(VERIFIED_STATIONS['노량진'],[126.941005,37.513534]);
 assert.deepEqual(VERIFIED_STATIONS['장승배기'],[126.93915,37.504898]);
 for(const feature of railGeojson.features){
   for(const name of FIXED_RAIL_STATION_ORDER[feature.properties.line]){
     const ref=stationsGeojson.features.find(x=>x.properties.line===feature.properties.line && x.properties.name===`${name}역`)?.geometry.coordinates || VERIFIED_STATIONS[name];
     assert.ok(feature.geometry.coordinates.some(x=>x[0]===ref[0]&&x[1]===ref[1]),`${feature.properties.line}: ${name} 좌표 통과 필요`);
   }
 }
});
test('노선 구간 끝은 하드 컷 대신 알파값이 0에서 점진적으로 증가',async()=>{
 const {railEndpointFadeMeters}=await import('../src/fixed-rail-lines.js');
 assert.equal(railEndpointFadeMeters(0),0);
 assert.ok(railEndpointFadeMeters(200)>0);
 assert.ok(railEndpointFadeMeters(200)<railEndpointFadeMeters(700));
 assert.ok(railEndpointFadeMeters(700)<railEndpointFadeMeters(1200));
 assert.equal(railEndpointFadeMeters(1400),1);
});
