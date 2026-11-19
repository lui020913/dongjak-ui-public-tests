import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSeoulBusArrival,parseSeoulSubwayArrival,resolveSeoulBusStation} from '../src/transport-data.js';
test('버스 공식 API 정류소별 노선과 첫 도착정보 파싱',()=>{
  assert.deepEqual(parseSeoulBusArrival({msgBody:{itemList:[{rtNm:'123',arrmsg1:'3분 후',stNm:'방면'}]}}),[{route:'123',destination:'방면',message:'3분 후',nextMessage:''}]);
});
test('지하철 공식 API의 호선 및 메시지 파싱',()=>{
  assert.deepEqual(parseSeoulSubwayArrival({realtimeArrivalList:[{subwayId:'1009',updnLine:'상행',trainLineNm:'개화방면',arvlMsg2:'전역 출발',barvlDt:'0'}]}),[{line:'9호선',direction:'상행 · 개화방면',directionType:'상행',destination:'',message:'전역 출발'}]);
});
test('빈 API 응답은 가짜 도착정보를 생성하지 않음',()=>{
 assert.deepEqual(parseSeoulBusArrival({}),[]);
 assert.deepEqual(parseSeoulSubwayArrival({}),[]);
});

test('공식 서울시 좌표 근접 검색에서 가까운 정류소의 ARS 번호만 선택',()=>{
  const body={msgBody:{itemList:[
    {arsId:'12345',gpsX:'126.95005',gpsY:'37.50004',stNm:'테스트정류소'},
    {arsId:'99999',gpsX:'126.96000',gpsY:'37.51000',stNm:'다른정류소'},
  ]}};
  assert.equal(resolveSeoulBusStation(body,37.5,126.95,'테스트 정류소'),'12345');
  assert.equal(resolveSeoulBusStation(body,37.3,126.95),'');
});
