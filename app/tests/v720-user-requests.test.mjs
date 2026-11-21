import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const main=read('src/main.js');
const html=read('index.html');
const css=read('src/v720-ui-consistency.css');
const help=read('src/mobile-map-controls.js');

test('v7.0.29 keeps the full v7.0.19 feature chain and applies one final stylesheet',()=>{
 assert.match(main,/import '\.\/v719-repair-ui\.css'/);
 assert.match(main,/import '\.\/v720-ui-consistency\.css'/);
 assert.ok(main.indexOf("v720-ui-consistency.css")>main.indexOf("v719-repair-ui.css"));
 assert.match(main,/installNightVisibility/);
 assert.match(main,/initDongjakNews/);
 assert.match(main,/initMapQuickSearch/);
});
test('desktop news page has a gap from the map rail; mobile panels have one bottom-nav clearance',()=>{
 assert.match(css,/#app #news-panel\.page-panel:not\(\[hidden\]\)/);
 assert.match(css,/left:max\(176px,calc\(var\(--dj-nav-width,112px\) \+ 64px\)\)/);
 assert.match(css,/--dj-v720-sheet-bottom:calc\(var\(--dj-v720-nav-bottom\) \+ var\(--dj-v720-nav-height\) \+ 7px\)/);
 assert.match(css,/bottom:var\(--dj-v720-sheet-bottom\)!important/);
});
test('map help button is question mark and first-run guide is centered',()=>{
 assert.match(html,/id="map-gesture-guide-open"[^>]*>\?<\/button>/);
 assert.match(help,/guide\.classList\.add\('dj-guide-centered'\)/);
 assert.match(css,/transform:translate\(-50%,-50%\)!important/);
 assert.match(help,/showOnInitialMap/);
});
test('the guide includes a recent update and a working release-history action',()=>{
  assert.match(html,/id="dj-guide-latest-version">분류별 내역<\/strong>/);
 assert.match(html,/id="dj-guide-release-details"/);
 assert.match(help,/version-history-trigger'\)\?\.click\(\)/);
 assert.match(css,/\.dj-guide-release/);
});
test('compact map removes app CSS haze including native sky while preserving desktop fog',()=>{
 const haze=read('src/distant-haze.js');
 assert.match(haze,/const desired=isCompact \? 'flat'/);
 assert.match(css,/#app #map\.dj-far-haze-active::before/);
 assert.match(css,/backdrop-filter:none!important/);
 assert.match(css,/#app \.topbar::before/);
});
test('iPhone nav raises by a few pixels while floating sheets retain small gap',()=>{
 assert.match(css,/--dj-pwa-nav-edge:max\(9px,calc\(env\(safe-area-inset-bottom,0px\) - 15px\)\)/);
 assert.match(css,/#app #bottom-nav\{/);
 assert.match(css,/--dj-v720-nav-height:67px/);
 assert.match(css,/--dj-v720-sheet-bottom/);
});
test('both device sizes select the map tab at first render',()=>{
 assert.match(html,/<div id="app" data-tab="map">/);
 assert.match(html,/class="nav-tab active" data-tab="map" aria-current="page"/);
 assert.match(main,/app\.dataset\.tab = 'map'/);
 assert.match(main,/navigate\('map'\)/);
});
