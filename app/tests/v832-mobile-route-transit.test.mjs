import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const route=read('src/main.js');
const planner=read('src/v815-map-product.js');
const layout=read('src/v832-mobile-interaction.css');
const interaction=read('src/v832-mobile-interaction.js');
test('route GPS out-of-bound rejection never reports success',()=>{
 assert.match(route,/const accepted=setRouteLocation\('start'/);
 assert.match(route,/if\(accepted\)\{[\s\S]*?toast\('현재 위치를 출발지로 지정했습니다\.'\)/);
 assert.match(route,/dongjak:route-boundary-denied/);
});
test('boundary modal has dismiss, correct scope and no artificial success',()=>{
 assert.match(interaction,/동작구 내 영역을 선택해주세요/);
 assert.match(interaction,/setAttribute\('role','alertdialog'\)/);
 assert.match(interaction,/\.dj832-boundary-x/);
 assert.match(interaction,/\.dj832-boundary-confirm/);
 assert.match(layout,/#dj832-dongjak-boundary\[hidden\]/);
});
test('optional waypoints open through plus only before route calculation',()=>{
 assert.match(planner,/toggleWay=button\('＋ 경유지 추가'/);
 assert.match(planner,/wayDetails\.hidden=!open/);
 assert.match(planner,/calcBtn\?\.before\(waySection\)/);
 assert.match(planner,/calcBtn\?\.before\(transit\)/);
 assert.match(planner,/calcBtn\?\.before\(shareSection\)/);
 assert.match(planner,/if\(items\.length\)\{wayDetails\.hidden=false/);
});
test('sign-in prompt and three full-height tabs respect measured nav and search limits',()=>{
 assert.match(interaction,/--dj832-signin-nav-offset/);
 assert.match(interaction,/--dj832-nav-inset/);
 assert.match(interaction,/--dj832-search-edge/);
 assert.match(layout,/:is\(#participation-panel,#news-panel,#mine-panel\)/);
 assert.match(layout,/bottom:var\(--dj832-nav-inset/);
 assert.match(layout,/top:var\(--dj832-search-edge/);
});
test('bus header is a single row with right actions and X',()=>{
 assert.match(layout,/grid-template-rows:minmax\(68px,auto\)/);
 assert.match(layout,/grid-column:2!important;grid-row:1!important/);
 assert.match(layout,/grid-column:3!important;grid-row:1!important/);
 assert.match(layout,/transport-arrival-main>:is\(strong,small,span\)/);
});
test('mobile transit swipe and sticky panels are cleared above content',()=>{
 assert.match(read('src/dj-v8212-sheet-controller.js'),/\['transport-sheet','.dj856-transport-edge-drag','#transport-close','.transport-panel-head'\]/);
 assert.match(layout,/\.handle:active\{cursor:grabbing/);
 assert.match(layout,/top:calc\(26px \+ var\(--dj-news-head-h/);
 assert.match(layout,/isolation:isolate!important/);
});
test('scale docking does not hide scale because a transit panel is open',()=>{
 const dock=read('src/map-scale-docking.js');
 // A paired TIP + physical MapLibre scalebar may remain visible beside the dock.
 assert.match(dock,/const visible=fitsBelowRail\|\|dockNight\|\|dock\.visible/);
 assert.match(dock,/const hudVisibility=\(visible\|\|pair\)\?'visible':'hidden'/);
 assert.match(dock,/applyImportant\(scale,'visibility',hudVisibility\)/);
 assert.match(dock,/if\(scaleChip\)applyImportant\(scaleChip,'visibility',hudVisibility\)/);
 assert.doesNotMatch(dock,/visible && app\.querySelector\('#transport-sheet'\)/);
 assert.match(layout,/maplibregl-ctrl-scale/);
});
