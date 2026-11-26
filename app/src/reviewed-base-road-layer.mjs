import {createNativeTileGuard} from './reviewed-native-tile-guard.mjs';
import {createSelectiveRoadReview} from './reviewed-native-road-filter.mjs';
import {createRoadDisplayAssets,RECOVERED_SURFACE_TILE} from './reviewed-road-display-assets.mjs';
const baseAssets=createRoadDisplayAssets({enabled:true});
const SOURCE='dj-reviewed-base-road-surfaces';
const LAYER='dj-reviewed-base-road-fill';
const empty=()=>({type:'FeatureCollection',features:[]});
export const intersectsBounds=(a,b)=>Array.isArray(a)&&a.length===4&&a.every(Number.isFinite)&&a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
export function roadTilesForViewport(tiles,bounds){
 const pad=.001;
 const b=[bounds[0]-pad,bounds[1]-pad,bounds[2]+pad,bounds[3]+pad];
 return tiles.filter(t=>intersectsBounds(t.bbox,b));
}
// The reviewed polygons were checked against the retained GIS footprints.
 // Native vector footprints are a separate geometry source. Put the exact
 // verified road surface above native 2D fills but below GIS buildings,
 // extrusions and symbols, rather than letting the old footprint mask it.
export function reviewedRoadAnchor(layers=[]){
 const nativePlan=l=>l?.type==='fill'&&l['source-layer']==='building'&&!String(l.id).startsWith('dongjak-buildings-');
 const firstProtected=layers.findIndex(l=>l.type==='symbol'||l.type==='fill-extrusion'||String(l.id).startsWith('dongjak-buildings-'));
 const end=firstProtected<0?layers.length:firstProtected;
 let lastPlan=-1;
 for(let i=0;i<end;i++)if(nativePlan(layers[i]))lastPlan=i;
 if(lastPlan>=0)return layers[lastPlan+1]?.id;
 return layers.find(l=>l['source-layer']==='building'||l.type==='symbol'||String(l.id).startsWith('dongjak-buildings-'))?.id;
}
/** Actual base-map integration, isolated QA only. Keep native roads visible
 * unless the exact reaudited source and district guards are satisfied.
 * Do not modify routing, transport or building layers.
 */
