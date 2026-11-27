import {parseRoadTilePath,reduceExteriorRoadTile} from '../server/district-road-tile.mjs';
// Request a separate vector data product, not a style visibility filter.
const TILE=/^https:\/\/tiles\.openfreemap\.org\/(planet|backup_planet)\/[A-Za-z0-9_-]+\/\d+\/\d+\/\d+\.pbf$/;
export function exteriorTileRequest(url,type,active,apiBase=''){
 if(type!=='Tile')return {url};
 let parsed;try{parsed=new URL(url);}catch{return {url};}
 const mode=parsed.searchParams.get('dj-road-mode');
 if(mode)parsed.searchParams.delete('dj-road-mode');
 const raw=parsed.origin+parsed.pathname;
 if(!TILE.test(raw))return {url};
 if((mode?mode==='full':active))return {url:parsed.href};
 return {url:apiBase+'/api/basemap/tile'+parsed.pathname};
}
export function installExteriorRoadScope(map){
 let active=false,source=null,original=null;
 const apply=()=>{
  const next=map.getSource('openmaptiles');if(!next||typeof next.setTiles!=='function')return;
  if(next!==source){source=next;original=Array.isArray(next.tiles)?next.tiles.slice():null;}
  if(!original?.length&&Array.isArray(next.tiles))original=next.tiles.slice();
  if(!original?.length)return;
  const mode=active?'full':'reduced';
  const desired=original.map(url=>url+(url.includes('?')?'&':'?')+'dj-road-mode='+mode);
  if(JSON.stringify(next.tiles)!==JSON.stringify(desired))next.setTiles(desired);
 };
 map.on('style.load',()=>{source=null;original=null;apply();});
 // TileJSON may finish after style.load. Do not touch filters or paint.
 map.on('idle',()=>{if(!original?.length)apply();});
 return {update(geometry,next){if(!geometry)return;const changed=active!==Boolean(next);active=Boolean(next);if(changed||!original?.length)apply();}};
}

const PROTOCOL='dj-reduced';
export function reducedTileProtocolRequest(url,type,active,apiBase=''){
 const request=exteriorTileRequest(url,type,active,apiBase);
 if(type==='Tile'&&request.url!==url&&request.url.includes('/api/basemap/tile/')){
  return {...request,url:PROTOCOL+'://'+request.url};
 }
 return request;
}
async function tileBytes(response){
 if(!response.ok)throw Error('Map tile HTTP '+response.status);
 const mime=response.headers.get('content-type')||'';
 if(!/protobuf|vector-tile|octet-stream/i.test(mime))throw Error('Invalid map tile content type');
 let bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes[0]===31&&bytes[1]===139)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
 return bytes;
}
export async function loadReducedTile(url,signal,{fetcher=fetch}={}){
 const endpoint=url.slice((PROTOCOL+'://').length);
 const parsed=parseRoadTilePath(new URL(endpoint).pathname);
 if(!parsed)throw Error('Invalid reduced tile request');
 let firstError;
 try{
  const response=await fetcher(endpoint,{signal});
  const bytes=await tileBytes(response);
  // Require the reduction service response, not a generic Pages response.
  if(response.headers.get('X-Dongjak-Removed-Road-Features')===null)throw Error('Unverified reduction response');
  return {data:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),cacheControl:response.headers.get('cache-control')||undefined};
 }catch(e){firstError=e;if(signal?.aborted)throw e;}
 // Failover still removes exterior minor road features from vector bytes
 // before handing them to MapLibre. It never restores full road styling.
 try{
  const upstream=await fetcher(parsed.url,{signal});
  const bytes=await tileBytes(upstream);
  const reduced=reduceExteriorRoadTile(bytes,parsed.z,parsed.x,parsed.y).bytes;
  return {data:reduced.buffer.slice(reduced.byteOffset,reduced.byteOffset+reduced.byteLength),cacheControl:'max-age=300'};
 }catch(e){if(signal?.aborted)throw e;throw Error('Map tile HTTP recovery failed: '+(e.message||firstError?.message||'unknown'));}
}
export function registerReducedTileProtocol(maplibre){
 maplibre.addProtocol(PROTOCOL,(request,controller)=>loadReducedTile(request.url,controller.signal));
}
