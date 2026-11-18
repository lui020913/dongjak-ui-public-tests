#!/usr/bin/env node
/** Remote smoke-check of OFFLINE stop locations, independent from live bus ETA authentication. */
const site=String(process.argv[2]||'https://dongjak-walk-safety-preview.pages.dev').replace(/\/+$/,'');
if(!/^https:\/\//.test(site)){
  console.error('HTTPS 배포 사이트 주소를 입력해 주세요.');process.exit(2);
}
async function getJson(path){
  const ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(),12000);
  try{
    const response=await fetch(site+path,{cache:'no-store',signal:ctrl.signal});
    const text=await response.text();
    let data=null;
    try{data=JSON.parse(text);}catch{}
    return {status:response.status,data};
  }finally{clearTimeout(timer);}
}
console.log(`[동작구 공식 버스정류장 정적데이터 진단] ${site}`);
let missing=false;
try{
  const {status,data}=await getJson('/data/transport/seoul-bus-stops.json');
  const count=Array.isArray(data?.stops)?data.stops.length:0;
  console.log(`정적 JSON: HTTP ${status} / ${count}곳 / 자료 기준 ${data?.sourceDate||'미확인'}`);
  if(status!==200||data?.source!=='서울시 버스정류소 위치정보'||count!==11236){
    missing=true;
    console.log('문제: 정적 파일이 배포되지 않았거나 2026-09-02 업로드 데이터와 다릅니다.');
  }else{
    const sample=data.stops.find(x=>x.arsId==='20160');
    console.log(`상도역 샘플: ${sample?.name||'없음'} / ARS ${sample?.arsId||'없음'}`);
  }
}catch(error){missing=true;console.log('정적 JSON 다운로드 오류:',error.message);}
try{
  const {status,data}=await getJson('/api/transport/bus/stops-nearby?lat=37.5016271&lng=126.9486225&radius=180');
  const items=Array.isArray(data?.items)?data.items:[];
  console.log(`정류장 API 대체 경로: HTTP ${status} / ${items.length}곳 / 출처 ${data?.source||'미확인'}`);
  if(status!==200||!items.some(s=>s.arsId==='20160')){
    missing=true;
    console.log(`문제: Cloudflare 정적 대체 경로 확인 필요 (${data?.code||'상태코드'}).`);
  }else{
    console.log(`상도역 정류장 확인됨 / 실시간 도착정보 ${data?.realtimeAvailable===false?'미제공(정적)': '별도 확인 필요'}`);
  }
}catch(error){missing=true;console.log('정류장 API 검사 오류:',error.message);}
if(missing)process.exitCode=1;
else console.log('확인 완료: 정류장 위치·이름은 배포 서버에서 정적으로 제공됩니다. 실시간 버스 도착 API 정상화는 별개입니다.');
