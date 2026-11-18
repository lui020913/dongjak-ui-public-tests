import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTime,formatTime,seoulMinutes,seoulDayTag,parseMetroStationLookup,parseMetroServiceHours,parseBusServiceTime} from '../server/service-hours.mjs';
import {readFileSync} from 'node:fs';

test('첫차와 24시 이후 막차 시각을 정확히 파싱한다',()=>{
  assert.equal(parseTime('05:34:00'),334);
  assert.equal(parseTime('24:12:00'),1452);
  assert.equal(parseTime('253000'),1530);
  assert.equal(parseTime('30:05'),null);
  assert.equal(formatTime(1452),'00:12 (+1일)');
});
test('KST 기준 주말/평일을 구분한다',()=>{
  assert.equal(seoulDayTag(new Date('2026-11-06T00:00:00Z')),'1');
  assert.equal(seoulDayTag(new Date('2026-11-07T00:00:00Z')),'2');
  assert.equal(seoulDayTag(new Date('2026-11-08T00:00:00Z')),'3');
  assert.equal(seoulMinutes(new Date('2026-11-06T00:02:00Z')),542);
});
test('공식 역사 목록에서 역명과 호선이 모두 맞는 외부코드만 선택한다',()=>{
  const lookup={SearchInfoBySubwayNameService:{row:[
    {STATION_NM:'동작',LINE_NUM:'4호선',FR_CODE:'431'},
    {STATION_NM:'동작',LINE_NUM:'9호선',FR_CODE:'920'},
    {STATION_NM:'다른역',LINE_NUM:'4호선',FR_CODE:'999'}
  ]}};
  assert.equal(parseMetroStationLookup(lookup,'동작역','4호선'),'431');
  assert.equal(parseMetroStationLookup(lookup,'동작','9호선'),'920');
  assert.equal(parseMetroStationLookup(lookup,'동작','2호선'),null);
});
test('공식 역별 열차시간표에서 방향별 첫차/막차를 구분한다',()=>{
  const date=new Date('2026-11-06T14:00:00Z'); // 서울 23시, 평일
  const result=parseMetroServiceHours([{
    direction:'1',body:{SearchSTNTimeTableByFRCodeService:{row:[
      {WEEK_TAG:'1',LEFTTIME:'05:36:00'},
      {WEEK_TAG:'1',LEFTTIME:'23:25:00'},
      {WEEK_TAG:'1',LEFTTIME:'24:18:00'}
    ]}}
  },{direction:'2',body:{SearchSTNTimeTableByFRCodeService:{row:[{WEEK_TAG:'1',LEFTTIME:'05:41:00'},{WEEK_TAG:'1',LEFTTIME:'22:50:00'}]}}}], '4호선',date);
  assert.equal(result.length,2);
  assert.equal(result[0].first,'05:36');
  assert.equal(result[0].last,'00:18 (+1일)');
  assert.equal(result[0].passed,false);
  assert.equal(result[1].passed,true);
});
test('도착정보 부재만으로 막차 통과를 단정하지 않는다',()=>{
  assert.equal(parseBusServiceTime({msgBody:{itemList:[{firstBusTm:'05:20',lastBusTm:'23:20'}]}},'501').passed,false);
  assert.equal(parseBusServiceTime({msgBody:{itemList:[{firstBusTm:'05:20',lastBusTm:'23:20',nextBus:'운행종료'}]}},'501').passed,true);
});
test('자동 현재 위치 추적 복구 코드를 제거하고 수동 버튼을 유지한다',()=>{
  const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/if\s*\(localStorage\.getItem\(GPS_AUTO_KEY\)==='yes'\)startGpsTracking\(\)/);
  assert.match(source,/getElementById\('current-location'\)\.addEventListener\('click',\(\)=>startGpsTracking\(\{manual:true\}\)\)/);
});
test('교통 안내 패널에서 막차 조회 결과와 실시간 도착 목록을 분리한다',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="transport-service-hours"/);
  const source=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(source,/service-hours\?/);
  assert.match(source,/setInterval\(\(\)=>\{void autoRefreshSelectedArrival\(\);\},15000\)/);
});
