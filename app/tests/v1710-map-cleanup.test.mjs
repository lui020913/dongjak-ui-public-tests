import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSchematicRailConnections,normalizeOSMTransport,metroLineBadgeText,subwayLineColor} from '../src/transport-map.js';
import {classifyPublicTags,safetyFeatures} from '../src/safety-layers.js';
import {computeActionPlacement} from '../src/adaptive-map-actions.js';
import {readFile} from 'node:fs/promises';

test('신림선은 서울하늘색이고 대방역에도 신림선 환승 정보가 추가됨',()=>{
  assert.equal(subwayLineColor('신림선'),'#6789CA');
  assert.equal(metroLineBadgeText('신림선'),'신림');
  const result=normalizeOSMTransport([{type:'node',id:1,lon:126.926,lat:37.513,
    tags:{railway:'station',name:'대방역'}}],()=>true);
  assert.ok(result[0].lines.includes('신림선'));
});

test('개략 지하철 노선은 확인된 인접 역만 이어 불확실한 역을 건너뛰지 않음',()=>{
  const features=makeSchematicRailConnections([
    {kind:'subway',name:'노량진',lng:126.941,lat:37.514},
    {kind:'subway',name:'흑석',lng:126.964,lat:37.509},
  ]);
  assert.equal(features.features.length,0,'중간 노들역 누락 시 가짜 지름길을 만들지 않음');
});

test('지하철 개략 노선은 실제 동작구 경계까지 연장되며 외부로 넘어가지 않음',()=>{
  const inside=(x,y)=>x>=126.90&&x<=126.97&&y>=37.49&&y<=37.52;
  const features=makeSchematicRailConnections([
    {kind:'subway',name:'대방',lng:126.925,lat:37.513},
    {kind:'subway',name:'노량진',lng:126.940,lat:37.514}
  ],inside);
  const line=features.features.find(f=>f.properties.line==='1호선');
  assert.ok(line);
  assert.ok(line.geometry.coordinates.length>=3);
  assert.ok(line.geometry.coordinates.every(([x,y])=>inside(x,y)));
});

test('공공·교육시설 태그를 다양한 형태로 구분하며 일반 상업시설은 제외',()=>{
  const samples=[
    [{amenity:'townhall',name:'동작구청'},'district_office'],
    [{office:'government',name:'정부청사'},'government'],
    [{amenity:'community_centre',name:'상도1동 행정복지센터'},'administrative_center'],
    [{amenity:'community_centre',name:'상도경로당'},'senior_center'],
    [{amenity:'kindergarten',name:'미래어린이집'},'daycare'],
    [{amenity:'school',name:'상도초등학교'},'school'],
    [{leisure:'park',name:'공원'},'park'],
    [{shop:'hairdresser',name:'미용실'},null]
  ];
  for(const [tags,expected] of samples)assert.equal(classifyPublicTags(tags),expected);
});

test('공공시설 GeoJSON은 동작구 내부의 확인된 위치만 포함',()=>{
  const elements=[
    {id:7,type:'node',lon:126.95,lat:37.5,tags:{amenity:'school',name:'학교'}},
    {id:8,type:'node',lon:127.4,lat:37.5,tags:{amenity:'school',name:'다른 지역 학교'}},
    {id:9,type:'node',lon:126.95,lat:37.5,tags:{shop:'convenience',name:'편의점'}}
  ];
  const result=safetyFeatures(elements,(lng)=>lng<127,'public');
  assert.equal(result.features.length,1);
  assert.equal(result.features[0].properties.kind,'school');
});

test('패널 오른쪽에 여유 공간이 있으면 조작 버튼을 패널 밖에 배치',()=>{
  const result=computeActionPlacement({viewportWidth:1600,viewportHeight:900,panelRect:{left:300,right:1300,top:680,bottom:900},actionsWidth:49,actionsHeight:223});
  assert.ok(result.right>=12);
  assert.equal(result.bottom,85);
});
test('전체폭 화면에서는 조작 버튼을 안내 패널보다 위로 올림',()=>{
  const result=computeActionPlacement({viewportWidth:390,viewportHeight:844,panelRect:{left:0,right:390,top:666,bottom:844},actionsWidth:49,actionsHeight:223});
  assert.ok(result.bottom>=190);
  assert.equal(result.right,16);
});
test('전용 시설·버스 축척 설정 및 회색 철도 강조 레이어 제거',async()=>{
  const t=await readFile(new URL('../src/transport-map.js',import.meta.url),'utf8');
  const h=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(t,/source:'transport-bus',minzoom:16.4/);
  assert.doesNotMatch(t,/id:'transport-rail-base'/);
  assert.match(h,/id="toggle-public-facilities"/);
});
