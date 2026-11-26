import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('phone active layers stack upward from the measured dock, not under the toolbar',()=>{
 const css=readFileSync(new URL('../src/pilot-layer-selection.css',import.meta.url),'utf8');
 assert.match(css,/top:auto;bottom:var\(--dj-active-dock-bottom/);
 assert.match(css,/flex-direction:column-reverse;align-items:flex-end/);
 assert.match(css,/data-dj-search-entry="1"/);
 assert.match(css,/data-dj910-sheet-open="true"/);
 assert.doesNotMatch(css,/overflow-x:auto/);
});
