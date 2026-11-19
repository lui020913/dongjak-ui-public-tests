import {fetchSdotPageOverTcp} from '../../server/sdot-openapi-tcp.mjs';
import {parseSdotResponse,summarizeDongjakSdot} from '../../server/sdot-environment.mjs';
const PAGE_SIZE=1000,MAX_PAGES=40;
const empty={observations:[],summary:{sensor_count:0,recent_sensor_count:0,stale:true,source_complete:true},source:'서울특별시 S-DoT sDoTEnv'};
const seoulDate=date=>new Date(+date+9*3600000).toISOString().slice(0,10);
function responseJson(body,status=200){return Response.json(body,{status,headers:{
  'Cache-Control':status===200?'public, max-age=900, stale-while-revalidate=300':'no-store',
  'X-Content-Type-Options':'nosniff'}});}
async function fetchDay({key,date,fetchPage}){
  const first=parseSdotResponse(await fetchPage({key,start:1,end:PAGE_SIZE,date}));
  if(first.total===0)return {rows:[],total:0,complete:true};
  const required=Math.ceil(first.total/PAGE_SIZE);
  const count=Math.min(required,MAX_PAGES);
  const rows=[...first.rows];
  for(let i=1;i<count;i+=3){
    const pages=await Promise.all(Array.from({length:Math.min(3,count-i)},(_,j)=>{
      const start=(i+j)*PAGE_SIZE+1;
      return fetchPage({key,start,end:Math.min(first.total,start+PAGE_SIZE-1),date}).then(parseSdotResponse);
    }));
    for(const page of pages)rows.push(...page.rows);
  }
  return {rows,total:first.total,complete:required<=MAX_PAGES};
}
export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  if(url.pathname!=='/api/sdot-environment')return new Response('Not found',{status:404});
  const key=String(env?.SEOUL_OPEN_API_KEY||'').trim();
  if(!key)return responseJson({status:'not_configured',message:'서울시 Open API 키가 설정되지 않았습니다. (SEOUL_OPEN_API_KEY)'},503);
  // Edge cache: avoids repeating ~30 API calls for every user request. 20 min TTL.
  const cache=typeof caches!=='undefined'&&caches.default?caches.default:null;
  const cacheKey=new Request(`${url.origin}/api/sdot-environment?cache=sdot-hourly-v1`);
  try{
    const found=await cache?.match(cacheKey);if(found)return found;
    const now=new Date(),today=seoulDate(now);
    let result=await fetchDay({key,date:today,fetchPage:fetchSdotPageOverTcp});
    if(result.total===0){const previous=seoulDate(new Date(+now-86400_000));
      result=await fetchDay({key,date:previous,fetchPage:fetchSdotPageOverTcp});}
    const data=summarizeDongjakSdot(result.rows,{now,sourceComplete:result.complete});
    data.meta={source_rows:result.total,source_complete:result.complete,retrieved_at:now.toISOString(),
      time_coverage:'서울시 S-DoT 일자별 데이터',geo_status:'좌표는 별도 공식 설치 위치정보 XLSX를 등록해야 지도 표시 가능'};
    const response=responseJson(data);
    // cache.put cannot be awaited in a detached task; write-through where possible.
    if(cache)await cache.put(cacheKey,response.clone());
    return response;
  }catch(error){console.warn('[S-DoT]',String(error?.message||error));
    return responseJson({status:'unavailable',message:'S-DoT 관측정보를 현재 가져올 수 없습니다.',
      ...empty,summary:{...empty.summary,source_complete:false}},502);}
}
