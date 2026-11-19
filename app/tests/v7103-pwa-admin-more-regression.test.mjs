import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v8.0.0 release and all earlier releases remain consistent',()=>{
  assert.equal(RENUMBERED_VERSION_HISTORY[0].version,'v8.0.3');
  assert.equal(RENUMBERED_VERSION_HISTORY[0].scale,'patch');
  assert.equal(RENUMBERED_VERSION_HISTORY[3].version,'v8.0.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[4].version,'v7.13.0');
  assert.equal(RENUMBERED_VERSION_HISTORY[5].version,'v7.12.0');
  assert.equal(RENUMBERED_VERSION_HISTORY.at(-1).version,'v1.0.0');
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});

test('administrative district sheet reuses the original live list, keeping header fixed and body scrolling',()=>{
  const script=read('platforms/shared/mobile-panel-layout.js');
  const css=read('platforms/shared/mobile-panel-layout.css');
  assert.match(script,/installMobileAdminPickerLayout/);
  assert.match(script,/content\.append\(status,grid,clear\)/);
  assert.match(script,/titleGroup\.replaceChildren\(\.\.\.titleNodes\)/);
  assert.match(script,/picker\.replaceChildren\(\.\.\.nodes\)/);
  assert.match(css,/#admin-dong-picker\.dj-mobile-admin-sheet:not\(\[hidden\]\)/);
  assert.match(css,/bottom:calc\(102px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
  assert.match(css,/height:min\(43dvh,480px\)!important/);
  assert.match(css,/\.dj-mobile-admin-content\{/);
  assert.match(css,/overflow-y:auto!important/);
  assert.match(css,/--dj-mobile-panel-bg/);
});

test('More popover temporarily hides competing floating panels and restores them on close',()=>{
  const js=read('src/mobile-chrome-v790.js');
  const css=read('platforms/shared/mobile-panel-layout.css');
  const toolbar=read('src/mobile-toolbar-v794.js');
  assert.match(js,/app\.classList\.add\('dj-mobile-more-open'\)/);
  assert.match(js,/app\.classList\.remove\('dj-mobile-more-open'\)/);
  assert.match(toolbar,/app\.classList\.remove\('dj-mobile-more-open'\)/);
  assert.match(css,/\.dj-mobile-more-open :is\(/);
  assert.match(css,/#admin-dong-picker/);
  assert.match(css,/#route-panel/);
  assert.match(css,/visibility:hidden!important;pointer-events:none!important/);
});

test('iOS standalone reload is optional on active forms, never introduced on Android or PC',()=>{
  const ios=read('platforms/ios-pwa/entry.js');
  const pc=read('platforms/pc-chromium/entry.js');
  const android=read('platforms/android/entry.js');
  assert.match(ios,/navigator\?\.standalone===true/);
  assert.match(ios,/display-mode: standalone/);
  assert.match(ios,/app\.dataset\.tab==='map'/);
  assert.match(ios,/doc\.activeElement\?\.matches/);
  assert.match(ios,/event\?\.isTrusted===false/);
  assert.match(ios,/localStorage\.getItem/);
  assert.match(ios,/win\.location\.reload\(\)/);
  assert.doesNotMatch(pc,/location\.reload/);
  assert.doesNotMatch(android,/location\.reload/);
});
