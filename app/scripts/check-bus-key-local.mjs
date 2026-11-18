/**
 * Compare the same public-service request from the developer's PC with the
 * Cloudflare Pages result. No keys are printed or transmitted to our service.
 * Reads SEOUL_BUS_SERVICE_KEY from environment or local .env (never commit).
 * Usage: node scripts/check-bus-key-local.mjs
 */
import {existsSync,readFileSync} from 'node:fs';
const name='SEOUL_BUS_SERVICE_KEY';
let raw=String(process.env[name]||'').trim();
if(!raw&&existsSync('.env')){
  const match=readFileSync('.env','utf8').match(/^\s*SEOUL_BUS_SERVICE_KEY\s*=\s*(.*?)\s*$/m);
  if(match)raw=match[1].replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/,'$1$2').trim();
}
if(!raw){
  console.log('버스키 미설정: 로컬 .env 파일에 SEOUL_BUS_SERVICE_KEY를 설정한 뒤 재실행해 주세요.');
  process.exitCode=2;
}else{
  let key=raw;
  if(/%(?:2B|2F|3D)/i.test(key))try{key=decodeURIComponent(key);}catch{}
  const url=new URL('http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos');
  for(const [k,v] of Object.entries({tmX:'126.954',tmY:'37.4955',radius:'180',resultType:'json'}))url.searchParams.set(k,v);
  url.searchParams.set('ServiceKey',key);
  console.log('[로컬 서울시 버스 인증 점검]');
  console.log('검사 대상: 정류소정보조회 getStationByPos / 요청 키는 출력되지 않습니다.');
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(9500),headers:{Accept:'application/json'}});
    console.log('상위 API HTTP 상태:',response.status);
    const body=await response.text();
    let data;try{data=JSON.parse(body);}catch{}
    if(data){
      console.log('메시지 코드:',String(data.msgHeader?.headerCd??data.RESULT?.CODE??'미제공'));
      console.log('반환 자료 수:',Array.isArray(data.msgBody?.itemList)?data.msgBody.itemList.length:'미확인');
    }else console.log('응답 형식: JSON 아님 (네트워크·서비스 단에서 오류 가능)');
    if(response.status===401||response.status===403){
      console.log('판정: 로컬에서도 접근 거부 → 서비스키·승인 범위·원 요청 방식을 점검하십시오.');process.exitCode=1;
    }else if(response.ok){
      console.log('판정: 로컬 응답 성공 → 배포 서버에서만 401이면 Cloudflare Secrets 값과 외부 접근 경로를 비교하십시오.');
    }else{
      console.log('판정: 외부 서비스 오류 → HTTP 상태와 서비스 공지를 확인하십시오.');process.exitCode=1;
    }
  }catch(error){
    console.log('로컬 접속 실패:',error?.name==='TimeoutError'?'9.5초 시간 초과':String(error?.cause?.code||error?.name||'네트워크 실패'));
    console.log('판정: 로컬 네트워크에서 서울시 API 접속을 완료하지 못했습니다.');process.exitCode=1;
  }
}