export function installReviewedBaseRoads({map,app,assets=baseAssets,enabled=false,requireSelective=false}){
 if(!enabled)return {dispose(){},refresh:async()=>false};
 let manifest=null,disposed=false,generation=0,timer=0,lastKey='',initializing=null,selective=null,eligibilityPromise=null,readyToken=0,nativeGuard=null;
 const cache=new Map();let recoveredData=null;
 const hide=()=>{readyToken=0;selective?.restore();if(map.getLayer(LAYER)){map.setPaintProperty(LAYER,'fill-opacity',0);map.setLayoutProperty(LAYER,'visibility','none');}delete app.dataset.djReviewedBaseRoads;};
 async function setupSelective(){
  if(!manifest?.native_reaudit||manifest.native_reaudit.exact_surface_count!==manifest.surface_count||manifest.native_reaudit.eligible_ids!==258)return null;
  if(!eligibilityPromise)eligibilityPromise=(async()=>{
    const n=await assets.checked(manifest.native);
    if(n.eligible_id_count!==258||n.surface_count!==manifest.surface_count||n.source_graph_sha256!==manifest.graph_sha256)return null;
    const [style,boundary]=await Promise.all([fetch('https://tiles.openfreemap.org/styles/bright',{cache:'no-store'}),fetch('/data/dongjak_sig_reference.geojson',{cache:'force-cache'})]);
    if(!style.ok||!boundary.ok)return null;
    const bytes=await style.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
    if(hash!==n.style_sha256)return null;
    const geo=await boundary.json();
    const native=JSON.parse(new TextDecoder().decode(bytes));
    const actual=map.getStyle()?.sources?.[n.source_name];
    // Match the audited vector source, not merely a coincidentally named one.
    if(!actual||actual.type!=='vector'||actual.url!==native.sources[n.source_name]?.url)return null;
    nativeGuard=createNativeTileGuard(n);
    if(!nativeGuard.valid)return null;
    // The actual MapLibre source must use the same versioned template, not
    // merely the same TileJSON endpoint. A stale source fails open.
    const liveTiles=map.getSource(n.source_name)?.tiles;
    if(!Array.isArray(liveTiles)||!liveTiles.length||!liveTiles.every(t=>t===n.tile_template))return null;
    return createSelectiveRoadReview(map,n,geo.features?.[0]?.geometry,true,SOURCE);
  })().catch(()=>null).then(result=>{if(!result)eligibilityPromise=null;return result;});
  return eligibilityPromise;
 }
 function applySelective(){
  if(!readyToken||readyToken!==generation||disposed||map.getZoom()<16||app.dataset.sangdoNight==='on')return;
  if(!selective||!map.getSource(SOURCE)||!map.isSourceLoaded?.(SOURCE))return;
  const count=selective.update(true);
  if(count>0){map.setPaintProperty(LAYER,'fill-opacity',1);app.dataset.djReviewedBaseRoads=requireSelective?'selective-operational':'selective-preview';}
  else if(requireSelective)hide();
 }
 const remove=()=>{hide();if(map.getLayer(LAYER))map.removeLayer(LAYER);if(map.getSource(SOURCE))map.removeSource(SOURCE);lastKey='';};
 const color=()=>app.dataset.theme==='dark'||app.dataset.sangdoNight==='on'?'#39434a':'#ffffff';
 function ensureLayer(){
  const style=map.getStyle();
  if(!style?.sources?.openmaptiles)return false;
  // Keep verified surfaces above native 2D footprints, below GIS buildings and labels.
  const anchor=reviewedRoadAnchor(style.layers);
  if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:empty(),tolerance:0,maxzoom:19});
  if(!map.getLayer(LAYER))map.addLayer({id:LAYER,source:SOURCE,type:'fill',minzoom:16,layout:{visibility:'none'},paint:{'fill-color':color(),'fill-opacity':0,'fill-antialias':true}},anchor);
  return true;
 }
 async function refresh(){
  const token=++generation;readyToken=0;selective?.restore();
  if(disposed||map.getZoom()<16||app.dataset.sangdoNight==='on'){hide();return false;}
  try{
   manifest=manifest||await (initializing??=(assets.manifest().finally(()=>{initializing=null;})));
   if(disposed||token!==generation||!manifest)return false;
   if(!ensureLayer())return false;
   const b=map.getBounds(),bounds=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],tiles=roadTilesForViewport(manifest.tiles,bounds);
   const needsRecovery=typeof assets.recovered==='function'&&roadTilesForViewport([RECOVERED_SURFACE_TILE],bounds).length>0;
   if(!tiles.length){hide();return false;}
   // Bound peak decode cost. Leave the original map intact on wide views.
   if(tiles.length>20||tiles.reduce((n,t)=>n+t.bytes,0)>14*1024*1024){hide();return false;}
   const key=tiles.map(t=>t.file).sort().join('|')+(needsRecovery?'|recovered':'');
   if(key!==lastKey){
    hide();
    const groups=[];
    for(let i=0;i<tiles.length;i+=3){
      const batch=await Promise.all(tiles.slice(i,i+3).map(async t=>{
       if(cache.has(t.file))return cache.get(t.file);
       const data=await assets.checked(t,2*1024*1024);
       if(data.type!=='FeatureCollection'||data.features?.length!==t.count||data.features.some(f=>!['Polygon','MultiPolygon'].includes(f.geometry?.type)))throw Error('road tile mismatch');
       cache.set(t.file,data);return data;
      }));
      if(disposed||token!==generation)return false;
      groups.push(...batch);
    }
    if(needsRecovery){
      try{recoveredData=recoveredData||await assets.recovered();if(recoveredData)groups.push(recoveredData);}
      catch(e){console.warn('[road review] optional recovered surfaces unavailable',e.message);}
    }
    if(disposed||token!==generation)return false;
    const keep=new Set(tiles.map(t=>t.file));for(const k of cache.keys())if(!keep.has(k))cache.delete(k);
    map.getSource(SOURCE).setData({type:'FeatureCollection',features:groups.flatMap(g=>g.features)});
    lastKey=needsRecovery&&!recoveredData?'':key;
   }
   if(disposed||token!==generation)return false;
   map.setPaintProperty(LAYER,'fill-color',color());
   // Visible at zero alpha allows MapLibre to index the source without
   // exposing unverified road polygons over the original map.
   map.setPaintProperty(LAYER,'fill-opacity',requireSelective?0:1);
   map.setLayoutProperty(LAYER,'visibility','visible');
   if(!requireSelective)app.dataset.djReviewedBaseRoads='additive-preview';
   // Wait for the complete viewport asset to be indexed by MapLibre before
   // removing any native feature. A camera move restores all native filters.
   if(manifest.native_reaudit){
     selective=await setupSelective();
     if(selective&&nativeGuard&&await nativeGuard.verify([b.getWest(),b.getSouth(),b.getEast(),b.getNorth()])&&!disposed&&token===generation){readyToken=token;applySelective();}
     else if(requireSelective&&token===generation){hide();return false;}
   }else if(requireSelective){hide();return false;}
   return !disposed&&token===generation;
  }catch(e){if(token===generation){hide();delete app.dataset.djReviewedBaseRoads;console.warn('[road review] native base retained',e.message);}return false;}
 }
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void refresh(),120);};
 const onStyle=()=>{if(!map.getSource(SOURCE)){selective?.restore();selective=null;nativeGuard=null;eligibilityPromise=null;lastKey='';schedule();}};
 const onSource=e=>{if(e.sourceId===SOURCE&&e.isSourceLoaded)applySelective();};
 const onMove=()=>{generation++;hide();delete app.dataset.djReviewedBaseRoads;};
 map.on('load',schedule);map.on('moveend',schedule);map.on('movestart',onMove);map.on('styledata',onStyle);map.on('sourcedata',onSource);
 const observer=new MutationObserver(schedule);observer.observe(app,{attributes:true,attributeFilter:['data-theme','data-sangdo-night']});
 return {refresh,dispose(){disposed=true;generation++;clearTimeout(timer);observer.disconnect();map.off('load',schedule);map.off('moveend',schedule);map.off('movestart',onMove);map.off('styledata',onStyle);map.off('sourcedata',onSource);remove();cache.clear();recoveredData=null;delete app.dataset.djReviewedBaseRoads;}};
}
