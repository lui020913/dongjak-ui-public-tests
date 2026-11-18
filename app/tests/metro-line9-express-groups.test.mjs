import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseMetroExpressFlag,parseMetroTimetableRows,parseMetroServiceHours} from '../server/service-hours.mjs';

const rows=[
 {WEEK_TAG:'1',LEFTTIME:'05:31:00',SUBWAYENAME:'중앙보훈병원',EXPRESS_YN:'G'},
 {WEEK_TAG:'1',LEFTTIME:'05:42:00',SUBWAYENAME:'중앙보훈병원',EXPRESS_YN:'D'},
 {WEEK_TAG:'1',LEFTTIME:'06:03:00',SUBWAYENAME:'개화',EXPRESS_YN:''},
 {WEEK_TAG:'1',LEFTTIME:'23:30:00',SUBWAYENAME:'개화',EXPRESS_YN:'D'},
 {WEEK_TAG:'1',LEFTTIME:'23:41:00',SUBWAYENAME:'중앙보훈병원',EXPRESS_YN:'G'}
];
const response=[{direction:'1',body:{SearchSTNTimeTableByFRCodeService:{row:rows}}}];
test('공식 EXPRESS_YN G=일반, D=급행 파싱; 없는 정보 추정 금지',()=>{
 assert.equal(parseMetroExpressFlag('G'),false);
 assert.equal(parseMetroExpressFlag('D'),true);
 assert.equal(parseMetroExpressFlag('0'),false);
 assert.equal(parseMetroExpressFlag('1'),true);
 assert.equal(parseMetroExpressFlag(undefined),null);
 assert.equal(parseMetroExpressFlag('unexpected'),null);
});
test('9호선 전체 시간표는 급행·일반·미확인을 혼합하지 않는다',()=>{
 const times=parseMetroTimetableRows(response,'9호선','1');
 assert.deepEqual(times.map(r=>r.express),[false,true,null,true,false]);
});
test('9호선 방향별 첫차·막차도 일반·급행 분리하고 알 수 없는 유형 별도 유지',()=>{
 const now=new Date('2026-11-05T20:00:00Z');
 const summary=parseMetroServiceHours(response,'9호선',now,'1');
 assert.deepEqual(summary.map(r=>r.route),['일반','급행','종별 미확인']);
 assert.equal(summary.find(r=>r.route==='급행').first,'05:42');
 assert.equal(summary.find(r=>r.route==='급행').last,'23:30');
 assert.equal(summary.find(r=>r.route==='일반').last,'23:41');
 assert.ok(summary.every(r=>r.passed===false));
});
test('다른 호선의 시간표 형태는 변경하지 않는다',()=>{
 const result=parseMetroServiceHours(response,'7호선',new Date('2026-11-05T20:00:00Z'),'1');
 assert.equal(result.length,1);
 assert.equal(result[0].route,'');
});
test('9호선 상하행 안에 일반·급행 각각 독립 그룹과 미확인 구분, CSS 존재',()=>{
 const client=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(client,/if\(line==='9호선'\)/);
 assert.match(client,/title:'일반열차',kind:'local'/);
 assert.match(client,/title:'급행열차',kind:'express'/);
 assert.match(client,/title:'종별 미확인',kind:'unknown'/);
 assert.match(client,/row\.express===true/);
 assert.match(css,/transport-timetable-service-group--express/);
 assert.match(css,/transport-timetable-service-group--local/);
});
