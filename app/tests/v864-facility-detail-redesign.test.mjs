import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('v8.6.4 facility details use centered title and a separate mobile action row',()=>{
  const source=read('src/place-details.js');
  assert.match(source,/dj-place-header-title/);
  assert.match(source,/dj-place-header-actions/);
  assert.match(source,/dj-place-info-card/);
  assert.match(source,/dj-place-favorites-section/);
  assert.match(source,/dj-place-ai-section/);
  assert.match(source,/\['start','출발'\],\['end','도착'\]/);
  assert.match(source,/headerActions\.append\(routeActions\)/);
  assert.match(source,/personalActions\.append\(saveButton,shareButton\)/);
  assert.match(source,/headerActions\.append\(closeButton\)/);
});

test('v8.6.4 favorite/share/close icons share one centered 40px visual system',()=>{
  const css=read('src/v864-facility-detail-redesign.css');
  assert.match(css,/@media\s*\(max-width:699px\)/);
  assert.match(css,/grid-template-areas:"title" "actions"/);
  assert.match(css,/flex:0 0 40px!important;width:40px!important/);
  assert.match(css,/width:20px!important;height:20px!important/);
  assert.match(css,/dj854-place-favorite::before[\s\S]*?content:none!important/);
  assert.match(css,/dj854-place-favorite\[aria-pressed="true"\] svg path/);
  assert.match(css,/dj-place-route-actions button[\s\S]*?font-size:13px!important/);
});

test('v8.6.4 facility body is divided into readable information, favorites, review and AI cards',()=>{
  const css=read('src/v864-facility-detail-redesign.css');
  for(const selector of ['.dj-place-info-card','.dj-place-favorites-section','.dj834-reviews','.dj-place-ai-section'])
    assert.ok(css.includes(selector),`missing ${selector}`);
  assert.match(css,/\.dj-place-row\{[\s\S]*?grid-template-columns:74px minmax\(0,1fr\)/);
  assert.match(css,/\.dj-place-official-lookup\{[\s\S]*?min-height:44px/);
  assert.match(css,/\.dj-place-body\{[\s\S]*?overflow-y:auto/);
});

test('v8.6.4 temporary night theme bypasses consent and dismisses the full-screen transition',()=>{
  const night=read('src/night-visibility-map.js');
  assert.match(night,/const applyTemporaryTheme=next=>/);
  assert.match(night,/themeToggle\.dataset\.dj840ThemeConfirmed='1'/);
  assert.match(night,/transition\.hidden=true/);
  assert.match(night,/remove\('dj-v711-transition-active'\)/);
  assert.match(night,/applyTemporaryTheme\('dark'\)/);
});

test('v8.6.4 night-analysis map view does not apply the perspective screen blur',()=>{
  const css=read('src/v864-facility-detail-redesign.css');
  assert.match(css,/#app\[data-sangdo-night="on"\] #map\.dj-far-haze-active::before/);
  assert.match(css,/-webkit-backdrop-filter:none!important;backdrop-filter:none!important/);
});

test('v8.6.4 desktop wrappers remain layout-neutral',()=>{
  const css=read('src/v864-facility-detail-redesign.css');
  assert.match(css,/#app #map \.dj-place-detail-popup \.dj-place-info-card,[\s\S]*?display:contents/);
  assert.ok(css.includes('#app #map .dj-place-detail-popup .dj-place-favorites-section[hidden]{display:none!important;}'));
});
