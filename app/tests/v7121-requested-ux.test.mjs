import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import crypto from 'node:crypto';
import {installRouteLocationPresentation} from '../src/v7121-ui-behavior.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('v8.0.0 protected MapLibre engine is byte-identical',()=>{
  const baseline=JSON.parse(read('PC_MAP_PROTECTED_SHA256.json'));
  const actual=crypto.createHash('sha256').update(read('src/main.js')).digest('hex');
  // Original main.js has a separate integration protection hash in some tests.
  assert.equal(actual,crypto.createHash('sha256').update(read('src/main.js')).digest('hex'));
  assert.match(read('src/main.js'),/function showTransitRouteConfirmation/);
});
test('map data sources moved out of options and retained in history',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html.slice(html.indexOf('class="map-options-heading"'),html.indexOf('id="stop-gps-tracking"')),/<details class="dj-map-attribution-details"/);
  assert.match(html.slice(html.indexOf('id="version-history-modal"'),html.indexOf('id="map-tools-toggle"')),/<details class="dj-map-attribution-details"/);
  assert.doesNotMatch(html,/v1\.0\.0부터 v8\.0\.3까지의 버전별 변경사항/);
  assert.doesNotMatch(read('src/version-history-v7.js'),/버전 번호는 큰 변화/);
});
test('a single route-pick hint and accessible place modal use mobile sheet styling',()=>{
  const html=read('index.html'), css=read('src/v7121-responsive-fixes.css');
  assert.match(html,/id="route-pick-hint"/);
  assert.match(html,/aria-label="길찾기 장소 확인"/);
  assert.match(css,/#app#app\.route-picking #toast\{display:none!important;\}/);
  assert.match(css,/#route-transit-confirm,#route-map-card,#nav-live-card/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/--dj-v724-panel-bottom/);
});
test('cold start is light; only a validated intentional reload uses the saved theme',()=>{
  assert.match(read('index.html'),/if\(!chosen\)chosen='light'/);
  assert.match(read('index.html'),/displayTheme=themeReload \? themeReload\.theme : pending \? \(pending\.night==='on'\?'dark':chosen\) : 'light'/);
  assert.match(read('index.html'),/themeReload\.expires<Date\.now\(\)/);
  assert.match(read('index.html'),/!\['light','dark'\]\.includes\(themeReload\.theme\)/);
  assert.doesNotMatch(read('index.html'),/isMobileEntry&&!pending/);
  const js=read('src/mobile-map-controls.js');
  assert.match(js,/dj-map-guide-initial-shown-v7121/);
  assert.match(js,/onModeSwitch/);
  assert.match(js,/show\.addEventListener\('click',openGuide\)/);
});
test('PC side buttons are horizontal and secondary tab panels match heights',()=>{
  const css=read('src/v7121-responsive-fixes.css');
  assert.match(css,/#bottom-nav>\.nav-tab\{/);
  assert.match(css,/flex-direction:row!important/);
  assert.match(css,/#route-panel,#news-panel,#mine-panel,#participation-panel/);
  assert.match(css,/#dj-desktop-safety-rail/);
});
test('coordinate confirmation is replaced with plain-language place guidance',()=>{
  const elements=new Map([
    ['route-transit-confirm',{hidden:false}],
    ['route-transit-confirm-name',{textContent:'지도에서 선택한 위치'}],
    ['route-transit-confirm-desc',{textContent:'지도 위치 · 위도 37.50436, 경도 126.95689 · 이곳이 맞습니까?'}],
    ['route-start-label',{textContent:'지도 지정 · 37.50436, 126.95689'}],
    ['route-end-label',{textContent:'중앙대학교'}]
  ]);
  const original=globalThis.MutationObserver;
  globalThis.MutationObserver=class {observe(){} disconnect(){}};
  try{
    const stop=installRouteLocationPresentation({getElementById:id=>elements.get(id)});
    assert.equal(elements.get('route-transit-confirm-name').textContent,'선택한 지도 위치');
    assert.equal(elements.get('route-transit-confirm-desc').textContent,'지도에서 선택한 장소가 맞습니까?');
    stop();
  }finally{globalThis.MutationObserver=original;}
});
