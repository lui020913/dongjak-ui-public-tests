import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseStationMasterCSV,adjacentStationNames,makeNearbyRailOverview,
  subwayLineColor,normalizeLineName,metroLineBadgeText,STATION_MASTER_URL} from '../src/transport-map.js';
import {makeNeighborDistrictLabels} from '../src/map-polish.js';

const station=(name,line,lng,lat)=>({kind:'subway',name,lines:[line],lng,lat});
const square=(lng,lat)=>({type:'Polygon',coordinates:[[
  [lng-.003,lat-.003],[lng+.003,lat-.003],[lng+.003,lat+.003],[lng-.003,lat+.003],[lng-.003,lat-.003]
]]});

test('역 좌표 CSV에서 역명, 노선, 위경도를 정확히 파싱한다',()=>{
  const csv='station,line,lat,lng,first_seen,last_seen\n상도,7호선,37.50283,126.94791,20150101,20260630\n노량진,9호선·경부선,37.51353,126.94101,20150101,20260630';
  const stations=parseStationMasterCSV(csv);
  assert.equal(stations.length,2);
  assert.deepEqual([stations[0].lng,stations[0].lat],[126.94791,37.50283]);
  assert.deepEqual(stations[1].lines,['9호선','1호선']);
  assert.match(STATION_MASTER_URL,/station_coords_canonical\.csv$/);
});

test('정확한 호선별 이전역·다음역은 실제 정해진 역 순서로만 보여준다',()=>{
  assert.deepEqual(adjacentStationNames('상도','7호선'),{previous:'장승배기',next:'숭실대입구',verified:true});
  assert.deepEqual(adjacentStationNames('노량진','9호선'),{previous:'샛강',next:'노들',verified:true});
  assert.equal(adjacentStationNames('아무역','9호선').verified,false);
});

test('역사 마스터의 좌표를 연결해 동작구 주변 호선별 개략선을 만든다',()=>{
  const samples=[
    station('장승배기','7호선',126.938,37.505),
    station('상도','7호선',126.94791,37.50283),
    station('숭실대입구','7호선',126.953,37.497)
  ];
  const result=makeNearbyRailOverview(samples,()=>true);
  assert.ok(result.features.some(f=>f.properties.line==='7호선'));
  assert.ok(result.features.every(f=>f.properties.schematic===true));
});

test('신림선·경의중앙선은 고유 색상과 이름을 쓰고 알 수 없는 호선은 이름을 위조하지 않는다',()=>{
  assert.equal(metroLineBadgeText('신림선'),'신림');
  assert.equal(metroLineBadgeText('경의중앙선'),'경의중앙');
  assert.equal(subwayLineColor('경의중앙선'),'#77C4A3');
  assert.equal(normalizeLineName('경부선'),'1호선');
  assert.equal(metroLineBadgeText('알 수 없는 철도'),'');
});

test('서울 자치구와 경기도 시 이름이 지역 라벨로 포함된다',()=>{
  const out=makeNeighborDistrictLabels([
    {properties:{SIG_KOR_NM:'동작구',SIG_CD:'11590'},geometry:square(126.95,37.5)},
    {properties:{SIG_KOR_NM:'관악구',SIG_CD:'11620'},geometry:square(126.95,37.48)},
    {properties:{SIG_KOR_NM:'안양시 동안구',SIG_CD:'41173'},geometry:square(126.95,37.42)},
    {properties:{SIG_KOR_NM:'안양시 만안구',SIG_CD:'41171'},geometry:square(126.92,37.4)}
  ],[[126.9,37.4],[127.1,37.6]]);
  assert.deepEqual(out.features.map(f=>f.properties.name),['관악구','안양시']);
});

test('교통정보는 노선별 그룹·이전역·다음역을 표시하며 스크롤바를 숨긴다',async()=>{
  const [source,html,css]=await Promise.all([
    readFile(new URL('../src/transport-map.js',import.meta.url),'utf8'),
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../src/style.css',import.meta.url),'utf8')
  ]);
  assert.match(html,/id="transport-neighbors"/);
  assert.match(source,/function displayArrivals\(container,kind,items\)/);
  assert.match(source,/function createMetroLineCard\(line,stationName\)/);
  assert.match(css,/\.transport-sheet::-webkit-scrollbar/);
  assert.match(css,/\.metro-overview \.metro-badges/);
});
