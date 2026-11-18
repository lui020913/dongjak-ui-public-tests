import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {schoolIdentity,normalizeEducationFeatures} from '../src/education-layer.js';
import {fallbackRailOverview} from '../src/transport-map.js';
import {VERSION_HISTORY} from '../src/version-history.js';

const source=async file=>readFile(new URL(`../${file}`,import.meta.url),'utf8');

test('대학교 캠퍼스·후문·명칭 변형을 같은 교육기관으로 인식',()=>{
  assert.equal(schoolIdentity('중앙대학교 서울캠퍼스'),'중앙대학교');
  assert.equal(schoolIdentity('중앙대학교 후문'),'중앙대학교');
  assert.equal(schoolIdentity('숭실대학교 정문'),'숭실대학교');
  const features=normalizeEducationFeatures([
    {type:'node',id:1,lon:126.953,lat:37.503,tags:{amenity:'university',name:'중앙대학교'}},
    {type:'way',id:2,center:{lon:126.954,lat:37.504},tags:{amenity:'university',name:'중앙대학교 서울캠퍼스'}},
    {type:'node',id:3,lon:126.956,lat:37.496,tags:{amenity:'university',name:'숭실대학교'}}
  ],()=>true);
  assert.equal(features.length,2);
});

test('보행 경로를 일반형과 경사 회피형으로 나누고 Valhalla pedestrian use_hills 적용',async()=>{
  const code=await source('src/main.js');
  assert.match(code,/costing:'pedestrian',costing_options:\{pedestrian:\{use_hills:useHills\}\}/);
  assert.match(code,/profile==='gentle'\?0:0\.5/);
  assert.match(code,/Promise\.allSettled\(\[/);
  assert.match(code,/routeVariants=\{standard,gentle\}/);
  const html=await source('index.html');
  assert.match(html,/data-route-variant="standard"/);
  assert.match(html,/data-route-variant="gentle"/);
});

test('한글 단어가 중간에서 강제로 잘리지 않고 노선 선형과 경계선 강조 레이어 유지',async()=>{
  const css=await source('src/style.css');
  assert.match(css,/word-break:keep-all/);
  assert.match(css,/transport-arrival-time\{white-space:nowrap/);
  const main=await source('src/main.js');
  assert.match(main,/text-max-width',90/);
  assert.match(main,/id:'district-border-halo'/);
  const transport=await source('src/transport-map.js');
  assert.match(transport,/id:'transport-schematic-subway-casing'/);
  assert.match(transport,/fixedRailCollection\(boundaryGeometry\)/);
  assert.match(transport,/isNearBoundary=\(\)=>false/);
  assert.ok(fallbackRailOverview().features.length>=5);
});

test('지도 화살표는 베이스맵 일방통행 레이어의 간격만 조정',async()=>{
  const code=await source('src/main.js');
  assert.match(code,/function thinNativeOnewayArrows/);
  assert.match(code,/symbol-spacing',280/);
  assert.doesNotMatch(code,/addLayer\(\{id:'invented-direction-arrow'/);
});

test('지하철 원거리 정보 제한·버전 누적 이력',async()=>{
  const code=await source('src/transport-map.js');
  assert.match(code,/if\(!station\|\|p.openable/);
  assert.match(code,/nearby:\(lng,lat\)=>isNearBoundary\(lng,lat\)/);
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
  assert.ok(LEGACY_VERSION_HISTORY.some(v=>v.version==='v5.1'));
});
