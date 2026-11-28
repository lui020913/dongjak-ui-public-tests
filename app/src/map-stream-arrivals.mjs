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
export function createStreamArrivalFade(map,source,{now=Date.now,schedule=setTimeout,cancel=clearTimeout}={}){
 let ids=new Set(),pending=new Set(),timer=null,watchdog=null,serial=0;
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
 if(supported){map.on('sourcedata',e=>{if(e.sourceId===source&&e.isSourceLoaded)ready();});map.on('style.load',finish);}
 return {publish(collection){
  finish();
  const next=markStreamArrivals(collection,ids,identify);ids=next.ids;
  const src=map.getSource(source);if(!src)return;
  if(!supported){src.setData(next.collection);return;}
  // Stable integer feature IDs work across GeoJSON tile regeneration.
  pending=new Set(next.fresh);
  for(const id of pending)set(id,.15);
  src.setData(next.collection);
  if(pending.size)watchdog=schedule(finish,800);
  ready();
 }};
}
