import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const primary=read('src/mobile-first-layout.css');
const markerStart='/* BEGIN original mobile-primary-fullscreen.css (verbatim, immediately after mobile-first-layout.css) */';
const markerEnd='/* END original mobile-primary-fullscreen.css */';
const css=primary.slice(primary.indexOf(markerStart)+markerStart.length,primary.indexOf(markerEnd));
const main=read('src/main.js');
const controller=read('src/dj-v8212-sheet-controller.js');
const navigation=read('src/bottom-tab-navigation.js');

test('primary tabs have independent full viewport phone surfaces',()=>{
 assert.match(css,/@media \(max-width:699px\)/);
 for(const id of ['route-panel','participation-panel','news-panel','mine-panel']){
   assert(css.includes('#'+id),id+' is in the shared full page selector');
 }
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/inset:0!important/);
 assert.match(css,/border-radius:0!important/);
 assert.match(css,/padding:0 0 calc\(92px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
 assert.match(css,/z-index:8500!important/);
 assert.match(css,/\.dj836-sheet-body/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/\.dj-sheet-chrome-grip/);
 assert.match(css,/display:none!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(main,/import '\.\/mobile-first-layout\.css'/);
 assert.doesNotMatch(main,/import '\.\/mobile-primary-fullscreen\.css'/);
 assert.equal(existsSync(new URL('../src/mobile-primary-fullscreen.css',import.meta.url)),false);
});

test('primary pages bypass draggable sheets and reveal content without a full-screen root fade',()=>{
 assert.match(controller,/\['route-panel','participation-panel','news-panel','mine-panel'\]\.includes\(id\)/);
 assert.match(controller,/win\.matchMedia\('\(max-width:699px\)'\)/);
 assert.ok(navigation.includes("button=nav.querySelector('.nav-tab[data-tab=\"map\"]')"));
 assert.equal(navigation.includes('doc.startViewTransition'),false);
 assert.ok(navigation.includes("panel.classList.add('dj-tab-content-enter')"));
 assert.equal(navigation.includes("ensureCurtain()"),false);
 assert.ok(navigation.includes("replay(button)"));
 assert.match(main,/function closePrimaryPageToMap\(panel\)/);
 assert.match(main,/window\.DongjakWindowMotion\?\.cancel\?\.\(active\);finish\(\)/);
 const html=read('index.html');
 for(const key of ['route','participate','news','mine'])
   assert(html.includes('data-page="'+key+'"'));
});

test('map-origin full-screen report composer hides the map header and AI orb above its close button',()=>{
 assert.ok(css.includes(':has(#participation-panel.dj9256-composing:not([hidden])) > .topbar'));
 assert.ok(css.includes(':has(#participation-panel.dj9256-composing:not([hidden])) :is(#dj-v794-toolbar,#djNext-toolbar)'));
 assert.ok(css.includes('pointer-events:none!important'));
 // During report composition data-tab can remain map; the composer selector
 // must not depend on the bottom tab reflecting participate.
 assert.ok(css.includes(':has(#participation-panel.dj9256-composing:not([hidden]))'));
 const built=new URL('../src/mobile-next.css',import.meta.url);
 const legacyHeader=readFileSync(existsSync(built)?built:new URL('../../frontend/production/mobile-next.css',import.meta.url),'utf8');
 assert.ok(legacyHeader.includes('#app:not(:has(#participation-panel.dj9256-composing:not([hidden]))) .topbar{display:grid!important'),
   'a historical 38-ID header selector must not re-display the search/AI bar above a report composer');
});
