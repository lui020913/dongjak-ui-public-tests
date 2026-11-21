import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {metroMarkerGeojson} from '../src/metro-marker-geodata.js';
import {metroLineBadgeText, metroLineMarkerPlacements} from '../src/transport-map.js';
import {VERSION_HISTORY} from '../src/version-history.js';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('v5.4 로깅 및 HTML 버전 일치',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,APP_VERSION);
   assert.match(read('index.html'),/>업데이트<\/button>/);
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
});
test('모든 지하철 호선 배지는 역명 끝에 역을 붙이고 신림선만 신림을 표시',()=>{
  const fc=metroMarkerGeojson([{kind:'subway',name:'보라매',lng:126.92018,lat:37.4998,lines:['7호선','신림선']}],{
    normalizeName:s=>s,normalizeLine:s=>s,placements:metroLineMarkerPlacements,
    colors:{'7호선':'#747f00','신림선':'#6789ca'},radiusPredicate:()=>true,nearby:()=>true,
  });
  assert.equal(fc.features.length,4);
  const summary=fc.features.filter(f=>f.properties.role==='summary');
  const detail=fc.features.filter(f=>f.properties.role==='detail');
  assert.equal(summary.length,2);
  assert.deepEqual(summary.map(f=>f.properties.badge),['7','신림']);
  assert.equal(summary.filter(f=>f.properties.labelOn).length,1);
  assert.deepEqual(detail.map(f=>f.properties.badge),['7','신림']);
  assert.deepEqual(detail.map(f=>f.properties.labelOn),[true,true]);
  assert.equal(metroLineBadgeText('신림선'),'신림');
});
test('역 마커는 지도 레이어로 생성하고 축척에 따라 통합·분리함',()=>{
  const source=read('src/transport-map.js');
  assert.match(source,/dj-metro-\$\{role\}-icon/);
  assert.match(source,/dj-metro-summary-icon/);
  assert.match(source,/METRO_MARKER_MIN_ZOOM/);
  assert.match(source,/map\.getSource\(stationSource\)\?\.setData\(geo\)/);
  assert.match(source,/icon-allow-overlap':true/);
  assert.match(source,/function updateMetroMarkerPresentation\(\)\{/);
  assert.match(source,/Overview: adjacent separate circles per line/);
});
test('모바일 검색 날씨 축척 및 하단 메뉴 고정',()=>{
  const css=read('src/map-patch/dongjak-v54-polish.css');
  assert.match(css,/\.topbar>\.map-quick-search/);
  assert.match(css,/\.header-tools \.weather-widget/);
  assert.match(css,/#bottom-nav/);
  assert.match(css,/maplibregl-ctrl-scale/);
  assert.match(css,/#map-chrome-restore\{display:none!important;\}/);
});
test('커뮤니티는 목록이 제보보다 앞서고, 실제 게시글이 없으면 빈 상태를 표시',()=>{
  const html=read('index.html');
  assert.ok(html.indexOf('id="community-list"')<html.indexOf('class="community-report-secondary"'));
  assert.match(read('src/main.js'),/dj-community-empty-state/);
  assert.match(read('src/main.js'),/첫 번째 동네 이야기를 기다리고 있습니다/);
  assert.doesNotMatch(read('src/main.js'),/community-example|시연 예시 게시글/);
});
test('도로폭 미확인 구간, 뉴스 재시도, 한국어 전용 상호명은 코드를 갖춤',()=>{
  assert.match(read('src/road-width-layer.js'),/setShown\(false\)/);
  assert.doesNotMatch(read('src/road-width-layer.js'),/이 위치의 도로폭 정보 없음/);
  assert.match(read('server/dongjak-news.mjs'),/Bing 뉴스|동작구청 보도자료/);
  assert.match(read('src/ui-environment.js'),/dongjak-zoom-commercial-names/);
  assert.match(read('src/ui-environment.js'),/dongjak-zoom-busstop-names/);
});
