// Per-feature fade: keep retained markers opaque, never fade a whole source.
export const STREAM_FADE_MS=200;
export const streamOpacity=['coalesce',['feature-state','streamAlpha'],['get','streamAlpha'],1];
export function markStreamArrivals(collection,previous=new Set()){
 const ids=new Set(),fresh=[];
 const features=collection.features.map(f=>{
  const id=String(f.properties.osmId);ids.add(id);
  const incoming=!previous.has(id);if(incoming)fresh.push(id);
  return {...f,id,properties:{...f.properties,streamAlpha:incoming?.15:1}};
 });
 return {collection:{...collection,features},ids,fresh};
}
export function createStreamArrivalFade(map,source){
 let ids=new Set(),pending=new Set(),timer=null,watchdog=null,serial=0;
 const supported=typeof map.setFeatureState==='function'&&typeof map.isSourceLoaded==='function';
 function set(id,alpha){try{map.setFeatureState({source,id},{streamAlpha:alpha});}catch{}}
 function finish(){serial++;if(timer!==null)clearTimeout(timer);if(watchdog!==null)clearTimeout(watchdog);timer=null;watchdog=null;for(const id of pending)set(id,1);pending.clear();}
 function ready(){
  if(!supported||!pending.size||timer!==null||!map.isSourceLoaded(source))return;
  const generation=serial,started=Date.now();
  const tick=()=>{if(generation!==serial)return;const t=Math.min(1,(Date.now()-started)/STREAM_FADE_MS);for(const id of pending)set(id,.15+.85*t);if(t<1)timer=setTimeout(tick,45);else{timer=null;pending.clear();}};
  timer=setTimeout(tick,20);
 }
 if(supported)map.on('sourcedata',e=>{if(e.sourceId===source&&e.isSourceLoaded)ready();});
 return {publish(collection){
  if(!supported){map.getSource(source)?.setData(collection);return;}
  finish();
  const next=markStreamArrivals(collection,ids);ids=next.ids;pending=new Set(next.fresh);
  map.getSource(source)?.setData(next.collection);
  for(const id of pending)set(id,.15);
  ready();
  if(pending.size)watchdog=setTimeout(finish,800);
 }};
}
