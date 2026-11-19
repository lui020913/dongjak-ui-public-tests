/** Read-only deployment diagnostics; no service keys are accessed or logged. */
const target=process.argv[2]||'https://dongjak-walk-safety-preview.pages.dev';
const base=new URL(target).origin;
for(const [name,path] of [['서울 교통정보','/api/transport/status'],['장소 AI 설명','/api/place-insight']]){
  try{
    const response=await fetch(base+path,{signal:AbortSignal.timeout(9500)});
    const json=await response.json();
    console.log(`${name}: HTTP ${response.status}`,JSON.stringify(json));
  }catch(error){console.log(`${name}: 응답 확인 실패 (${String(error.message).slice(0,110)})`);}
}
console.log('참고: status에서 bus=true여도 인증키 유효성과 실제 데이터 응답까지 보장하지 않습니다.');
