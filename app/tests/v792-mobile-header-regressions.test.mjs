import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v8.0.0 preserves the mobile patch history',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
  assert.equal(RENUMBERED_VERSION_HISTORY[12].version,'v7.9.5');
  assert.equal(RENUMBERED_VERSION_HISTORY[13].version,'v7.9.4');
  assert.equal(RENUMBERED_VERSION_HISTORY[14].version,'v7.9.3');
  assert.equal(RENUMBERED_VERSION_HISTORY.at(-1).version,'v1.0.0');
});
test('iOS standalone header retains v792 fixes while deprecated mode is removed',()=>{
  const html=read('index.html'),css=read('src/mobile-ui-v792-fixes.css');
  assert.doesNotMatch(html,/apple-mobile-web-app-status-bar-style/);
  assert.match(html,/src\/mobile-pwa-status-tone-v793.css/);
  assert.match(html,/src\/mobile-ui-v792-fixes.css/);
  assert.match(css,/@media \(max-width:699px\)/);
  assert.match(css,/#dj-mobile-safe-top/);
  assert.match(css,/background:transparent!important/);
  assert.match(css,/\.topbar/);
});
test('mobile-only duplicate history is removed and original R2 is preserved',()=>{
  const script=read('src/mobile-ui-v792-fixes.js');
  assert.match(script,/removeShortcut/);
  assert.match(script,/dj-r2-history-shortcut/);
  assert.match(script,/MutationObserver/);
  assert.match(script,/installR2Ui/);
});
test('new mobile scrim matches map darkness and light route tabs remain light',()=>{
  const css=read('src/mobile-ui-v792-fixes.css');
  const js=read('src/mobile-ui-v792-fixes.js');
  assert.match(css,/rgba\(9,29,32,\.36\)/);
  assert.match(css,/#dj-mobile-header-dim/);
  assert.match(css,/:not\(\[data-theme="dark"\]\)/);
  assert.match(css,/map-controls-open/);
  assert.match(css,/map-safety-open/);
  assert.match(js,/pointerEvents|pointer-events|aria-hidden/);
});
