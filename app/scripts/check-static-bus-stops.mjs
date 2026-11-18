import {readFile} from 'node:fs/promises';
import {officialStaticBusPlaces} from '../src/static-bus-stops.js';
const path='public/data/transport/seoul-bus-stops.json';
try{
  const data=JSON.parse(await readFile(path,'utf8'));
  const all=officialStaticBusPlaces(data,()=>true);
  // approximate bounding rectangle is only for an installation sanity check;
  // the actual map always filters to its existing polygon geometry.
  const approx=all.filter(x=>x.lng>=126.885&&x.lng<=127.025&&x.lat>=37.462&&x.lat<=37.525);
  if(all.length<1000)throw Error('서울 전체 정류소 수가 부족합니다. 원본 변환을 다시 확인하십시오.');
  console.log(`[정적 정류장 점검] ${data.sourceDate} / 서울 전체 ${all.length}곳 / 동작구 인근 사각범위 ${approx.length}곳`);
  console.log('ARS 5자리 검증 완료 · 실시간 도착정보와는 별개 · 동작구 안쪽은 앱의 행정경계로 필터');
}catch(error){
  console.error(`[정적 정류장 점검 실패] ${path}: ${error.message}`);
  console.error('서울시 공식 XLSX를 내려받아 scripts/import-official-bus-stops.py를 실행해야 합니다.');
  process.exitCode=1;
}
