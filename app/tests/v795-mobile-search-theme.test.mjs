import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('v8.0.0 retains the platform refactor and retains all v7.9.x versions',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].version,'v8.0.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[4].version,'v7.13.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[5].version,'v7.12.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[6].version,'v7.11.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
});
test('mobile search displays suggestions without toolbar overlap and preserves logo spacing',()=>{
  const css=read('src/mobile-ui-v795.css');
  assert.match(css,/@media \(max-width:699px\)/);
  assert.match(css,/data-search-open="true"/);
  assert.match(css,/#dj-v794-toolbar/);
  assert.match(css,/visibility:hidden!important/);
  assert.match(css,/gap:12px!important/);
  assert.ok(!css.includes('@media (min-width:'));
});
test('public toolbar no longer mounts night icon or temporary theme',()=>{
  const js=read('src/mobile-toolbar-v794.js');
  const env=read('src/ui-environment.js');
  assert.doesNotMatch(js,/id:'dj-v794-night'/);
  assert.doesNotMatch(env,/themeFlash|stopMobileThemeTimers|showThemeTransition/);
  assert.doesNotMatch(env,/themeState\.override|setTemporaryTheme/);
  assert.match(read('index.html'),/mobile-ui-v795.css/);
});
