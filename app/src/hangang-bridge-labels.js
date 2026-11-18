import {nightOwnsLayerOrder} from './v913-night-poi-isolation.js';
/**
 * Labels for five Han River crossings. An approximate reference is used only
 * until a named road/rail bridge is resolved from the rendered vector tiles or
 * OSM geometry. No independent DOM bubble: MapLibre anchors the label to a
 * geographic point on the bridge and handles collisions natively.
 */
export const HANGANG_BRIDGE_REFERENCES = Object.freeze([
  {name:'원효대교',lng:126.94588,lat:37.52715,source:'Mapcarta / OSM reference'},
  {name:'한강철교',lng:126.95180,lat:37.51960,source:'Hangang Railway Bridge reference'},
  {name:'한강대교',lng:126.95780,lat:37.51590,source:'Hangang Bridge reference'},
  {name:'동작대교',lng:126.98189,lat:37.51070,source:'Dongjak Bridge crossing / OSM and bridge coordinate reference'},
  {name:'반포대교',lng:126.99600,lat:37.51550,source:'Banpo Bridge crossing / published bridge coordinate reference'}
]);
export const HANGANG_BRIDGE_NAMES = HANGANG_BRIDGE_REFERENCES.map(row=>row.name);
const point=(name,lng,lat,source)=>({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{name,source}});
export const bridgeReferenceCollection=()=>({type:'FeatureCollection',features:
  HANGANG_BRIDGE_REFERENCES.map(row=>point(row.name,row.lng,row.lat,row.source))});

const sq=(x)=>x*x;
export function bridgeDistanceMeters(a,b){
  const lat=(a[1]+b[1])*.5*Math.PI/180;
  return Math.hypot((a[0]-b[0])*111320*Math.cos(lat),(a[1]-b[1])*111320);
}
const isCoordinate=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const bridgeTitle=tags=>String(tags?.['name:ko']||tags?.name||'').trim();
function geometryLines(geometry){
  if(!geometry)return [];
  if(geometry.type==='LineString')return [geometry.coordinates];
  if(geometry.type==='MultiLineString')return geometry.coordinates;
  return [];
}
/** Length-based middle of a named bridge segment (not the OSM way bounding-box center). */
export function bridgeGeometryMidpoint(coordinates=[]){
  const segments=[];let total=0;
  for(let i=1;i<coordinates.length;i++){
    const a=coordinates[i-1],b=coordinates[i];
    if(!isCoordinate(a)||!isCoordinate(b))continue;
    const d=bridgeDistanceMeters(a,b);
    if(d>0){segments.push({a,b,d});total+=d;}
  }
  if(!segments.length)return null;
  let walked=0;
  for(const s of segments){
    if(walked+s.d>=total/2){const t=(total/2-walked)/s.d;return [s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t];}
    walked+=s.d;
  }
  return segments.at(-1).b;
}
/** Project the reference onto the named bridge centerline, instead of using
 * the midpoint of a ramp or the center of a bounding box. Returns meters. */
export function snapBridgeReferenceToLine(coordinates,reference){
  if(!isCoordinate(reference)||!Array.isArray(coordinates))return null;
  let nearest=null;
  const cos=Math.cos(reference[1]*Math.PI/180),sx=111320*cos,sy=111320;
  for(let i=1;i<coordinates.length;i++){
    const a=coordinates[i-1],b=coordinates[i];
    if(!isCoordinate(a)||!isCoordinate(b))continue;
    const vx=(b[0]-a[0])*sx,vy=(b[1]-a[1])*sy;
    const den=vx*vx+vy*vy;
    if(den<.01)continue;
    const wx=(reference[0]-a[0])*sx,wy=(reference[1]-a[1])*sy;
    const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/den));
    const projected=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    const distance=bridgeDistanceMeters(projected,reference);
    if(!nearest||distance<nearest.distance)nearest={coordinates:projected,distance};
  }
  return nearest;
}
const asOSMLines=row=>Array.isArray(row.geometry)
  ?[row.geometry.map(p=>[Number(p.lon),Number(p.lat)])]:geometryLines(row.geometry);

