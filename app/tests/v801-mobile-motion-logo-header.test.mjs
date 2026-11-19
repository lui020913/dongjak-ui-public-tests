import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.0.1 is a patch release and preserves the v8.0.0 major change',()=>{
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].version,'v8.0.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].scale,'major');
});
test('mobile opening motion is triggered when a previously hidden panel becomes visible',()=>{
  const js=read('src/v800-ui-architecture.js');
  assert.match(js,/const fresh=identifyOpenedSurface\(previous,current\)/);
  assert.match(js,/if\(fresh && active===fresh\)/);
  assert.match(js,/requestAnimationFrame\(\(\)=>animateEntrance\(fresh\)\)/);
  assert.match(js,/target\.animate\(\[/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(js,/duration:touch\?340:250/);
});
test('mobile logo is slightly larger and both themes open the same update history',()=>{
  const js=read('src/v7120-settings.js');
  const coordinator=read('src/v800-ui-architecture.js');
  const css=read('src/v800-ui-architecture.css');
  assert.match(js,/mobile\.addEventListener\('click',openAbout\)/);
  assert.match(js,/pcLogo\.addEventListener\('click',openAbout\)/);
  assert.match(js,/about\.hidden=false/);
  assert.match(coordinator,/Math\.min\(height\+6,70\)/);
  assert.match(css,/--dj800-logo-size:56px/);
});
test('PC header restores 56px search and matches the adjacent controls',()=>{
  const css=read('src/v800-ui-architecture.css');
  assert.match(css,/--dj800-header-button:56px/);
  assert.match(css,/topbar #map-quick-search/);
  assert.match(css,/topbar #dj-about-pc/);
  assert.match(css,/height:56px!important;min-height:56px!important;max-height:56px!important/);
});
test('map settings and update history no longer darken or blur the map',()=>{
  const css=read('src/v800-ui-architecture.css');
  assert.match(css,/#dj-map-settings:not\(\[hidden\]\)/);
  assert.match(css,/#version-history-modal:not\(\[hidden\]\)/);
  assert.match(css,/background:transparent!important;background-color:transparent!important/);
  assert.match(css,/-webkit-backdrop-filter:none!important;backdrop-filter:none!important/);
});
