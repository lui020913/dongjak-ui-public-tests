import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../src/v831-swipe-feature-toolbar.js',import.meta.url),'utf8');

test('mobile shortcut styles are imported into the Vite module graph',()=>{
  assert.ok(js.includes("import './v831-swipe-feature-toolbar.css';"));
  assert.ok(js.includes("import './v832-priority-feature-toolbar.css';"));
});

test('the toolbar fallback enforces one horizontal row without overriding expanded pill widths',()=>{
  assert.match(js,/export function enforcePriorityToolbarSingleRow\(row,scrollport,more\)/);
  assert.match(js,/important\(row,'flex-wrap','nowrap'\)/);
  assert.match(js,/'overflow-x':'auto'/);
  assert.match(js,/'overflow-y':'hidden'/);
  assert.match(js,/important\(scrollport,name,value\)/);
  assert.match(js,/height:phone\?'52px':'44px'/);
  assert.match(js,/important\(row,'max-height',phone\?'52px':'48px'\)/);
  assert.match(js,/enforcePriorityToolbarSingleRow\(row,scroller,more\)/);
  assert.doesNotMatch(js,/important\(button,'width','44px'\)/);
});

test('the More button stays outside the scrollport and shortcuts forward to original controls',()=>{
  assert.match(js,/row\.insertBefore\(scroller,more\)/);
  assert.match(js,/if\(child!==scroller&&child!==more(?:&&child\.id!=='djNext-rail')?\)scroller\.appendChild\(child\)/);
  assert.match(js,/if\(valid\)source\.click\(\)/);
  assert.doesNotMatch(js,/\bfetch\(/);
});

test('the toolbar remains hideable when switching to other tabs and immersive mode',()=>{
  assert.match(js,/row\.style\.setProperty\('display','flex'\)/);
  assert.doesNotMatch(js,/own\(row,'display','flex'\)/);
});
