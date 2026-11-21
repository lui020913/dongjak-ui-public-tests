import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/mobile-ui-baseline.css');
const main=read('src/main.js');

test('shared mobile-first shell loads after iOS edge and safety interaction fixes',()=>{
  assert.ok(main.indexOf("import './mobile-ui-baseline.css';")<main.indexOf("import './mobile-first-layout.css';"));
  assert.equal(main.includes("import './v726-desktop-polish.css';"),false);
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});

test('legacy safety toggles are hidden while the shared toolbar keeps their controls',()=>{
  const html=read('index.html'),shared=read('src/mobile-first-layout.css'),toolbar=read('src/mobile-toolbar-v794.js');
  assert.ok(shared.includes(':is(#map-tools-toggle,#map-safety-toggle,#night-visibility-quick-off)'));
  assert.ok(shared.includes('display: none !important'));
  assert.ok(html.includes('mobile-toolbar-v794.js'));
  assert.ok(toolbar.includes('dj-v794-toolbar'));
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
