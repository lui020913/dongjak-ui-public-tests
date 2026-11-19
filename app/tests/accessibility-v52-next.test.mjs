import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMetroExits,parseSeoulElevators,wktPoint,mergeAccessibilityCollections,parseFieldVerified} from '../server/station-accessibility-data.mjs';
import {railGeojson,VERIFIED_STATIONS} from '../src/fixed-rail-data.js';
import {railEndpointFadeMeters,fixedRailCollection} from '../src/fixed-rail-lines.js';
import {isRoadDirectionSymbolLayer} from '../src/map-direction.js';

test('출구 좌표는 ArcGIS JSON 속성과 4326 실제 위치로만 등록한다',()=>{
  const result=parseMetroExits({features:[
    {attributes:{stn_nm:'노량진',entrc_no:'3',sub_ent_sn:'official-3'},geometry:{x:126.9416,y:37.5137}},
    {attributes:{stn_nm:'노량진',entrc_no:'3',sub_ent_sn:'official-3'},geometry:{x:126.9416,y:37.5137}},
    {attributes:{entrc_no:'1'},geometry:{x:0,y:0}}
  ]});
  assert.equal(result.features.length,1);
  assert.equal(result.features[0].properties.number,'3');
  assert.equal(result.features[0].properties.equipment,'unknown');
});
test('엘리베이터 좌표는 서울시 WKT가 실제 동작구 주변인 경우만 받는다',()=>{
  assert.deepEqual(wktPoint('POINT (126.941 37.513)'),[126.941,37.513]);
  assert.equal(wktPoint('POINT (12 20)'),null);
  const f=parseSeoulElevators({tbTraficElvtr:{row:[{NODE_WKT:'POINT(126.941 37.513)',SBWY_STN_NM:'노량진'}]}});
  assert.equal(f.features.length,1);
  assert.equal(f.features[0].properties.type,'elevator');
  assert.equal(f.features[0].properties.operating,'unknown');
});
test('동일 출구는 중복 표시하지 않는다',()=>{
  const f={type:'Feature',properties:{type:'exit',number:'3'},geometry:{type:'Point',coordinates:[126.94,37.5]}};
  assert.equal(mergeAccessibilityCollections({features:[f]},{features:[f]}).features.length,1);
});
test('실제 지하철 종점인 샛강역까지 신림선 표시 및 페이드값 유지',()=>{
  const line=railGeojson.features.find(f=>f.properties.line==='신림');
  assert.deepEqual(line.geometry.coordinates[0],VERIFIED_STATIONS['샛강']);
  assert.ok(fixedRailCollection().features.some(f=>f.properties.line==='신림선'&&f.properties.opacity>0));
  assert.equal(railEndpointFadeMeters(0),0);
});
test('도로 방향 화살표만 viewport가 아닌 지도 회전에 정렬한다',()=>{
  assert.equal(isRoadDirectionSymbolLayer({type:'symbol',id:'road-oneway-arrow','source-layer':'transportation'}),true);
  assert.equal(isRoadDirectionSymbolLayer({type:'symbol',id:'poi_transit','source-layer':'poi'}),false);
  assert.equal(isRoadDirectionSymbolLayer({type:'line',id:'oneway'}),false);
});

test('계단/에스컬레이터는 실제 확인 일자와 출처가 없으면 지도에 표시하지 않는다',()=>{
  const base={type:'Feature',geometry:{type:'Point',coordinates:[126.94,37.5]},properties:{type:'escalator',verified:true,source:'현장조사',observedAt:'2026-11-05'}};
  assert.equal(parseFieldVerified({features:[base]}).features.length,1);
  assert.equal(parseFieldVerified({features:[{...base,properties:{...base.properties,observedAt:''}}]}).features.length,0);
});
