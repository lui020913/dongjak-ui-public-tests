import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('v7.9.4 toolbar uses an independent five-button row, not legacy fixed children',()=>{
  const css=get('src/mobile-toolbar-v794.css');
  const js=get('src/mobile-toolbar-v794.js');
  const html=get('index.html');
  assert.match(css,/@media \(max-width:699px\)/);
  assert.match(css,/#dj-mobile-tool-row \{display:none!important/);
  assert.match(css,/#dj-v794-toolbar/);
  assert.match(js,/doc\.getElementById\(c\.original\)\?\.click\(\)/);
  for(const id of ['dj-v794-map','dj-v794-safety','dj-v794-night','dj-v794-weather','dj-v794-more'])assert.match(js,new RegExp(id));
  assert.match(html,/mobile-toolbar-v794.css/);
  assert.match(html,/mobile-toolbar-v794.js/);
  assert.ok(!css.includes('min-width:112px'));
  assert.match(css,/100vw - 216px/);
});
test('desktop does not import toolbar into MapLibre and prior panel actions remain wired',()=>{
  const css=get('src/mobile-toolbar-v794.css');const js=get('src/mobile-toolbar-v794.js');
  assert.ok(!css.includes('min-width:700px'));
  assert.ok(!js.includes('maplibregl'));
  assert.match(js,/map-tools-toggle/);
  assert.match(js,/map-safety-toggle/);
  assert.match(js,/night-visibility-quick-off/);
});
