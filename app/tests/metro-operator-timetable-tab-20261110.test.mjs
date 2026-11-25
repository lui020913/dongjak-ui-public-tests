import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {operatorTimetableResources,OFFICIAL_OPERATOR_TIMETABLES} from '../src/metro-operator-timetables.js';

const path=new URL('../',import.meta.url);
const read=(p)=>readFileSync(new URL(p,path),'utf8');

test('line 1 and Sillim official schedule resources are recognized without fabricating ETA',()=>{
  const one=operatorTimetableResources({kind:'subway',selectedLine:'1호선',lines:['1호선','9호선']});
  assert.equal(one.length,1);
  assert.equal(one[0].provider,'한국철도공사 (코레일)');
  assert.match(one[0].url,/^https:\/\/www\.korail\.com\//);
  const sillim=operatorTimetableResources({kind:'subway',selectedLine:'신림선',lines:['1호선','신림선']});
  assert.equal(sillim.length,1);
  assert.match(sillim[0].url,/^https:\/\/www\.sillimlrt\.com\//);
  assert.deepEqual(operatorTimetableResources({kind:'subway',selectedLine:'7호선',lines:['7호선','신림선']}),[]);
  assert.deepEqual(operatorTimetableResources({kind:'bus',lines:['1호선']}),[]);
  assert.deepEqual(operatorTimetableResources({kind:'subway',lines:['신림선','1호선','신림선']}),
    [OFFICIAL_OPERATOR_TIMETABLES['신림선'],OFFICIAL_OPERATOR_TIMETABLES['1호선']]);
});

test('timetable is an actual selected tab with official fallback during loading or API failure',()=>{
  const html=read('index.html'),js=read('src/transport-map.js'),css=read('src/style.css');
  assert.match(html,/id="transport-mode-tabs"[^>]+role="tablist"/);
  assert.match(html,/id="transport-tab-hours"[^>]+role="tab"/);
  assert.match(html,/id="transport-hours-heading"/);
  assert.match(js,/dataset\.transportView=view/);
  assert.match(js,/appendOfficialOperatorTimetables\(\)/);
  assert.match(js,/const hasOperatorSources=verifiedInline\|\|inAppOperatorLine\?false:appendOfficialOperatorTimetables\(\)/);
  assert.match(js,/renderServiceHours\(\{status:'loading'/);
  assert.match(css,/#transport-sheet\[data-transport-view="hours"\] #transport-arrivals/);
  assert.match(css,/#transport-sheet\[data-transport-view="live"\] #transport-service-hours/);
});

test('status-only is not rendered as 0 second arrival and 7 line countdown remains separate',()=>{
  const js=read('src/transport-map.js');
  assert.match(js,/도착시간 미제공/);
  assert.match(js,/state==='status-only'/);
  assert.match(js,/displayArrivals\(container,place\.kind,filtered,place\)/);
  assert.match(read('src/transport-freshness.js'),/barvlDt/);
});