/** OSM way segments with geometries supersede rough reference coordinates. */
export function parseBridgeWays(elements=[]){
  const grouped=new Map();
  for(const row of elements){
    const name=bridgeTitle(row.tags);
    const ref=HANGANG_BRIDGE_REFERENCES.find(r=>r.name===name);
    if(!ref)continue;
    let candidates=asOSMLines(row).map(bridgeGeometryMidpoint).filter(isCoordinate);
    if(!candidates.length){
      const lng=Number(row.center?.lon??row.lon),lat=Number(row.center?.lat??row.lat);
      if(Number.isFinite(lng)&&Number.isFinite(lat))candidates=[[lng,lat]];
    }
    for(const coords of candidates){
      // A mislabeled bridge in another part of the city must not move these labels.
      if(bridgeDistanceMeters(coords,[ref.lng,ref.lat])>1700)continue;
      const d=bridgeDistanceMeters(coords,[ref.lng,ref.lat]);
      const prev=grouped.get(name);
      if(!prev||d<prev.distance)grouped.set(name,{name,coords,distance:d});
    }
  }
  return [...grouped.values()].map(p=>point(p.name,...p.coords,'OpenStreetMap named bridge geometry'));
}

/** Snap to named bridge line features already rendered on screen (offline-capable). */
export function bridgeAnchorsFromRenderedFeatures(features=[]){
  const grouped=new Map();
  for(const feature of features){
    const name=bridgeTitle(feature.properties);
    const ref=HANGANG_BRIDGE_REFERENCES.find(r=>r.name===name);
    if(!ref)continue;
    for(const line of geometryLines(feature.geometry)){
      const coords=bridgeGeometryMidpoint(line);
      if(!isCoordinate(coords))continue;
      const distance=bridgeDistanceMeters(coords,[ref.lng,ref.lat]);
      if(distance>1700)continue;
      const prev=grouped.get(name);
      if(!prev||distance<prev.distance)grouped.set(name,{name,coords,distance});
    }
  }
  return [...grouped.values()].map(p=>point(p.name,...p.coords,'Rendered named bridge segment'));
}

/** Real bridge geometries suitable for MapLibre 'line-center' text placement.
 * A reference point is NOT treated as a line: unresolved bridges remain in the
 * fallback point layer until a named bridge way is available. */
export function namedBridgeLines(elements=[]){
  const selected=new Map();
  for(const row of elements){
    const name=bridgeTitle(row.tags||row.properties);
    const ref=HANGANG_BRIDGE_REFERENCES.find(v=>v.name===name);
    if(!ref)continue;
    for(const line of asOSMLines(row)){
      if(!Array.isArray(line)||line.length<2||!line.every(isCoordinate))continue;
      const midpoint=bridgeGeometryMidpoint(line);
      if(!midpoint||bridgeDistanceMeters(midpoint,[ref.lng,ref.lat])>1700)continue;
      const length=line.slice(1).reduce((sum,p,i)=>sum+bridgeDistanceMeters(line[i],p),0);
      if(length<35||length>3500)continue;
      const prev=selected.get(name);
      // The longest plausible named bridge span is usually the main crossing,
      // rather than a ramp or a short access spur.
      if(!prev||prev.length<length)selected.set(name,{length,feature:{type:'Feature',
        geometry:{type:'LineString',coordinates:line},properties:{name,source:'Named OSM bridge way'}}});
    }
  }
  return [...selected.values()].map(record=>record.feature);
}

