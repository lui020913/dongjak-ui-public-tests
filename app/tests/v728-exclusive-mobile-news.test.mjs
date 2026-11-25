import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FRIENDLY_SEARCH_PLACEHOLDERS} from '../src/map-quick-search.js';
import {VERSION_HISTORY} from '../src/version-history.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/mobile-ui-baseline.css');

test('v728 applies one last stylesheet while retaining 5-tab mobile controls',()=>{
  const main=read('src/main.js');
  assert.match(main,/import '\.\/mobile-ui-baseline\.css'/);
  assert.equal((main.match(/mobile-ui-baseline\.css/g)||[]).length,1);
  assert.ok(main.indexOf('mobile-ui-baseline.css')<main.indexOf('v815-map-product.css'));
  assert.match(css,/#app\[data-tab\] #map-tools-toggle/);
  assert.match(css,/#app\[data-tab\] #night-visibility-quick-off/);
  assert.match(css,/#app\[data-tab\] #map-safety-toggle/);
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
});
test('night view excludes competing drawers and has full night-off label',()=>{
  const src=read('src/night-visibility-map.js');
  assert.match(src,/app\.classList\.remove\('map-controls-open','map-safety-open'\)/);
  assert.match(src,/label\.textContent=enabled\?'야간 시야 해제':'야간 시야'/);
  assert.match(css,/#app\[data-tab="map"\]\.map-controls-open #night-visibility-float/);
});
test('road width uses exclusive road-layer state and an explicit aligned close X',()=>{
  const src=read('src/road-width-layer.js');
  assert.match(src,/dj-road-width-open/);
  assert.match(src,/claimRoadLayer\('width'/);
  assert.match(css,/#app #road-width-legend:not\(\[hidden\]\)/);
  assert.match(css,/#app #road-width-legend-close::before/);
});
test('desktop right actions and scale remain while left drawers are open',()=>{
  assert.match(css,/#app\.detail-open \.map-actions/);
  assert.match(css,/#app \.maplibregl-ctrl-bottom-left/);
  assert.match(css,/display:block!important;visibility:visible!important;opacity:1!important/);
});
test('mobile no fake page scroll and restores 16px offset, stable across five tabs',()=>{
  assert.match(css,/--dj-ios-edge-clearance:0px!important/);
  assert.match(css,/#app\[data-tab\] \.topbar/);
  assert.doesNotMatch(css,/scrollTo\(|scrollBy\(/);
  assert.match(css,/#app::before,#app\[data-theme="dark"\]::before/);
});
test('search placeholder cycles without PC-only condition and preserves typing',()=>{
  const s=read('src/map-quick-search.js');
  assert.equal(FRIENDLY_SEARCH_PLACEHOLDERS.length,6);
  assert.doesNotMatch(s,/innerWidth<1080\|\|document\.hidden/);
  assert.match(s,/Math\.floor\(Math\.random\(\)\*FRIENDLY_SEARCH_PLACEHOLDERS\.length\)/);
  assert.match(s,/document\.activeElement===query/);
  assert.match(s,/window\.setInterval\(setFriendlyPlaceholder,10_000\)/);
});
test('news preserves successful prefetched/cached headlines on tab switching and refresh failure',()=>{
  const s=read('src/dongjak-news.js');
  assert.match(s,/storageKey='dongjak-news-verified-cache-v728'/);
  assert.match(s,/saveVerifiedCache\(\)/);
  assert.match(s,/if\(stored\?\.items\?\.length\)/);
  assert.doesNotMatch(s,/latest\.delete\(category\)/);
});
test('history does not render redundant release heading',()=>{
  const s=read('src/version-history-v7.js');
  assert.doesNotMatch(s,/버전별 업데이트 내역/);
});
