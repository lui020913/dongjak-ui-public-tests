import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const client=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');

test('전체 운행시간표는 상행·내선과 하행·외선을 별도 패널로 나눈다',()=>{
  assert.match(client,/code:'1',label:'상행 · 내선'/);
  assert.match(client,/code:'2',label:'하행 · 외선'/);
  assert.match(client,/row\.directionCode===direction\.code/);
  assert.match(client,/transport-timetable-direction-grid/);
  assert.match(client,/transport-timetable-pane--/);
});
test('요일과 호선 필터와 방향 스위치를 서로 독립적으로 유지한다',()=>{
  assert.match(client,/timetableDay=daySelect\.value/);
  assert.match(client,/timetableLine=lineSelect\.value/);
  assert.match(client,/timetableDirection=value/);
  assert.match(client,/setAttribute\('aria-pressed'/);
  assert.match(client,/timetableExpanded=false;timetableDay=null;timetableLine='all';timetableDirection='all'/);
});
test('각 방향은 호선별 열차 시간 및 행선지/급행을 표시한다',()=>{
  assert.match(client,/const grouped=new Map\(\)/);
  assert.match(client,/transport-timetable-train-time/);
  assert.match(client,/transport-timetable-train-dest/);
  assert.match(client,/row\.express===true/);
  assert.match(styles,/\.transport-timetable-pane--up/);
  assert.match(styles,/\.transport-timetable-pane--down/);
});
test('모바일에서도 시간표가 겹치지 않게 세로로 분리된다',()=>{
  assert.match(styles,/@media\(max-width:640px\)/);
  assert.match(styles,/\.transport-timetable-direction-grid\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(styles,/\.transport-timetable-pane-list\{overflow-y:auto/);
});
