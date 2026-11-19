import {fetchSeoulXmlOverTcp} from '../../server/topis-xml-tcp.mjs';
import {parseAccInfoXml,incidentsToGeoJSON} from '../../server/topis-road-incidents.mjs';

/** TOPIS public road incidents, filtered to Dongjak with a buffer. Never exposes SEOUL_OPEN_API_KEY. */
export async function onRequestGet({request,env}) {
  const key=String(env?.SEOUL_OPEN_API_KEY||'').trim();
  if(!key)return Response.json({status:'not_configured',message:'서울 열린데이터광장 인증키가 필요합니다. (SEOUL_OPEN_API_KEY)'},{status:503,headers:{'Cache-Control':'no-store'}});
  const url=new URL(request.url);
  if(url.pathname!=='/api/road-incidents')return new Response('Not found',{status:404});
  try{
    let page=await fetchSeoulXmlOverTcp({key,start:1,end:1000});
    let data=parseAccInfoXml(page),all=[...data.rows];
    const target=Math.min(data.total,3000);
    for(let start=1001;start<=target;start+=1000){
      page=await fetchSeoulXmlOverTcp({key,start,end:Math.min(target,start+999)});
      data=parseAccInfoXml(page);all.push(...data.rows);
    }
    const result=incidentsToGeoJSON(all,new Date().toISOString());
    result.meta.total_source_records=data.total||all.length;
    result.meta.result_limited=target<data.total;
    result.meta.feed_note='도로 교통 돌발정보입니다. 실제 보도 통제 여부는 확인되지 않았습니다.';
    return Response.json(result,{headers:{'Cache-Control':'public, max-age=60, stale-while-revalidate=60','X-Content-Type-Options':'nosniff'}});
  }catch(error){
    console.warn('[TOPIS road incidents]',String(error?.message||error));
    return Response.json({status:'unavailable',message:'서울시 도로 돌발정보를 현재 가져올 수 없습니다.',detail:String(error?.message||'')
      .replace(/[^A-Za-z0-9_\-]/g,'').slice(0,70)},
      {status:502,headers:{'Cache-Control':'no-store'}});
  }
}
