/** Verifies the offline, operator-grounded Line 1 timetable required by the planned countdown. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const file=path.join(root,'public','data','transport','korail-line1-stations.json');
console.log('[동작구 1호선 계획 도착시간 데이터 검사]');
if(!fs.existsSync(file)){
  console.log('상태: 미탑재');
  console.log('노량진·대방역 평일·휴일 공식 코레일 시간표를 변환한 JSON이 없어 계획 카운트다운을 표시할 수 없습니다.');
  console.log('확인: 한국철도공사 열차운임/시간표 → 2026-09-01 적용 1호선 평일·휴일 원본 XLSX');
  console.log('원본 게시판: https://www.korail.com/com/userBoard.do?mode=list&schBcid=ticketTable');
  process.exitCode=2;
}else{
  try {
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    const valid=data.schemaVersion===1 && data.provider==='KORAIL' &&
      String(data.sourceUrl||'').startsWith('https://www.korail.com/');
    console.log('출처·형식 검사: '+(valid?'정상':'실패'));
    let total=0;
    for(const name of ['노량진','대방']){
      for(const [day,label] of [['weekday','평일'],['holiday','휴일']]){
        const rows=data.stations?.[name]?.[day];
        const count=Array.isArray(rows)?rows.filter(r=>/^\d{1,2}:\d{2}$/.test(String(r.time||''))&&['1','2'].includes(String(r.directionCode))).length:0;
        total+=count;
        console.log(`${name} ${label}: 유효 시각 ${count}건`);
      }
    }
    console.log(`상태: ${valid&&total?'탑재 확인':'누락 또는 검증 실패'}`);
    if(!valid||!total)process.exitCode=2;
  }catch(e){console.error('데이터 파일 해석 실패: '+e.message);process.exitCode=2;}
}
