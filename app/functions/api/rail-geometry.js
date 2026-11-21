/**
 * Read-only fixed-bounds rail geometry endpoint. Prefer MOIS 2026.04 official
 * rail shapes. If the upstream is unavailable, retrieve OSM-derived rail ways
 * (ODbL) from a static public mirror. Never mislabel OSM as official MOIS.
 *
 * The dataset mirror is intentionally fixed: clients cannot select arbitrary
 * URLs, paths, raw SQL, coordinates or features. Preserve schematic fallback
 * in the client if BOTH providers fail or a line is absent.
 */
const SOURCE='https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/2/query';
const OSM_MIRROR='https://raw.githubusercontent.com/jebowe3/seoul_transportation/main/';
const OSM_LICENSE='https://www.openstreetmap.org/copyright';
const BOUNDS='126.855,37.438,127.055,37.562';
const REGION=[126.842,37.425,127.068,37.575];
const ALLOWED=new Set(['서울1호선','서울2호선','서울4호선','서울7호선','서울9호선','서울신림선']);
const OSM_FILES=Object.freeze([
  ['서울1호선','line_1.geojson'],
  ['서울2호선','line_2.geojson'],
  ['서울4호선','line_4.geojson'],
  ['서울7호선','line_7.geojson'],
  ['서울9호선','line_9.geojson'],
  ['서울신림선','sillim_line.geojson']
]);
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
export function osmMirrorUrls(){
 return OSM_FILES.map(([name,file])=>({name,url:OSM_MIRROR+file}));
}
const json=(body,status)=>Response.json(body,{status,headers:{
 'Cache-Control':status===200?'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600':'no-store',
 'X-Content-Type-Options':'nosniff'
}});
function validFeature(item){
 if(!item||typeof item!=='object'||!ALLOWED.has(String(item.attributes?.sub_nm||'')))return false;
 return Array.isArray(item.geometry?.paths)||item.geometry?.type==='LineString'||item.geometry?.type==='MultiLineString';
}
async function checkedJson(fetchImpl,url,timeoutMs=6500,maxSize=6000000){
 const response=await fetchImpl(url,{
  method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(timeoutMs)
 });
 if(!response.ok)throw new Error('Rail HTTP '+response.status);
 const size=Number(response.headers?.get?.('content-length')||0);
 if(size>maxSize)throw new Error('Rail response over size bound');
 const text=await response.text();
 if(text.length>maxSize)throw new Error('Rail response over size bound');
 return JSON.parse(text);
}
function point(p){
 const lon=Number(p?.[0]),lat=Number(p?.[1]);
 return Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=125&&lon<=129&&lat>=35&&lat<=39?[lon,lat]:null;
}
function inRegion(p){
 return p[0]>=REGION[0]&&p[0]<=REGION[2]&&p[1]>=REGION[1]&&p[1]<=REGION[3];
}
/** Preserve original OSM track vertices; clip by actual segment endpoints.
 * Invalid or disjoint parts are not connected by synthetic station chords. */
export function osmRailFeatures(collection,name){
 if(!ALLOWED.has(name)||collection?.type!=='FeatureCollection'||!Array.isArray(collection.features))
   return [];
 const output=[];
 for(const feature of collection.features.slice(0,300)){
  const geom=feature?.geometry;
  const ways=geom?.type==='MultiLineString'?geom.coordinates:geom?.type==='LineString'?[geom.coordinates]:[];
  if(!Array.isArray(ways))continue;
  const paths=[];
  for(const way of ways.slice(0,180)){
   if(!Array.isArray(way))continue;
   let run=[];
   const flush=()=>{if(run.length>=2)paths.push(run);run=[];};
   for(let i=1;i<way.length&&i<16000;i++){
    const a=point(way[i-1]),b=point(way[i]);
    if(!a||!b||!(inRegion(a)||inRegion(b))){flush();continue;}
    if(!run.length)run.push(a);
    run.push(b);
   }
   flush();
  }
  if(paths.length)output.push({
   attributes:{sub_nm:name,data_origin:'OpenStreetMap_ODbL'},
   geometry:{paths}
  });
 }
 return output;
}
async function readOfficial(fetchImpl){
 const data=await checkedJson(fetchImpl,officialRailUpstreamUrl(),4500,6000000);
 if(data?.error||!Array.isArray(data?.features))throw new Error('MOIS invalid feature response');
 const features=data.features.filter(validFeature);
 if(!features.length)throw new Error('MOIS verified route geometry unavailable');
 return {features,source:'MOIS_KR_Subway_2026',dataset_date:'2026-04-30'};
}
async function readOsmMirror(fetchImpl){
 const checks=await Promise.allSettled(osmMirrorUrls().map(async({name,url})=>{
  const geojson=await checkedJson(fetchImpl,url,6500,450000);
  return {name,features:osmRailFeatures(geojson,name)};
 }));
 const features=[],available_lines=[];
 checks.forEach((item,index)=>{
  if(item.status!=='fulfilled')return;
  if(!item.value.features.length)return;
  available_lines.push(OSM_FILES[index][0]);
  features.push(...item.value.features);
 });
 if(!features.length)throw new Error('OpenStreetMap rail mirror unavailable');
 return {
  features,available_lines,
  missing_lines:OSM_FILES.map(([name])=>name).filter(name=>!available_lines.includes(name)),
  source:'OpenStreetMap_ODbL',
  attribution:'© OpenStreetMap contributors',
  license:OSM_LICENSE,
  mirror:'https://github.com/jebowe3/seoul_transportation'
 };
}
export async function onRequestGet({request,context,fetchImpl=fetch}={}){
 if(!request||new URL(request.url).pathname!=='/api/rail-geometry')
  return json({error:{message:'Not found'}},404);
 const cache=typeof caches!=='undefined'&&caches.default?caches.default:null;
 const cacheKey=new Request(new URL('/api/rail-geometry?edition=mois202604-osm-v2',request.url));
 try{
  const cached=await cache?.match(cacheKey);
  if(cached)return cached;
  let data;
  try{data=await readOfficial(fetchImpl);}
  catch(error){
   console.warn('[rail geometry] MOIS currently unavailable:',String(error?.message||error).slice(0,110));
   data=await readOsmMirror(fetchImpl);
  }
  const result=json(data,200);
  if(cache){
   const write=cache.put(cacheKey,result.clone()).catch(()=>{});
   if(context?.waitUntil)context.waitUntil(write);else await write;
  }
  return result;
 }catch(error){
  console.warn('[rail geometry] all verified providers unavailable:',String(error?.message||error).slice(0,110));
  return json({error:{message:'철도 선형 원자료에 접근할 수 없어 기존 안내 선형을 유지합니다.'}},502);
 }
}
