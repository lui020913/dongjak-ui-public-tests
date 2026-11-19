import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {popupViewportOffset} from '../src/map-popup-viewport.js';
import {isScheduleMergedStation} from '../src/metro-schedule-view.js';
import {verifiedKorailLine1Timetable} from '../src/metro-korail-line1.js';
import {verifiedInlineOperatorTimetable} from '../src/metro-inline-schedules.js';
import {NIGHT_VISUAL_PALETTE} from '../src/night-visibility-map.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('MapLibre popup rectangles are shifted into the visible viewport on all four edges',()=>{
  const viewport={left:0,top:0,right:400,bottom:800};
  assert.deepEqual(popupViewportOffset({left:-40,top:30,right:180,bottom:180},viewport,12),{x:52,y:0});
  assert.deepEqual(popupViewportOffset({left:240,top:720,right:440,bottom:860},viewport,12),{x:-52,y:-72});
  assert.deepEqual(popupViewportOffset({left:80,top:100,right:280,bottom:300},viewport,12),{x:0,y:0});
});

test('all subway stations expose independent realtime and timetable tabs',()=>{
  for(const place of [
    {kind:'subway',selectedLine:'1호선',lines:['1호선']},
    {kind:'subway',selectedLine:'신림선',lines:['신림선']},
    {kind:'subway',selectedLine:'9호선',lines:['9호선']},
    {kind:'subway',lines:['1호선','신림선']}
  ]) assert.equal(isScheduleMergedStation(place),false);
  const source=read('src/transport-map.js');
  assert.match(source,/hoursTab\.hidden=merged/);
  assert.match(source,/timetableExpanded=true;\s*saveTimetable\(place,selectedDay,table\);\s*renderServiceHours\(table\)/);
  assert.match(source,/timetableExpanded=true;\s*saveTimetable\(place,selectedDay,inline\);\s*renderServiceHours\(inline\)/);
  assert.match(source,/전체 운행시간표 보기/);
  assert.match(source,/!hasOperatorSources&&!inAppOperatorLine/);
});

test('Line 1 Korail in-app timetable includes the full two-direction daily schedule',()=>{
  const data=JSON.parse(read('public/data/transport/korail-line1-stations.json'));
  const weekday=verifiedKorailLine1Timetable(data,'대방','1');
  const holiday=verifiedKorailLine1Timetable(data,'대방','2');
  assert.equal(weekday.timetable.length,656);
  assert.equal(weekday.timetable.filter(row=>row.directionCode==='1').length,330);
  assert.equal(weekday.timetable.filter(row=>row.directionCode==='2').length,326);
  assert.equal(holiday.timetable.length,609);
  assert.equal(holiday.timetable.filter(row=>row.directionCode==='1').length,305);
  assert.equal(holiday.timetable.filter(row=>row.directionCode==='2').length,304);
});

test('Sillim in-app timetable shows all published rows for its verified local stations',()=>{
  const weekday=verifiedInlineOperatorTimetable('대방','신림선','1');
  const weekend=verifiedInlineOperatorTimetable('샛강','신림선','2');
  assert.equal(weekday.timetable.length,374);
  assert.equal(weekday.timetable.filter(row=>row.directionCode==='1').length,192);
  assert.equal(weekday.timetable.filter(row=>row.directionCode==='2').length,182);
  assert.equal(weekend.timetable.length,150);
  assert(weekday.timetable.every(row=>row.line==='신림선'));
  const server=read('server/sillim-published-timetable.mjs');
  assert.match(server,/const STATIONS=\['샛강','대방','서울지방병무청','보라매','보라매공원','보라매병원','당곡','신림','서원','서울대벤처타운','관악산'\]/);
});

test('station title carries the selected line badge and route strip centers all three stations',()=>{
  const source=read('src/transport-map.js');
  const css=read('src/v704-user-request-fixes.css');
  assert.match(source,/button\.append\(badge\)/);
  assert.match(source,/dj-metro-line-selector/);
  assert.match(source,/metroTransferBadgeLines\(place\.name/);
  assert.match(source,/metro-rail-previous/);
  assert.match(source,/metro-rail-current/);
  assert.match(source,/metro-rail-next/);
  assert.match(css,/justify-content:center!important/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(70px,1\.05fr\) minmax\(0,1fr\)/);
});

test('clicked menus and map popups are viewport-bounded and scroll internally',()=>{
  const css=read('src/v704-user-request-fixes.css');
  const main=read('src/main.js');
  const popup=read('src/map-popup-viewport.js');
  assert.match(main,/installViewportSafeMapPopups\(\{map\}\)/);
  assert.match(css,/max-height:min\(72dvh,calc\(100dvh - 52px\)\)!important/);
  assert.match(css,/overflow-y:auto!important/);
  assert.match(css,/map-safety-open #map-safety-controls/);
  assert.match(css,/map-controls-open \.map-advanced-controls/);
  assert.match(popup,/map\.on\?\.\('move',schedule\)/);
  assert.match(popup,/popupViewportOffset\(rect,viewport,margin\)/);
});

test('the pedestrian-safety launcher stays on one line and user-facing zone text avoids "도형"',()=>{
  const css=read('src/v704-user-request-fixes.css');
  const html=read('index.html');
  const zone=read('src/protection-zone-map.js')+read('src/protection-zone-guidance.js');
  assert.match(css,/white-space:nowrap!important/);
  assert.doesNotMatch(html,/도형/);
  assert.doesNotMatch(zone,/도형/);
});

test('night analysis is fixed to building occlusion with its original light-reach color retained',()=>{
  const html=read('index.html');
  const night=read('src/night-visibility-map.js');
  const css=read('src/night-visibility-panel.css');
  assert.doesNotMatch(html,/night-analysis-mode|기존 조명 거리/);
  assert.equal(NIGHT_VISUAL_PALETTE.clear.toLowerCase(),'#79dec1');
  assert.equal(NIGHT_VISUAL_PALETTE.alleyUnlit.toLowerCase(),'#ff8a5b');
  assert.equal(NIGHT_VISUAL_PALETTE.pathUnlit.toLowerCase(),'#5d9eff');
  for(const color of [NIGHT_VISUAL_PALETTE.clear,NIGHT_VISUAL_PALETTE.alleyUnlit,NIGHT_VISUAL_PALETTE.pathUnlit])
    assert.ok(css.toLowerCase().includes(color.toLowerCase()));
  assert.match(night,/const isOcclusion=\(\)=>true/);
  assert.match(night,/거리 기반 분석으로 대체하지 않습니다/);
});

test('v7.0.4 is the current version and records all requested UI changes',()=>{
  const pkg=JSON.parse(read('package.json'));
  const history=read('src/version-history.js');
  assert.equal(pkg.version,APP_VERSION);
  assert.match(history,/\{version:'v7\.0\.5'/);
  for(const phrase of ['뷰포트 안쪽으로 자동 보정','코레일 역별 평일·휴일 전체 시간표','신림선 역별 평일·토요일·공휴일 전체 시간표','건물 차폐 방식으로 고정'])
    assert.ok(history.includes(phrase),phrase);
});
