import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {verifiedKorailLine1Timetable} from '../src/metro-korail-line1.js';
import {plannedArrivalsFromTimetable} from '../src/metro-planned-arrivals.js';

const file=path.resolve('public/data/transport/korail-line1-stations.json');
const raw=JSON.parse(fs.readFileSync(file,'utf8'));

test('Sep 2026 KORAIL schedules for Noryangjin and Daebang are actually embedded',()=>{
  assert.equal(raw.provider,'KORAIL');
  assert.equal(raw.schemaVersion,1);
  assert.ok(raw.sources.weekday.sha256.length===64);
  assert.ok(raw.sources.holiday.sha256.length===64);
  for(const name of ['노량진','대방']){
    for(const day of ['weekday','holiday']){
      const rows=raw.stations[name][day];
      assert.ok(rows.length>500,`${name} ${day}`);
      assert.ok(rows.some(r=>r.directionCode==='1'));
      assert.ok(rows.some(r=>r.directionCode==='2'));
      assert.ok(rows.some(r=>r.express===true));
      assert.ok(rows.every(r=>r.destination && /^\d\d:\d\d$/.test(r.time)));
      assert.ok(rows.every(r=>r.minute>=300 && r.minute<1500));
      assert.ok(rows.every(r=>r.trainNumber));
    }
  }
});

test('Source Excel examples are preserved for both weekdays and holidays',()=>{
  const rows=raw.stations;
  assert.ok(rows.노량진.weekday.some(r=>r.trainNumber==='K802'&&r.time==='05:11'&&r.destination==='동두천'&&r.directionCode==='1'));
  assert.ok(rows.대방.weekday.some(r=>r.trainNumber==='K802'&&r.time==='05:09'&&r.directionCode==='1'));
  assert.ok(rows.노량진.holiday.some(r=>r.trainNumber==='K7'&&r.time==='05:39'&&r.destination==='인천'&&r.directionCode==='2'));
  assert.ok(rows.대방.holiday.some(r=>r.trainNumber==='K7'&&r.time==='05:42'&&r.directionCode==='2'));
  assert.ok(rows.노량진.weekday.some(r=>r.destination==='청량리')); // original 1지청 alias
  assert.ok(rows.노량진.weekday.some(r=>r.time.startsWith('24:'))); // midnight rollover
});

test('Line 1 realtime screen can show genuine timetable-based countdown for both stations and service days',()=>{
  for(const name of ['노량진','대방']){
    for(const day of ['1','2','3']){
      const result=verifiedKorailLine1Timetable(raw,name,day);
      assert.equal(result.status,'ok');
      assert.equal(result.requestedLines[0],'1호선');
      assert.ok(result.timetable.length>500);
      // 15:40 is within the normal service day; both directions must be scheduled.
      const clock={minute:15*60+40,second:0,day};
      const future=plannedArrivalsFromTimetable(result.timetable,'1호선',clock);
      assert.ok(future.some(r=>r.directionCode==='1'),`${name}/${day} up`);
      assert.ok(future.some(r=>r.directionCode==='2'),`${name}/${day} down`);
      assert.ok(future.length<=4);
      for(const arrival of future){
        assert.match(arrival.message,/^약 \d+분 후 도착$/);
        assert.equal(arrival.isPlanned,true);
        assert.ok(arrival.remainingSeconds>=0);
        assert.match(arrival.sourceLabel,/시간표 기준/);
      }
    }
  }
});

test('No fabricated real-time ETA is inferred from schedule data',()=>{
  const w=verifiedKorailLine1Timetable(raw,'노량진','1');
  const future=plannedArrivalsFromTimetable(w.timetable,'1호선',{minute:15*60+40,second:20});
  assert.ok(future.length);
  assert.ok(future.every(x=>x.isPlanned===true));
  assert.ok(future.every(x=>!('realTime' in x)));
});

test('The in-app Line 1 timetable tab reads the same official offline JSON',()=>{
  const source=fs.readFileSync(path.resolve('src/transport-map.js'),'utf8');
  assert.match(source,/async function refreshServiceHours\(place,activeSeq\)/);
  const section=source.slice(source.indexOf('async function refreshServiceHours('),source.indexOf('async function open(',source.indexOf('async function refreshServiceHours(')));
  assert.match(section,/verifiedKorailLine1Timetable\(payload,normalizeStationQueryName\(place\.name\),selectedDay\)/);
  assert.match(section,/korail-line1-stations\.json/);
});
