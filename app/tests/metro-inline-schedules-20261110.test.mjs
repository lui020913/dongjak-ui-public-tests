import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedInlineOperatorTimetable,parseOfficialHourlyRows,normalizePublishedStationName} from '../src/metro-inline-schedules.js';

test('verified Sillim station schedule is rendered in-app without ETA synthesis',()=>{
  assert.equal(normalizePublishedStationName('샛강역'),'샛강');
  const sang=verifiedInlineOperatorTimetable('샛강역','신림선','1');
  assert.equal(sang.status,'ok');
  assert.equal(sang.sourceUrl,'https://www.sillimlrt.com/kr/html/sub01/01010201.html');
  assert.equal(sang.timetable[0].time,'05:30');
  assert.equal(sang.timetable.at(-1).time,'24:42');
  assert(sang.timetable.length>150);
  assert(sang.timetable.every(r=>r.directionCode==='2'));
  assert(sang.timetable.every(r=>r.line==='신림선'&&!('barvlDt' in r)));
});

test('Sillim station service-day rules and verified source limits',()=>{
  const weekend=verifiedInlineOperatorTimetable('샛강','신림선','2');
  assert.equal(weekend.timetable[0].time,'05:30');
  assert.equal(weekend.timetable.at(-1).time,'23:42');
  assert.deepEqual(verifiedInlineOperatorTimetable('샛강','신림선','3').timetable,weekend.timetable);
  const daebang=verifiedInlineOperatorTimetable('대방(성애병원)','신림선','1');
  assert(daebang.timetable.some(x=>x.time==='05:31'&&x.directionCode==='2'));
  assert(daebang.timetable.some(x=>x.time==='05:46'&&x.directionCode==='1'));
  assert.equal(verifiedInlineOperatorTimetable('대방','신림선','2'),null);
  assert.equal(verifiedInlineOperatorTimetable('노량진','1호선','1'),null);
  assert.equal(verifiedInlineOperatorTimetable('신림','신림선','1'),null);
});

test('parser rejects implausible minute strings rather than guessing',()=>{
  assert.deepEqual(parseOfficialHourlyRows('5:15 70 xx|24:01',{}).map(x=>x.time),['05:15','24:01']);
});

test('time tab prefers available verified rows over external-site cards',()=>{
  const source=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(source,/verifiedInlineOperatorTimetable\(place\.name,place\.selectedLine\|\|'',selectedDay\)/);
  assert.match(source,/if\(inline\)\{timetableExpanded=true;saveTimetable\(place,selectedDay,inline\);renderServiceHours\(inline\);return;\}/);
  assert.match(source,/const hasOperatorSources=verifiedInline\|\|inAppOperatorLine\?false:appendOfficialOperatorTimetables\(\)/);
});
