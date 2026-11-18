import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {facilityPresentation,DEFAULT_POI_GROUPS,visibleFacilityFilter,POI_GROUPS} from '../src/v912-poi-presentation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('safety and public defaults; food and cafe are independently selectable',()=>{
 assert.deepEqual(DEFAULT_POI_GROUPS,['safety','public']);
 for(const label of ['약국','병원','경찰서','소방서','AED'])assert.equal(facilityPresentation(label).group,'safety');
 assert.equal(facilityPresentation('공공기관').group,'public');
 assert.equal(facilityPresentation('음식점').group,'food');assert.equal(facilityPresentation('카페').group,'cafe');
 assert.ok(POI_GROUPS.some(x=>x[0]==='food')&&POI_GROUPS.some(x=>x[0]==='cafe'));
 assert.deepEqual(visibleFacilityFilter(DEFAULT_POI_GROUPS),['in',['get','group'],['literal',['safety','public']]]);
});
test('symbols replace plain dots, prioritize safety and preserve click data',()=>{
 const s=read('src/seoul-official-facilities.js');
 assert.match(s,/id:POINTS,type:'symbol'/);assert.doesNotMatch(s,/id:POINTS,type:'circle'/);assert.match(s,/'symbol-sort-key':\['get','priority'\]/);assert.match(s,/const wanted=\['약국'/);
});
test('food, cafe and safety categories are integrated into the shared feature toolbar at all widths',()=>{
 const poi=read('src/v912-poi-presentation.js');
 const main=read('src/main.js');
 assert.match(poi,/const MOBILE_TOOLBAR_MEDIA='\\(min-width: 0px\\)'/);
 assert.ok(poi.includes('installMobilePoiToolbarIntegration'));
 assert.match(poi,/rail\\.appendChild\\(button\\)/);
 assert.ok(poi.includes('dj912Integrated'));
 assert.doesNotMatch(main,/v912-desktop-poi\\.css/);
 assert.doesNotMatch(main,/v913-pc-design-system\\.css/);
});
test('the category shell is hidden after its buttons move into the shared toolbar',()=>{
 const css=read('src/mobile-first-layout.css');
 const poi=read('src/v912-poi-presentation.js');
 assert.ok(css.includes('#dj912-poi-categories'));
 assert.match(poi,/shell\\.dataset\\.dj912Integrated='true';right\\.hidden=true/);
 assert.match(poi,/if\\(button\\.parentElement!==rail\\)rail\\.appendChild\\(button\\)/);
});
