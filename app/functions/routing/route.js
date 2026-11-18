/** Cloudflare Pages function for the pilot walking route.
 * Accepts a restricted pedestrian Valhalla request; never accepts arbitrary URLs.
 * Public demo is limited and must be replaced with provisioned routing infrastructure
 * before the app is promoted to a public production navigation service.
 */
const RESP_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff'
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:RESP_HEADERS});
const buckets=new Map();
function withinPilotQuota(request){
  const ip=request.headers.get('cf-connecting-ip');
  if(!ip)return true; // no Cloudflare IP in local tests
  const now=Date.now();const span=60000;
  if(buckets.size>3000)for(const [k,v] of buckets)if(now-v.start>span)buckets.delete(k);
  const row=buckets.get(ip);
  if(!row||now-row.start>span){buckets.set(ip,{start:now,count:1});return true;}
  row.count++;
  return row.count<=10; // per-isolate soft limit, not a globally shared quota
}
export function validateWalkingRouteRequest(input){
  if(!input||input.costing!=='pedestrian'||!Array.isArray(input.locations)||input.locations.length!==2)
    return null;
  const points=input.locations.map(p=>({lat:Number(p?.lat),lon:Number(p?.lon)}));
  if(points.some(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||
    p.lat<36.5||p.lat>38.5||p.lon<125.8||p.lon>129.0))return null;
  if(Math.hypot((points[0].lat-points[1].lat)*111000,(points[0].lon-points[1].lon)*87000)>45000)
    return null;
  const hills=Number(input.costing_options?.pedestrian?.use_hills);
  return {locations:points,costing:'pedestrian',costing_options:{pedestrian:{use_hills:hills===0?0:0.5}},
    units:'kilometers',language:'en-US'};
}
export async function onRequestPost({request}){
  if(String(request.headers.get('content-type')||'').split(';')[0].trim()!=='application/json')
    return json({message:'JSON으로만 요청할 수 있습니다.'},415);
  if(!withinPilotQuota(request))return json({message:'경로 요청이 많습니다. 잠시 후 다시 시도해 주세요.'},429);
  const length=Number(request.headers.get('content-length')||0);
  if(length>3000)return json({message:'요청 크기를 초과했습니다.'},413);
  let raw;
  try{raw=await request.text();}catch{return json({message:'요청을 읽지 못했습니다.'},400);}
  if(raw.length>3000)return json({message:'요청 크기를 초과했습니다.'},413);
  let payload;
  try{payload=validateWalkingRouteRequest(JSON.parse(raw));}catch{}
  if(!payload)return json({message:'보행 경로 좌표가 올바르지 않습니다.'},400);
  const timeout=new AbortController();
  const timer=setTimeout(()=>timeout.abort(),19000);
  try {
    const upstream=await fetch('https://valhalla1.openstreetmap.de/route',{
      method:'POST',headers:{'content-type':'application/json','X-Client-Id':'dongjak-walk-safety-prototype'},
      body:JSON.stringify(payload),signal:timeout.signal
    });
    if(!upstream.ok)return json({message:upstream.status===429?'경로 서버 이용량 제한에 걸렸습니다.':
      `경로 서버가 응답하지 않습니다 (HTTP ${upstream.status}).`},503);
    const data=await upstream.json();
    if(!data?.trip?.summary||!Array.isArray(data?.trip?.legs))return json({message:'경로 데이터가 올바르지 않습니다.'},502);
    return json(data);
  }catch{return json({message:'경로 서버 연결이 지연되거나 실패했습니다.'},503);}
  finally{clearTimeout(timer);}
}
