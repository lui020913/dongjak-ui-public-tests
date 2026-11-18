import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {subwayArrivalDirection,groupSubwayArrivals,normalizeStationQueryName,
  subwayStationQueryCandidates,adjacentStationNames} from '../src/transport-map.js';
import {parseSeoulSubwayArrival} from '../src/transport-data.js';
import {classifySchool,normalizeEducationFeatures,DONGJAK_UNIVERSITIES} from '../src/education-layer.js';
import {VERSION_HISTORY} from '../src/version-history.js';

test('서울시 API 상행·하행 분리, 미확인 방향은 함부로 판정하지 않음',()=>{
  const data=[
    {line:'7호선',direction:'상행 · 장암행 - 신대방삼거리방면',message:'5분 후'},
    {line:'7호선',direction:'하행 · 온수행 - 신풍방면',message:'7분 후'},
    {line:'신림선',direction:'상행 · 샛강행',message:'보라매 출발'},
    {line:'신림선',direction:'하행 · 관악산행',message:'4분 후'},
    {line:'7호선',direction:'미확인 방면',message:'도착'}
  ];
  assert.equal(subwayArrivalDirection(data[0]),'상행');
  assert.equal(subwayArrivalDirection(data[1]),'하행');
  assert.equal(subwayArrivalDirection(data[4]),'방향 미확인');
  const groups=groupSubwayArrivals(data);
  assert.equal(groups.get('7호선').get('상행').length,1);
  assert.equal(groups.get('7호선').get('하행').length,1);
  assert.equal(groups.get('신림선').get('상행').length,1);
  assert.equal(groups.get('신림선').get('하행').length,1);
});

test('원본 실시간 API의 updnLine은 별도 보존된다',()=>{
  const data={realtimeArrivalList:[{subwayId:'1007',updnLine:'상행',trainLineNm:'장암행',arvlMsg2:'7분 후'}]};
  assert.equal(parseSeoulSubwayArrival(data)[0].directionType,'상행');
});

test('이수와 총신대입구는 하나의 환승역이면서 공식 명칭으로 재조회 가능',()=>{
  assert.equal(normalizeStationQueryName('총신대입구역'),'이수');
  assert.equal(normalizeStationQueryName('총신대입구(이수)'),'이수');
  assert.equal(normalizeStationQueryName('이수역'),'이수');
  const names=subwayStationQueryCandidates('총신대입구(이수)');
  assert.ok(names.includes('이수'));
  assert.ok(names.includes('총신대입구'));
  assert.ok(names.includes('총신대입구(이수)'));
  assert.equal(adjacentStationNames('총신대입구','4호선').previous,'동작');
  assert.equal(adjacentStationNames('이수','7호선').previous,'남성');
});

test('원거리 지도에서는 호선별 원형 배지를 붙여 표시하고 확대하면 노선별 위치로 분리',async()=>{
  const source=await readFile(new URL('../src/transport-map.js',import.meta.url),'utf8');
  const geo=await readFile(new URL('../src/metro-marker-geodata.js',import.meta.url),'utf8');
  assert.match(source,/const minzoom=isSummary\?\(mobile\?12\.6:METRO_MARKER_MIN_ZOOM\):METRO_PLATFORM_SPLIT_ZOOM/);
  assert.match(source,/dj-metro-summary-icon/);
  assert.match(source,/dj-metro-detail-icon/);
  assert.match(geo,/role:'summary'/);
  assert.match(geo,/iconOffset/);
  assert.match(geo,/linePoints\.forEach/);
  assert.match(geo,/role:'detail'/);
  assert.match(source,/map.addSource\(stationSource/);
  assert.match(source,/id:'transport-schematic-subway'/);
});

test('학교는 실제 좌표를 받아 분류하며 대학 3곳 대표좌표를 유지',()=>{
  assert.deepEqual(DONGJAK_UNIVERSITIES.map(x=>x.name),['중앙대학교','숭실대학교','총신대학교']);
  for(const x of DONGJAK_UNIVERSITIES){assert.ok(Number.isFinite(x.lat)&&Number.isFinite(x.lng));}
  assert.equal(classifySchool('동작초등학교','school'),'elementary');
  assert.equal(classifySchool('사당중학교','school'),'middle');
  assert.equal(classifySchool('성남고등학교','school'),'high');
  assert.equal(classifySchool('중앙대학교','university'),'university');
  const features=normalizeEducationFeatures([
    {id:1,type:'node',lat:37.5,lon:126.95,tags:{amenity:'school',name:'동작초등학교'}},
    {id:2,type:'node',lat:37.5,lon:127.5,tags:{amenity:'school',name:'외부고등학교'}},
    {id:3,type:'node',lat:37.5,lon:126.96,tags:{amenity:'restaurant',name:'국밥집'}}
  ],lng=>lng<127);
  assert.equal(features.length,1);
  assert.equal(features[0].kind,'elementary');
});

test('과거 이력 보존과 주요·개선 버전 구분, 현재 업데이트 문구에 분류 안내 포함 안함',()=>{
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
  assert.ok(LEGACY_VERSION_HISTORY.length>=20);
  assert.equal(LEGACY_VERSION_HISTORY.filter(x=>x.scale==='major').length,8);
  assert.ok(LEGACY_VERSION_HISTORY.some(x=>x.version==='v1.0'&&x.scale==='major'));
  assert.ok(LEGACY_VERSION_HISTORY.some(x=>x.version==='v4.4'));
  assert.ok(VERSION_HISTORY[0].items.length>=3);
});
