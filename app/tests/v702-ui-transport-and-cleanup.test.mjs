import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {isScheduleMergedStation} from '../src/metro-schedule-view.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Line 1 and Sillim both expose independent realtime and timetable tabs',()=>{
  assert.equal(isScheduleMergedStation({kind:'subway',selectedLine:'1호선',lines:['1호선','9호선']}),false);
  assert.equal(isScheduleMergedStation({kind:'subway',selectedLine:'신림선',lines:['신림선','2호선']}),false);
  const source=read('src/transport-map.js');
  assert.match(source,/normalizeLineName\(place\.selectedLine\|\|''\)==='신림선'/);
  assert.match(source,/operator-timetable\?\$\{params\}/);
  assert.match(source,/전체 운행시간표 보기/);
  assert.match(source,/timetableExpanded=true;saveTimetable\(place,selectedDay,data\);renderServiceHours\(data\)/);
  assert.match(source,/--transport-line-color/);
});

test('last-train notice is derived from direction-specific official timetable rows',()=>{
  const source=read('src/transport-map.js');
  assert.match(source,/function passedLastTrainDirections\(data,clock\)/);
  assert.match(source,/방향 · 시간표 기준, 실제 운행 종료 여부 미확인/);
  assert.match(source,/if\(hasSelectedLive\)return/);
  assert.match(read('src/metro-planned-arrivals.js'),/clock\.afterMidnight&&rawMinute<240\?rawMinute\+1440/);
});

test('facility details omit the popup arrow and set either route endpoint',()=>{
  const details=read('src/place-details.js');
  const main=read('src/main.js');
  const css=read('src/v702-ui-alignment.css');
  assert.match(details,/className:'dj-place-detail-popup'/);
  assert.match(details,/dj-place-route-actions/);
  assert.match(details,/dongjak:route-select/);
  assert.match(main,/window\.addEventListener\('dongjak:route-select'/);
  assert.match(css,/\.dj-place-detail-popup \.maplibregl-popup-tip\{display:none/);
});

test('demo and export controls are removed without deleting local record editing',()=>{
  const html=read('index.html');
  const main=read('src/main.js');
  assert.doesNotMatch(html,/route-demo-start|route-start-demo|community-export|my-export|export-points|pza-export-(?:csv|json)/);
  assert.doesNotMatch(html,/시연 모드|시연용 게시판/);
  assert.doesNotMatch(main,/navDemoFrame|navDemoStartAt|community-export|export-points|가상 경로 시연/);
  assert.match(main,/await updatePointAttachments\(p\.id,stagedPointFiles,removedPointFileIds\)/);
});

test('panels share the desktop surface, route height, invisible scrollbars and map controls spacing',()=>{
  const css=read('src/v702-ui-alignment.css');
  assert.match(css,/#app #bottom-nav,[\s\S]*#app \.page-panel/);
  assert.match(css,/height:auto!important/);
  assert.match(css,/#app #route-panel\.page-panel/);
  assert.match(css,/scrollbar-width:none!important/);
  assert.match(css,/#map-options-mobile-close/);
  assert.match(css,/north-up-feedback/);
  assert.match(css,/dj-compass-north-feedback/);
});

test('road width opacity is slightly stronger and the explanatory light-reach strip is gone',()=>{
  const roads=read('src/road-width-layer.js');
  const html=read('index.html');
  assert.match(roads,/isReliable, 0\.56, 0\.28/);
  assert.match(roads,/line-opacity':0\.21/);
  assert.doesNotMatch(html,/night-occlusion-legend|분석선은 모두 실선입니다/);
});

test('featured Dongjak marker uses the supplied symbol asset',()=>{
  const image=new URL('../public/logos/featured/dongjak.png',import.meta.url);
  const fullLogo=new URL('../public/logos/dongjak-gu.png',import.meta.url);
  assert.equal(statSync(image).size,statSync(fullLogo).size);
  assert.deepEqual(readFileSync(image),readFileSync(fullLogo));
});
