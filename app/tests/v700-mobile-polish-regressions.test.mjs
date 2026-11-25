import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nineLineServiceKind,subwayArrivalDirection,groupSubwayArrivals} from '../src/transport-map.js';
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('9호선 급행 분리는 명시적으로 확인된 정보만 사용',()=>{
  assert.equal(nineLineServiceKind({serviceType:'급행'}),'급행');
  assert.equal(nineLineServiceKind({direction:'하행 · 급행'}),'급행');
  assert.equal(nineLineServiceKind({express:true}),'급행');
  assert.equal(nineLineServiceKind({serviceType:'일반'}),'일반');
  assert.equal(nineLineServiceKind({express:false}),'일반');
  assert.equal(nineLineServiceKind({serviceType:'정보 없음'}),'종별 미확인');
  assert.equal(subwayArrivalDirection({direction:'상행 · 급행'}),'상행');
  assert.equal(groupSubwayArrivals([{line:'9호선',directionType:'상행',serviceType:'급행'}]).get('9호선').get('상행').length,1);
  const js=source('src/transport-map.js');
  assert.match(js,/line==='9호선'\s*\?\s*\[\['일반'/);
  assert.match(js,/metro-nine-service-heading/);
});

test('모바일 상행 하행은 좁은 화면에서도 두 열로 렌더링',()=>{
  const css=source('src/mobile-ui-baseline.css');
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css,/\.metro-arrival-direction-group \.transport-arrival-row\{[\s\S]*?flex-direction:column!important/);
  assert.match(source('src/main.js'),/import '\.\/mobile-ui-baseline\.css'/);
});

test('제한속도는 PRI에 통합하고 단속카메라는 비활성 표시',()=>{
  const js=source('src/sangdo-speed-map.js');
  const html=source('index.html');
  assert.match(js,/let enabled=false,ready=false/);
  assert.match(js,/let cameraEnabled=false,cameraData/);
  assert.doesNotMatch(html,/id="sangdo-speed-toggle"/);
  assert.match(html,/id="pilot-unavailable-camera"[^>]*disabled aria-pressed="false"/);
  assert.doesNotMatch(html,/id="sangdo-speed-controls"/);
  assert.match(js,/enabled=enabledSpeeds\(\)\.length>0/);
});

test('시간표 기반 카드의 출처는 유지하고 중복 상단 배너는 제거',()=>{
  const js=source('src/transport-map.js');
  assert.doesNotMatch(js,/el\('strong','','시간표 기준 다음 열차'\)/);
  assert.match(js,/metro-planned-time-meta/);
  assert.match(js,/시간표 기준/);
});

test('모바일 역 정보창을 열 때 지도 버튼 겹침을 방지',()=>{
  const css=source('src/mobile-ui-baseline.css'),js=source('src/transport-map.js');
  assert.match(css,/#app\.transport-sheet-open :is\(#map-tools-toggle,#map-safety-toggle/);
  assert.match(js,/classList\?\.add\?\.\('transport-sheet-open'\)/);
  assert.match(js,/classList\?\.remove\?\.\('transport-sheet-open'\)/);
});

test('지역 뉴스 RSS 실패 시 공식 보도자료 대체 표시를 분명하게 구분',()=>{
  const js=source('server/dongjak-news.mjs');
  assert.doesNotMatch(js, /source:'동작구청 보도자료 · RSS 대체 자료'/);
  assert.doesNotMatch(js,/if\(candidate\.official\)/);
  assert.match(js,/보도자료 · 지역뉴스 대체/);
  assert.match(js,/fallback:type==='media'/);
});

test('상단 검색 및 주요 버튼 스타일 일원화',()=>{
  const css=source('src/mobile-ui-baseline.css');
  assert.match(css,/\.topbar>.map-quick-search \.map-quick-search-form/);
  assert.match(css,/-webkit-backdrop-filter:none!important/);
  assert.match(css,/#app #map-safety-toggle::before/);
  assert.match(css,/#app #bottom-nav \.nav-tab/);
});
