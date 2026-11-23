import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v8.5.2 keeps the map TIP persistent and cross-fades its copy every 10 seconds',()=>{
 const tip=read('src/v840-coordinated-ui.js');
 const scale=read('src/map-scale-docking.js');
 assert.match(tip,/const advanceTip=/);
 assert.match(tip,/dj852-tip-copy-fade/);
 assert.doesNotMatch(tip,/tipShownThisMapVisit|tipHideTimer|showBriefTip/);
 assert.match(tip,/tipMark\.textContent='TIP'/);
 assert.match(tip,/\},10000\)/);
 assert.match(scale,/shouldHideMobileScale/);
 assert.doesNotMatch(scale,/MOBILE_SCALE_BLOCKERS[\s\S]{0,160}#dj840-map-tip/);
 assert.match(read('index.html'),/v832-mobile-interaction\.js/);
 assert.match(read('index.html'),/v841-route-and-tips\.js/);
});
test('route comparison and visibility toggles ported without touching protected map engine',()=>{
 assert.match(read('src/route-experience-20261123.js'),/mapCard\.querySelector\('\.route-map-card-actions'\)\?\.before\(choices\)/);
 assert.match(read('src/v831-swipe-feature-toolbar.js'),/VISIBILITY_KEYS/);
 assert.match(read('src/v841-route-and-tips.js'),/onWaypointClick/);
 assert.match(read('src/v841-route-and-tips.js'),/title\.includes\('경유지 검색'\)/);
 assert.match(read('src/v815-map-product.js'),/＋ 경유지 검색/);
});
