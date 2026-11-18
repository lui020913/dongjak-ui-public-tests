import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  SUBWAY_STATION_ORDER,
  RAIL_OVERVIEW_MIN_ZOOM,
  RAIL_OVERVIEW_MAX_ZOOM,
  makeSchematicRailConnections,
  smoothSchematicRailConnections,
  subwayLineColor
} from '../src/transport-map.js';

const station=(name,lng,lat)=>({kind:'subway',name,lng,lat});

test('사진에 맞춘 1·4·7·9·신림선의 역 연결 순서',()=>{
  assert.deepEqual(Object.keys(SUBWAY_STATION_ORDER),['1호선','4호선','7호선','9호선','신림선']);
  assert.deepEqual(SUBWAY_STATION_ORDER['4호선'],['동작','이수','사당']);
  assert.deepEqual(SUBWAY_STATION_ORDER['9호선'],['노량진','노들','흑석','동작']);
  assert.deepEqual(SUBWAY_STATION_ORDER['신림선'],['대방','서울지방병무청','보라매','보라매공원','보라매병원']);
  assert.deepEqual(SUBWAY_STATION_ORDER['7호선'],['보라매','신대방삼거리','장승배기','상도','숭실대입구','남성','이수']);
});



test('원거리 지하철 도식은 제공된 노선도 느낌을 위해 보조 굴곡점을 포함할 수 있다',()=>{
  const items=[
    station('샛강',126.928,37.517),station('노량진',126.942,37.514),station('노들',126.953,37.513),
    station('흑석',126.964,37.509),station('동작',126.978,37.502),station('구반포',126.987,37.501)
  ];
  const f=makeSchematicRailConnections(items,()=>true,{includeOuter:true}).features.find(f=>f.properties.line==='9호선');
  assert.ok(f);
  assert.ok(f.geometry.coordinates.length>items.length);
});

test('4호선 이수·총신대입구 표기가 달라도 한 개 노선으로 이어짐',()=>{
  const items=[station('동작',126.977,37.502),station('총신대입구',126.982,37.494),station('사당',126.984,37.488)];
  const f=makeSchematicRailConnections(items).features.find(f=>f.properties.line==='4호선');
  assert.ok(f);
  for (const coordinate of items.map(x=>[x.lng,x.lat])) assert.ok(f.geometry.coordinates.some(c=>c[0]===coordinate[0]&&c[1]===coordinate[1]));
  assert.ok(f.geometry.coordinates.length>=items.length);
});

test('신림선 노선색 유지 및 역별 순서 정확히 연결',()=>{
  assert.equal(subwayLineColor('신림선'),'#6789CA');
  const items=SUBWAY_STATION_ORDER['신림선'].map((name,i)=>station(name,126.926+i*.006,37.513-i*.004));
  const f=makeSchematicRailConnections(items).features.find(f=>f.properties.line==='신림선');
  assert.ok(f);
  for (const coordinate of items.map(p=>[p.lng,p.lat])) assert.ok(f.geometry.coordinates.some(c=>c[0]===coordinate[0]&&c[1]===coordinate[1]));
  assert.ok(f.geometry.coordinates.length>=items.length);
});

test('곡선 완화 과정에서도 모든 관측 역 좌표와 양쪽 끝 좌표를 유지',()=>{
  const features=makeSchematicRailConnections([
    station('노량진',126.942,37.513),
    station('노들',126.953,37.513),
    station('흑석',126.964,37.508),
    station('동작',126.978,37.501)
  ]);
  const raw=features.features.find(f=>f.properties.line==='9호선');
  const smooth=smoothSchematicRailConnections(features).features.find(f=>f.properties.line==='9호선');
  assert.ok(smooth.geometry.coordinates.length>raw.geometry.coordinates.length);
  for(const coordinate of raw.geometry.coordinates) assert.ok(smooth.geometry.coordinates.some(c=>c[0]===coordinate[0]&&c[1]===coordinate[1]));
  assert.equal(smooth.properties.schematic,true);
});

test('v5.3 고정 노선은 확대 후에도 유지되며 원거리 페이드를 적용',async()=>{
  const source=await readFile(new URL('../src/transport-map.js',import.meta.url),'utf8');
  const railBlock=source.slice(source.indexOf("id:'transport-schematic-subway'"),source.indexOf("// OSM 실제 노선 relation"));
  assert.match(railBlock,/maxzoom:20/);
  assert.match(railBlock,/line-opacity':\['get','opacity'\]/);
  assert.match(source,/fixedRailCollection\(boundaryGeometry\)/);
  assert.doesNotMatch(source,/^  loadRouteRelations\(\);/m);
  assert.doesNotMatch(source,/^  loadRailwayGeometry\(\);/m);
  assert.match(source,/id:'transport-platform-area'.*minzoom:15\.3/);
});
