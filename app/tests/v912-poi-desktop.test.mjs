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
test('separate PC workspace and stationary search navigation',()=>{
 const s=read('src/v912-desktop-poi.css');assert.match(s,/@media \(min-width:1080px\) and \(pointer:fine\)/);assert.match(s,/--dj912-pc-edge:16px/);assert.match(s,/#transport-sheet > \.handle/);assert.match(read('src/v713-desktop-rail.js'),/const push=0;/);
});

test('PC presentation stylesheet loads in the browser entry, not the Node-testable geometry coordinator',()=>{
 const entry=read('src/main.js'),coordinator=read('src/v910-request-completion.js');
 assert.ok(entry.indexOf("import './v912-desktop-poi.css';")>entry.indexOf("import './v910-request-completion.css';"));
 assert.doesNotMatch(coordinator,/import\s+['"][^'"]+\.css['"]/);
});
