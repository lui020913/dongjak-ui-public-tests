import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/v727-ios-edge-and-safety-buttons.css');
const main=read('src/main.js');

test('v7.0.29 imports its final mobile overrides after all older styles',()=>{
  assert.match(main,/import '\.\/v726-desktop-polish\.css';\s*import '\.\/v727-ios-edge-and-safety-buttons\.css';/);
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
test('all five mobile bottom tabs use the same three safety buttons and positions',()=>{
  assert.match(css,/#app\[data-tab\] :is\(#map-tools-toggle,#night-visibility-quick-off,#map-safety-toggle\)/);
  assert.match(css,/#app\[data-tab\] #map-tools-toggle\{top:calc\(/);
  assert.match(css,/#app\[data-tab\] #night-visibility-quick-off\{top:calc\(/);
  assert.match(css,/#app\[data-tab\] #map-safety-toggle\{top:calc\(/);
  assert.match(css,/background:#fff!important/);
});
test('night active text and expanded safety toggle remain legible in light and dark themes',()=>{
  assert.match(css,/#app\[data-tab\] #night-visibility-quick-off\[aria-pressed="true"\]/);
  assert.match(css,/#app\[data-tab\] #night-visibility-quick-off\[aria-pressed="true"\] \.dj-night-action-text/);
  assert.match(css,/#app\[data-theme="dark"\]\[data-tab\]/);
  assert.match(css,/#app\[data-tab\] #map-safety-toggle\[aria-expanded="true"\]/);
  assert.match(css,/#app\[data-tab\] #night-visibility-quick-off\[hidden\]\{display:none!important/);
});
test('iPhone standalone top edge clearance does not change browser Safari or map scroll gestures',()=>{
  assert.match(css,/@media\(max-width:699px\) and \(display-mode:standalone\)/);
  assert.match(css,/@supports \(-webkit-touch-callout:none\)/);
  assert.match(css,/--dj-ios-edge-clearance:16px/);
  assert.match(css,/#app::before,\s*#app\[data-theme="dark"\]::before/);
  assert.doesNotMatch(css,/scrollTo\(|scrollBy\(/);
});
