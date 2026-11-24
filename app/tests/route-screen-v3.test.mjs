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
 assert.match(engine,/if\(!requireDongjakRouteLocation\(position\)\)return;/);
 assert.match(style,/grid-template-rows:61px auto auto 61px/);
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
