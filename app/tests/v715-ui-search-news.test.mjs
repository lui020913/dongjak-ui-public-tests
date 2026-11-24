import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('v7.0.29 final overrides remove filled safety buttons while retaining pressed state',()=>{
  const css=read('src/mobile-ui-baseline.css');
  assert.match(read('src/main.js'),/import '\.\/mobile-ui-baseline\.css'/);
  assert.match(css,/#dj-desktop-safety-rail/);
  assert.match(css,/#night-visibility-quick-off\[aria-pressed="true"\]/);
  assert.match(css,/background:#fbfdfc!important/);
  assert.match(css,/border-color:#68ad99!important/);
});

test('mobile search prevents Safari zoom and keeps results above weather',()=>{
  const css=read('src/mobile-ui-baseline.css'),search=read('src/map-quick-search.js');
  assert.match(css,/font-size:16px!important/);
  assert.match(css,/data-search-open="true"/);
  assert.match(css,/weather-widget\{visibility:hidden!important/);
  assert.match(css,/-webkit-backdrop-filter:none!important/);
  assert.match(search,/window\.visualViewport/);
  assert.match(search,/const anchor=shell\.getBoundingClientRect\(\)/);
  assert.match(search,/const top=Math\.ceil\(Math\.max\(anchor\.bottom,aiBottom\)\+7/);
  assert.match(search,/app\.dataset\.searchOpen='true'/);
  assert.match(search,/delete app\.dataset\.searchOpen/);
});

test('mobile safety buttons move higher and lower nav retains safe-area clearance',()=>{
  const css=read('src/mobile-ui-baseline.css');
  assert.match(css,/--dj-header-h,60px\) \+ 25px/);
  assert.match(css,/--dj-header-h,60px\) \+ 76px/);
  assert.match(css,/--dj-header-h,60px\) \+ 127px/);
  assert.match(css,/bottom:calc\(2px \+ env\(safe-area-inset-bottom\)\)/);
});

test('region news explicit press-release fallback without misrepresenting publisher',()=>{
  const server=read('server/dongjak-news.mjs');
  const client=read('src/dongjak-news.js');
  assert.match(server,/if\(!items\.length\)\{\s*try\{\s*items=await withinDeadline\(\(\)=>fetchOfficialBoard/);
  assert.match(server,/동작구청 보도자료 · 지역뉴스 대체/);
  assert.match(client,/언론 RSS 연결 불가: 동작구청 공식 보도자료 대체 표시/);
});
