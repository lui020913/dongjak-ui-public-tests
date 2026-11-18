import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FRIENDLY_SEARCH_PLACEHOLDERS} from '../src/map-quick-search.js';
import {VERSION_HISTORY} from '../src/version-history.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const css=read('src/v726-desktop-polish.css');

test('v7.0.29 imports desktop polish LAST and retains all earlier styles',()=>{
 const main=read('src/main.js');
 assert.ok(main.indexOf("import './v725-layout-state.css';")<main.indexOf("import './v726-desktop-polish.css';"));
 assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
 assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
 assert.equal(JSON.parse(read('public/version.json')).version,APP_VERSION);
});
test('v7.0.29 moon/road width and right controls use shared light/dark theme colors without yellow safety dot',()=>{
 assert.match(css,/--dj-desktop-panel/);
 assert.match(css,/#app\[data-theme="dark"\]/);
 assert.match(css,/#map-safety-toggle::after\{content:none!important;display:none!important/);
 assert.match(css,/\.dj-night-action-symbol/);
 assert.match(css,/\.dj-road-width-icon/);
 assert.match(css,/\.map-actions>button svg\{stroke:currentColor!important/);
});
test('v7.0.29 rail and mine panel align to identical desktop search push and shared panel surface',()=>{
 assert.match(css,/#app #bottom-nav,/);
 assert.match(css,/#app #mine-panel\.page-panel:not\(\[hidden\]\)/);
 assert.match(css,/--dj-v725-search-rail-push/);
 assert.match(css,/background:var\(--dj-desktop-panel\)!important/);
});
test('v7.0.29 route selection suppresses facility details and uses named candidate for HTML markers',()=>{
 const details=read('src/place-details.js'),main=read('src/main.js');
 assert.match(details,/classList\.contains\('route-picking'\)/);
 assert.match(details,/dongjak:route-map-place/);
 assert.ok(details.indexOf("classList.contains('route-picking')")<details.indexOf('map.easeTo'));
 assert.match(main,/addEventListener\('dongjak:route-map-place'/);
 assert.match(main,/showTransitRouteConfirmation\(\{kind:'point',source:'facility'/);
});
test('v7.0.29 route HUD and road-width legend are consistent cards with usable actions',()=>{
 assert.match(css,/#route-map-card \.route-map-card-actions/);
 assert.match(css,/grid-template-columns:1\.15fr 1fr 1fr!important/);
 assert.match(css,/#road-width-legend #road-width-legend-close/);
 assert.match(css,/#road-width-legend:not\(\[hidden\]\)/);
});
test('v7.0.29 release data source column uses the same background as updates and guide animates',()=>{
 assert.match(css,/\.v707-history-timeline,#app \.v707-history-sources\{background:#fff!important/);
 assert.match(css,/@keyframes dj-v726-guide-in/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});
test('v7.0.29 search suggestions cycle every 10 seconds only while input is idle',()=>{
 const search=read('src/map-quick-search.js');
 assert.equal(FRIENDLY_SEARCH_PLACEHOLDERS.length,6);
 assert.ok(FRIENDLY_SEARCH_PLACEHOLDERS.every(s=>typeof s==='string'&&s.length>5));
 assert.match(search,/document\.activeElement===query/);
 assert.match(search,/query\.value/);
 assert.match(search,/window\.setInterval\(setFriendlyPlaceholder,10_000\)/);
 assert.match(css,/\.map-quick-search-submit\{min-width:80px!important/);
});
