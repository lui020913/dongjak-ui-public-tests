import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html = read('index.html');
const css = read('src/v8212-mobile-overlay-guide-fixes.css');
const swipe = read('src/v831-swipe-feature-toolbar.js');
test('v8.2.12: original structural OAuth popup remains wired, and swipe shortcuts are layered on',()=>{
  assert.match(html, /src\/v831-swipe-feature-toolbar\.css/);
  assert.match(html, /src\/v831-swipe-feature-toolbar\.js/);
  assert.match(html, /src\/v8212-mobile-overlay-guide-fixes\.css/);
  assert.ok(html.indexOf('v831-swipe-feature-toolbar.js')>html.indexOf('v824-auth-keyboard.js'));
  assert.match(swipe,/row\.insertBefore\(scroller,more\)/);
  assert.ok(read('src/v831-kakao-popup.js').includes('dongjak:kakao-popup-result:v831'));
  assert.ok(read('tests/v832-structural-fixes.test.mjs').length>0);
});
test('v8.2.12: only one scroll owner for mobile map option and static layer submenu',()=>{
  assert.match(css, /map-controls-open #map-advanced-controls\{/);
  assert.match(css, /overflow-x:hidden!important;overflow-y:auto!important/);
  assert.match(css, /#map-advanced-controls \.base-layer-menu\{/);
  assert.match(css, /position:static!important/);
  assert.match(css, /z-index:auto!important/);
  assert.match(css, /#map-advanced-controls > \.map-options-mobile-heading/);
});
test('v8.2.12: centered original app logo and larger fixed More glyph',()=>{
  assert.match(css, /topbar > #dj-settings-mobile img/);
  assert.match(css, /object-position:center center!important/);
  assert.match(css, /#dj-v794-toolbar > #dj-v794-more > span/);
  assert.match(css,/font-size:28px!important/);
});
test('v8.2.12: concise first-open help preserves all original instructions behind mobile context and native disclosure',()=>{
  assert.equal((html.match(/class="dj807-guide-platform"><b>PC<\/b>/g)||[]).length,4);
  assert.equal((html.match(/class="dj807-guide-platform"><b>모바일<\/b>/g)||[]).length,4);
  assert.match(html,/<details class="dj803-ios-install-help dj8212-ios-install-help"/);
  assert.match(html,/<summary aria-expanded="false"><span>iPhone에서 앱처럼 사용하기<\/span><span class="dj852-tip-chevron"/);
  assert.match(html,/id="dj-guide-release-details"/);
  assert.match(css,/\.dj807-guide-platform:has\(> b\):first-child\{display:none!important/);
  assert.match(css,/map-gesture-guide dl dd \.dj807-guide-platform\{/);
  assert.match(css,/font-weight:500!important/);
});
