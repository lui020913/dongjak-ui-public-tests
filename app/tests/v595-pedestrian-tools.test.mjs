import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {distanceMeters,nearbyResults,classifyAccessFeature,normalizedAccessFeatures} from '../src/pedestrian-tools.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('GPS 주변 거리 계산은 미터 단위이며 잘못된 좌표는 무한대로 처리한다',()=>{
  assert.equal(distanceMeters([126.95,37.50],[126.95,37.50]),0);
  assert.ok(distanceMeters([126.95,37.50],[126.951,37.50])>70);
  assert.equal(distanceMeters([NaN,37.5],[126.95,37.5]),Infinity);
});
test('내 주변 요약은 반경 밖을 제외하고 카테고리별 가장 가까운 항목만 반환한다',()=>{
  const items=[
    {category:'지하철',name:'A역',coordinates:[126.95,37.50]},
    {category:'지하철',name:'B역',coordinates:[126.951,37.50]},
    {category:'지하철',name:'C역',coordinates:[126.952,37.50]},
    {category:'지하철',name:'D역',coordinates:[126.953,37.50]},
    {category:'학교',name:'초등학교',coordinates:[126.951,37.5]},
    {category:'공원',name:'먼 공원',coordinates:[127.05,37.5]}
  ];
  const found=nearbyResults([126.95,37.5],items,850,3);
  assert.equal(found.filter(p=>p.category==='지하철').length,3);
  assert.equal(found.filter(p=>p.category==='학교').length,1);
  assert.equal(found.some(p=>p.name==='먼 공원'),false);
  assert.equal(found[0].name,'A역');
});
test('교통약자 모드에는 낮은 연석·높은 연석·계단·승강기를 명확히 구분한다',()=>{
  assert.equal(classifyAccessFeature({highway:'elevator'}).kind,'lift');
  assert.equal(classifyAccessFeature({highway:'steps'}).risk,'caution');
  assert.equal(classifyAccessFeature({highway:'crossing',kerb:'lowered'}).risk,'possible');
  assert.equal(classifyAccessFeature({barrier:'kerb',kerb:'raised'}).risk,'caution');
  assert.equal(classifyAccessFeature({highway:'crossing'}).risk,'unknown');
  assert.equal(classifyAccessFeature({amenity:'restaurant'}),null);
});
test('OSM 지도에 등록된 실제 좌표만 그리며 사용자 위치를 저장하지 않는다',()=>{
  const data=normalizedAccessFeatures([
    {type:'node',id:1,lat:37.5,lon:126.95,tags:{highway:'steps'}},
    {type:'node',id:2,lat:0,lon:0,tags:{highway:'elevator'}},
    {type:'node',id:3,tags:{highway:'crossing',kerb:'flush'}},
    {type:'node',id:1,lat:37.5,lon:126.95,tags:{highway:'steps'}}
  ],(lng,lat)=>lng>126.9&&lat>37.4);
  assert.equal(data.features.length,1);
  assert.equal(data.features[0].properties.kind,'steps');
  const js=read('src/pedestrian-tools.js');
  assert.doesNotMatch(js,/localStorage|sessionStorage/);
  assert.match(js,/requestPosition/);
});
test('지도 옵션에 3개 보행정보 도구를 추가하고 커뮤니티를 시연용 제보로 연동한다',()=>{
  const html=read('index.html'),main=read('src/main.js'),css=read('src/map-patch/dongjak-v595-pedestrian-tools.css');
  for(const id of ['ped-access-toggle','ped-report-open','ped-nearby-open','ped-tools-panel','ped-tools-status','community-issue-type','community-priority'])
    assert.match(html,new RegExp(`id="${id}"`));
  assert.match(main,/initPedestrianTools\(/);
  assert.match(main,/openCommunityComposer\(true\)/);
  assert.match(main,/\[보행불편 유형:/);
  assert.match(html,/실제 안전등급이나 행정기관 처리상태가 아닙니다/);
  assert.match(css,/#app \#ped-tools-panel\[hidden\]/);
});