export function installHangangBridgeLabels(map,{fetchImpl=globalThis.fetch}={}){
  const sourceId='dj-hangang-bridges-osm';
  const lineSourceId='dj-hangang-bridges-real-lines';
  if(!map||map.getSource?.(sourceId))return ()=>{};
  let removed=false;
  const byName=new Map(bridgeReferenceCollection().features.map(f=>[f.properties.name,f]));
  const lockedRiverLabels=new Set(['동작대교','반포대교']);
  const quality=new Map(HANGANG_BRIDGE_NAMES.map(name=>[name,0]));
  map.addSource(sourceId,{type:'geojson',data:bridgeReferenceCollection()});
  map.addSource(lineSourceId,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'dj-hangang-bridge-geometry-labels',type:'symbol',source:lineSourceId,minzoom:10.2,maxzoom:19,
    layout:{'visibility':'none','symbol-placement':'line-center','text-field':['get','name'],
      'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Semibold','Open Sans Regular'],
      'text-size':['interpolate',['linear'],['zoom'],12,10.5,15,13,18,14],
      'text-allow-overlap':true,'text-ignore-placement':true,'text-optional':true,'text-padding':4,
      'text-keep-upright':true,'text-pitch-alignment':'viewport'},
    paint:{'text-color':'#31586e','text-halo-color':'#fff','text-halo-width':2.2}});
  map.addLayer({id:'dj-hangang-bridge-osm-labels',type:'symbol',source:sourceId,minzoom:10.2,maxzoom:19,
    layout:{'text-field':['get','name'],
      'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Semibold','Open Sans Regular'],
      'text-size':['interpolate',['linear'],['zoom'],12,10.5,15,13.5,18,14.5],
      'text-allow-overlap':true,'text-ignore-placement':true,'text-optional':true,'text-padding':4,
      'text-anchor':'center','text-offset':[0,0],
      'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},
    paint:{'text-color':'#31586e','text-halo-color':'#fff','text-halo-width':2.5}});
  // Other components add building/extrusion layers after this module initializes.
  // Keep bridge names above those later layers (without DOM markers).
  const labelIds=['dj-hangang-bridge-geometry-labels','dj-hangang-bridge-osm-labels'];
  // The dedicated bridge layers are excluded from generic basemap recoloring.
  // Recolor both the letters AND their halo whenever the app theme changes.
  const themeOwner=typeof document!=='undefined'?document.getElementById('app'):null;
  const syncBridgeTheme=()=>{
    if(removed)return;
    const dark=themeOwner?.dataset?.theme==='dark';
    const ink=dark?'#edf8ff':'#31586e';
    const halo=dark?'#10212b':'#ffffff';
    for(const id of labelIds){
      if(!map.getLayer?.(id))continue;
      try{
        if(map.getPaintProperty?.(id,'text-color')!==ink)map.setPaintProperty(id,'text-color',ink);
        if(map.getPaintProperty?.(id,'text-halo-color')!==halo)map.setPaintProperty(id,'text-halo-color',halo);
        if(map.getPaintProperty?.(id,'text-halo-width')!==(dark?2.7:2.5))
          map.setPaintProperty(id,'text-halo-width',dark?2.7:2.5);
      }catch(error){console.debug('[교량명] 테마 색상 유지',error?.message);}
    }
  };
  const bridgeThemeObserver=themeOwner && typeof MutationObserver!=='undefined'
    ?new MutationObserver(syncBridgeTheme):null;
  bridgeThemeObserver?.observe(themeOwner,{attributes:true,attributeFilter:['data-theme']});
  syncBridgeTheme();
  // The basemap can also draw the original labels at the bridge end, making a
  // second name that survives even when our corrected annotation is centered.
  // Filter only these two names from its transportation_name symbol layers.
  const suppressedNative=new Set();
  function suppressNativeBridgeDuplicates(){
    for(const layer of map.getStyle?.()?.layers||[]){
      if(layer.type!=='symbol'||layer['source-layer']!=='transportation_name'||suppressedNative.has(layer.id))continue;
      if(layer.id.startsWith('dj-hangang-'))continue;
      try{
        const previous=map.getFilter?.(layer.id);
        const noDuplicate=['!', ['in',['coalesce',['get','name:ko'],['get','name'],''],
          ['literal',['동작대교','반포대교']]]];
        map.setFilter?.(layer.id,previous?['all',previous,noDuplicate]:noDuplicate);
        suppressedNative.add(layer.id);
      }catch(error){console.debug('[교량 라벨] 기본지도 중복 필터 불가',layer.id,error?.message);}
    }
  }
  let movingLabels=false;
  function prioritizeBridgeNames(){
    if(movingLabels||nightOwnsLayerOrder(map))return;
    suppressNativeBridgeDuplicates();
    if(removed||typeof map.moveLayer!=='function'||typeof map.getStyle!=='function')return;
    const layers=map.getStyle()?.layers||[];
    const names=layers.map(layer=>layer.id);
    if(!labelIds.every(id=>names.includes(id)))return;
    const atEnd=labelIds.every((id,i)=>names[names.length-labelIds.length+i]===id);
    if(atEnd)return;
    movingLabels=true;
    try{for(const id of labelIds)map.moveLayer(id);}
    catch(e){console.debug('[교량명] 레이어 우선순위 조정 보류',e?.message);}
    finally{movingLabels=false;}
  }
  map.on?.('idle',prioritizeBridgeNames);
  map.on?.('styledata',prioritizeBridgeNames);
  map.on?.('idle',syncBridgeTheme);
  const realLines=new Map();
  function applyRealLines(features){
    if(removed)return;
    let changed=false;
    for(const feature of features){
      const name=feature.properties?.name;
      if(!quality.has(name)||feature.geometry?.type!=='LineString')continue;
      if(lockedRiverLabels.has(name)){
        const coords=feature.geometry.coordinates||[];
        const length=coords.slice(1).reduce((sum,p,i)=>sum+bridgeDistanceMeters(coords[i],p),0);
        const center=bridgeGeometryMidpoint(coords);
        const ref=HANGANG_BRIDGE_REFERENCES.find(p=>p.name===name);
        // Only a continuous crossing, close to the expected river span, can
        // supersede the stable midpoint. Short shoreline ramps cannot.
        if(length<350 || !center || bridgeDistanceMeters(center,[ref.lng,ref.lat])>350)continue;
        const snapped=snapBridgeReferenceToLine(coords,[ref.lng,ref.lat]);
        // Only verified continuous named bridge geometry close to the crossing
        // can replace the initial geographic anchor.
        if(snapped&&snapped.distance<=110){
          byName.set(name,point(name,...snapped.coordinates,'Named bridge centerline near the published crossing'));
        }
      }
      realLines.set(name,feature);
      // Keep user-corrected Han River labels stable: short or slightly skewed
      // OSM bridge ways should not pull the visible annotation away from the
      // intended crossing midpoint.
      if(!lockedRiverLabels.has(name)){
        const midpoint=bridgeGeometryMidpoint(feature.geometry.coordinates);
        if(midpoint)byName.set(name,point(name,...midpoint,'Named bridge geometry'));
      }
      quality.set(name,3);changed=true;
    }
    if(changed){
      map.getSource?.(lineSourceId)?.setData({type:'FeatureCollection',features:[...realLines.values()]});
      map.getSource?.(sourceId)?.setData({type:'FeatureCollection',features:[...byName.values()]});
      prioritizeBridgeNames();
    }
  }
  function applyFeatures(features,rank){
    if(removed)return;
    let changed=false;
    for(const feature of features){
      const name=feature.properties?.name;
      if(!byName.has(name)||quality.get(name)>rank||lockedRiverLabels.has(name))continue;
      const old=byName.get(name).geometry.coordinates;
      const next=feature.geometry?.coordinates;
      if(!isCoordinate(next))continue;
      if(bridgeDistanceMeters(old,next)<6){quality.set(name,rank);continue;}
      byName.set(name,feature);quality.set(name,rank);changed=true;
    }
    if(changed)map.getSource?.(sourceId)?.setData({type:'FeatureCollection',features:[...byName.values()]});
  }
  const onMapMoveEnd=()=>{
    prioritizeBridgeNames();
    if(removed||typeof map.queryRenderedFeatures!=='function')return;
    try{
      const relevantLayers=(map.getStyle?.()?.layers||[]).filter(layer=>
        !layer.id.startsWith('dj-')&&/transportation|bridge|road|rail/i.test(layer['source-layer']||layer.id));
      const lineLayerIds=relevantLayers.filter(layer=>layer.type==='line'||layer.type==='symbol').map(l=>l.id);
      const rows=lineLayerIds.length?map.queryRenderedFeatures(undefined,{layers:lineLayerIds}):[];
      // Names can be dropped from the display at a collision, but remain in the
      // transportation_name vector source. Consult cached tiles as well.
      for(const layer of relevantLayers.filter(l=>l['source-layer']==='transportation_name')){
        if(typeof map.querySourceFeatures!=='function')continue;
        rows.push(...map.querySourceFeatures(layer.source,{sourceLayer:'transportation_name'}));
      }
      applyRealLines(namedBridgeLines(rows.map(feature=>({tags:feature.properties,geometry:feature.geometry}))));
      applyFeatures(bridgeAnchorsFromRenderedFeatures(rows),1);
    }catch(e){console.debug('[교량명] 기본 위치 유지',e?.message);}
  };
  map.on?.('moveend',onMapMoveEnd);
  map.once?.('idle',onMapMoveEnd);
  // Remote OSM geometry is an enhancement, not a prerequisite for the bridge labels.
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),9000);
  const query=`[out:json][timeout:8];(way["bridge"]["name"~"^(원효대교|한강철교|한강대교|동작대교|반포대교)$"](37.505,126.91,37.545,127.01);way["bridge"]["name:ko"~"^(원효대교|한강철교|한강대교|동작대교|반포대교)$"](37.505,126.91,37.545,127.01););out geom tags;`;
  (async()=>{
    for(const endpoint of ['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter']){
      if(abort.signal.aborted||typeof fetchImpl!=='function')return;
      try{
        const res=await fetchImpl(`${endpoint}?data=${encodeURIComponent(query)}`,{signal:abort.signal});
        if(!res.ok)throw new Error(`OSM ${res.status}`);
        const elements=(await res.json()).elements||[];
        const lines=namedBridgeLines(elements);
        applyRealLines(lines);
        const results=parseBridgeWays(elements);
        if(results.length){applyFeatures(results,2);return;}
      }catch(e){if(!abort.signal.aborted)console.debug('[교량명] 지도 선형 우선',e?.message);}
    }
  })().finally(()=>clearTimeout(timer));
  prioritizeBridgeNames();
  return ()=>{removed=true;abort.abort();clearTimeout(timer);bridgeThemeObserver?.disconnect();map.off?.('moveend',onMapMoveEnd);
    map.off?.('idle',syncBridgeTheme);map.off?.('idle',prioritizeBridgeNames);map.off?.('styledata',prioritizeBridgeNames);};
}
