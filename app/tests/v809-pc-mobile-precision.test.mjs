import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('legacy PC precision layer and shortcut script are no longer loaded',()=>{
 const html=read('index.html'),main=read('src/main.js');
 assert.equal(html.includes('v809-precision-polish.css'),false);
 assert.equal(html.includes('v809-precision-polish.js'),false);
 assert.equal(main.includes('v725-layout-state.css'),false);
 assert.equal(main.includes('v726-desktop-polish.css'),false);
 assert.ok(main.includes("import './mobile-first-layout.css'"));
});

test('search, feature rail and map controls use the shared floating layout',()=>{
 const css=read('src/mobile-first-layout.css');
 assert.ok(css.includes('.topbar'));
 assert.ok(css.includes('#dj-v794-toolbar'));
 assert.ok(css.includes('.map-actions'));
 assert.ok(css.includes('#bottom-nav:not([hidden])'));
 assert.ok(css.includes('scroll-snap-type: x proximity !important'));
 assert.ok(css.includes('.dj831-edge-blur'));
});

test('transit sheets and arrival cards remain accessible in the shared panel system',()=>{
 const css=read('src/mobile-first-layout.css'),transit=read('src/v854-integrated-ui.css');
 assert.ok(css.includes('#transport-sheet:not([hidden])'));
 assert.ok(css.includes('max-height: calc(100dvh'));
 assert.ok(transit.includes('.dj854-search-column-list'));
 assert.ok(transit.includes('.dj854-more-head'));
 assert.ok(transit.includes('transport-arrivals'));
});

test('the five navigation tabs retain vertical icon and label alignment on every viewport',()=>{
 const css=read('src/mobile-first-layout.css');
 assert.ok(css.includes('grid-template-columns: repeat(5,minmax(0,1fr))'));
 assert.ok(css.includes('flex-direction: column !important'));
 assert.ok(css.includes('.nav-icon'));
 assert.ok(css.includes('> span:last-child'));
});

test('mobile motion owner still provides one entrance and exit transition system',()=>{
 const js=read('src/v806-unified-ui.js');
 assert.ok(js.includes('data-dj806-motion'));
 assert.ok(js.includes('prefers-reduced-motion'));
 assert.ok(js.includes('transitionend'));
});

test('version history remains in the header; no duplicate release shortcut is mounted',()=>{
 const html=read('index.html'),css=read('src/mobile-first-layout.css');
 assert.ok(html.includes('id="version-history-trigger"'));
 assert.ok(css.includes('#version-history-trigger'));
 assert.equal(html.includes('v729-r2-new-ui.js'),false);
});
