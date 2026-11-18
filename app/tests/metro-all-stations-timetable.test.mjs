import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchStationTimetables,timetableStationCandidates,timetableLineSelection} from '../server/metro-timetable-common.mjs';
import {parseMetroStationLookup} from '../server/service-hours.mjs';

const fakeStation=(station,line,code)=>({STATION_NM:station,LINE_NUM:line,FR_CODE:code});
const fakeTrain=(direction,day='1')=>({SearchSTNTimeTableByFRCodeService:{RESULT:{CODE:'INFO-000'},row:[
  {WEEK_TAG:day,LEFTTIME:direction==='1'?'05:28:00':'05:36:00',SUBWAYENAME:'중간행',TRAIN_NO:`${direction}1`},
  {WEEK_TAG:day,LEFTTIME:direction==='1'?'24:21:00':'24:42:00',SUBWAYENAME:'종착',TRAIN_NO:`${direction}2`}
]}});
const stationLookup=rows=>({SearchInfoBySubwayNameService:{RESULT:{CODE:'INFO-000'},row:rows}});
const stationLineLookup=rows=>({SearchSTNBySubwayLineInfo:{RESULT:{CODE:'INFO-000'},row:rows}});

function fakeOfficial({nameRows={},lineRows={},failedLines=new Set(),emptyLines=new Set()}={}){
  const calls=[];
  const fetchJSON=async(service,parts)=>{
    calls.push({service,parts});
    if(service==='SearchInfoBySubwayNameService')return stationLookup(nameRows[parts[1]]||[]);
    if(service==='SearchSTNBySubwayLineInfo')return stationLineLookup(lineRows[`${parts[2]}/${parts[3]}`]||[]);
    if(service==='SearchSTNTimeTableByFRCodeService'){
      if(failedLines.has(parts[1]))throw Error('upstream unavailable');
      return emptyLines.has(parts[1])?{SearchSTNTimeTableByFRCodeService:{row:[]}}:fakeTrain(parts[3],parts[2]);
    }
    throw Error(`unexpected ${service}`);
  };
  return {fetchJSON,calls};
}
const fixedDate=new Date('2026-11-06T05:00:00Z');

test('일반역: 상도역 7호선 첫차·막차와 양방향 전체 시간표',async()=>{
  const mock=fakeOfficial({nameRows:{상도:[fakeStation('상도','7호선','739')]}});
  const out=await fetchStationTimetables({station:'상도역',line:'7호선',day:'1',fetchJSON:mock.fetchJSON,now:fixedDate});
  assert.equal(out.status,'ok');
  assert.deepEqual(out.items.map(x=>x.direction),['상행·내선','하행·외선']);
  assert.equal(out.timetable.length,4);
  assert.deepEqual([...new Set(out.timetable.map(x=>x.line))],['7호선']);
  assert.equal(mock.calls.filter(x=>x.service==='SearchSTNTimeTableByFRCodeService').length,2);
});

test('환승역: 사당역 2·4호선 모두 포함 (하나의 역명 조회)',async()=>{
  const mock=fakeOfficial({nameRows:{사당:[fakeStation('사당','2호선','226'),fakeStation('사당','4호선','433')]}});
  const out=await fetchStationTimetables({station:'사당',line:'2호선,4호선',day:'1',fetchJSON:mock.fetchJSON,now:fixedDate});
  assert.equal(out.status,'ok');
  assert.equal(out.items.length,4);
  assert.deepEqual(new Set(out.timetable.map(x=>x.line)),new Set(['2호선','4호선']));
  assert.equal(mock.calls.filter(x=>x.service==='SearchInfoBySubwayNameService').length,1);
});

test('환승역: 노량진 1·9호선, 고정 136 예외가 없어도 공식 검색으로 조회',async()=>{
  const mock=fakeOfficial({nameRows:{노량진:[fakeStation('노량진','1호선','136'),fakeStation('노량진','9호선','917')]}});
  const out=await fetchStationTimetables({station:'노량진',line:'1호선,9호선',day:'1',fetchJSON:mock.fetchJSON,now:fixedDate});
  assert.deepEqual(new Set(out.items.map(x=>x.line)),new Set(['1호선','9호선']));
});

test('환승역: 이수 4호선은 총신대입구 별칭으로 재조회, 7호선은 이수 유지',async()=>{
  const mock=fakeOfficial({
    nameRows:{이수:[fakeStation('이수','7호선','736')]},
    lineRows:{'총신대입구/4호선':[fakeStation('총신대입구(이수)','4호선','432')]}
  });
  const out=await fetchStationTimetables({station:'이수(총신대입구)',line:'4호선,7호선',day:'1',fetchJSON:mock.fetchJSON,now:fixedDate});
  assert.equal(out.status,'ok');
  assert.deepEqual(new Set(out.items.map(x=>x.line)),new Set(['4호선','7호선']));
  assert.ok(mock.calls.some(x=>x.service==='SearchSTNBySubwayLineInfo'&&x.parts[2]==='총신대입구'));
});

