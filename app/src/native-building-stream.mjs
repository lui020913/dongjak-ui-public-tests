import {createNativeTilePartitioner} from './native-building-partition.mjs';
const PREFIX='dj-building://';
export const NATIVE_BUILDING_SOURCE='dj-native-building-stream';
export const NATIVE_BUILDING_STAGE_MS=32;
export const NATIVE_BUILDING_STAGES=5;
// FIFO follows MapLibre's center-first tile demand. Canceled viewport work
// never occupies a slot. Only building tiles are throttled.
export function createBuildingTileQueue(load,{concurrency=1,gap=65,schedule=setTimeout}={}){
 let active=0;const pending=[];
 function drain(){
  while(active<concurrency&&pending.length){
   const job=pending.shift();job.detach();if(job.signal?.aborted){job.reject(new DOMException('Aborted','AbortError'));continue;}
   active++;
   Promise.resolve().then(()=>load(job.url,job.signal)).then(job.resolve,job.reject).finally(()=>schedule(()=>{active--;drain();},gap));
  }
 }
 return (url,signal)=>new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Aborted','AbortError'));return;}
  const abort=()=>{const i=pending.indexOf(job);if(i>=0){pending.splice(i,1);job.detach();reject(new DOMException('Aborted','AbortError'));}};
  const job={url,signal,resolve,reject,detach:()=>signal?.removeEventListener('abort',abort)};pending.push(job);
  signal?.addEventListener('abort',abort,{once:true});
  drain();
 });
}
export function buildingTileUrl(template,stage=0){
 const clean=template.replace(/[?&]dj-road-mode=[^&]*/g,'');
 return PREFIX+clean+(clean.includes('?')?'&':'?')+'dj-building-stage='+stage;
}
export function nativeBuildingLayer(layer){
 return layer?.source==='openmaptiles'&&layer['source-layer']==='building'&&['fill','line','fill-extrusion'].includes(layer.type);
}
export function registerNativeBuildingProtocol(maplibre,{fetcher=fetch,partition=createNativeTilePartitioner()}={}){
 const cache=new Map();
 const queue=createBuildingTileQueue(async(url,signal)=>{
  const full=url.slice(PREFIX.length),match=full.match(/[?&]dj-building-stage=(\d+)$/),stage=Number(match?.[1]||0),raw=match?full.slice(0,match.index):full;
  if(stage>=NATIVE_BUILDING_STAGES)throw Error('Invalid building stage');
  if(!/^https:\/\/tiles\.openfreemap\.org\/(?:planet|backup_planet)\/[A-Za-z0-9_-]+\/\d+\/\d+\/\d+\.pbf(?:\?.*)?$/.test(raw))throw Error('Invalid building tile');
  if(cache.has(raw)){const parts=cache.get(raw);cache.delete(raw);cache.set(raw,parts);return {data:parts[stage].slice(0)};}
  const response=await fetcher(raw,{signal,cache:'force-cache'});if(!response.ok)throw Error('Building tile HTTP '+response.status);
  let bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes[0]===31&&bytes[1]===139)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const parts=await partition(bytes,NATIVE_BUILDING_STAGES,signal);
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  cache.set(raw,parts);while(cache.size>32)cache.delete(cache.keys().next().value);
  return {data:parts[stage].slice(0)};
 },{concurrency:1,gap:NATIVE_BUILDING_STAGE_MS});
 maplibre.addProtocol('dj-building',(request,controller)=>queue(request.url,controller?.signal));
}
export function isolateNativeBuildingTiles(map){
 const style=map.getStyle?.(),source=map.getSource?.('openmaptiles');
 if(!style||!source||map.getSource?.(NATIVE_BUILDING_SOURCE))return false;
 const templates=source.tiles||style.sources?.openmaptiles?.tiles;
 if(!Array.isArray(templates)||!templates.length||!templates.every(t=>typeof t==='string'&&t.startsWith('https://tiles.openfreemap.org/')))return false;
 const original=style.layers.filter(nativeBuildingLayer);
 if(!original.length)return false;
 const ids=new Set(original.map(l=>l.id)),installed=[];
 try{
  const spec=style.sources?.openmaptiles||{};
  for(let stage=0;stage<NATIVE_BUILDING_STAGES;stage++)map.addSource(stage?NATIVE_BUILDING_SOURCE+'-'+stage:NATIVE_BUILDING_SOURCE,{type:'vector',tiles:templates.map(t=>buildingTileUrl(t,stage)),minzoom:source.minzoom??spec.minzoom??0,maxzoom:source.maxzoom??spec.maxzoom??14,...(spec.bounds?{bounds:spec.bounds}:{}),...(spec.attribution?{attribution:spec.attribution}:{})});
  // Keep original IDs, filters, layer ordering and all paint/layout properties.
  for(const layer of original){
   const i=style.layers.findIndex(l=>l.id===layer.id),before=style.layers.slice(i+1).find(l=>!ids.has(l.id)&&map.getLayer(l.id))?.id;
   map.removeLayer(layer.id);installed.push({layer,before});
   for(let stage=0;stage<NATIVE_BUILDING_STAGES;stage++)map.addLayer({...layer,id:stage?layer.id+'-building-stage-'+stage:layer.id,source:stage?NATIVE_BUILDING_SOURCE+'-'+stage:NATIVE_BUILDING_SOURCE},before);
  }
  return true;
 }catch(error){
  // If the source cannot be separated, restore the original native style.
  for(const {layer,before} of installed){try{for(let stage=0;stage<NATIVE_BUILDING_STAGES;stage++){const id=stage?layer.id+'-building-stage-'+stage:layer.id;if(map.getLayer(id))map.removeLayer(id);}map.addLayer(layer,before);}catch{}}
  for(let stage=0;stage<NATIVE_BUILDING_STAGES;stage++)try{const id=stage?NATIVE_BUILDING_SOURCE+'-'+stage:NATIVE_BUILDING_SOURCE;if(map.getSource(id))map.removeSource(id);}catch{}
  return false;
 }
}
