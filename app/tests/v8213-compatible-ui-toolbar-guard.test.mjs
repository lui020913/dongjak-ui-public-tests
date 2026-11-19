import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const toolbar=read('src/v831-swipe-feature-toolbar.js');
const core=read('src/dj-v8212-sheet-controller.js');
const css=read('src/v829-mobile-layout-system.css');
const sheetCss=read('src/v832-priority-feature-toolbar.css');

test('v8.2.13 imports both shortcut style layers and enforces one horizontal row even if CSS is stale',()=>{
  assert.match(toolbar,/import '\.\/v831-swipe-feature-toolbar\.css'/);
  assert.match(toolbar,/import '\.\/v832-priority-feature-toolbar\.css'/);
  assert.match(toolbar,/export function enforcePriorityToolbarSingleRow/);
  assert.match(toolbar,/['"]flex-wrap['"]:'nowrap'/);
  assert.match(toolbar,/['"]overflow-y['"]:'hidden'/);
  assert.match(toolbar,/enforcePriorityToolbarSingleRow\(row,scroller,more\)/);
  // v8.2.14 replaces the fixed PRIMARY_KEYS list with persisted user preferences.
  assert.match(toolbar,/DEFAULT_PRIMARY/);
  assert.match(toolbar,/loadPrimary/);
  assert.match(toolbar,/rebuildFeatureLocations/);
  assert.match(toolbar,/\.dj832-feature/);
});
test('the expanded v8.2.13 buttons retain their CSS authority and disclosure sheet',()=>{
  assert.match(sheetCss,/\.dj832-feature\.dj832-expanded/);
  assert.match(sheetCss,/\.dj832-native\.dj832-expanded/);
  assert.match(sheetCss,/#dj832-data-sheet/);
  assert.doesNotMatch(toolbar,/important\(button,'flex'/);
  assert.match(toolbar,/sheet\.querySelector\('\.dj832-sheet-close'\)/);
});
test('mobile sheets have one shared header and admin sheet hides the map action rail',()=>{
  assert.match(css,/display:flex!important;flex-flow:row nowrap!important/);
  assert.match(css,/\[data-dj-active-sheet="admin-dong-picker"\] \.map-actions/);
  assert.match(core,/MOBILE_FLOATING_SHEETS/);
  assert.match(core,/bindHeaderDragInput\(handle,win,\{down,move,up,cancel\}\)/);
  const input=read('src/mobile-header-input.js');
  assert.match(input,/header\.addEventListener\('pointerdown'/);
  assert.match(input,/header\.addEventListener\('touchstart'/);
  assert.match(read('index.html'),/dj-v8212-sheet-controller\.js/);
});
