import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('v8.0.0 retains the original release timeline and all prior releases',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].version,'v8.0.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[4].version,'v7.13.0');
  assert.equal(RENUMBERED_VERSION_HISTORY.at(-1).version,'v1.0.0');
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
test('PWA theme preference changes without reloading or old splash',()=>{
  const head=read('index.html'),theme=read('src/manual-pwa-theme-reload.js');
  const android=read('platforms/android/entry.js'),pc=read('platforms/pc-chromium/entry.js');
  assert.match(head,/displayTheme=themeReload \? themeReload\.theme : chosen/);
  assert.doesNotMatch(head,/dj-pwa-transition-v7104|data-dj-reload-splash/);
  assert.match(theme,/export function installManualThemeReload\(\)\{return \(\)=>\{\};\}/);
  assert.doesNotMatch(theme,/location\.reload\(\)/);
  assert.doesNotMatch(android,/location\.reload/);
  assert.doesNotMatch(pc,/location\.reload/);
});
test('more menu and map options omit duplicated controls but the history remains accessible',()=>{
  const more=read('src/mobile-chrome-v790.js');const html=read('index.html');
  for(const name of ['dj-mobile-night','dj-mobile-weather-refresh','dj-mobile-weather-location'])assert.doesNotMatch(more,new RegExp(name));
  assert.doesNotMatch(html,/id="version-history-mobile-trigger"/);
  assert.match(more,/dj-mobile-history/);
  assert.match(html,/id="version-history-trigger"/);
});
test('history summary numbers disappear but individual releases and full notes remain',()=>{
  const v=read('src/version-history-v7.js');
  assert.doesNotMatch(v,/v7-history-stats/);
  assert.doesNotMatch(v,/개 변경사항`/);
  assert.match(v,/release.version/);
  assert.match(v,/release.items/);
});
test('four mobile map actions proxy original handlers and share independent UI',()=>{
  const js=read('platforms/shared/mobile-actions-v7104.js');
  const css=read('platforms/shared/mobile-actions-v7104.css');
  for(const id of ['map-gesture-guide-open','center-dongjak','map-compass','current-location'])assert.match(js,new RegExp(id));
  assert.match(js,/getElementById\(action.id\)\?\.click\(\)/);
  assert.match(css,/@media\(max-width:699px\)/);
});
test('icon files use the user-supplied art for light, dark and first loading',()=>{
  const html=read('index.html');
  for(const mode of ['light','dark'])for(const size of [180,192,512]){
    assert.ok(existsSync(new URL(`../public/icons/dongjak-${mode}-${size}.png`,import.meta.url)));
  }
  assert.match(html,/map-startup-logo[^]*?dongjak-light-512.png/);
  assert.match(html,/manifest-light.webmanifest/);
  assert.match(html,/dj-apple-touch-icon/);
});
test('admin district sheet and bottom tab sheets share a single bottom offset',()=>{
  const css=read('platforms/shared/mobile-panel-layout.css');
  assert.match(css,/one common baseline/);
  assert.match(css,/--dj-v724-panel-bottom/);
  assert.match(css,/#admin-dong-picker.dj-mobile-admin-sheet/);
});
