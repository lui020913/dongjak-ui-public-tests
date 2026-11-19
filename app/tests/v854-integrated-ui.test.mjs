import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_POI_GROUPS,visibleFacilityFilter} from '../src/v912-poi-presentation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('search and feature controls share one floating header and horizontal toolbar',()=>{
 const css=read('src/mobile-first-layout.css'),html=read('index.html');
 assert.ok(css.includes('.topbar'));
 assert.ok(css.includes('.map-quick-search-form'));
 assert.ok(css.includes('#dj-v794-toolbar'));
 assert.ok(css.includes('overflow-x: auto !important'));
 assert.ok(html.includes('mobile-toolbar-v794.js'));
 assert.ok(html.includes('v831-swipe-feature-toolbar.js'));
});

test('map actions and five-tab navigation retain one position system on every viewport',()=>{
 const css=read('src/mobile-first-layout.css');
 assert.ok(css.includes('.map-actions'));
 assert.ok(css.includes('#bottom-nav:not([hidden])'));
 assert.ok(css.includes('grid-template-columns: repeat(5,minmax(0,1fr))'));
 assert.ok(css.includes('bottom: calc(env(safe-area-inset-bottom,0px) + 8px)'));
});

test('search results keep separate media and official sections',()=>{
 const css=read('src/v854-integrated-ui.css');
 assert.match(css,/\.dj854-search-columns/);
 assert.match(css,/\.dj854-search-column/);
 assert.match(css,/\.dj854-search-column-list/);
});

test('search no longer filters results according to a desktop-only layout',()=>{
 const js=read('src/map-quick-search.js');
 assert.match(js,/query\.addEventListener\('input'/);
 assert.match(js,/filter/);
 assert.doesNotMatch(js,/matchMedia\('\(min-width:1080px\)'\)/);
});

test('the more panel remains sticky and its close control stays available',()=>{
 const css=read('src/v854-integrated-ui.css');
 assert.match(css,/\.dj854-more-head/);
 assert.match(css,/position:\s*sticky/);
 assert.match(css,/#dj-mobile-utilities-close/);
});

test('weather icon and temperature use the shared toolbar and one weather sheet at all widths',()=>{
 const html=read('index.html'),weather=read('src/v854-weather-desktop.js'),css=read('src/mobile-first-layout.css');
 assert.match(html,/data-dj-weather-icon/);
 assert.match(html,/data-dj-temperature/);
 assert.ok(weather.includes("matchMedia('(min-width: 0px)')"));
 assert.ok(weather.includes('dj854-weather-sheet'));
 assert.ok(css.includes('#dj854-weather-sheet:not([hidden])'));
 assert.ok(read('src/v854-integrated-ui.css').includes('#dj-v794-weather'));
});

test('language selector remains accessible in the shared settings surface',()=>{
 const html=read('index.html'),settings=read('src/v854-language.js'),appSettings=read('src/v7120-settings.js');
 assert.ok(read('src/v854-integrated-ui.css').includes('.dj854-language-section'));
 assert.ok(settings.includes('dj854-language-section'));
 assert.ok(settings.includes('select'));
 assert.ok(read('src/main.js').includes('v854-language.js'));
 assert.ok(appSettings.includes("mobile.id='dj-settings-mobile'"));
});

test('map tip stays separate from the five-tab navigation dock',()=>{
 const css=read('src/mobile-first-layout.css'),html=read('index.html');
 assert.ok(read('src/v854-integrated-ui.css').includes('#dj840-map-tip'));
 assert.ok(css.includes('#bottom-nav:not([hidden])'));
});

test('search merges results from local facilities and transport without dropping categories',()=>{
 const search=read('src/map-quick-search.js');
 assert.ok(search.includes("import {searchPlaces,searchLocalPlaces} from './route-search.js'"));
 assert.ok(search.includes("import {searchCachedTransportPlaces} from './transport-map.js'"));
 assert.ok(search.includes("import {queryOfficialPlaces} from './seoul-official-facilities.js'"));
 assert.ok(search.includes("import {searchNamedOsm} from './v875-osm-name-search.js'"));
});

test('favorites panel remains a shared bottom sheet',()=>{
 const css=read('src/mobile-first-layout.css');
 assert.ok(css.includes('#mine-panel'));
 assert.ok(css.includes('#mine-panel):not([hidden])'));
 assert.ok(css.includes('var(--mf-panel-bottom)'));
});

test('facility filter defaults preserve safety and public categories',()=>{
 assert.deepEqual(DEFAULT_POI_GROUPS,['safety','public']);
 assert.deepEqual(visibleFacilityFilter(DEFAULT_POI_GROUPS),['in',['get','group'],['literal',['safety','public']]]);
});
