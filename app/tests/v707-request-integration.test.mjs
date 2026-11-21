import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedKorailLine1Timetable} from '../src/metro-korail-line1.js';
import {verifiedInlineOperatorTimetable} from '../src/metro-inline-schedules.js';
import {plannedArrivalsFromTimetable, seoulServiceClock} from '../src/metro-planned-arrivals.js';
import {VERSION_HISTORY} from '../src/version-history.js';
import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';
const read=rel=>readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');

test('time-table count-down derives solely from operator rows and explicitly says planned',()=>{
 const korail=verifiedKorailLine1Timetable(JSON.parse(read('public/data/transport/korail-line1-stations.json')),'노량진','1');
 assert.ok(korail?.timetable?.length>100);
 const first=korail.timetable.find(x=>x.minute>600 && x.minute<900);
 assert.ok(first);
 const clock={minute:Math.floor(first.minute)-1,second:0,afterMidnight:false,day:'1'};
 const result=plannedArrivalsFromTimetable(korail.timetable,'1호선',clock);
 assert.ok(result.length>0);
 assert.ok(result.every(x=>x.isPlanned && x.sourceLabel.includes('시간표 기준') && x.message.includes('분 후 도착')));
 const sillim=verifiedInlineOperatorTimetable('대방','신림선','1');
 assert.ok(sillim?.timetable?.length>100);
 const row=sillim.timetable.find(x=>x.minute>600 && x.minute<900);
 assert.ok(plannedArrivalsFromTimetable(sillim.timetable,'신림선',{minute:Math.floor(row.minute)-1,second:0,afterMidnight:false,day:'1'}).length>0);
 assert.equal(plannedArrivalsFromTimetable(null,'1호선',clock).length,0);
});
test('no countdown is fabricated from a last-report-only realtime feed',()=>{
 const js=read('src/transport-map.js');
 assert.match(js,/const hasSelectedLive=result\?\.sourceStatus==='ok'/);
 assert.match(js,/if\(hasSelectedLive\)return/);
 assert.match(js,/await showArrivalOrPlannedCountdown\(arrivalsEl,place,/);
 assert.match(js,/plannedArrivalsFromTimetable\(data\?\.timetable,line,clock\)/);
});
test('metro tabs, neighbor rails, direction list and mobile device controls have unified centering',()=>{
 const css=read('src/mobile-ui-baseline.css');
 assert.match(css,/\.transport-mode-tabs\{/);
 assert.match(css,/margin:8px auto 15px!important/);
 assert.match(css,/\.metro-neighbor-row\{/);
 assert.match(css,/margin:0 auto!important/);
 assert.match(css,/\.metro-direction-heading\.down\{/);
 for(const id of ['#map-tools-toggle','#night-visibility-quick-off','#map-safety-toggle'])assert.ok(css.includes(id));
 assert.match(css,/#app:has\(#transport-sheet:not\(\[hidden\]\)\) \.maplibregl-ctrl-bottom-left/);
});
test('mobile floating tabs and search respect iOS notch and home indicator',()=>{
 const css=read('src/mobile-ui-baseline.css');
 assert.match(css,/env\(safe-area-inset-top\)/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/#app #bottom-nav\{/);
 assert.match(css,/border-radius:21px!important/);
 assert.match(css,/#app \.topbar>\.map-quick-search\{/);
 assert.doesNotMatch(read('index.html'),/apple-mobile-web-app-status-bar-style/);
  assert.match(read('index.html'),/viewport-fit=cover/);
  assert.match(read('src/mobile-ui-v792-fixes.css'),/background:transparent!important/);
});
test('history renders all original notes by version, with sources adjacent and both kept in mobile switch',()=>{
 const renderer=read('src/version-history-v7.js');
 const css=read('src/mobile-ui-baseline.css');
 const versions=[...VERSION_HISTORY,...LEGACY_VERSION_HISTORY];
 const count=versions.reduce((n,release)=>n+release.items.length,0);
 assert.ok(count>=400);
 assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
 assert.ok(VERSION_HISTORY.some(record=>record.version==='v7.0.7'));
 for(const symbol of ['releases=[...recentHistory,...legacyHistory]','v707-release-items','v707-history-timeline','v707-history-sources','DATA_SOURCE_GROUPS'])
  assert.ok(renderer.includes(symbol),symbol);
 assert.match(css,/grid-template-columns:minmax\(0,1\.22fr\) minmax\(270px,\.9fr\)/);
 assert.match(css,/data-active-view="sources"/);
});
