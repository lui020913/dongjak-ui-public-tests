import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeBottomTabs,hasOpenMapWindow,MAP_TIP_MESSAGES} from '../src/v840-ui-core.js';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const core=src('src/v840-ui-core.js'),tips=src('src/v840-coordinated-ui.js');
const compare=src('src/v804-route-comparison.js'),toolbar=src('src/v831-swipe-feature-toolbar.js');
const ui=src('src/v841-route-and-tips.js'),css=src('src/v841-route-and-tips.css');
const nav=['map','route','participate','news','mine'];
const fakeButton=tab=>({dataset:{tab},classList:{toggle(_,active){this.selected=active;}},setAttribute(){},removeAttribute(){}});
function environment(routeShown=false){
 const routeCard={hidden:!routeShown},app={dataset:{tab:'map'},classList:{contains(){return false;}}};
 const elements=new Map([['route-map-card',routeCard],['nav-live-card',{hidden:true}],['route-panel',{hidden:true}]]);
 const buttons=nav.map(fakeButton);
 const doc={getElementById(id){return id==='app'?app:(elements.get(id)||null);},querySelectorAll(selector){return selector==='#bottom-nav>.nav-tab'?buttons:[];}};
 return {app,doc,buttons,routeCard};
}
test('map preview keeps route selected while map renderer remains in map mode',()=>{
 const e=environment(true);
 assert.equal(normalizeBottomTabs(e.doc,e.app),'route');
 assert.equal(e.app.dataset.tab,'map');
 assert.equal(e.buttons[1].classList.selected,true);
 assert.equal(hasOpenMapWindow(e.doc,e.app),true);
 e.routeCard.hidden=true;
 assert.equal(normalizeBottomTabs(e.doc,e.app),'map');
 assert.equal(e.buttons[0].classList.selected,true);
});
test('calculated route comparison has one owner in the floating map result',()=>{
 const modern=src('src/route-experience-20261123.js');
 const modernCss=src('src/route-experience.css');
 assert.match(modern,/const actions=mapCard\.querySelector\('\.route-map-card-actions'\)/);
 assert.match(modern,/actions\?\.before\(choices\)/);
 assert.match(modern,/choices=add\('section','dj-route-choice-list'\)/);
 assert.match(modernCss,/#dj-route-choice-list/);
 assert.doesNotMatch(compare,/initRouteComparison/);
});
test('waypoint search opens the real route editor first and expands via CSS :has',()=>{
 assert.match(ui,/onWaypointClick/);
 assert.match(ui,/\[data-tab=route\]/);
 assert.match(css,/#route-panel:not\(\[hidden\]\):has\(#route-place-search:not\(\[hidden\]\)\)/);
 assert.match(ui,/visualViewport\?\.addEventListener\('resize'/);
 assert.match(ui,/scrollIntoView/);
});
test('layer switches call the original source rather than changing shortcut preference',()=>{
 assert.match(toolbar,/const VISIBILITY_KEYS=new Set/);
 assert.match(toolbar,/const isVisibility=VISIBILITY_KEYS\.has\(key\)/);
 assert.match(toolbar,/if\(input\.checked!==wasOn\)control\.click\(\)/);
 assert.match(toolbar,/toggleLabel\.hidden=false/);
 assert.doesNotMatch(toolbar,/title\.textContent='상단 표시'/);
 assert.match(css,/\.dj834-feature-line:has\(>\.dj834-shortcut-switch\[hidden\]\)/);
});
test('TIP is bold, cycles after reading, hides over popups and appears in help',()=>{
 assert.ok(MAP_TIP_MESSAGES.length>=5);
 assert.match(tips,/tipMark\.textContent='TIP'/);
 assert.match(tips,/Date\.now\(\)<Number\(label\.dataset\.djTipReadUntil\)/);
 assert.match(core,/'route-map-card','nav-live-card','route-pick-hint','dj-community-location-card','map-gesture-guide'/);
 assert.match(tips,/tipGuide\.id='dj841-guide-tips'/);
 assert.match(css,/#dj840-map-tip strong/);
});
