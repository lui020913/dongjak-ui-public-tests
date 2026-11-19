import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectDongjakAdminFeatures,geometryBounds,labelPointForFeature} from '../src/admin-dong-layer.js';
import {scopeRailConnections,metroLineBadgeText} from '../src/transport-map.js';

const MAIN=readFileSync(new URL('../src/main.js', import.meta.url),'utf-8');
const HTML=readFileSync(new URL('../index.html', import.meta.url),'utf-8');
const CSS=readFileSync(new URL('../src/style.css', import.meta.url),'utf-8');

test('행정동 필터는 동작구 행정동만 골라낸다',()=>{
  const geom={type:'Polygon',coordinates:[[[126.9,37.5],[127,37.5],[127,37.6],[126.9,37.5]]]};
  const fc={features:[{properties:{sggcd:'11590',emdnm:'상도1동',emdcd:'1159052000'},geometry:geom},
    {properties:{sggcd:'11620',emdnm:'낙성대동'},geometry:geom}]};
  const got=selectDongjakAdminFeatures(fc);
  assert.equal(got.length,1);assert.equal(got[0].properties.dong_name,'상도1동');
  assert.equal(got[0].properties.dong_id,'1159052000');
});
test('행정동 Polygon / MultiPolygon 경계 상자의 위치는 좌표로 계산한다',()=>{
  const polygon={type:'Polygon',coordinates:[[[126,37],[127,37],[127,38],[126,37]]]};
  assert.deepEqual(geometryBounds(polygon),[[126,37],[127,38]]);
  assert.deepEqual(geometryBounds({type:'MultiPolygon',coordinates:[polygon.coordinates]}),[[126,37],[127,38]]);
  assert.deepEqual(geometryBounds(null),null);
  assert.ok(labelPointForFeature({geometry:polygon}));
});
test('외부 지하철 노선 구간은 별도 축소 표시를 위해 scope가 구분된다',()=>{
  const raw={features:[{type:'Feature',properties:{color:'#000'},
    geometry:{type:'LineString',coordinates:[[0,0],[1,0],[2,0],[3,0]]}}]};
  const scoped=scopeRailConnections(raw,(lng)=>lng<1.5);
  assert.equal(scoped.features.length,2);
  assert.deepEqual(scoped.features.map(f=>f.properties.scope),['inside','outside']);
  assert.deepEqual(scoped.features[0].geometry.coordinates,[[0,0],[1,0]]);
});
test('호선 숫자와 신림선 배지를 유지한다',()=>{
  assert.equal(metroLineBadgeText('7호선'),'7');
  assert.equal(metroLineBadgeText('신림선'),'신림');
});
test('길찾기에서 일반 지도 좌표도 확인창을 먼저 거친다',()=>{
  const func=MAIN.slice(MAIN.indexOf('function pickRouteLocation('), MAIN.indexOf('function resetRoute('));
  assert.match(func,/showTransitRouteConfirmation\(/);
  assert.doesNotMatch(func,/setRouteLocation\(/);
  assert.match(MAIN,/routeCandidateMarker=new maplibregl\.Marker/);
  assert.match(HTML,/선택한 위치 확인/);
});
test('위치 추적은 watchPosition 및 사용자 중지 버튼을 사용한다',()=>{
  assert.match(MAIN,/startDeviceWatch\(onGpsPosition/);
  assert.match(MAIN,/GPS_AUTO_KEY/);
  assert.match(HTML,/stop-gps-tracking/);
});
test('행정동 선택은 유지하고 시연·백업 UI는 노출하지 않는다',()=>{
  assert.match(HTML,/id="open-admin-dongs"/);
  assert.match(HTML,/id="admin-dong-picker"/);
  assert.doesNotMatch(HTML,/id="go-pilot"/);
  assert.doesNotMatch(HTML,/id="export-points"|id="my-export"|id="community-export"|id="pza-export-(?:csv|json)"/);
  assert.doesNotMatch(HTML,/route-demo-start|route-start-demo|시연 모드/);
});
test('전체 패널을 드래그하고 지도 상세 필터는 접히는 구조이다',()=>{
  assert.match(MAIN,/overview\.addEventListener\('pointerdown'/);
  assert.match(HTML,/id="map-tools-toggle"/);
  assert.match(CSS,/\.map-advanced-controls\{display:none;/);
});
