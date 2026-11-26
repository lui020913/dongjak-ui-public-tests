/** Display-only reviewed road assets. Never use for routing, spatial matching or PRI scoring.
 * The manifest is absent in ordinary builds until protected integration is approved.
 * Every request fails open to original source geometry.
 */
const ROOT='/data/road-display-review/';
const PATHS=new Set(['/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson','/data/sangdo1-analysis-view/bocha-mixed-roads.geojson','/data/road-speed/sangdo1_speed_links.geojson','/data/sangdo1-analysis-view/slope.geojson','/data/safety/slope/dongjak_walk_links_slope_visual.geojson','/data/safety/walk/dongjak_walk_links.geojson']);
const GRAPH='3f80b417f5b6fe27b0fb7f31c107c0b19f967daf86836cd024d68ea38787607a';
const hex=async bytes=>Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
const parse=bytes=>JSON.parse(new TextDecoder().decode(bytes));
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const file=v=>typeof v==='string'&&/^[a-zA-Z0-9_.-]+\.(json|geojson)$/.test(v);
const line=g=>{const l=c=>Array.isArray(c)&&c.length>=2&&c.every(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite));return g?.type==='LineString'?l(g.coordinates):g?.type==='MultiLineString'&&Array.isArray(g.coordinates)&&g.coordinates.length>0&&g.coordinates.every(l)};
export function applyReviewedGeometry(original,patch){
 if(original?.type!=='FeatureCollection'||!Array.isArray(original.features)||patch?.original_count!==original.features.length||!Array.isArray(patch.changes))throw Error('source count mismatch');
 const changes=new Map();
 for(const c of patch.changes){
   if(!Number.isInteger(c.row)||c.row<0||c.row>=original.features.length||changes.has(c.row)||!line(c.geometry)||!line(original.features[c.row]?.geometry))throw Error('invalid geometry patch');
   changes.set(c.row,c.geometry);
 }
 return {...original,features:original.features.map((f,i)=>changes.has(i)?{...f,geometry:changes.get(i)}:f)};
}
export function createRoadDisplayAssets({fetcher=globalThis.fetch,enabled=false}={}){
 let manifestPromise;
 async function manifest(){
   if(!enabled||!globalThis.crypto?.subtle)return null;
   if(!manifestPromise)manifestPromise=(async()=>{
      const r=await fetcher(ROOT+'manifest.json',{cache:'no-cache'});if(!r.ok)return null;
      const m=await r.json();if(m.schema!==1||m.graph_sha256!==GRAPH||m.operational_enabled!==false||!Array.isArray(m.overlays)||!Array.isArray(m.tiles))throw Error('review manifest mismatch');
      return m;
   })().catch(()=>null);
   return manifestPromise;
 }
 async function checked(meta,limit=8*1024*1024){
   if(!file(meta?.file)||!sha(meta?.sha256)||!Number.isInteger(meta.bytes)||meta.bytes<1||meta.bytes>limit)throw Error('invalid asset metadata');
   const r=await fetcher(ROOT+meta.file,{cache:'force-cache'});if(!r.ok)throw Error('review asset HTTP '+r.status);
   const bytes=await r.arrayBuffer();if(bytes.byteLength!==meta.bytes||await hex(bytes)!==meta.sha256)throw Error('asset integrity mismatch');
   return parse(bytes);
 }
 async function displayResponse(path,response){
   if(!enabled||!PATHS.has(path)||!globalThis.crypto?.subtle)return response.json();
   // Clone before consuming the body so ordinary source data survives any error.
   const bytes=await response.arrayBuffer(),original=parse(bytes);
   try{
     const m=await manifest();const meta=m?.overlays.find(o=>o.original_path===path);
     if(!meta)return original;
     const patch=await checked(meta);
     if(!sha(patch.original_sha256)||await hex(bytes)!==patch.original_sha256||meta.original_count!==patch.original_count||meta.changed_count!==patch.changes?.length)return original;
     return applyReviewedGeometry(original,patch);
   }catch(e){console.warn('[road display] original geometry retained',path,e.message);return original}
 }
 return {manifest,checked,displayResponse};
}
// Opt-in isolated app QA only. No hidden route geometry changes in Production.
const previewEnabled=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('roadReview')==='1';
export const reviewedRoadAssets=createRoadDisplayAssets({enabled:previewEnabled});
export const readDisplayRoadResponse=(path,response)=>reviewedRoadAssets.displayResponse(path,response);