test('일반역: 다른 이름/부역명도 정규화',()=>{
  assert.deepEqual(timetableStationCandidates('서울대입구(관악구청)역').slice(0,1),['서울대입구']);
  const data=stationLookup([fakeStation('서울대입구(관악구청)','2호선','228')]);
  assert.equal(parseMetroStationLookup(data,'서울대입구','2호선'),'228');
  assert.equal(parseMetroStationLookup(data,'서울대입구','7호선'),null);
});

test('한 호선 실패해도 다른 호선은 정상 표시하며 사유를 알린다',async()=>{
  const mock=fakeOfficial({nameRows:{노량진:[fakeStation('노량진','1호선','136'),fakeStation('노량진','9호선','917')]},failedLines:new Set(['136'])});
  const out=await fetchStationTimetables({station:'노량진역',line:'1호선,9호선',day:'1',fetchJSON:mock.fetchJSON,now:fixedDate});
  assert.equal(out.status,'ok');
  assert.deepEqual(new Set(out.items.map(x=>x.line)),new Set(['9호선']));
  assert.match(out.notice,/1호선: 시간표 조회 결과 없음/);
  assert.match(out.notice,/1호선: 일부 방면 API 조회 실패/);
});

test('신림선 등 미지원 노선은 미지원 안내하고, 2호선 시간표는 제공',async()=>{
  const mock=fakeOfficial({nameRows:{신림:[fakeStation('신림','2호선','230')]}});
  const out=await fetchStationTimetables({station:'신림',line:'2호선,신림선',day:'2',fetchJSON:mock.fetchJSON,now:fixedDate});
  assert.equal(out.status,'ok');
  assert.deepEqual(new Set(out.items.map(x=>x.line)),new Set(['2호선']));
  assert.match(out.notice,/신림선/);
  assert.ok(out.timetable.every(x=>x.day==='2'));
});

test('시간표가 없는 역은 실제 시간 정보를 생성하지 않는다',async()=>{
  const mock=fakeOfficial({nameRows:{숭실대입구:[fakeStation('숭실대입구','7호선','740')]},emptyLines:new Set(['740'])});
  const out=await fetchStationTimetables({station:'숭실대입구',line:'7호선',day:'1',fetchJSON:mock.fetchJSON,now:fixedDate});
  assert.equal(out.status,'unavailable');
  assert.equal(out.items.length,0);
  assert.equal(out.timetable.length,0);
});

test('9호선만/신림선만 선택한 경우를 명확히 처리한다',async()=>{
  const mock=fakeOfficial({nameRows:{샛강:[fakeStation('샛강','9호선','915')]}});
  const nine=await fetchStationTimetables({station:'샛강',line:'9호선',day:'1',fetchJSON:mock.fetchJSON,now:fixedDate});
  const sillim=await fetchStationTimetables({station:'샛강',line:'신림선',day:'1',fetchJSON:mock.fetchJSON,now:fixedDate});
  assert.equal(nine.status,'ok');
  assert.equal(sillim.status,'unsupported');
  assert.match(sillim.notice,/신림선/);
});

test('지원 호선 목록은 요청된 호선만 고르며 임의 추측하지 않는다',()=>{
  const selection=timetableLineSelection('1호선,9호선,신림선,9호선');
  assert.deepEqual(selection.supported,['1호선','9호선']);
  assert.deepEqual(selection.unsupported,['신림선']);
});

test('노량진 1호선은 공식 역명검색과 노선별 검색 모두 누락 시 확인된 외부코드 136을 마지막으로 사용',async()=>{
  const mock=fakeOfficial({nameRows:{노량진:[fakeStation('노량진','9호선','917')]}});
  const out=await fetchStationTimetables({station:'노량진',line:'1호선,9호선',day:'1',fetchJSON:mock.fetchJSON,now:fixedDate});
  assert.equal(out.status,'ok');
  assert.deepEqual(new Set(out.items.map(x=>x.line)),new Set(['1호선','9호선']));
  assert.ok(mock.calls.some(x=>x.service==='SearchSTNTimeTableByFRCodeService'&&x.parts[1]==='136'));
});

test('1차 역명 검색에서 API 오류 코드가 반환되어도 노선별 조회로 복구',async()=>{
  const calls=[];
  const fetchJSON=async(service,parts)=>{
    calls.push(service);
    if(service==='SearchInfoBySubwayNameService')return stationLookup([]);
    if(service==='SearchSTNBySubwayLineInfo')return stationLineLookup([fakeStation('동작','4호선','431')]);
    return fakeTrain(parts[3],parts[2]);
  };
  const out=await fetchStationTimetables({station:'동작',line:'4호선',day:'1',fetchJSON,now:fixedDate});
  assert.equal(out.status,'ok');
  assert.ok(calls.includes('SearchSTNBySubwayLineInfo'));
});
