import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseMetroTimetableRows,parseMetroServiceHours} from '../server/service-hours.mjs';

const responses=[
  {direction:'1',body:{SearchSTNTimeTableByFRCodeService:{row:[
    {WEEK_TAG:'1',LEFTTIME:'05:11:30',SUBWAYENAME:'동두천',SUBWAYSNAME:'구로',TRAIN_NO:'A01',EXPRESS_YN:'0'},
    {WEEK_TAG:'1',LEFTTIME:'24:13:00',SUBWAYENAME:'동묘앞',TRAIN_NO:'A02',EXPRESS_YN:'0'},
    {WEEK_TAG:'2',LEFTTIME:'05:13:00',SUBWAYENAME:'서울역'}
  ]}}},
  {direction:'2',body:{SearchSTNTimeTableByFRCodeService:{row:[
    {WEEK_TAG:'1',LEFTTIME:'05:28:00',SUBWAYENAME:'서동탄',TRAIN_NO:'B01'},
    {WEEK_TAG:'1',LEFTTIME:'24:21:30',SUBWAYENAME:'구로',TRAIN_NO:'B02'}
  ]}}}
];

test('전체 지하철 시간표는 출발시각과 행선지를 포함하고, 두 방면과 자정 이후까지 모두 담는다',()=>{
  const rows=parseMetroTimetableRows(responses,'1호선','1');
  assert.equal(rows.length,4);
  assert.deepEqual(rows.map(x=>x.time),['05:11','05:28','00:13 (+1일)','00:21 (+1일)']);
  assert.deepEqual([...new Set(rows.map(x=>x.directionCode))],['1','2']);
  assert.equal(rows.at(-1).destination,'구로');
  assert.equal(rows[0].origin,'구로');
});

test('공휴일/토요일 시간표를 보는 중에 현재 평일 시각으로 막차 경과 판정하지 않는다',()=>{
  const date=new Date('2026-11-06T14:00:00Z'); // 서울 금요일 23시
  const day2={direction:'1',body:{SearchSTNTimeTableByFRCodeService:{row:[
    {WEEK_TAG:'2',LEFTTIME:'05:30:00'},
    {WEEK_TAG:'2',LEFTTIME:'22:00:00'}
  ]}}};
  const rows=parseMetroServiceHours([day2],'9호선',date,'2');
  assert.equal(rows.length,1);
  assert.equal(rows[0].passed,false);
});

test('모든 역은 공통 방식으로 호선별 역코드를 조회한다',()=>{
  const server=readFileSync(new URL('../server/transport-proxy.mjs',import.meta.url),'utf8');
  assert.match(server,/fetchStationTimetables/);
  const general=readFileSync(new URL('../server/metro-timetable-common.mjs',import.meta.url),'utf8');
  assert.match(general,/timetable\.push\(\.\.\.parsedTimes/);
  assert.match(general,/requestedLines:/);
  assert.match(server,/getServiceHours\(\{kind,station,line,arsId,day\}\)/);
});

test('지도 상세 패널에 전체 시간표 및 요일/호선/방향 필터를 제공한다',()=>{
  const client=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(client,/전체 운행시간표 보기/);
  assert.match(client,/시간표 요일/);
  assert.match(client,/시간표 호선/);
  assert.match(client,/시간표 방향/);
  assert.match(client,/timetableExpanded=false;timetableDay=null/);
  assert.match(client,/setInterval\(\(\)=>\{void autoRefreshSelectedArrival\(\);\},15000\)/);
});
