import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {plannedArrivalsFromTimetable} from '../src/metro-planned-arrivals.js';
import {verifiedKorailLine1Timetable} from '../src/metro-korail-line1.js';
const official={schemaVersion:1,provider:'KORAIL',sourceUrl:'https://www.korail.com/com/userBoard.do?mode=list&schBcid=ticketTable',stations:{'노량진':{weekday:[
  {time:'15:30',minute:930,directionCode:'1',destination:'',express:false},
  {time:'15:36',minute:936,directionCode:'2',destination:'',express:false}
]}}};
test('both Sillim and line 1 planned cards use approximate arrival wording with provenance',()=>{
  const res=verifiedKorailLine1Timetable(official,'노량진','1');
  const result=plannedArrivalsFromTimetable(res.timetable,'1호선',{minute:15*60+25,second:10});
  assert.equal(result.length,2);
  assert.equal(result[0].message,'약 5분 후 도착');
  assert.equal(result[0].plannedTime,'15:30');
  assert.ok(result.every(x=>x.isPlanned && x.sourceLabel.includes('시간표 기준')));
});
test('never invent Korail arrivals from missing unverified station schedule',()=>{
  assert.equal(verifiedKorailLine1Timetable(null,'노량진','1'),null);
  assert.equal(verifiedKorailLine1Timetable(official,'대방','1'),null);
  assert.equal(verifiedKorailLine1Timetable({...official,provider:'unknown'},'노량진','1'),null);
  assert.equal(verifiedKorailLine1Timetable(official,'노량진','3'),null);
});
test('UI marks scheduled time clearly and does not use bare 0-second realtime ETA',()=>{
  const source=fs.readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(source,/row\.isPlanned/);
  assert.match(source,/metro-planned-time-meta/);
  assert.match(source,/verifiedKorailLine1Timetable/);
});
