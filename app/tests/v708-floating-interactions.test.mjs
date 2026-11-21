import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VERSION_HISTORY} from '../src/version-history.js';
const read = name => readFileSync(new URL(`../${name}`,import.meta.url),'utf8');

test('header branding lives within the search form and search stays available on other tabs',()=>{
 const html=read('index.html');
 const shell=html.slice(html.indexOf('<header class="topbar">'),html.indexOf('<div class="header-tools">'));
 assert.ok(shell.indexOf('map-quick-search-form') < shell.indexOf('class="brand"'));
 assert.ok(shell.indexOf('class="brand"') < shell.indexOf('id="map-quick-search-query"'));
 const css=read('src/v708-floating-ux.css');
 assert.match(css,/#app\[data-tab\] \.topbar>\.map-quick-search/);
 assert.match(css,/display:block!important/);
 assert.doesNotMatch(read('src/map-quick-search.js'),/if\(app\.dataset\.tab!=='map'\)return;dropdown\.hidden=false/);
 assert.match(read('src/main.js'),/if\(app\.dataset\.tab!=='map'\)navigate\('map'\);/);
});
test('Soongsil name and icon use the same symbol anchor without a scale-dependent offset',()=>{
 const js=read('src/featured-place-labels.js');
 assert.match(js,/'icon-offset':\[0,0\]/);
 assert.match(js,/'text-anchor':'bottom'/);
});
test('close button can hide overview and menu X remains available',()=>{
 const js=read('src/main.js');
 assert.match(js,/overview\.hidden=true; \/\/ Closing must work/);
 assert.match(js,/for\(const button of document\.querySelectorAll\('\[data-close-page\]'\)\)/);
 assert.match(js,/document\.getElementById\('news-close-to-map'\)/);
 const css=read('src/v708-floating-ux.css');
 assert.match(css,/#overview-sheet\[hidden\]/);
 assert.match(css,/#overview-sheet #overview-sheet-close/);
 assert.match(css,/pointer-events:auto!important/);
});
test('all four rounded edges and space above the home indicator survive last imported overrides',()=>{
 const css=read('src/v708-floating-ux.css');
 assert.match(css,/#app #bottom-nav\{/);
 assert.match(css,/bottom:calc\(16px \+ env\(safe-area-inset-bottom\)\)!important/);
 assert.match(css,/border-radius:25px!important/);
 assert.match(css,/bottom:calc\(102px \+ env\(safe-area-inset-bottom\)\)!important/);
 assert.match(css,/border-radius:23px!important/);
 assert.match(read('src/main.js'),/import '\.\/v708-floating-ux.css';/);
});
test('drawer rise/fade animation and reduced motion fallback are defined',()=>{
 const css=read('src/v708-floating-ux.css');
 for(const k of ['@keyframes dj-v708-sheet-rise','@keyframes dj-v708-drawer-appear','@media(prefers-reduced-motion:no-preference)','@media(prefers-reduced-motion:reduce)','animation:none!important'])assert.ok(css.includes(k),k);
});
test('build version and release history remain synchronized',()=>{
 assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
 assert.equal(JSON.parse(read('src/build-info.json')).version,APP_VERSION);
 assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
  assert.ok(read('index.html').includes('id="map-startup-version" aria-label="앱 버전">버전 1.0'));
});
