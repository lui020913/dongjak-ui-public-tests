import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/mobile-primary-fullscreen.css');
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
 assert.match(main,/import '\.\/mobile-primary-fullscreen\.css'/);
});

test('primary pages bypass draggable sheets but use a brief native safe fade when returning to map',()=>{
 assert.match(controller,/\['route-panel','participation-panel','news-panel','mine-panel'\]\.includes\(id\)/);
 assert.match(controller,/win\.matchMedia\('\(max-width:699px\)'\)/);
 assert.ok(navigation.includes("button=nav.querySelector('.nav-tab[data-tab=\"map\"]')"));
 assert.ok(navigation.includes("if(previous)previous.classList.add('dj9272-tab-leave')"));
 assert.ok(navigation.includes("protectPageTransition(next.dataset.tab)"));
 assert.ok(navigation.includes("replay(next)"));
 assert.match(main,/function closePrimaryPageToMap\(panel\)/);
 assert.match(main,/window\.DongjakWindowMotion\?\.cancel\?\.\(active\);finish\(\)/);
 const html=read('index.html');
 for(const key of ['route','participate','news','mine'])
   assert(html.includes('data-page="'+key+'"'));
});
