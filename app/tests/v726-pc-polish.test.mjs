import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FRIENDLY_SEARCH_PLACEHOLDERS} from '../src/map-quick-search.js';
import {VERSION_HISTORY} from '../src/version-history.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/mobile-first-layout.css');

test('the unified mobile-first shell is the final layout layer and release metadata agrees',()=>{
 const main=read('src/main.js');
 assert.ok(main.indexOf("import './v914-mobile-ux-fixes.css';")<main.indexOf("import './mobile-first-layout.css';"));
 assert.equal(main.includes("import './v726-desktop-polish.css';"),false);
 assert.equal(main.includes("import './v729-pc-consistency.css';"),false);
 assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
 assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
 assert.equal(JSON.parse(read('public/version.json')).version,APP_VERSION);
});

test('map actions, toolbar and navigation use the same light/dark surface system',()=>{
 assert.ok(css.includes('--mf-surface: rgba(255,255,255,.96)'));
 assert.ok(css.includes('--mf-accent: #13866c'));
 assert.ok(css.includes('#app#app#app#app#app[data-theme="dark"]'));
 assert.ok(css.includes('.map-actions'));
 assert.ok(css.includes('#dj-v794-toolbar'));
 assert.ok(css.includes('#bottom-nav:not([hidden])'));
});

test('route selection suppresses facility details and uses named candidate for HTML markers',()=>{
 const details=read('src/place-details.js'),main=read('src/main.js');
 assert.match(details,/classList\.contains\('route-picking'\)/);
 assert.match(details,/dongjak:route-map-place/);
 assert.ok(details.indexOf("classList.contains('route-picking')")<details.indexOf('map.easeTo'));
 assert.match(main,/addEventListener\('dongjak:route-map-place'/);
 assert.match(main,/showTransitRouteConfirmation\(\{kind:'point',source:'facility'/);
});

test('route HUD and road-width legend are positioned as shared sheets above the five-tab dock',()=>{
 assert.ok(css.includes('#route-map-card:not([hidden])'));
 assert.ok(css.includes('#road-width-legend:not([hidden])'));
 assert.ok(css.includes('var(--mf-panel-bottom)'));
});

test('release history remains accessible and the map guide honors reduced motion',()=>{
 const html=read('index.html'),guide=read('src/v860-onboarding.js');
 assert.ok(html.includes('id="version-history-trigger"'));
 assert.ok(guide.includes('prefers-reduced-motion'));
});

test('search suggestions cycle every 10 seconds only while input is idle',()=>{
 const search=read('src/map-quick-search.js');
 assert.equal(FRIENDLY_SEARCH_PLACEHOLDERS.length,6);
 assert.ok(FRIENDLY_SEARCH_PLACEHOLDERS.every(s=>typeof s==='string'&&s.length>5));
 assert.match(search,/document\.activeElement===query/);
 assert.match(search,/query\.value/);
 assert.match(search,/window\.setInterval\(setFriendlyPlaceholder,10_000\)/);
});
