import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('mobile fallback always places page close to the right even if v833 fails to load',()=>{
  const css=read('src/v829-mobile-layout-system.css');
  assert.match(css,/\.page-heading > button\.page-dismiss\{[\s\S]*?order:3!important;margin-left:auto!important/);
  assert.match(css,/\.page-heading > \.dj-page-title-icon\{[\s\S]*?order:1!important/);
  assert.match(css,/\.page-heading > h2\.dj-page-title-text\{[\s\S]*?order:2!important/);
  assert.doesNotMatch(read('src/v833-home-sheet-layout.css'),/grid-column:3!important;grid-row:1!important;order:3!important/);
  assert.match(css,/\.page-heading > \.dj-sheet-grabber/);
});

test('legacy high-specificity route rules cannot exceed the shared 50dvh sheet maximum',()=>{
  const css=read('src/v829-mobile-layout-system.css');
  assert.match(css,/--dj829-sheet-max-height: 50dvh/);
  assert.doesNotMatch(css,/max-height:min\(61dvh/);
  assert.doesNotMatch(css,/max-height:min\(60dvh/);
  assert.match(css,/#app#app#app#app#app#app\[data-tab="route"\] #route-panel\.page-panel:not\(\[hidden\]\)\{[\s\S]*?max-height:min\(var\(--dj829-sheet-max-height\)/);
  assert.match(read('src/v833-home-sheet-layout.css'),/max-height:min\(50dvh/);
});
