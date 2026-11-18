import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {facilityPresentation,DEFAULT_POI_GROUPS,visibleFacilityFilter,POI_GROUPS} from '../src/v912-poi-presentation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('safety and public defaults; food and cafe are independently selectable',()=>{
 assert.deepEqual(DEFAULT_POI_GROUPS,['safety','public']);
 for(const label of ['약국','병원','경찰서','소방서','AED'])assert.equal(facilityPresentation(label).group,'safety');
 assert.equal(facilityPresentation('공공기관').group,'public');
 assert.equal(facilityPresentation('음식점').group,'food');
 assert.equal(facilityPresentation('카페').group,'cafe');
 assert.ok(POI_GROUPS.some(x=>x[0]==='food')&&POI_GROUPS.some(x=>x[0]==='cafe'));
 assert.deepEqual(visibleFacilityFilter(DEFAULT_POI_GROUPS),['in',['get','group'],['literal',['safety','public']]]);
});

test('official safety facilities remain symbol layers with priority ordering and click data',()=>{
 const source=read('src/seoul-official-facilities.js');
 assert.ok(source.includes("id:POINTS,type:'symbol'"));
 assert.equal(source.includes("id:POINTS,type:'circle'"),false);
 assert.ok(source.includes("'symbol-sort-key':['get','priority']"));
 assert.ok(source.includes("const wanted=['약국'"));
});

test('food, cafe and safety categories join the shared feature toolbar at every viewport',()=>{
 const poi=read('src/v912-poi-presentation.js');
 const main=read('src/main.js');
 assert.ok(poi.includes("const MOBILE_TOOLBAR_MEDIA='(min-width: 0px)'"));
 assert.ok(poi.includes('installMobilePoiToolbarIntegration'));
 assert.ok(poi.includes('rail.appendChild(button)'));
 assert.ok(poi.includes("shell.dataset.dj912Integrated='true';right.hidden=true"));
 assert.equal(main.includes('v912-desktop-poi.css'),false);
 assert.equal(main.includes('v913-pc-design-system.css'),false);
});

test('the standalone category shell is hidden after its buttons move into the shared toolbar',()=>{
 const css=read('src/mobile-first-layout.css');
 const poi=read('src/v912-poi-presentation.js');
 assert.ok(css.includes('#dj912-poi-categories'));
 assert.ok(poi.includes('if(button.parentElement!==rail)rail.appendChild(button)'));
});
