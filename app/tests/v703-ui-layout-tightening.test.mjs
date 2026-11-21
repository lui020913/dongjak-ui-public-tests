import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Dongjak full logo is used and fitted smaller inside the circular featured marker',()=>{
  const renderer=read('src/featured-place-labels.js');
  const html=read('index.html');
  const packageJson=JSON.parse(read('package.json'));
  assert.match(renderer,/fit==='contain'\?Math\.min/);
  assert.match(renderer,/name==='dongjak'\?\{fit:'contain',scaleFactor:0\.78\}/);
  assert.match(html,/map-startup-logo[^]*?dongjak-light-512\.png/);
  assert.equal(packageJson.version,APP_VERSION);
});

test('route, news, community and activity panels align to the left navigation and shrink to content',()=>{
  const css=read('src/mobile-ui-baseline.css');
  assert.match(css,/#app #route-panel\.page-panel,[\s\S]*#app #news-panel\.page-panel/);
  assert.match(css,/top:calc\(88px \+ env\(safe-area-inset-top\)\)!important/);
  assert.match(css,/bottom:auto!important/);
  assert.match(css,/height:max-content!important/);
  assert.match(css,/max-height:calc\(100dvh/);
});

test('map options owns its close X and launcher keeps a stable label',()=>{
  const html=read('index.html');
  const main=read('src/main.js');
  const css=read('src/mobile-ui-baseline.css');
  assert.match(html,/id="map-options-desktop-close"[^>]*>/);
  assert.match(html,/id="map-options-mobile-close"[^>]*>/);
  assert.match(main,/map-options-desktop-close'\)\?\.addEventListener\('click',closeMapOptions\)/);
  assert.match(main,/mapToolsToggle\.textContent='지도 옵션'/);
  assert.doesNotMatch(main,/지도 옵션 닫기/);
  assert.match(css,/#app \.map-options-desktop-close/);
});

test('map options and pedestrian safety launchers share desktop tab dimensions',()=>{
  const css=read('src/mobile-ui-baseline.css');
  assert.match(css,/#app #map-tools-toggle,[\s\S]*#app #map-safety-toggle/);
  assert.match(css,/height:60px!important;min-height:60px!important;max-height:60px!important/);
});

test('v7.0.3 release notes record the six UI changes',()=>{
  const history=read('src/version-history.js');
  assert.match(history,/\{version:'v7\.0\.3'/);
  for(const phrase of ['길찾기는 위로, 동작 소식은 아래로','지도 옵션 패널 내부 헤더에 X 닫기 버튼','빈 공간 축소'])
    assert.ok(history.includes(phrase),`missing release note: ${phrase}`);
});
