/** Official Seoul bus route geometry: never substitute straight stop-to-stop lines. */
export function parseBusRoutePath(body,routeId){
  const box=body?.msgBody??body?.MsgBody??body?.response?.body??body?.body??body;
  const list=box?.itemList??box?.item??box?.PathList??box?.pathList??box?.items;
  const raw=list?.itemList??list?.item??list?.PathList??list?.pathList??list??[];
  const rows=Array.isArray(raw)?raw:[raw];
  if(rows.length<2)return [];
  const points=rows.map(row=>({id:String(row?.busRouteId??routeId),order:Number(row?.no),lng:Number(row?.gpsX),lat:Number(row?.gpsY)}));
  if(points.some(p=>p.id!==String(routeId)||!Number.isInteger(p.order)||p.order<0||!Number.isFinite(p.lng)||!Number.isFinite(p.lat)||p.lng<124||p.lng>132||p.lat<33||p.lat>39))return [];
  points.sort((a,b)=>a.order-b.order);
  if(points.some((p,i)=>i>0&&p.order!==points[i-1].order+1))return [];
  const coordinates=points.map(p=>[p.lng,p.lat]).filter((p,i,all)=>!i||p[0]!==all[i-1][0]||p[1]!==all[i-1][1]);
  return coordinates.length>=2?coordinates:[];
}
export function busRoutePathUrl(key,id){
  return 'http://ws.bus.go.kr/api/rest/busRouteInfo/getRoutePath?'+new URLSearchParams({ServiceKey:key,busRouteId:id,resultType:'json'});
}

function tagged(xml,name){return xml.match(new RegExp('<'+name+'\\b[^>]*>\\s*([^<]*)\\s*</'+name+'>','i'))?.[1]?.trim();}
function failure(code,message='',gateway=false){
  const n=String(code??'').trim();
  if(!n||['0','00','INFO-000'].includes(n))return null;
  if((gateway&&['20','21','30','31','32','33'].includes(n))||(!gateway&&['5','6','7'].includes(n))||/SERVICE_ACCESS_DENIED|SERVICE_KEY_IS_NOT_REGISTERED|등록되지 않은 서비스키|인증키|접근 권한/i.test(message))return 'ROUTE_PATH_AUTH';
  if((gateway&&n==='22')||(!gateway&&n==='8')||/LIMITED_NUMBER|요청 제한|호출 한도/i.test(message))return 'ROUTE_PATH_RATE_LIMIT';
  if((gateway&&n==='03')||/조회\s*결과가\s*없|결과가\s*없습니다|데이터가\s*없습니다/i.test(message))return 'ROUTE_PATH_UNAVAILABLE';
  return 'ROUTE_PATH_UPSTREAM';
}
export function decodeBusRouteResponse(raw,id){
  const text=String(raw??'').replace(/^\uFEFF/,'').trim();
  let data;
  if(text.startsWith('{')){
    try{data=JSON.parse(text);}catch{return {code:'ROUTE_PATH_FORMAT'};}
    const g=data?.OpenAPI_ServiceResponse?.cmmMsgHeader??data?.cmmMsgHeader??data?.response?.header,h=data?.msgHeader??data?.MsgHeader;
    const code=g?failure(g.returnReasonCode??g.returnCode??g.resultCode??g.errCode,g.returnAuthMsg??g.resultMsg??g.errMsg,true):failure(h?.headerCd,h?.headerMsg);
    if(code)return {code};
  }else if(text.startsWith('<')){
    const g=tagged(text,'returnReasonCode')??tagged(text,'returnCode')??tagged(text,'resultCode'),h=tagged(text,'headerCd');
    const code=g!=null?failure(g,tagged(text,'returnAuthMsg')??tagged(text,'errMsg')??tagged(text,'resultMsg'),true):failure(h,tagged(text,'headerMsg'));
    if(code)return {code};
    let blocks=[...text.matchAll(/<itemList\b[^>]*>([\s\S]*?)<\/itemList>/gi)];
    if(!blocks.length)blocks=[...text.matchAll(/<PathList\b[^>]*>([\s\S]*?)<\/PathList>/gi)];
    data={msgBody:{itemList:blocks.map(m=>({no:tagged(m[1],'no'),gpsX:tagged(m[1],'gpsX'),gpsY:tagged(m[1],'gpsY'),busRouteId:tagged(m[1],'busRouteId')??id}))}};
    if(h==null&&!blocks.length)return {code:'ROUTE_PATH_FORMAT'};
  }else return {code:'ROUTE_PATH_FORMAT'};
  const coordinates=parseBusRoutePath(data,id);
  return coordinates.length?{coordinates}:{code:'ROUTE_PATH_UNAVAILABLE'};
}
export function routePathFailure(code){
  const errors={ROUTE_PATH_AUTH:[503,'서울시 노선정보조회 API 활용신청 또는 인증 권한을 확인해 주세요.'],ROUTE_PATH_RATE_LIMIT:[429,'서울시 노선 API 호출 한도에 도달했습니다.'],ROUTE_PATH_UNAVAILABLE:[404,'공식 노선 경로 데이터가 없습니다.'],ROUTE_PATH_FORMAT:[502,'공식 좌표 응답 형식 오류'],ROUTE_PATH_UPSTREAM:[502,'서울시 노선 서버에 연결하지 못했습니다.']};
  const [status,error]=errors[code]??errors.ROUTE_PATH_UPSTREAM;return {status,error,code:errors[code]?code:'ROUTE_PATH_UPSTREAM'};
}
export async function fetchBusRouteGeometry(key,id,{fetcher=globalThis.fetch}={}){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  try{
    const res=await fetcher(busRoutePathUrl(key,id),{signal:ctrl.signal,headers:{Accept:'application/json, application/xml, text/xml'}});
    const raw=await res.text();
    if([401,403].includes(res.status))return {code:'ROUTE_PATH_AUTH'};
    if(res.status===429)return {code:'ROUTE_PATH_RATE_LIMIT'};
    if(raw.length>3000000)return {code:'ROUTE_PATH_FORMAT'};
    const decoded=decodeBusRouteResponse(raw,id);
    return res.ok||['ROUTE_PATH_AUTH','ROUTE_PATH_RATE_LIMIT'].includes(decoded.code)?decoded:{code:'ROUTE_PATH_UPSTREAM'};
  }catch{return {code:'ROUTE_PATH_UPSTREAM'};}finally{clearTimeout(timer);}
}
