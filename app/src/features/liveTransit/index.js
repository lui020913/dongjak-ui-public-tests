/** MapLibre real-time vehicle overlay. Isolated GeoJSON sources and layers; no GPS permission. */
import {payloadToCollection,LINE_COLORS} from './normalize.js';
import {haversineMeters,getDisplayedRailPaths} from './geometry.js';
export const LIVE_SOURCE='dongjak-live-vehicles-v827';
export const LIVE_METRO_LAYER='dongjak-live-metro-v827';
export const LIVE_BUS_LAYER='dongjak-live-bus-v827';
const empty=()=>({type:'FeatureCollection',features:[]});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
// Local vector artwork rasterized at 2x, no remote sprite or icon dependency.
const trainImageId=(line,facing='right')=>'dj-live-train-'+line+(facing==='left'?'-left':'');
// Preserve the horizontal side profile, but choose its nose from the screen-space
// tangent. Near-vertical intervals keep a stable orientation to avoid flicker.
export function trainFacing(map,props,previous=null){
  if(!props?.headingKnown)return null;
  const a=[props.headingFromLng,props.headingFromLat],b=[props.headingToLng,props.headingToLat];
  if(![...a,...b].every(Number.isFinite))return null;
  let dx=(b[0]-a[0])*Math.cos(a[1]*Math.PI/180),dy=-(b[1]-a[1]);
  try{if(typeof map?.project==='function'){
    const p=map.project(a),q=map.project(b);
    if([p?.x,p?.y,q?.x,q?.y].every(Number.isFinite)){dx=q.x-p.x;dy=q.y-p.y;}
  }}catch{}
  const length=Math.hypot(dx,dy);if(!(length>0))return null;
  if(Math.abs(dx)<=length*.08){if(previous==='left'||previous==='right')return previous;return dy>0?'left':'right';}
  return dx<0?'left':'right';
}
export function trainIconImage(color,doc=globalThis.document,facing='right'){
  const canvas=doc?.createElement?.('canvas');if(!canvas)return null;
  canvas.width=96;canvas.height=96;const ctx=canvas.getContext?.('2d');if(!ctx)return null;
  ctx.scale(3,3);ctx.clearRect(0,0,32,32);
  const rounded=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();};
  // Side train only: transparent canvas, no backing plate, keyline or track.
  // Filled shapes rather than strokes; line color belongs to the vehicle itself.
  const wheelColor='#344650';
  for(const x of [7.5,13.5,24]){ctx.beginPath();ctx.arc(x,23,2.45,0,Math.PI*2);ctx.fillStyle=wheelColor;ctx.fill();}
  ctx.beginPath();ctx.moveTo(3,7.5);ctx.lineTo(18.6,7.5);ctx.quadraticCurveTo(22.5,7.5,25,10.8);ctx.lineTo(29.2,16.1);ctx.quadraticCurveTo(30.5,17.9,29.8,20.1);ctx.quadraticCurveTo(29,23,25.9,23);ctx.lineTo(3,23);ctx.quadraticCurveTo(1.5,23,1.5,21.5);ctx.lineTo(1.5,9);ctx.quadraticCurveTo(1.5,7.5,3,7.5);ctx.closePath();
  ctx.fillStyle=color;ctx.fill();
  // Contrasting windows and cab glass remain fully inside the train silhouette.
  for(const x of [4,8.8,13.6]){rounded(x,10,3.8,6.4,.8);ctx.fillStyle='#f1f7f8';ctx.fill();}
  ctx.beginPath();ctx.moveTo(19.5,10);ctx.lineTo(21.3,10);ctx.quadraticCurveTo(22.2,10,23.4,11.6);ctx.lineTo(27,16.4);ctx.lineTo(19.5,16.4);ctx.quadraticCurveTo(18.6,16.4,18.6,15.5);ctx.lineTo(18.6,10.9);ctx.quadraticCurveTo(18.6,10,19.5,10);ctx.closePath();ctx.fillStyle='#f1f7f8';ctx.fill();
  rounded(26,18.3,2.2,1.7,.65);ctx.fillStyle='#f1f7f8';ctx.fill();
  const image=ctx.getImageData(0,0,96,96);const data=new Uint8Array(image.data);
  if(facing==='left'){
    const mirrored=new Uint8Array(data.length);
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){
      const offset=(y*64+x)*4;mirrored.set(data.subarray(offset,offset+4),(y*64+63-x)*4);
    }
    return {width:64,height:64,data:mirrored};
  }
  return {width:64,height:64,data};
}
function ensureTrainImages(map){
  if(typeof map.addImage!=='function'||typeof map.hasImage!=='function')return false;
  try{for(const [line,color] of Object.entries({...LINE_COLORS,unknown:'#596c75'})){
    for(const facing of ['right','left']){
      const id=trainImageId(line,facing);if(map.hasImage(id))continue;
      const image=trainIconImage(color,globalThis.document,facing);if(!image)return false;map.addImage(id,image,{pixelRatio:3});
    }
  }return true;}catch{return false;}
}
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
  let payload=null,display=empty(),previous=new Map(),lastUpdate=0;
  let rendering=0,poll=0,started=false,destroyed=false,request=null;
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
    const trainImages=ensureTrainImages(map);
    if(!map.getLayer(LIVE_METRO_LAYER))map.addLayer(trainImages?{id:LIVE_METRO_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:minimumZoom,
      filter:['==',['get','mode'],'metro'],layout:{'icon-image':['coalesce',['get','trainIcon'],trainImageId('unknown')],
        'icon-size':['interpolate',['linear'],['zoom'],13.2,.70,15.5,.85,18,1],
        'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center','icon-rotation-alignment':'viewport'}}:
      {id:LIVE_METRO_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:minimumZoom,filter:['==',['get','mode'],'metro'],paint:{...common,'circle-color':['get','color'],
        'circle-radius':['interpolate',['linear'],['zoom'],13.2,6.2,15.5,8.3,18,10.5]}});
    if(!map.getLayer(LIVE_BUS_LAYER))map.addLayer({id:LIVE_BUS_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:minimumZoom,
      filter:['==',['get','mode'],'bus'],paint:{...common,'circle-color':'#0785ef',
        'circle-radius':['interpolate',['linear'],['zoom'],13.2,5.7,15.5,7.7,18,9.8]}});
    map.getSource(LIVE_SOURCE)?.setData?.(display);
  }
  function calculate(now){
    if(!payload||now-lastUpdate>staleMs)return empty();
    const collection=payloadToCollection(payload,{...normOpts,renderedRailPaths:getDisplayedRailPaths(map)},now);
    const filtered=[];
    for(const f of collection.features){
      if(!visible[f.properties.mode])continue;
      let coords=f.geometry.coordinates;
      const earlier=previous.get(f.properties.id);
      if(f.properties.mode==='metro'){
        const prior=display.features.find(x=>x.properties.id===f.properties.id)?.properties;
        const facing=trainFacing(map,f.properties,prior?.trainFacing);
        f.properties.trainFacing=facing||'unknown';
        f.properties.trainIcon=trainImageId(Object.hasOwn(LINE_COLORS,f.properties.line)?f.properties.line:'unknown',facing||'right');
      }
      // Straight-line smoothing stays bus-only; metro coordinates are on the displayed track already.
      if(f.properties.mode==='bus'&&earlier&&transitionMs>0&&now-lastUpdate<transitionMs&&haversineMeters(earlier,coords)<250){
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
    // The interval itself provides throttling; avoid skipping a frame due to timer jitter.
    if(!force&&typeof document!=='undefined'&&document.visibilityState==='hidden')return;
    if(typeof map.getZoom==='function'&&map.getZoom()<minimumZoom){opts.onVehiclesRendered?.(empty());return;}
    display=calculate(now);
    try{if(started&&(!map.getSource(LIVE_SOURCE)||!map.getLayer(LIVE_METRO_LAYER)||!map.getLayer(LIVE_BUS_LAYER)))attachLayers();const source=map.getSource(LIVE_SOURCE);if(!source)return;source.setData(display);opts.onVehiclesRendered?.(display);}catch(e){emit({status:'render_error',error:String(e.message||e)});}
  }
  async function refresh(){
    if(!started||destroyed||request||(typeof document!=='undefined'&&document.visibilityState==='hidden'))return;
    if(!visible.metro&&!visible.bus)return;
    const ac=new AbortController();request=ac;const timeout=setTimeout(()=>ac.abort(),19000);
    try{
      let next;
      if(typeof opts.getVehicles==='function')next=await opts.getVehicles({signal:ac.signal});
      else {const path=opts.endpoint??'/api/transport/live-vehicles';
        const separator=path.includes('?')?'&':'?';
        const target=path+separator+'modes='+encodeURIComponent(Object.keys(visible).filter(k=>visible[k]).join(','));
        const res=await fetch(target,{signal:ac.signal,cache:'no-store'});
        if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(body.error||`실시간 차량 API HTTP ${res.status}`);}next=await res.json();}
      if(!started||destroyed||request!==ac||ac.signal.aborted)return;
      if(!next||next.ok===false)throw new Error(next?.error||'실시간 차량 응답 오류');
      next.metro=preserveMetroEvents(next.metro||[],payload?.metro||[]);
      previous=new Map(display.features.map(f=>[f.properties.id,f.geometry.coordinates]));
      payload=next;lastUpdate=Date.now();render(true);
      const items=calculate(Date.now()).features;
      emit({status:'ok',metro:items.filter(f=>f.properties.mode==='metro').length,
        bus:items.filter(f=>f.properties.mode==='bus').length,warnings:next.warnings||[],availability:next.availability||{}});
    }catch(e){if(request===ac&&started&&!destroyed)emit({status:'error',error:String(e?.message||e)});}finally{clearTimeout(timeout);if(request===ac)request=null;}
  }
  function handleMapClick(e){
    if(!visible.metro&&!visible.bus)return;
    const layers=[LIVE_METRO_LAYER,LIVE_BUS_LAYER].filter(id=>map.getLayer(id));
    const hit=layers.length?map.queryRenderedFeatures?.(e.point,{layers})?.[0]:null;
    const actual=hit&&display.features.find(f=>f.properties.id===hit.properties.id&&f.properties.mode===hit.properties.mode);
    if(actual)opts.onVehicleClick?.({...actual.properties,coordinates:actual.geometry.coordinates});
    else opts.onVehicleMiss?.();
  }
  const onStyle=()=>{try{attachLayers();}catch(e){emit({status:'render_error',error:String(e.message||e)});}};
  const onVisible=()=>{if(document.visibilityState==='visible')refresh();};
  function start(){
    if(started||destroyed)return;started=true;
    onStyle();map.on?.('style.load',onStyle);map.on?.('click',handleMapClick);
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVisible);
    rendering=setInterval(render,frameMs);poll=setInterval(refresh,pollMs);void refresh();
  }
  function stop(){started=false;request?.abort();request=null;clearInterval(rendering);clearInterval(poll);
    map.off?.('style.load',onStyle);map.off?.('click',handleMapClick);
    if(typeof document!=='undefined')document.removeEventListener('visibilitychange',onVisible);
    payload=null;previous.clear();display=empty();lastUpdate=0;
    try{map.getSource(LIVE_SOURCE)?.setData(display);}catch{}
    opts.onVehiclesRendered?.(display);
  }
  function destroy(){if(destroyed)return;stop();destroyed=true;
    for(const id of [LIVE_METRO_LAYER,LIVE_BUS_LAYER])if(map.getLayer(id))map.removeLayer(id);
    if(map.getSource(LIVE_SOURCE))map.removeSource(LIVE_SOURCE);
    for(const line of [...Object.keys(LINE_COLORS),'unknown'])for(const facing of ['right','left'])if(map.hasImage?.(trainImageId(line,facing)))map.removeImage?.(trainImageId(line,facing));
  }
  function setVisible(mode,on){if(!(mode in visible))throw new Error('Unknown mode');visible[mode]=Boolean(on);render(true);}
  return {start,stop,destroy,refresh,setVisible,getStatus:()=>({started,visible:{...visible},lastUpdate,features:display.features.length,vehicles:display.features.length}),sourceId:LIVE_SOURCE};
}
