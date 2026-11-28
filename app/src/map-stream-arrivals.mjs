// Opacity is transient feature state only. If state is lost, the default
// is fully opaque, never the initial alpha embedded in the GeoJSON.
export const STREAM_FADE_MS=200;
export const streamOpacity=['coalesce',['feature-state','streamAlpha'],1];
export function markStreamArrivals(collection,previous=new Set(),identify=id=>id){
 const ids=new Set(),fresh=[];
 const features=collection.features.map(f=>{
  const key=String(f.properties.osmId);ids.add(key);
  const id=identify(key);if(!previous.has(key))fresh.push(id);
  const {streamAlpha:unused,...properties}=f.properties;
  return {...f,id,properties};
 });
 return {collection:{...collection,features},ids,fresh};
}
export function streamFeatureDiff(previous,next){
 const old=new Map(previous.map(f=>[f.id,f])),current=new Map(next.map(f=>[f.id,f])),remove=[],add=[],update=[];
 for(const id of old.keys())if(!current.has(id))remove.push(id);
 for(const [id,f] of current){const before=old.get(id);if(!before){add.push(f);continue;}const delta={id};if(JSON.stringify(before.geometry)!==JSON.stringify(f.geometry))delta.newGeometry=f.geometry;if(JSON.stringify(before.properties)!==JSON.stringify(f.properties)){delta.removeAllProperties=true;delta.addOrUpdateProperties=Object.entries(f.properties).map(([key,value])=>({key,value}));}if(Object.keys(delta).length>1)update.push(delta);}
 return {remove,add,update};
}
export function createStreamArrivalFade(map,source,{now=Date.now,schedule=setTimeout,cancel=clearTimeout}={}){
 let ids=new Set(),pending=new Set(),timer=null,watchdog=null,serial=0,previous=[],lastSource=null,publication=0;
 const seen=new Set();
 const numericIds=new Map();let nextId=1;
 const identify=key=>{if(!numericIds.has(key))numericIds.set(key,nextId++);return numericIds.get(key);};
 const supported=typeof map.setFeatureState==='function'&&typeof map.isSourceLoaded==='function';
 function set(id,alpha){try{map.setFeatureState({source,id},{streamAlpha:alpha});}catch{}}
 function restore(id){
  try{map.removeFeatureState?.({source,id},'streamAlpha');}catch{}
  set(id,1);
 }
 function finish(){
  serial++;if(timer!==null)cancel(timer);if(watchdog!==null)cancel(watchdog);
  timer=null;watchdog=null;for(const id of pending)restore(id);pending.clear();
 }
 function ready(){
  if(!supported||!pending.size||timer!==null||!map.isSourceLoaded(source))return;
  const generation=serial,started=now();
  for(const id of pending)set(id,.15);
  const tick=()=>{if(generation!==serial)return;const t=Math.min(1,(now()-started)/STREAM_FADE_MS);if(t>=1){finish();return;}for(const id of pending)set(id,.15+.85*t);timer=schedule(tick,40);};
  timer=schedule(tick,20);
 }
 if(supported){map.on('sourcedata',e=>{if(e.sourceId===source&&e.isSourceLoaded)ready();});map.on('style.load',()=>{finish();previous=[];lastSource=null;publication++;});}
 return {publish(collection){
  const src=map.getSource(source);if(!src)return;
  const next=markStreamArrivals(collection,seen,identify);ids=next.ids;
  const sameSource=lastSource===src;
  const diff=streamFeatureDiff(sameSource?previous:[],next.collection.features);
  if(sameSource&&!diff.add.length&&!diff.remove.length&&!diff.update.length)return;
  finish();for(const id of ids)seen.add(id);
  pending=new Set(next.fresh);
  if(supported)for(const id of pending)set(id,.15);
  const generation=++publication;
  const fallback=()=>{if(generation===publication)src.setData(next.collection);};
  if(sameSource&&typeof src.updateData==='function'){try{const result=src.updateData(diff);if(result?.catch)result.catch(fallback);}catch{fallback();}}
  else src.setData(next.collection);
  previous=next.collection.features;lastSource=src;
  if(!supported){pending.clear();return;}
  if(pending.size)watchdog=schedule(finish,800);
  ready();
 }};
}
