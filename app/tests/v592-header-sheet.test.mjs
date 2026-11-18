import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('v5.9.3 touch sheet no longer enlarges while collapsed content is hidden',()=>{
  const js=read('src/main.js');
  assert.match(js,/const validState = nextState === 'collapsed' \? 'collapsed' : 'expanded'/);
  assert.match(js,/overviewDrag\.delta = pointerY - overviewDrag\.startY/);
  assert.doesNotMatch(js,/setProperty\('--mobile-drag-height'/);
});
test('v5.9.3 header search is inside white header for tablet and phone breakpoints',()=>{
  const css=read('src/layout-core.css');
  assert.match(css,/@media\(min-width:701px\) and \(max-width:1079px\)/);
  assert.match(css,/grid-template-areas:'brand search tools'/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/--dj-header-h:calc\(64px \+ env\(safe-area-inset-top\)\)/);
});
