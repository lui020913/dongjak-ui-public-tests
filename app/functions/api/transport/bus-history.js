import {fetchArrivalHistory,validDate,SOURCE} from '../../../server/bus-arrival-history.mjs';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200&&body.complete&&body.status==='ok'?'public, max-age=0, s-maxage=3600':'no-store','X-Content-Type-Options':'nosniff'}});
export async function onRequestGet({request,env}){
 const params=new URL(request.url).searchParams;
 const query=Object.fromEntries(['routeId','stationId','seq','date'].map(k=>[k,params.get(k)||'']));
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replace(/-/g,'');
 if(!/^\d{9,10}$/.test(query.routeId)||!/^\d{9,10}$/.test(query.stationId)||!/^[1-9]\d{0,3}$/.test(query.seq)||!validDate(query.date)||query.date>=today)return reply({status:'error',notice:'과거 날짜와 공식 노선·정류장 ID를 확인해 주세요.'},400);
 const key=String(env.SEOUL_TDATA_API_KEY||'').trim();
 if(!key)return reply({status:'unconfigured',source:SOURCE,notice:'버스 이력 API 인증 설정이 필요합니다.'},503);
 try{return reply(await fetchArrivalHistory(query,key));}
 catch(e){
  const code=['HISTORY_AUTH','HISTORY_QUOTA','HISTORY_FORMAT','HISTORY_REDIRECT','HISTORY_TIMEOUT','HISTORY_CONNECTION','HISTORY_ENDPOINT','HISTORY_REQUEST'].includes(e?.message)?e.message:'HISTORY_UPSTREAM';
  const notice={HISTORY_AUTH:'이력 API 이용 권한을 확인해 주세요.',HISTORY_QUOTA:'이력 API 조회 한도에 도달했습니다.',HISTORY_FORMAT:'공식 이력 응답 형식을 확인하지 못했습니다.',HISTORY_REDIRECT:'공식 이력 서버 주소가 변경되었거나 안전한 연결을 확인하지 못했습니다.',HISTORY_TIMEOUT:'공식 이력 서버 응답 시간이 초과되었습니다.',HISTORY_CONNECTION:'공식 이력 서버에 연결하지 못했습니다.',HISTORY_ENDPOINT:'공식 이력 API 주소를 확인해야 합니다.',HISTORY_REQUEST:'공식 이력 API가 조회 조건을 거부했습니다.',HISTORY_UPSTREAM:'공식 이력 서버 조회에 실패했습니다.'}[code];
  return reply({status:'error',source:SOURCE,code,notice},code==='HISTORY_QUOTA'?429:502);
 }
}
