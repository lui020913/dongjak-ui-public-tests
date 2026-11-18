import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compactReportedArrivals,statusReportLabel,metroTerminalLabel} from '../src/metro-status-view.js';
const core=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/metro-status-compact.css',import.meta.url),'utf8');
test('ETA-free report is never formatted as a countdown',()=>{
  assert.equal(statusReportLabel('최근 수신: 운행 중 · 도착시간 미확인'),'마지막 보고: 운행 중');
  assert.equal(statusReportLabel('최근 수신: 역 도착 · 도착시간 미확인'),'마지막 보고: 역 도착');
  assert.equal(statusReportLabel('7분 후'),'');
});
test('latest train reports are capped per direction, preserving data in original order',()=>{
  const rows=[...Array.from({length:5},(_,i)=>({line:'1호선',directionType:'상행',destination:`T${i}`})),
    ...Array.from({length:3},(_,i)=>({line:'1호선',directionType:'하행',destination:`D${i}`}))];
  const output=compactReportedArrivals(rows);
  assert.equal(output.total,8);assert.equal(output.hidden,4);
  assert.deepEqual(output.visible.map(x=>x.destination),['T0','T1','D0','D1']);
});
test('shinlim starting terminus is explicitly labelled as terminus, not missing data',()=>{
  assert.equal(metroTerminalLabel('샛강','신림선','previous'),'기점');
  assert.equal(metroTerminalLabel('관악산','신림선','next'),'종점');
  assert.equal(metroTerminalLabel('노량진','1호선','previous'),'이전역 없음');
});
test('ETA-free status uses one concise notice and timetable action without an expandable report log',()=>{
  assert.match(core,/if\(state==='status-only'\)/);
  assert.match(core,/실시간 도착시간 미제공/);
  assert.match(core,/최근 열차 상태는 수신했지만 남은 도착시간은 확인할 수 없습니다/);
  assert.match(core,/metro-open-schedule/);
  assert.match(core,/metroTerminalLabel\(stationName,line,'previous'\)/);
  assert.doesNotMatch(core,/metro-reports-toggle|metro-reports-collapsible/);
});
