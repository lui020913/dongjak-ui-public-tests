import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const toolbar=read('src/v831-swipe-feature-toolbar.js');
const mobile=read('src/mobile-toolbar-v794.js');
const search=read('src/map-quick-search.js');
const route=read('src/route-search.js');
const currentMetroCss=read('src/mobile-ui/current.css');
const currentTransport=read('src/transport-map.js');
const currentIndex=read('index.html');
const currentMapControls=read('src/mobile-map-controls.js');
const currentBaseCss=read('src/style.css');

test('six supplied metro assets are archived while the current live badges use official line colors',()=>{
 for(const line of ['1','7','9','신림','2','4']){
  assert.ok(statSync(new URL(`../public/icons/metro-user-20261114/line-${line}.png`,import.meta.url)).size>100);
 }
 assert.match(currentTransport,/function makeLineBadge\(line,extraClass/);
 assert.match(currentTransport,/badge\.style\.backgroundColor=subwayLineColor\(normalized\)/);
 assert.match(currentMetroCss,/\.metro-badge-number/);
});

test('primary shortcut preferences persist while base layers and live vehicles remain More-only',()=>{
 for(const key of ['base-metro','base-bus','base-buildings','base-boundary','live-metro','live-bus']){
  assert.ok(toolbar.includes("['"+key+"'"),key);
 }
 assert.match(toolbar,/key\.startsWith\('base-'\)/);
 assert.match(toolbar,/key\.startsWith\('live-'\)/);
 assert.match(toolbar,/parsed\.filter\(k=>!MORE_ONLY_KEYS\.has\(k\)/);
 assert.match(toolbar,/function savePrimary\(\)/);
 assert.match(toolbar,/localStorage\.setItem\(SHORTCUTS_KEY,JSON\.stringify\(\[\.\.\.primary\]\)/);
 assert.match(toolbar,/if\(input\.checked\)primary\.add\(key\);else primary\.delete\(key\)/);
 assert.match(toolbar,/savePrimary\(\)/);
 assert.match(toolbar,/if\(!quickToggle&&feature\[0\]!=='map-dong'\)openSheet/);
});

test('night view is intercepted until the user explicitly accepts the confirmation dialog',()=>{
 assert.match(mobile,/dj-v794-night/);
 assert.match(toolbar,/scroller\.addEventListener\('click',requestNight,true\)/);
 assert.match(toolbar,/e\.preventDefault\(\);e\.stopImmediatePropagation\(\)/);
 assert.match(toolbar,/nightConfirm\.hidden=false/);
 assert.match(toolbar,/data-choice="yes"/);
 assert.match(toolbar,/source\.click\(\)/);
 assert.match(toolbar,/data-choice="no"/);
});

test('map search uses loaded vector POIs and verified local/official sources, then hides the keyboard on submit',()=>{
 assert.match(search,/map\.querySourceFeatures\(source,\{sourceLayer:'poi'\}\)/);
 assert.match(search,/localVectorFacilities\(text\)/);
 assert.match(search,/queryOfficialPlaces\(term/);
 assert.match(search,/searchNamedOsm\(rawTerm/);
 assert.match(search,/query\.blur\(\)/);
 assert.match(search,/form\.addEventListener\('submit'/);
 assert.match(route,/export function searchLocalPlaces\(query\)/);
 assert.match(route,/\[\.\.\.IMPORTANT_PLACES,\.\.\.DONGJAK_UNIVERSITIES\]/);
});

test('active help and GPS controls remain wired after unreachable historic CSS is removed',()=>{
 assert.match(currentIndex,/id="map-gesture-guide-open"/);
 assert.match(currentIndex,/id="current-location"/);
 assert.match(currentMapControls,/document\.getElementById\('map-gesture-guide-open'\)/);
 assert.match(currentBaseCss,/#map-gesture-guide-open/);
 assert.match(currentBaseCss,/\.map-actions #current-location/);
});
