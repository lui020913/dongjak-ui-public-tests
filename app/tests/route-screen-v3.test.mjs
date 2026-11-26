import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('route V3 owns the complete visible entry screen and isolates it from legacy layout',()=>{
 const source=read('src/route-screen-v3.js'),style=read('src/route-screen-v3.css'),global=read('src/route-screen-v3-global.css'),index=read('index.html');
 assert.match(source,/attachShadow\(\{mode:'open'\}\)/);
 assert.match(source,/doc\.body\.append\(host\)/);
 assert.match(source,/getElementById\('bottom-nav'\)|byId\('bottom-nav'\)/);
 assert.match(source,/native\.click\(\)/);
 assert.match(source,/form\.requestSubmit\(\)/);
 assert.match(source,/legacyCalc\.click\(\)/);
 assert.match(global,/data-dj-route-screen-v3="1"/);
 assert.match(global,/#route-panel\.page-panel/);
 assert.match(global,/clip-path:inset\(100%\)!important/);
 assert.match(global,/pointer-events:none!important/);
 assert.doesNotMatch(global,/#route-panel\.page-panel\s*\{[^}]*visibility:hidden!important/s);
 assert.match(style,/\.route-panel\s*\{/);
 assert.match(style,/\.search-screen\s*\{/);
 assert.match(style,/\.action\s*\{/);
 assert.match(index,/src\/route-screen-v3\.js/);
 assert.doesNotMatch(source,/card\.append\(rows\)|card\.prepend\(walkMode\)/);
});

test('inline waypoint plus and all three search targets share GPS and map actions',()=>{
 const source=read('src/route-screen-v3.js'),style=read('src/route-screen-v3.css'),engine=read('src/main.js');
 assert.match(source,/id="v3-waypoints"[\s\S]*?class="waypoint-add-row"[\s\S]*?data-v3="waypoint"[\s\S]*?data-v3="end"/);
 assert.doesNotMatch(source,/class="quick"|class="waypoint-actions"|data-v3="waypoint-map"/);
 assert.match(source,/data-v3="search-gps"/);assert.match(source,/data-v3="search-map"/);
 assert.match(source,/route-pick-start':'route-pick-end'/);
 assert.match(engine,/routeSearchTarget!==which/);assert.match(engine,/seq!==routeSearchSequence\|\|which!==routeSearchTarget/);
 assert.match(engine,/const inside=routeLocationInside\(position\);\s*if\(inside!==true&&!transitLocationAllowed\(position,which\)\)\{\s*document\.getElementById\('route-search-status'\)\.textContent=[^;]+;\s*return;/);
 assert.match(style,/grid-template-rows:52px auto auto 52px/);
 assert.match(style,/\.search-control-row\{display:grid/);
});

test('route waypoint deletion has a 44px control and recent heading reserves its own row',()=>{
 const source=read('src/route-screen-v3.js'),style=read('src/route-screen-v3.css');
 assert.ok(source.includes("cancel.className='waypoint-control'"));
 assert.ok(source.includes("b.className='waypoint-control'"));
 assert.ok(style.includes('width:44px;height:44px;min-width:44px;min-height:44px'));
 assert.ok(style.includes('grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;min-height:44px;margin-bottom:8px'));
 assert.ok(style.includes('.recent-head [data-v3="clear-recent"]'));
});

test('search cards keep scrolling without overlay scrollbars and history has a separate aligned header',async()=>{const {readFileSync}=await import('node:fs');const css=readFileSync(new URL('../src/route-screen-v3.css',import.meta.url),'utf8');const js=readFileSync(new URL('../src/route-screen-v3.js',import.meta.url),'utf8');assert.ok(css.includes('overflow-y:auto;overflow-x:hidden;flex:1'));assert.ok(css.includes('.search-results::-webkit-scrollbar{display:none'));assert.ok(css.includes('.search-results .search-recent-head{display:flex;align-items:center;justify-content:space-between'));assert.ok(js.includes("head.className='search-recent-head'"));assert.ok(js.includes('head.append(title,clear)'));});


test('route search isolates map controls and drops safe-area padding only while keyboard occupies the viewport',()=>{
 const source=read('src/route-screen-v3.js'),css=read('src/route-screen-v3.css');
 assert.ok(source.includes("view.dataset.searchOpen='true'"));
 assert.ok(source.includes('delete view.dataset.searchOpen'));
 assert.ok(source.includes('searchLayoutHeight-top-height>100'));
 assert.ok(source.includes("listen(win.visualViewport,'scroll',syncViewport)"));
 assert.ok(source.includes('if(!active||searching)return;'));
 assert.ok(css.includes('.canvas[data-search-open="true"] > :not(.search-screen){visibility:hidden;pointer-events:none}'));
 assert.ok(css.includes('.search-screen[data-keyboard="open"]{padding-bottom:4px}'));
 assert.ok(css.includes('top:var(--v3-search-top,0px)'));
});
