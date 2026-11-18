import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSeoulApiResponse,parseSeoulSubwayArrival} from '../src/transport-data.js';

test('서울 지하철 정상 응답 errorMessage INFO-000은 오류가 아니다',()=>{
  const payload={errorMessage:{status:200,code:'INFO-000',message:'정상 처리되었습니다.'},realtimeArrivalList:[{subwayId:'1009',updnLine:'상행',arvlMsg2:'3분 후',barvlDt:'180'}]};
  assert.equal(inspectSeoulApiResponse(payload).state,'ok');
  assert.equal(parseSeoulSubwayArrival(payload)[0].line,'9호선');
});
test('데이터 없음은 정상적인 빈 상태로 구분',()=>{
  assert.equal(inspectSeoulApiResponse({errorMessage:{code:'INFO-200'}}).state,'empty');
});
test('지하철 잘못된 인증키를 진단',()=>{
  const r=inspectSeoulApiResponse({errorMessage:{status:200,code:'INFO-100'}});
  assert.equal(r.state,'error');
  assert.equal(r.code,'INFO-100');
  assert.match(r.message,/인증키/);
});
test('상단 코드로 전달된 인증오류 역시 검출',()=>{
  const r=inspectSeoulApiResponse({status:200,code:'INFO-100'});
  assert.equal(r.state,'error');
});
test('기존 노선 정보 파싱 유지',()=>{
  assert.deepEqual(parseSeoulSubwayArrival({realtimeArrivalList:[]}),[]);
});

test('도착 메시지에 이미 분 단위가 있으면 같은 시간을 두 번 표시하지 않음',()=>{
  const item=parseSeoulSubwayArrival({realtimeArrivalList:[{subwayId:'1001',arvlMsg2:'3분 후',barvlDt:'180'}]})[0];
  assert.equal(item.message,'3분 후');
});
