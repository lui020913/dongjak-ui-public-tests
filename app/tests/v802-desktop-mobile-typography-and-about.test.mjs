import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read = name => readFileSync(new URL('../'+name, import.meta.url),'utf8');

test('v8.0.3 preserves the TOPIS and S-DOT optional endpoints and data source files',()=>{
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[2].version,'v8.0.1');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].version,'v8.0.0');
  assert.match(read('functions/api/sdot-environment.js'),/sdot/i);
  assert.match(read('functions/api/road-incidents.js'),/incident/i);
  assert.match(read('src/v800-live-environment.css'),/dj-sdot-summary/);
});

test('logos open a dedicated app information dialog, not release history, on both platforms',()=>{
  const js=read('src/v7120-settings.js');
  assert.match(js,/mobile\.addEventListener\('click',openAbout\)/);
  assert.match(js,/pcLogo\.addEventListener\('click',openAbout\)/);
  assert.match(js,/aria-controls','dj-app-about'/);
  assert.doesNotMatch(js,/mobile\.addEventListener\('click',openHistoryFromLogo\)/);
  assert.match(js,/\.dj-about-close/);
  assert.match(js,/dj-about-version-number/);
  assert.doesNotMatch(js,/class="dj-about-updates"/);
});

test('desktop search/button 56px sizing, inset spacing, typography hierarchy and compact sheets are explicitly scoped',()=>{
  const css=read('src/v802-ui-polish.css');
  assert.match(css,/@media\(min-width:700px\)/);
  assert.match(css,/--dj802-desktop-header:56px/);
  assert.match(css,/font-size:17px!important/);
  assert.match(css,/\.header-tools\{gap:11px!important/);
  assert.match(css,/#bottom-nav>\.nav-tab/);
  assert.match(css,/night-visibility-quick-off/);
  assert.match(css,/#map-gesture-guide-open/);
  assert.match(css,/bottom:auto!important;height:max-content!important/);
  assert.match(css,/\[data-theme="dark"\]/);
});

test('mobile type icon separates the two syllables and mobile sheets have a real re-open motion',()=>{
  const css=read('src/v802-ui-polish.css');
  const js=read('src/v802-panel-motion.js');
  assert.match(css,/gap:7px!important/);
  assert.match(css,/dj802-mobile-sheet-in/);
  assert.match(js,/MutationObserver/);
  assert.match(js,/animations\.get\(target\)\?\.cancel/);
  assert.match(js,/target\.animate\(\[/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(js,/maplibregl|fetch\(|XMLHttpRequest/);
});

test('new CSS and module are loaded last without disturbing the core map entry point',()=>{
  const html=read('index.html');
  assert.match(html,/href="\/src\/v802-ui-polish\.css"/);
  assert.match(html,/src="\/src\/v802-panel-motion\.js"/);
  assert.ok(html.indexOf('v802-ui-polish.css')>html.indexOf('v800-ui-architecture.css'));
  assert.ok(html.indexOf('v802-panel-motion.js')>html.indexOf('v800-ui-architecture.js'));
  assert.match(html,/src="\/src\/main\.js"/);
});
