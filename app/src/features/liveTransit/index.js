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
// A fixed-size top-view vehicle follows the local screen-space track tangent.
// Mirrored rasters keep the existing stable facing contract at vertical bends.
function screenTangent(map,props){
  if(!props?.headingKnown)return null;
  const a=[props.headingFromLng,props.headingFromLat],b=[props.headingToLng,props.headingToLat];
  if(![...a,...b].every(Number.isFinite))return null;
  let dx=(b[0]-a[0])*Math.cos(a[1]*Math.PI/180),dy=-(b[1]-a[1]);
  try{if(typeof map?.project==='function'){
    const p=map.project(a),q=map.project(b);
    if([p?.x,p?.y,q?.x,q?.y].every(Number.isFinite)){dx=q.x-p.x;dy=q.y-p.y;}
  }}catch{}
  return Math.hypot(dx,dy)>0?{dx,dy}:null;
}
export function trainFacing(map,props,previous=null){
  const v=screenTangent(map,props);if(!v)return null;
  if(Math.abs(v.dx)<=Math.hypot(v.dx,v.dy)*.08){
    if(previous==='left'||previous==='right')return previous;
    return v.dy>0?'left':'right';
  }
  return v.dx<0?'left':'right';
}
export function trainRotation(map,props,facing='right',previous=0){
  const v=screenTangent(map,props);if(!v)return Number.isFinite(previous)?previous:0;
  const angle=Math.atan2(v.dy,v.dx)*180/Math.PI-(facing==='left'?180:0);
  return ((angle+180)%360+360)%360-180;
}
export function trainIconImage(color,doc=globalThis.document,facing='right'){
  const canvas=doc?.createElement?.('canvas');if(!canvas)return null;
  const size=96;canvas.width=size;canvas.height=size;const ctx=canvas.getContext?.('2d');if(!ctx)return null;
  ctx.scale(3,3);ctx.clearRect(0,0,32,32);
  const rounded=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();};
  // Three-quarter SIDE view: one visible passenger side and the roof above it.
  // Front cab is on the right. No top-facing badge or second row of windows.
  const contour=()=>{ctx.beginPath();ctx.moveTo(4.0,8.8);ctx.lineTo(22.4,8.8);ctx.bezierCurveTo(27.3,8.8,30.0,11.4,30.0,15.1);ctx.lineTo(30.0,17.2);ctx.bezierCurveTo(29.8,20.1,27.3,22.7,23.0,22.7);ctx.lineTo(4.0,22.7);ctx.quadraticCurveTo(1.4,22.7,1.4,20.0);ctx.lineTo(1.4,11.5);ctx.quadraticCurveTo(1.4,8.8,4.0,8.8);ctx.closePath();};
  ctx.save();ctx.shadowColor='rgba(20,35,45,.27)';ctx.shadowBlur=1.25;ctx.shadowOffsetY=.85;contour();ctx.fillStyle='#65717b';ctx.fill();ctx.restore();
  contour();ctx.fillStyle='#fafcfd';ctx.fill();
  ctx.save();contour();ctx.clip();
  // Continuous single passenger side, separated from the white roof by a crease.
  ctx.beginPath();ctx.moveTo(1.0,15.9);ctx.lineTo(22.5,15.9);ctx.quadraticCurveTo(27.7,15.9,30.3,14.0);ctx.lineTo(30.3,23.0);ctx.lineTo(1.0,23.0);ctx.closePath();ctx.fillStyle='#e4e9ed';ctx.fill();
  ctx.fillStyle=color;ctx.fillRect(1,21.25,30,1.6);
  // Painted band crosses the roof and the visible side, not a badge.
  ctx.beginPath();ctx.moveTo(13.4,8.5);ctx.lineTo(16.8,8.5);ctx.quadraticCurveTo(16.5,12.3,16.8,15.9);ctx.lineTo(16.8,22.8);ctx.lineTo(13.4,22.8);ctx.lineTo(13.4,15.9);ctx.quadraticCurveTo(13.0,12.3,13.4,8.5);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  // Rectangular side glazing reads as train windows at actual map size.
  for(const [x,w] of [[3.5,3.8],[8.0,3.8],[17.9,3.7],[22.3,2.5]]){
    rounded(x,16.8,w,2.85,.55);ctx.fillStyle='#28343c';ctx.fill();
    ctx.fillStyle='#65747e';ctx.fillRect(x+.45,17.1,w-.9,.35);
  }
  // Wide dark windshield follows the rounded front face; its visible plane
  // is transverse to the train, not a narrow vertical slit in the roof.
  // Lower only the cab glazing so it sits on the front face, not the roof.
  ctx.beginPath();ctx.moveTo(24.4,12.0);ctx.bezierCurveTo(27.4,12.0,29.5,14.4,29.2,17.2);
  ctx.quadraticCurveTo(27.8,19.0,25.7,18.9);ctx.quadraticCurveTo(26.1,15.4,24.4,12.0);ctx.closePath();ctx.fillStyle='#202b33';ctx.fill();
  ctx.beginPath();ctx.moveTo(25.6,12.6);ctx.quadraticCurveTo(27.5,13.2,28.0,14.9);ctx.strokeStyle='#65747e';ctx.lineWidth=.45;ctx.stroke();
  rounded(26.5,19.1,1.75,.85,.35);ctx.fillStyle='#ffffff';ctx.fill();
  ctx.restore();
  contour();ctx.strokeStyle='#aebac2';ctx.lineWidth=.38;ctx.stroke();
  const image=ctx.getImageData(0,0,size,size);const data=new Uint8Array(image.data);
  if(facing==='left'){
    const mirrored=new Uint8Array(data.length);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const offset=(y*size+x)*4;mirrored.set(data.subarray(offset,offset+4),(y*size+size-1-x)*4);
    }
    return {width:size,height:size,data:mirrored};
  }
  return {width:size,height:size,data};
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
  let rendering=0,poll=0,started=false,destroyed=false,request=null,renderPending=false,lastRenderAt=0,renderGeneration=0;
  const raf=typeof globalThis.requestAnimationFrame==='function';
  let visible={metro:true,bus:true};
  const minimumZoom=Number(opts.minZoom??13.2);
  const pollMs=clamp(Number(opts.intervalMs??25000),20000,120000);
  const frameMs=clamp(Number(opts.renderIntervalMs??16),8,2000);
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
        'icon-size':['interpolate',['linear'],['zoom'],13.2,.84,15.5,1.13,18,1.42],
        'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center','icon-rotation-alignment':'viewport','icon-pitch-alignment':'viewport','icon-rotate':['coalesce',['get','trainRotation'],0]}}:
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
    const filtered=[],priorById=new Map(display.features.map(f=>[f.properties.id,f.properties]));
    for(const f of collection.features){
      if(!visible[f.properties.mode])continue;
      let coords=f.geometry.coordinates;
      const earlier=previous.get(f.properties.id);
      if(f.properties.mode==='metro'){
        const prior=priorById.get(f.properties.id);
        const facing=trainFacing(map,f.properties,prior?.trainFacing);
        f.properties.trainFacing=facing||'unknown';
        f.properties.trainRotation=trainRotation(map,f.properties,facing||'right',prior?.trainRotation);
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
    if(renderPending&&!force)return;
    if(!force&&!payload)return;
    const next=calculate(now);
    if(!force&&next.features.length===display.features.length&&next.features.every((f,i)=>{
      const old=display.features[i];return old.properties.id===f.properties.id&&old.geometry.coordinates[0]===f.geometry.coordinates[0]&&old.geometry.coordinates[1]===f.geometry.coordinates[1]&&old.properties.trainIcon===f.properties.trainIcon&&old.properties.trainRotation===f.properties.trainRotation&&old.properties.observedAt===f.properties.observedAt;
    }))return;
    display=next;
    try{if(started&&(!map.getSource(LIVE_SOURCE)||!map.getLayer(LIVE_METRO_LAYER)||!map.getLayer(LIVE_BUS_LAYER)))attachLayers();const source=map.getSource(LIVE_SOURCE);if(!source)return;const result=source.setData(display);const generation=++renderGeneration;if(result&&typeof result.then==='function'){renderPending=true;Promise.resolve(result).catch(()=>{}).finally(()=>{if(generation===renderGeneration)renderPending=false;});}else renderPending=false;opts.onVehiclesRendered?.(display);}catch(e){emit({status:'render_error',error:String(e.message||e)});}
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
    if(raf){const frame=t=>{if(!started||destroyed)return;if(t-lastRenderAt>=frameMs-.9){lastRenderAt=t;render(false);}rendering=globalThis.requestAnimationFrame(frame);};rendering=globalThis.requestAnimationFrame(frame);}
    else rendering=setInterval(()=>render(false),frameMs);
    poll=setInterval(refresh,pollMs);void refresh();
  }
  function stop(){started=false;request?.abort();request=null;if(raf)globalThis.cancelAnimationFrame?.(rendering);else clearInterval(rendering);clearInterval(poll);lastRenderAt=0;renderGeneration++;renderPending=false;
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
