import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/mobile-ui/current.css',import.meta.url),'utf8');
const history=readFileSync(new URL('../src/version-history-v7.js',import.meta.url),'utf8');

test('My Info no longer paints an opaque pseudo-element across update history above the dock',()=>{
  const scope=css.slice(css.indexOf('/* My Info history: keep scrolling content'));
  assert.match(scope,/#mine-panel\.page-panel:not\(\[hidden\]\)::after\s*\{\s*content:none!important;display:none!important/);
  assert.match(scope,/\.dj836-sheet-body\s*\{[\s\S]*?padding-bottom:calc\(106px \+ env\(safe-area-inset-bottom/);
  assert.match(scope,/scroll-padding-bottom:calc\(106px \+ env\(safe-area-inset-bottom/);
  assert.doesNotMatch(scope,/:is\(#route-panel,#participation-panel,#news-panel/);
});
test('History summary title and description cannot force the mobile record count outside its card',()=>{
  const scope=css.slice(css.indexOf('/* My Info history: keep scrolling content'));
  assert.match(scope,/grid-template-columns:minmax\(0,1fr\) max-content/);
  assert.match(scope,/overflow-wrap:anywhere!important/);
  assert.match(scope,/\.dj-edition-patch-summary\s*\{[\s\S]*?white-space:normal!important/);
  assert.match(history,/heading\.append\(el\('strong'/);
});
