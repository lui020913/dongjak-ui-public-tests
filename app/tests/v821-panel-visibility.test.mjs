import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/v821-panel-visibility.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('v821 stylesheet loaded after v819, and only once',()=>{
  assert.equal(html.split('href="/src/v821-panel-visibility.css"').length-1,1);
  assert.ok(html.indexOf('v821-panel-visibility.css')>html.indexOf('v819-safety-one-screen.css'));
});
test('desktop search shift does not persist and normal floating panels use a stable anchor',()=>{
  assert.match(css,/#app#app:not\(\[data-search-open="true"\]\) #bottom-nav/);
  assert.match(css,/--dj821-panel-dock-top/);
  assert.match(css,/:not\(\.dj-float-user-positioned\)/);
});
test('desktop place popup has a viewport-limited, independently scrolling body',()=>{
  assert.match(css,/\.dj-place-detail-popup \.maplibregl-popup-content/);
  assert.match(css,/max-height:min\(62dvh,640px\)/);
  assert.match(css,/overflow-y:auto!important/);
});
test('desktop safety tab icon is round in light and dark themes',()=>{
  assert.match(css,/\.nav-tab\[data-tab="map"\] \.nav-icon/);
  assert.match(css,/border-radius:50%!important/);
  assert.match(css,/\[data-theme="dark"\].*#bottom-nav/);
});
test('mobile bus and subway bottom sheets leave the map visible',()=>{
  assert.match(css,/max-height:min\(43dvh,440px\)/);
  assert.match(css,/max-height:min\(50dvh,515px\)/);
  assert.match(css,/bottom:calc\(var\(--dj800-panel-bottom,96px\) \+ 4px\)/);
});
