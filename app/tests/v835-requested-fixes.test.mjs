import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const toolbar=read('src/v831-swipe-feature-toolbar.js');
const mobile=read('src/mobile-toolbar-v794.js');
const search=read('src/map-quick-search.js');
const route=read('src/route-search.js');
const css=read('src/v835-requested-ui-fixes.css');
const metro=read('src/v835-metro-user-icons.css');

test('six supplied line images are packaged and mapped to real badge selectors',()=>{
 for(const [line,title] of [['1','1호선'],['7','7호선'],['9','9호선'],['신림','신림선'],['2','2호선'],['4','4호선']]){
  assert.ok(statSync(new URL(`../public/icons/metro-user-20261114/line-${line}.png`,import.meta.url)).size>100);
  assert.ok(metro.includes(`title="${title}"`));
 }
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

test('help and GPS buttons are circular with theme-colored help icon',()=>{
 assert.match(css,/#map-gesture-guide-open,#map-compass,#center-dongjak,#current-location/);
 assert.match(css,/border-radius:50%!important/);
 assert.match(css,/#map-gesture-guide-open\{/);
 assert.match(css,/var\(--dj800-accent/);
});
