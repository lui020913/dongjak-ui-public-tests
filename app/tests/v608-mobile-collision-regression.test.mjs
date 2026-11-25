import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const css=read('src/v608-mobile-coordination.css');
const main=read('src/main.js');
const html=read('index.html');
test('mobile options is layered below navigation and above a backdrop, never the overview sheet',()=>{
  assert.match(css,/#app\[data-tab="map"\]\.map-controls-open \.map-advanced-controls\s*\{/);
  assert.match(css,/bottom: var\(--dj-mobile-nav-h\) !important/);
  assert.match(css,/position: fixed !important/);
  assert.match(css,/\.sheet\.overview-sheet,[\s\S]*#map-gesture-guide/);
  assert.match(css,/#app\[data-tab="map"\]\.map-controls-open #map-options-backdrop:not\(\[hidden\]\)/);
  assert.match(css,/\.map-options-mobile-actions #map-options-mobile-close/);
  assert.match(css,/max-height: min\(64dvh/);
});
test('closed options keep overview compact and never show floating fullscreen button',()=>{
  assert.match(css,/:not\(\.map-controls-open\) #mobile-fullscreen-toggle/);
  assert.match(css,/height: 68px !important/);
  assert.match(css,/data-sheet-state="collapsed"/);
  assert.match(css,/orientation: landscape/);
});
test('map options state is synchronized even when another feature closes it directly',()=>{
  assert.match(main,/mobileOptionsStateObserver/);
  assert.match(main,/attributeFilter:\['class','data-tab'\]/);
  assert.match(main,/mapOptionsBackdrop\.hidden=!visible/);
  assert.match(main,/const closeMapOptions=\(\)=>syncMapOptions\(false\)/);
  assert.match(main,/if\(expanded\)document\.getElementById\('map-gesture-guide'\)/);
  assert.match(main,/import '\.\/v608-mobile-coordination\.css';/);
  assert.match(html,/id="map-options-mobile-close"/);
   assert.doesNotMatch(html,/>업데이트<\/button>/);
});
