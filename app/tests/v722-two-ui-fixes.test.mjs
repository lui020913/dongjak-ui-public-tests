import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const css=read('src/v722-bottom-panels-ios-header.css');

test('all three non-news auxiliary menus anchor to the same bottom baseline',()=>{
  for(const id of ['route-panel','participation-panel','mine-panel']){
    assert.match(css,new RegExp(`#app #${id}\\.page-panel:not\\(\\[hidden\\]\\)`));
  }
  assert.match(css,/bottom:calc\(var\(--dj-v720-nav-bottom,8px\) \+ var\(--dj-v720-nav-height,70px\) \+ 5px\)/);
  assert.match(css,/max-height:min\(40dvh,380px/);
  assert.match(css,/-webkit-overflow-scrolling:touch/);
});
test('standalone-status safe-area cover is opaque, noninteractive, theme aware and isolated to PWA',()=>{
  assert.match(css,/@media \(max-width:1079px\) and \(display-mode:standalone\)/);
  assert.match(css,/#app::before/);
  assert.match(css,/height:calc\(max\(38px,env\(safe-area-inset-top,0px\)\) \+ 12px\)/);
  assert.match(css,/background:#f7faf8!important/);
  assert.match(css,/#app\[data-theme="dark"\]::before/);
  assert.match(css,/pointer-events:none!important/);
  assert.doesNotMatch(css,/backdrop-filter:blur\(/);
});
test('new final CSS is appended after v7.0.21 and version metadata remains consistent',()=>{
  const main=read('src/main.js');
  assert.ok(main.indexOf('v722-bottom-panels-ios-header.css')>main.indexOf('v721-overlay-interactions.css'));
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
  assert.equal(JSON.parse(read('public/version.json')).version,APP_VERSION);
  assert.match(read('src/version-history.js'),/version:'v7\.0\.29'/);
});
