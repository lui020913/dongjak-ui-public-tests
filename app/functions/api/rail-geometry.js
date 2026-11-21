/** Read-only MOIS/KR_Sub_Line railway geometry via a bounded same-origin
 * Cloudflare Pages Function. No user-supplied URL, bbox, credentials or SQL.
 * Upstream: Korea Esri public MOIS subway layer (2026-04-30), excluding Sillim.
 */
const SOURCE='https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/2/query';
const BOUNDS='126.855,37.438,127.055,37.562';
const ALLOWED=new Set(['서울1호선','서울2호선','서울4호선','서울7호선','서울9호선']);
export function officialRailUpstreamUrl(){
 const url=new URL(SOURCE);
 for(const [key,value] of Object.entries({
  where:"sub_nm IN ('서울1호선','서울2호선','서울4호선','서울7호선','서울9호선')",
  geometry:BOUNDS,geometryType:'esriGeometryEnvelope',inSR:'4326',
  spatialRel:'esriSpatialRelIntersects',outFields:'sub_nm',outSR:'4326',
  returnGeometry:'true',resultRecordCount:'2000',f:'json'
 }))url.searchParams.set(key,value);
 return url.toString();
}
const json=(body,status)=>Response.json(body,{status,headers:{
 'Cache-Control':status===200?'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600':'no-store',
 'X-Content-Type-Options':'nosniff'
}});
function validFeature(item){
 if(!item||typeof item!=='object'||!ALLOWED.has(String(item.attributes?.sub_nm||'')))return false;
 return Array.isArray(item.geometry?.paths)||item.geometry?.type==='LineString'||item.geometry?.type==='MultiLineString';
}
export async function onRequestGet({request,context,fetchImpl=fetch}={}){
 if(!request||new URL(request.url).pathname!=='/api/rail-geometry')
  return json({error:{message:'Not found'}},404);
 const cache=typeof caches!=='undefined'&&caches.default?caches.default:null;
 const cacheKey=new Request(new URL('/api/rail-geometry?edition=mois-20260430-v1',request.url));
 try{
  const cached=await cache?.match(cacheKey);
  if(cached)return cached;
  const response=await fetchImpl(officialRailUpstreamUrl(),{
   method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw new Error('MOIS HTTP '+response.status);
  const len=Number(response.headers?.get?.('content-length')||0);
  if(len>6000000)throw new Error('MOIS response exceeds safety size limit');
  const body=await response.text();
  if(body.length>6000000)throw new Error('MOIS response exceeds safety size limit');
  const data=JSON.parse(body);
  if(data?.error||!Array.isArray(data?.features))throw new Error('MOIS invalid feature response');
  const features=data.features.filter(validFeature);
  if(!features.length)throw new Error('MOIS verified route geometry unavailable');
  const result=json({features,source:'MOIS_KR_Subway_2026',dataset_date:'2026-04-30'},200);
  if(cache){
   const write=cache.put(cacheKey,result.clone()).catch(()=>{});
   if(context?.waitUntil)context.waitUntil(write);else await write;
  }
  return result;
 }catch(error){
  console.warn('[MOIS rail proxy]',String(error?.message||error).slice(0,120));
  return json({error:{message:'공식 GIS 철도 선형을 현재 조회할 수 없습니다. 기존 안내 선형을 유지합니다.'}},502);
 }
}
