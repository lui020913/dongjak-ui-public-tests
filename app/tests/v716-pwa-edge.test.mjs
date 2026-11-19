import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v7.0.29 edge stylesheet is last and avoids frosted search chrome',()=>{
  const main=read('src/main.js'), css=read('src/v716-standalone-edges.css');
  const old=main.indexOf("import './v715-mobile-polish.css'");
  const updated=main.indexOf("import './v716-standalone-edges.css'");
  assert.ok(old>=0 && updated>old);
  assert.match(css,/#app \.topbar>.map-quick-search \.map-quick-search-form/);
  assert.match(css,/-webkit-backdrop-filter:none!important/);
  assert.match(css,/background:transparent!important/);
  assert.match(css,/box-shadow:0 3px 10px/);
  assert.doesNotMatch(read('index.html'),/apple-mobile-web-app-status-bar-style/);
  assert.match(read('index.html'),/viewport-fit=cover/);
  assert.match(read('src/mobile-ui-v792-fixes.css'),/background:transparent!important/);
});

test('v7.0.29 standalone nav lowers without breaking ordinary Safari and docks panels',()=>{
  const css=read('src/v716-standalone-edges.css');
  assert.match(css,/@media \(max-width:699px\) and \(display-mode:standalone\)/);
  assert.match(css,/--dj-pwa-nav-edge:max\(4px, calc\(env\(safe-area-inset-bottom, 0px\) - 20px\)\)/);
  assert.match(css,/#app #bottom-nav\{/);
  assert.match(css,/bottom:var\(--dj-pwa-nav-edge\)!important/);
  assert.match(css,/\.sheet\.overview-sheet:not\(\[hidden\]\)/);
  assert.match(css,/\.maplibregl-ctrl-bottom-right/);
  assert.match(read('index.html'),/viewport-fit=cover/);
});

test('v7.0.29 night vision label stays readable in light and dark',()=>{
  const css=read('src/v716-standalone-edges.css');
  assert.match(css,/#night-visibility-quick-off \.dj-night-action-text\{color:#23483d!important/);
  assert.match(css, /data-theme="dark"\] #night-visibility-quick-off \.dj-night-action-text/);
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
