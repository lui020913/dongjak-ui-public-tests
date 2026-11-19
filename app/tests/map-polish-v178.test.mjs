import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNeighborDistrictLabels,makeDecorativeTrees,pointInsideRing} from '../src/map-polish.js';
import {metroLineBadgeText,knownRailLine,railwayGeometryFeatures,subwayLineColor} from '../src/transport-map.js';
import {safetyFeatures,classifySafetyTags} from '../src/safety-layers.js';
const square=(x,y,r=0.01)=>({type:'Polygon',coordinates:[[[x-r,y-r],[x+r,y-r],[x+r,y+r],[x-r,y+r],[x-r,y-r]]]});
test('이웃 자치구 라벨은 동작구 이름을 중복 표시하지 않고 실제 인접구 이름을 사용',()=>{
  const source=[
    {properties:{SIG_KOR_NM:'동작구',SIG_CD:'11590'},geometry:square(126.95,37.5)},
    {properties:{SIG_KOR_NM:'관악구',SIG_CD:'11620'},geometry:square(126.95,37.48)},
    {properties:{SIG_KOR_NM:'수원시',SIG_CD:'41110'},geometry:square(126.95,37.48)}
  ];
  const out=makeNeighborDistrictLabels(source,[[126.92,37.48],[126.97,37.52]]);
  assert.deepEqual(out.features.map(f=>f.properties.name),['관악구','수원시']);
});
test('호선 배지는 노선색의 번호로, 없는 노선은 가짜 색 지정하지 않음',()=>{
  assert.equal(metroLineBadgeText('1호선'),'1');
  assert.equal(metroLineBadgeText('9호선'),'9');
  assert.equal(metroLineBadgeText('신림선'),'신림');
  assert.equal(metroLineBadgeText('우이신설선'),'U');
  assert.equal(metroLineBadgeText('정보없음'),'');
  assert.equal(knownRailLine({ref:'9'}),'9호선');
  assert.equal(knownRailLine({line:'7호선'}),'7호선');
  assert.equal(knownRailLine({name:'임의 선로'}),null);
  assert.equal(subwayLineColor('9호선'),'#b89b2f');
});
test('선로와 승강장은 OSM 실제 geometry로만 만들고 모르는 선로색은 회색',()=>{
  const inArea=()=>true;
  const e=[
    {type:'way',id:1,tags:{railway:'subway',ref:'1'},geometry:[{lon:126.9,lat:37.5},{lon:126.901,lat:37.501}]},
    {type:'way',id:2,tags:{railway:'platform'},geometry:[{lon:126.902,lat:37.5},{lon:126.903,lat:37.501}]},
    {type:'way',id:3,tags:{railway:'subway'},geometry:[{lon:126.9,lat:37.5},{lon:126.901,lat:37.501}]},
    {type:'way',id:4,tags:{railway:'subway'},geometry:[{lon:126.9,lat:37.5},{lon:126.901,lat:37.501}]},
  ];
  const out=railwayGeometryFeatures(e,inArea);
  assert.equal(out.tracks.features.length,3);
  assert.equal(out.platforms.features.length,1);
  assert.equal(out.tracks.features[0].properties.color,'#0d57a7');
  assert.equal(out.tracks.features[1].properties.color,'#9ba9ad');
  assert.equal(railwayGeometryFeatures(e,()=>false).tracks.features.length,0);
});
test('공원 수목은 공개 공원 geometry 안에서만 만들고 상한 개수를 지킴',()=>{
  const ring=[{lon:126.95,lat:37.49},{lon:126.96,lat:37.49},{lon:126.96,lat:37.5},{lon:126.95,lat:37.5},{lon:126.95,lat:37.49}];
  const elements=[{type:'way',id:123,tags:{leisure:'park'},geometry:ring}];
  const out=makeDecorativeTrees(elements,()=>true,17);
  assert.ok(out.crowns.features.length>0);
  assert.ok(out.crowns.features.length<=17);
  assert.equal(out.trunks.features.length,out.crowns.features.length);
  const again=makeDecorativeTrees(elements,()=>true,17);
  assert.deepEqual(out,again,'seeded greenery should remain spatially stable');
  assert.ok(pointInsideRing(126.955,37.495,ring.map(p=>[p.lon,p.lat])));
});
test('약국/편의점 위치는 생활 편의 시설 필터로 분리',()=>{
  assert.equal(classifySafetyTags({shop:'convenience'}),'convenience');
  const elements=[
    {type:'node',id:1,lon:126.95,lat:37.5,tags:{amenity:'pharmacy'}},
    {type:'node',id:2,lon:126.952,lat:37.5,tags:{shop:'convenience'}},
    {type:'node',id:3,lon:126.955,lat:37.5,tags:{shop:'hairdresser'}}
  ];
  assert.equal(safetyFeatures(elements,()=>true,'essentials').features.length,2);
  assert.equal(safetyFeatures(elements,()=>true,'safety').features.length,1);
});
