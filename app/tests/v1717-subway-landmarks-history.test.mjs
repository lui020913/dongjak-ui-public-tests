import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {VERSION_HISTORY} from '../src/version-history.js';
import {VERIFIED_LANDMARKS} from '../src/landmark-layer.js';
import {
  METRO_RADIUS_CENTER,METRO_RADIUS_METERS,withinMetroRadius,
  metroLineBadgeText,subwayLineColor,normalizeLineName,fallbackRailOverview
} from '../src/transport-map.js';

test('원형 신림선과 경의중앙선 표기가 정확하다',()=>{
  assert.equal(metroLineBadgeText('신림선'),'신림');
  assert.equal(metroLineBadgeText('경의중앙선'),'경의중앙');
  assert.equal(normalizeLineName('경의·중앙선'),'경의중앙선');
  assert.equal(subwayLineColor('경의중앙선'),'#77C4A3');
  assert.equal(subwayLineColor('신림선'),'#6789CA');
  assert.equal(metroLineBadgeText('확인되지 않음'),'');
});
test('동작구 중심에서 반경 10km까지만 역을 표시한다',()=>{
  assert.equal(METRO_RADIUS_METERS,10000);
  assert.ok(withinMetroRadius(...METRO_RADIUS_CENTER));
  assert.equal(withinMetroRadius(127.15,37.4987),false);
});
test('서버 조회 전에 기본 개략 지하철 노선이 비어 있지 않다',()=>{
  const fc=fallbackRailOverview();
  assert.ok(fc.features.length>=5);
  for(const f of fc.features){assert.equal(f.geometry.type,'LineString');assert.ok(f.geometry.coordinates.length>=4);}
});
test('누적 업데이트 내역은 v17.17부터 과거 버전까지 계속 표시한다',()=>{
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
  assert.ok(LEGACY_VERSION_HISTORY.some(x=>x.version==='v1.0'));
  assert.ok(LEGACY_VERSION_HISTORY.some(x=>x.version==='v4.4'));
  assert.ok(LEGACY_VERSION_HISTORY.length>=15);
});
test('동작구청 신청사와 현충원 아이콘이 근거있는 좌표로 등록된다',()=>{
  assert.equal(VERIFIED_LANDMARKS.length,2);
  assert.equal(VERIFIED_LANDMARKS[0].name,'동작구청');
  assert.ok(VERIFIED_LANDMARKS.every(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)));
});
test('버전 생성 스크립트는 package.json 버전을 따라가야 한다',async()=>{
  const script=await readFile(new URL('../scripts/stamp-version.mjs',import.meta.url),'utf8');
  assert.match(script,/pkg\.version/);
  assert.doesNotMatch(script,/version:'1\.7\.14'/);
});
test('지도 역 배지와 신림선 아이콘 파일이 존재한다',async()=>{
  const {stat}=await import('node:fs/promises');
  assert.ok((await stat(new URL('../public/images/shinlim-line.png',import.meta.url))).size>1000);
  const t=await readFile(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(t,/metro-badge-shinlim/);
  assert.match(t,/fallbackRailOverview\(\)/);
});

test('실제 철도 노선은 OSM relation의 선로 좌표만 사용한다',async()=>{
  const {railwayRelationTracks}=await import('../src/transport-map.js');
  const input=[{type:'relation',id:123,tags:{type:'route',route:'subway',name:'서울 지하철 7호선'},members:[
    {type:'way',ref:12,role:'',geometry:[{lon:126.93,lat:37.50},{lon:126.935,lat:37.502}]},
    {type:'node',ref:42,role:'stop',lat:37.50,lon:126.93}
  ]}];
  const fc=railwayRelationTracks(input,()=>true);
  assert.equal(fc.features.length,1);
  assert.equal(fc.features[0].properties.line,'7호선');
  assert.equal(fc.features[0].properties.schematic,false);
  assert.deepEqual(fc.features[0].geometry.coordinates,[[126.93,37.50],[126.935,37.502]]);
});
