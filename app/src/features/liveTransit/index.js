/** MapLibre real-time vehicle overlay. Isolated GeoJSON sources and layers; no GPS permission. */
import {payloadToCollection} from './normalize.js';
import {haversineMeters} from './geometry.js';
export const LIVE_SOURCE='dongjak-live-vehicles-v827';
export const LIVE_METRO_LAYER='dongjak-live-metro-v827';
export const LIVE_BUS_LAYER='dongjak-live-bus-v827';
const empty=()=>({type:'FeatureCollection',features:[]});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
/** A repeated provider update of the SAME event must not reset simulated motion. */
export function preserveMetroEvents(newItems,oldItems=[]){
  const previous=new Map(oldItems.map(x=>[`${x.id}/${x.station}/${x.status}/${x.direction}`,x]));
  return newItems.map(x=>{
    const key=`${x.id}/${x.station}/${x.status}/${x.direction}`;
    const same=previous.get(key);
    return {...x,eventAt:same?.eventAt || x.observedAt};
  });
}
export function attachLiveTransitOverlay(map,opts={}){
  if(!map||typeof map.addSource!=='function'||typeof map.getSource!=='function')throw new TypeError('MapLibre instance needed');
  let payload=null,display=empty(),previous=new Map(),lastUpdate=0,lastRendered=0;
  let rendering=0,poll=0,started=false,destroyed=false,loading=false;
  let visible={metro:true,bus:true};
  const minimumZoom=Number(opts.minZoom??13.2);
  const pollMs=clamp(Number(opts.intervalMs??25000),20000,120000);
  const frameMs=clamp(Number(opts.renderIntervalMs??240),100,2000);
  const transitionMs=clamp(Number(opts.transitionMs??2200),0,6000);
  const staleMs=clamp(Number(opts.maxAgeMs??90000),15000,180000);
  const emit=typeof opts.onStatus==='function'?opts.onStatus:()=>{};
  const safeWithin=(p,prop)=>typeof opts.withinDistrict!=='function'||opts.withinDistrict(p,prop);
  const normOpts={...opts,withinDistrict:safeWithin,maxAgeMs:staleMs};
  function attachLayers(){
    if(destroyed||!map.isStyleLoaded?.())return;
    if(!map.getSource(LIVE_SOURCE))map.addSource(LIVE_SOURCE,{type:'geojson',data:empty()});
    const common={'circle-stroke-color':'#ffffff','circle-stroke-width':2.1,'circle-opacity':0.98};
    if(!map.getLayer(LIVE_METRO_LAYER))map.addLayer({id:LIVE_METRO_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:minimumZoom,
      filter:['==',['get','mode'],'metro'],paint:{...common,'circle-color':['get','color'],
        'circle-radius':['interpolate',['linear'],['zoom'],13.2,6.2,15.5,8.3,18,10.5]}});
    if(!map.getLayer(LIVE_BUS_LAYER))map.addLayer({id:LIVE_BUS_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:minimumZoom,
      filter:['==',['get','mode'],'bus'],paint:{...common,'circle-color':'#0785ef',
        'circle-radius':['interpolate',['linear'],['zoom'],13.2,5.7,15.5,7.7,18,9.8]}});
    map.getSource(LIVE_SOURCE)?.setData?.(display);
  }
  function calculate(now){
    if(!payload||now-lastUpdate>staleMs)return empty();
    const collection=payloadToCollection(payload,normOpts,now);
    const filtered=[];
    for(const f of collection.features){
      if(!visible[f.properties.mode])continue;
      let coords=f.geometry.coordinates;
      const earlier=previous.get(f.properties.id);
      if(earlier&&transitionMs>0&&now-lastUpdate<transitionMs&&haversineMeters(earlier,coords)<250){
        const frac=clamp((now-lastUpdate)/transitionMs,0,1);
        coords=[earlier[0]+(coords[0]-earlier[0])*frac,earlier[1]+(coords[1]-earlier[1])*frac];
      }
      if(!safeWithin(coords,f.properties))continue;
      filtered.push({...f,geometry:{...f.geometry,coordinates:coords}});
    }
    return {type:'FeatureCollection',features:filtered};
  }
  function render(force=false){
    const now=Date.now();
    if(!force && now-lastRendered<frameMs)return;
    lastRendered=now;
    if(!force && (typeof document!=='undefined'&&document.visibilityState==='hidden' || (map.getZoom?.()||0)<minimumZoom))return;
    display=calculate(now);
    try{map.getSource(LIVE_SOURCE)?.setData(display);}catch(e){emit({status:'render_error',error:String(e.message||e)});}
  }
  async function refresh(){
    if(!started||destroyed||loading||(typeof document!=='undefined'&&document.visibilityState==='hidden'))return;
    if(!visible.metro&&!visible.bus)return;
    loading=true;
    const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),19000);
    try{
      let next;
      if(typeof opts.getVehicles==='function')next=await opts.getVehicles({signal:ac.signal});
      else {const path=opts.endpoint??'/api/transport/live-vehicles';
        const separator=path.includes('?')?'&':'?';
        const target=path+separator+'modes='+encodeURIComponent(Object.keys(visible).filter(k=>visible[k]).join(','));
        const res=await fetch(target,{signal:ac.signal,cache:'no-store'});
        if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(body.error||`실시간 차량 API HTTP ${res.status}`);}next=await res.json();}
      if(!next||next.ok===false)throw new Error(next?.error||'실시간 차량 응답 오류');
      next.metro=preserveMetroEvents(next.metro||[],payload?.metro||[]);
      previous=new Map(display.features.map(f=>[f.properties.id,f.geometry.coordinates]));
      payload=next;lastUpdate=Date.now();render(true);
      const items=calculate(Date.now()).features;
      emit({status:'ok',metro:items.filter(f=>f.properties.mode==='metro').length,
        bus:items.filter(f=>f.properties.mode==='bus').length,warnings:next.warnings||[],availability:next.availability||{}});
    }catch(e){emit({status:'error',error:String(e?.message||e)});}finally{clearTimeout(timeout);loading=false;}
  }
  function handleMapClick(e){
    if(!visible.metro&&!visible.bus||!map.getLayer(LIVE_METRO_LAYER))return;
    const layers=[LIVE_METRO_LAYER,LIVE_BUS_LAYER].filter(id=>map.getLayer(id));
    const hit=layers.length?map.queryRenderedFeatures?.(e.point,{layers})?.[0]:null;
    if(hit&&typeof opts.onVehicleClick==='function')opts.onVehicleClick({...hit.properties,coordinates:hit.geometry.coordinates});
  }
  const onStyle=()=>{try{attachLayers();}catch(e){emit({status:'render_error',error:String(e.message||e)});}};
  const onVisible=()=>{if(document.visibilityState==='visible')refresh();};
  function start(){
    if(started||destroyed)return;started=true;
    attachLayers();map.on?.('style.load',onStyle);map.on?.('click',handleMapClick);
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVisible);
    rendering=setInterval(render,frameMs);poll=setInterval(refresh,pollMs);void refresh();
  }
  function stop(){started=false;clearInterval(rendering);clearInterval(poll);
    map.off?.('style.load',onStyle);map.off?.('click',handleMapClick);
    if(typeof document!=='undefined')document.removeEventListener('visibilitychange',onVisible);
    payload=null;previous.clear();display=empty();lastUpdate=0;
    try{map.getSource(LIVE_SOURCE)?.setData(display);}catch{}
  }
  function destroy(){if(destroyed)return;stop();destroyed=true;
    for(const id of [LIVE_METRO_LAYER,LIVE_BUS_LAYER])if(map.getLayer(id))map.removeLayer(id);
    if(map.getSource(LIVE_SOURCE))map.removeSource(LIVE_SOURCE);
  }
  function setVisible(mode,on){if(!(mode in visible))throw new Error('Unknown mode');visible[mode]=Boolean(on);render(true);}
  return {start,stop,destroy,refresh,setVisible,getStatus:()=>({started,visible:{...visible},lastUpdate,features:display.features.length,vehicles:display.features.length}),sourceId:LIVE_SOURCE};
}
