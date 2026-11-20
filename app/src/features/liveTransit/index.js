import {isMetroDailyQuota,isMixedMetroQuota,metroQuotaRetryMs,METRO_QUOTA_NOTICE} from './quota-state.js';
/** MapLibre real-time vehicle overlay. Isolated GeoJSON sources and layers; no GPS permission. */
import {payloadToCollection,LINE_COLORS} from './normalize.js';
import {loadTrainAtlas} from './train-atlas.js';
import {selectedBusVehicleRoute} from '../../bus-route-overlay.js';
import {haversineMeters,getDisplayedRailPaths} from './geometry.js';
export const LIVE_SOURCE='dongjak-live-vehicles-v827';
export const LIVE_METRO_LAYER='dongjak-live-metro-v827';
export const LIVE_BUS_LAYER='dongjak-live-bus-v827';
const empty=()=>({type:'FeatureCollection',features:[]});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
// Local user-supplied train atlas, preserving the established directional image keys.
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
// Icon offsets are rotated with the icon, not geographic positions.
// Southbound and northbound use opposite sides of a shared track centerline.
export function trainTrackOffset(props,facing){
  if(!props?.headingKnown||!Object.hasOwn(LINE_COLORS,props.line)||!['left','right'].includes(facing))return 0;
  const traffic=props.line==='1호선'?-1:1;
  return traffic*(facing==='left'?-1:1)*4.5;
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
  // Reference-inspired three-quarter side view: long carriage, shallow roof,
  // a single row of side glazing, and a compact transverse front windshield.
  const contour=()=>{ctx.beginPath();ctx.moveTo(4.2,10.3);ctx.lineTo(24.2,10.3);ctx.bezierCurveTo(28.4,10.3,30.0,12.2,30.0,15.7);ctx.bezierCurveTo(30.0,19.4,27.8,21.7,24.0,21.7);ctx.lineTo(4.2,21.7);ctx.quadraticCurveTo(1.5,21.7,1.5,18.9);ctx.lineTo(1.5,13.0);ctx.quadraticCurveTo(1.5,10.3,4.2,10.3);ctx.closePath();};
  ctx.save();ctx.shadowColor='rgba(30,45,55,.25)';ctx.shadowBlur=1.1;ctx.shadowOffsetY=.65;contour();ctx.fillStyle='#65717b';ctx.fill();ctx.restore();
  contour();ctx.fillStyle='#fafcfd';ctx.fill();
  ctx.save();contour();ctx.clip();
  // The visible side is narrow, as in the supplied perspective, with a soft crease.
  ctx.beginPath();ctx.moveTo(1.5,17.1);ctx.lineTo(24.0,17.1);ctx.quadraticCurveTo(27.5,17.1,30.0,15.8);ctx.lineTo(30.0,22.0);ctx.lineTo(1.5,22.0);ctx.closePath();ctx.fillStyle='#e7ebee';ctx.fill();
  // One clean route stripe wraps around the carriage, without a route badge.
  ctx.beginPath();ctx.moveTo(13.5,10.1);ctx.lineTo(17.1,10.1);ctx.quadraticCurveTo(17.8,14.0,17.2,17.1);ctx.lineTo(16.8,22.0);ctx.lineTo(13.2,22.0);ctx.lineTo(13.6,17.1);ctx.quadraticCurveTo(14.1,14.0,13.5,10.1);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  // Side-window quadrilaterals follow the actual side plane, not the roof.
  for(const [x,w] of [[3.5,4.0],[8.3,3.9],[18.5,3.8],[23.0,2.7]]){
    ctx.beginPath();ctx.moveTo(x+.55,17.8);ctx.lineTo(x+w,17.8);
    ctx.quadraticCurveTo(x+w+.15,17.8,x+w-.1,18.3);
    ctx.lineTo(x+w-.65,19.9);ctx.lineTo(x,19.9);
    ctx.quadraticCurveTo(x-.2,19.9,x,19.5);ctx.lineTo(x+.55,17.8);ctx.closePath();
    ctx.fillStyle='#28343c';ctx.fill();
  }
  // Short transverse glass tucked into the tapered end cap; a thin white
  // perimeter separates it from both the roof and the passenger windows.
  ctx.beginPath();ctx.moveTo(26.0,11.9);
  ctx.bezierCurveTo(27.35,12.15,28.45,13.3,28.65,14.6);
  ctx.quadraticCurveTo(29.0,16.25,28.15,17.7);
  ctx.lineTo(26.65,18.25);ctx.quadraticCurveTo(26.1,18.4,26.25,17.65);
  ctx.quadraticCurveTo(26.9,15.0,25.45,12.55);
  ctx.quadraticCurveTo(25.2,11.9,26.0,11.9);ctx.closePath();ctx.fillStyle='#202b33';ctx.fill();
  // Warm headlamps are mirrored together with the entire fallback sprite.
  ctx.fillStyle='#fffacd';for(const y of [14.2,18.2]){ctx.beginPath();ctx.arc(28.7,y,.65,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  contour();ctx.strokeStyle='#b6c1c7';ctx.lineWidth=.30;ctx.stroke();
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
export function ensureTrainImages(map,atlas=null,replace=false,doc=globalThis.document){
  if(typeof map.addImage!=='function'||typeof map.hasImage!=='function')return false;
  try{for(const [line,color] of Object.entries({...LINE_COLORS,unknown:'#596c75'})){
    for(const facing of ['right','left']){
      const id=trainImageId(line,facing),sprite=atlas?.get(line+':'+facing);
      if(map.hasImage(id)){if(replace&&sprite){if(typeof map.updateImage!=='function')return false;map.updateImage(id,sprite);}continue;}
      const image=sprite??trainIconImage(color,doc,facing);if(!image)return false;map.addImage(id,image,{pixelRatio:3});
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
  let visible={metro:true,bus:true},metroQuotaUntil=0;
  const quotaActive=()=>metroQuotaUntil>Date.now();
  let trainAtlas=null,atlasState=typeof map.addImage==='function'&&typeof map.hasImage==='function'?'pending':'unavailable',atlasRequested=false,atlasApplied=false,lastAttachAttempt=0;
  const minimumZoom=Number(opts.minZoom??13.2),metroMinZoom=Number(opts.metroMinZoom??minimumZoom);
  function reportArtwork(value){const node=map.getContainer?.();if(node?.dataset)node.dataset.djLiveTrainArtwork=value;}
  const pollMs=clamp(Number(opts.intervalMs??25000),20000,120000);
  const frameMs=clamp(Number(opts.renderIntervalMs??16),8,2000);
  const transitionMs=clamp(Number(opts.transitionMs??2200),0,6000);
  const staleMs=clamp(Number(opts.maxAgeMs??90000),15000,180000);
  const emit=typeof opts.onStatus==='function'?opts.onStatus:()=>{};
  const safeWithin=(p,prop)=>typeof opts.withinDistrict!=='function'||opts.withinDistrict(p,prop);
  const normOpts={...opts,withinDistrict:safeWithin,maxAgeMs:staleMs};
  function attachLayers(){
    if(destroyed||!started||!map.isStyleLoaded?.())return;
    lastAttachAttempt=Date.now();
    if(!map.getSource(LIVE_SOURCE))map.addSource(LIVE_SOURCE,{type:'geojson',data:empty()});
    const common={'circle-stroke-color':'#ffffff','circle-stroke-width':2.1,'circle-opacity':0.98};
    // Never delay the layer while the artwork downloads. Install recognizable fallback icons first.
    let trainImages=ensureTrainImages(map,trainAtlas,!!trainAtlas&&!atlasApplied,opts.trainIconDocument??globalThis.document);
    if(trainImages&&trainAtlas)atlasApplied=true;
    if(!trainImages&&map.getLayer(LIVE_METRO_LAYER)?.type==='symbol')trainImages=true;
    if(trainImages&&map.getLayer(LIVE_METRO_LAYER)?.type==='circle')map.removeLayer(LIVE_METRO_LAYER);
    if(!map.getLayer(LIVE_METRO_LAYER))map.addLayer(trainImages?{id:LIVE_METRO_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:metroMinZoom,
      filter:['==',['get','mode'],'metro'],layout:{'icon-image':['coalesce',['get','trainIcon'],trainImageId('unknown')],
        'icon-size':['interpolate',['linear'],['zoom'],11,.8052,12.5,.9028,13.2,1.0248,15.5,1.3786,18,1.7324],
        'icon-offset':['match',['get','trainTrackOffset'],-4.5,['literal',[0,-4.5]],4.5,['literal',[0,4.5]],['literal',[0,0]]],
        'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center','icon-rotation-alignment':'viewport','icon-pitch-alignment':'viewport','icon-rotate':['coalesce',['get','trainRotation'],0]}}:
      {id:LIVE_METRO_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:metroMinZoom,filter:['==',['get','mode'],'metro'],paint:{...common,'circle-color':['get','color'],
        'circle-radius':['interpolate',['linear'],['zoom'],13.2,6.2,15.5,8.3,18,10.5]}});
    if(!map.getLayer(LIVE_BUS_LAYER))map.addLayer({id:LIVE_BUS_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:minimumZoom,
      filter:['==',['get','mode'],'bus'],paint:{...common,'circle-color':'#0785ef',
        'circle-radius':['interpolate',['linear'],['zoom'],13.2,5.7,15.5,7.7,18,9.8]}});
    reportArtwork(atlasApplied?'atlas':trainImages?'fallback':'circle');
    map.getSource(LIVE_SOURCE)?.setData?.(display);
  }
  function calculate(now){
    if(!payload||now-lastUpdate>staleMs)return empty();
    const collection=payloadToCollection(payload,{...normOpts,renderedRailPaths:getDisplayedRailPaths(map)},now);
    const filtered=[],priorById=new Map(display.features.map(f=>[f.properties.id,f.properties]));
    for(const f of collection.features){
      if(!visible[f.properties.mode])continue;
      if(f.properties.mode==='bus'&&f.properties.routeId&&f.properties.routeId===selectedBusVehicleRoute(map))continue;
      let coords=f.geometry.coordinates;
      const earlier=previous.get(f.properties.id);
      if(f.properties.mode==='metro'){
        const prior=priorById.get(f.properties.id);
        const facing=trainFacing(map,f.properties,prior?.trainFacing);
        f.properties.trainFacing=facing||'unknown';
        f.properties.trainTrackOffset=trainTrackOffset(f.properties,facing);
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
    // Recover missing layers even for stationary trains / unchanged data, before the equality shortcut.
    if(started&&now-lastAttachAttempt>=300&&(!map.getSource(LIVE_SOURCE)||!map.getLayer(LIVE_METRO_LAYER)||!map.getLayer(LIVE_BUS_LAYER)||(trainAtlas&&!atlasApplied)))onStyle();
    const belowVisibleZoom=typeof map.getZoom==='function'&&map.getZoom()<Math.min(visible.metro?metroMinZoom:Infinity,visible.bus?minimumZoom:Infinity);
    // Keep source data current even below the symbol minzoom (fitBounds and orientation can change zoom without moving a train).
    if(belowVisibleZoom)opts.onVehiclesRendered?.(empty());
    if(renderPending&&!force)return;
    if(!force&&!payload)return;
    const next=calculate(now);
    if(!force&&next.features.length===display.features.length&&next.features.every((f,i)=>{
      const old=display.features[i];return old.properties.id===f.properties.id&&old.geometry.coordinates[0]===f.geometry.coordinates[0]&&old.geometry.coordinates[1]===f.geometry.coordinates[1]&&old.properties.trainIcon===f.properties.trainIcon&&old.properties.trainRotation===f.properties.trainRotation&&old.properties.trainTrackOffset===f.properties.trainTrackOffset&&old.properties.observedAt===f.properties.observedAt;
    }))return;
    display=next;
    try{if(started&&(!map.getSource(LIVE_SOURCE)||!map.getLayer(LIVE_METRO_LAYER)||!map.getLayer(LIVE_BUS_LAYER)))attachLayers();const source=map.getSource(LIVE_SOURCE);if(!source)return;const result=source.setData(display);const generation=++renderGeneration;if(result&&typeof result.then==='function'){renderPending=true;Promise.resolve(result).catch(()=>{}).finally(()=>{if(generation===renderGeneration)renderPending=false;});}else renderPending=false;if(!belowVisibleZoom)opts.onVehiclesRendered?.(display);}catch(e){emit({status:'render_error',error:String(e.message||e)});}
  }
  async function refresh(){
    if(!started||destroyed||request||(typeof document!=='undefined'&&document.visibilityState==='hidden'))return;
    if(!visible.metro&&!visible.bus)return;
    const modes=Object.keys(visible).filter(k=>visible[k]&&(k!=='metro'||!quotaActive()));
    if(!modes.length){if(visible.metro&&quotaActive())emit({status:'quota',error:METRO_QUOTA_NOTICE,quotaUntil:metroQuotaUntil});return;}
    const ac=new AbortController();request=ac;const timeout=setTimeout(()=>ac.abort(),19000);
    try{
      let next;
      if(typeof opts.getVehicles==='function')next=await opts.getVehicles({signal:ac.signal,modes});
      else {const path=opts.endpoint??'/api/transport/live-vehicles';
        const separator=path.includes('?')?'&':'?';
        const target=path+separator+'modes='+encodeURIComponent(modes.join(','));
        const res=await fetch(target,{signal:ac.signal,cache:'no-store'});const body=await res.json().catch(()=>({}));
        if(!started||destroyed||request!==ac||ac.signal.aborted)return;
        if(isMetroDailyQuota(res.status,body)||isMixedMetroQuota(body))metroQuotaUntil=Date.now()+metroQuotaRetryMs(body.metroQuota??body,res.headers.get('Retry-After'));
        if(!res.ok){if(isMetroDailyQuota(res.status,body)){payload={...payload,metro:[]};render(true);emit({status:'quota',error:METRO_QUOTA_NOTICE,quotaUntil:metroQuotaUntil});return;}throw new Error(body.error||`실시간 차량 API HTTP ${res.status}`);}next=body;}
      if(!started||destroyed||request!==ac||ac.signal.aborted)return;
      if(!next||next.ok===false)throw new Error(next?.error||'실시간 차량 응답 오류');
      if(isMixedMetroQuota(next))metroQuotaUntil=Date.now()+metroQuotaRetryMs(next.metroQuota);
      if(quotaActive())next.metro=[];else if(modes.includes('metro'))metroQuotaUntil=0;
      next.metro=preserveMetroEvents(next.metro||[],payload?.metro||[]);
      previous=new Map(display.features.map(f=>[f.properties.id,f.geometry.coordinates]));
      payload=next;lastUpdate=Date.now();render(true);
      const items=calculate(Date.now()).features;
      emit({status:'ok',metro:items.filter(f=>f.properties.mode==='metro').length,
        bus:items.filter(f=>f.properties.mode==='bus').length,warnings:next.warnings||[],availability:next.availability||{},quotaUntil:quotaActive()?metroQuotaUntil:0});
    }catch(e){if(request===ac&&started&&!destroyed)emit({status:'error',error:String(e?.message||e),quotaUntil:quotaActive()?metroQuotaUntil:0});}finally{clearTimeout(timeout);if(request===ac)request=null;}
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
  const onStyleReload=()=>{atlasApplied=false;onStyle();};
  let lastMeasure=0;
  function measureRenderedTrains(){
    const node=map.getContainer?.(),now=Date.now();
    if(!started||!node?.dataset||now-lastMeasure<500||!map.getLayer(LIVE_METRO_LAYER)||typeof map.queryRenderedFeatures!=='function')return;
    lastMeasure=now;
    try{
      const rendered=map.queryRenderedFeatures({layers:[LIVE_METRO_LAYER]});
      node.dataset.djLiveTrainRendered=String(new Set(rendered.map(f=>f.properties.id)).size);
      node.dataset.djLiveTrainDiagnostics=JSON.stringify({zoom:map.getZoom?.(),minimum:metroMinZoom,feed:payload?.metro?.length??0,features:display.features.filter(f=>f.properties.mode==='metro').length,rendered:node.dataset.djLiveTrainRendered,railLines:[...(getDisplayedRailPaths(map)?.keys()??[])],visible:visible.metro,layer:map.getLayer(LIVE_METRO_LAYER)?.type});
    }catch{}
  }
  const onIdle=()=>{
    if(started&&(!map.getLayer(LIVE_METRO_LAYER)||(trainAtlas&&!atlasApplied)))onStyle();
    measureRenderedTrains();
  };
  const onVisible=()=>{if(document.visibilityState==='visible')refresh();};
  function start(){
    if(started||destroyed)return;started=true;
    onStyle();map.on?.('style.load',onStyleReload);map.on?.('idle',onIdle);map.on?.('render',measureRenderedTrains);map.on?.('click',handleMapClick);
    if(atlasState==='pending'&&!atlasRequested){atlasRequested=true;void Promise.resolve().then(()=> (opts.loadTrainAtlas??loadTrainAtlas)()).catch(()=>null).then(atlas=>{trainAtlas=atlas;atlasState=atlas?'ready':'unavailable';if(started&&!destroyed)onStyle();});}
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVisible);
    if(raf){const frame=t=>{if(!started||destroyed)return;if(t-lastRenderAt>=frameMs-.9){lastRenderAt=t;render(false);}rendering=globalThis.requestAnimationFrame(frame);};rendering=globalThis.requestAnimationFrame(frame);}
    else rendering=setInterval(()=>render(false),frameMs);
    poll=setInterval(refresh,pollMs);void refresh();
  }
  function stop(){started=false;request?.abort();request=null;if(raf)globalThis.cancelAnimationFrame?.(rendering);else clearInterval(rendering);clearInterval(poll);lastRenderAt=0;renderGeneration++;renderPending=false;
    map.off?.('style.load',onStyleReload);map.off?.('idle',onIdle);map.off?.('render',measureRenderedTrains);map.off?.('click',handleMapClick);
    const node=map.getContainer?.();if(node?.dataset){node.dataset.djLiveTrainRendered='0';delete node.dataset.djLiveTrainDiagnostics;}
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
  return {start,stop,destroy,refresh,setVisible,getStatus:()=>({started,visible:{...visible},lastUpdate,metroQuotaUntil:quotaActive()?metroQuotaUntil:0,features:display.features.length,vehicles:display.features.length,trainArtwork:atlasApplied?'atlas':atlasState}),sourceId:LIVE_SOURCE};
}
