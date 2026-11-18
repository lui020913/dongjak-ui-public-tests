import test from 'node:test';
import assert from 'node:assert/strict';
import {seoulServiceClock,plannedArrivalsFromTimetable} from '../src/metro-planned-arrivals.js';
import {verifiedInlineOperatorTimetable} from '../src/metro-inline-schedules.js';

test('KST timetable counts previous service day just after midnight',()=>{
  const mondayNight=seoulServiceClock(new Date('2026-11-09T15:30:00.000Z'));
  assert.equal(mondayNight.day,'1');
  assert.equal(mondayNight.minute,24*60+30);
});
test('KST Tuesday service day and seconds are available for precise scheduled labels',()=>{
  const clock=seoulServiceClock(new Date('2026-11-10T04:36:10.000Z'));
  assert.equal(clock.day,'1');
  assert.equal(clock.minute,13*60+36);
  assert.equal(clock.second,10);
});
test('only verified station timetable yields directional planned countdown, never ETA',()=>{
  const verified=verifiedInlineOperatorTimetable('대방','신림선','1');
  assert.ok(verified?.timetable?.length>100);
  const rows=plannedArrivalsFromTimetable(verified.timetable,'신림선',
    {minute:13*60+0,second:0});
  assert.ok(rows.length>=2);
  assert.ok(rows.every(x=>x.message.startsWith('약 ') && x.message.endsWith('분 후 도착') && x.isPlanned===true && x.remainingSeconds>=0));
  assert.ok(new Set(rows.map(x=>x.directionType)).size===2);
});
test('missing table never invents scheduled trains',()=>{
  assert.deepEqual(plannedArrivalsFromTimetable(null,'1호선',{minute:800,second:0}),[]);
});
test('wrong line, expired and >3h away records do not appear',()=>{
  assert.deepEqual(plannedArrivalsFromTimetable([
    {line:'7호선',minute:800,directionCode:'1'},
    {line:'1호선',minute:100,directionCode:'1'},
    {line:'1호선',minute:1300,directionCode:'2'}
  ],'1호선',{minute:800,second:0}),[]);
});


test('00:xx departures remain future after midnight',()=>{
  const rows=[
    {line:'1호선',directionCode:'1',minute:18,time:'00:18',destination:'노량진'},
    {line:'1호선',directionCode:'2',minute:42,time:'00:42',destination:'인천'}
  ];
  const clock={day:'1',minute:24*60+10,second:0,afterMidnight:true};
  const future=plannedArrivalsFromTimetable(rows,'1호선',clock);
  assert.equal(future.length,2);
  assert.equal(future[0].plannedTime,'00:18');
  assert(future.every(row=>row.remainingSeconds>0));
});
