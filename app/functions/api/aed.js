import {DEFAULT_AED_ENDPOINT,parseAedXml,aedRowsToGeoJSON} from '../../server/aed-openapi.mjs';
const PAGE_SIZE=400,MAX_PAGES=12;
const responseJson=(body,status=200)=>Response.json(body,{status,headers:{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200?'public, max-age=900, stale-while-revalidate=600':'no-store',
  'X-Content-Type-Options':'nosniff'}});
function getEndpoint(env){
  const given=String(env?.AED_API_ENDPOINT||'').trim();
  if(!given)return DEFAULT_AED_ENDPOINT;
  const url=new URL(given);
  if(url.protocol!=='https:'||url.hostname!=='apis.data.go.kr'||!url.pathname.startsWith('/B552657/AEDInfoInqireService/'))
    throw new Error('AED_API_ENDPOINT는 국립중앙의료원 공식 HTTPS API 주소만 허용됩니다.');
  return url.origin+url.pathname;
}
export async function onRequestGet({request,env}){
  if(new URL(request.url).pathname!=='/api/aed')return new Response('Not found',{status:404});
  const key=String(env?.AED_API_KEY||'').trim();
  if(!key)return responseJson({status:'not_configured',message:'AED_API_KEY 서버 Secret 등록이 필요합니다. 데이터가 없는 상태는 아닙니다.'},503);
  const cache=typeof caches!=='undefined'&&caches.default?caches.default:null;
  const cacheKey=new Request(new URL('/api/aed?cache=medical-center-v1',request.url));
  try{
    const cached=await cache?.match(cacheKey);if(cached)return cached;
    const endpoint=getEndpoint(env);
    const rows=[];let total=0,complete=true;
    // The public API returns XML; pages are processed sequentially to respect request quotas.
    for(let page=1;page<=MAX_PAGES;page++){
      const url=new URL(endpoint);
      const credential=/%[0-9a-f]{2}/i.test(key)?decodeURIComponent(key):key;
      url.searchParams.set('serviceKey',credential);
      url.searchParams.set('Q0','서울특별시');url.searchParams.set('Q1','동작구');
      url.searchParams.set('pageNo',String(page));url.searchParams.set('numOfRows',String(PAGE_SIZE));
      const res=await fetch(url.toString(),{signal:AbortSignal.timeout(11000),headers:{Accept:'application/xml, text/xml'}});
      if(!res.ok)throw new Error(`AED 원본 API HTTP ${res.status}`);
      const xml=await res.text();if(xml.length>4_000_000)throw new Error('AED XML 응답 크기 제한 초과');
      const parsed=parseAedXml(xml);if(page===1)total=parsed.total;
      rows.push(...parsed.rows);
      // Providers may cap numOfRows below the requested PAGE_SIZE. Continue until
      // totalCount is reached; a short page alone must not truncate results.
      if(!parsed.rows.length||rows.length>=total)break;
      if(page===MAX_PAGES)complete=false;
    }
    const output=aedRowsToGeoJSON(rows,{retrievedAt:new Date().toISOString(),sourceTotal:total,complete});
    const response=responseJson(output);
    if(cache)await cache.put(cacheKey,response.clone());
    return response;
  }catch(error){
    console.warn('[국립중앙의료원 AED]',String(error?.message||error).replace(/serviceKey=[^&\s]*/gi,'serviceKey=[redacted]'));
    return responseJson({status:'unavailable',message:'AED 위치정보 조회에 실패했습니다. 인증키·API 승인 및 배포 설정을 확인해 주세요. 현재 지도에 임의 위치를 표시하지 않습니다.'},502);
  }
}
