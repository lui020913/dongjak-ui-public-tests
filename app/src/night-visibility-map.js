import {createNightPoiIsolation} from './v913-night-poi-isolation.js';
/**
 * User-supplied Sangdo 1-dong night map -> MapLibre integration.
 * Original Kakao map UI is intentionally not loaded; only data and adapted
 * distance analysis are used. Public Overpass road lookup starts ON DEMAND.
 */
import {makeProj,inGeometry,sampleWays,annotate,findDark,
  kindOf,kindLabel,isExcluded,isIgnored,lightingBounds,isValidLight} from './night-visibility-analysis.js';
import {isReachDataset,trimReach,annotateVisibility,analyzeOcclusion,occlusionLineFeatures} from './night-occlusion.js';
import {getSangdo1Boundary} from './admin-dong-layer.js';
import {createNightMapRoadLayer,NIGHT_GL_LAYER_ID} from './night-map-roads-gl.js';

// v5.12.7: three road-result colours are keyed to the pedestrian's road type.
// The reason for missing the hypothetical direct ray (building obstruction vs
// outside the radius) is explained in segment details rather than dash patterns.
// All three main road types use slimmer solid strokes. These are estimates, NOT illuminance readings.
export const NIGHT_VISUAL_PALETTE=Object.freeze({
  dimColor:'#071725',dimOpacity:0.47,
  glowStreet:'#fcd372',glowSecurity:'#47e1d7',
  reachStreet:'#ffd376',reachSecurity:'#47e7cf',reachOpacity:0.42,uncertainReachOpacity:0.095,
  clear:'#79DEC1',alleyUnlit:'#FF8A5B',pathUnlit:'#5D9EFF',
  // Legacy keys follow the same road-type palette; clear retains its established colour.
  blocked:'#FF8A5B',outside:'#5D9EFF',uncertain:'#B2BCC7',
  casing:'#304955',streetPoint:'#ffd35f',securityPoint:'#81e4ff'
});
const DATA_ROOT='/data/sangdo1-night/';
const OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
const EMPTY={type:'FeatureCollection',features:[]};
const OCC_TYPES=['clear','blocked','outside','uncertain'];
const LAYERS=['dj-night-area-fill','dj-night-area-outline','dj-night-outside-shield','dj-night-light-glow','dj-night-glow-outline',
  'dj-night-dark-alley-casing','dj-night-dark-path-casing','dj-night-dark-alley','dj-night-dark-path',
  'dj-night-lit-casing','dj-night-lit-line',
  'dj-night-reach-fill','dj-night-reach-halo','dj-night-reach-outline',
  ...OCC_TYPES.map(cat=>'dj-night-occ-casing-'+cat),...OCC_TYPES.map(cat=>'dj-night-occ-'+cat),
  'dj-night-light-point'];
const occCategory=id=>/^dj-night-occ-(?:casing-)?(clear|blocked|outside|uncertain)$/.exec(id)?.[1]||null;
const SOURCES=['dj-night-area','dj-night-shield','dj-night-glow','dj-night-dark','dj-night-lit','dj-night-lights','dj-night-reach','dj-night-occ'];
// Render categorical *road* observations on top of night reach polygons and
// late-added GIS 3D buildings. Casing below strokes; light-source pins last.
const NIGHT_ROAD_CASINGS=[
  'dj-night-dark-alley-casing','dj-night-dark-path-casing','dj-night-lit-casing',
  ...OCC_TYPES.map(cat=>'dj-night-occ-casing-'+cat)
];
const NIGHT_ROAD_STROKES=[
  'dj-night-dark-alley','dj-night-dark-path','dj-night-lit-line',
  ...OCC_TYPES.map(cat=>'dj-night-occ-'+cat)
];
export const NIGHT_FOREGROUND_LAYERS=[...NIGHT_ROAD_CASINGS,...NIGHT_ROAD_STROKES,NIGHT_GL_LAYER_ID];
/** Idempotent: no moveLayer calls if the analytic foreground already sits on top. */
export function promoteNightAnalysisLayers(map){
  if(typeof map?.moveLayer!=='function'||typeof map?.getStyle!=='function')return false;
  const existing=map.getStyle()?.layers?.map(layer=>layer.id)||[];
  const active=NIGHT_FOREGROUND_LAYERS.filter(id=>existing.includes(id)&&map.getLayer?.(id));
  if(!active.length)return false;
  if(existing.slice(-active.length).every((id,i)=>id===active[i]))return false;
  for(const id of active)map.moveLayer(id);
  return true;
}
// Cartographic detail-on-demand: far away only colored road centerlines;
// close up the light envelopes reappear, and only the nearest view draws lamps.
export const NIGHT_DETAIL_ZOOM=Object.freeze({reach:15.35,light:16.35});
export function nightFeatureVisible(id,zoom,permitted=true,pitch=0){
  if(!permitted)return false;
  const z=Number(zoom)||0;
  // Pitch is not a sufficient proxy for distance. On a close oblique view,
  // suppression removed *every* lamp and visibility envelope even in front of
  // the camera. Keep detail keyed to zoom; the building layer itself handles
  // physical depth occlusion for individual lamp points.
  void pitch;
  if(id==='dj-night-light-point')return z>=NIGHT_DETAIL_ZOOM.light;
  if(['dj-night-area-fill','dj-night-area-outline','dj-night-outside-shield',
      'dj-night-light-glow','dj-night-glow-outline',
      'dj-night-reach-fill','dj-night-reach-halo','dj-night-reach-outline'].includes(id))
    return z>=NIGHT_DETAIL_ZOOM.reach;
  return true; // main road linework is always retained when its mode is on.
}

const MAX_ROADS=12000;
const formatMeters=number=>`${Math.round(number||0).toLocaleString('ko-KR')} m`;
const PROVISIONAL_ROADS_NOTE='행정경계 미확인: 저장된 도로망 전체 수집 범위를 임시로 표시합니다. 상도1동 통계가 아닙니다.';
function fc(features=[]){return {type:'FeatureCollection',features};}
function pointFeature(light,index){
  return {type:'Feature',id:index,properties:{idx:index,kind:light.security?'security':'street',lamps:light.lamps||1},
    geometry:{type:'Point',coordinates:[light.lon,light.lat]}};
}
function circularRing(lat,lon,radius,points=20){
  const ky=111320,kx=ky*Math.cos(lat*Math.PI/180);
  const ring=[];
  for(let k=0;k<=points;k++){
    const a=2*Math.PI*k/points;
    ring.push([lon+Math.cos(a)*radius/kx,lat+Math.sin(a)*radius/ky]);
  }
  return ring;
}
function glowFeatures(lights,radius){return lights.map((l,i)=>({type:'Feature',id:i,properties:{kind:l.security?'security':'street'},
  geometry:{type:'Polygon',coordinates:[circularRing(l.lat,l.lon,radius)]}}));}
function darkFeatures(segments){return segments.map((s,i)=>({type:'Feature',id:i,
  properties:{idx:i,kind:s.kind,name:String(s.name||''),length:Math.round(s.length),maxD:Math.round(s.maxD)},
  geometry:{type:'LineString',coordinates:s.points.map(p=>[p.lon,p.lat])}}));}

/** Road centerline portions within the assumed distance radius. This is the
 * counterpart to findDark(), not a measured luminance or safety assessment.
 * We do not bridge gaps across out-of-scope / invalid / radius-crossing edges.
 */
export function distanceLitLineFeatures(lines,radius,minLength=5){
  const features=[];
  for(const line of lines||[]){
    const points=line.samples||[];
    let run=null;
    const flush=()=>{
      if(run&&run.length>=minLength&&run.points.length>=2){
        features.push({type:'Feature',id:features.length,properties:{kind:kindOf(line.tags),
          name:String(line.tags?.name||''),length:Math.round(run.length)},
          geometry:{type:'LineString',coordinates:run.points}});
      }
      run=null;
    };
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y);
      if(!Number.isFinite(len)||len<=0||len>15||!a.inScope||!b.inScope||
          !(a.d<=radius&&b.d<=radius)) {flush();continue;}
      if(!run)run={points:[[a.lon,a.lat]],length:0};
      run.points.push([b.lon,b.lat]);run.length+=len;
    }
    flush();
  }
  return fc(features);
}

// The night layer uses the same 2026-10 admin-dong polygon as the selector.
// A cached *verified* polygon may be reused on the same device if the remote
// parquet service is unavailable. Never approximate Sangdo 1-dong from lights.
const NIGHT_BOUNDARY_CACHE='dongjak-sangdo1-20261001-admin-boundary';
const isBoundary=geometry=>['Polygon','MultiPolygon'].includes(geometry?.type)&&Array.isArray(geometry?.coordinates);
export function extractSangdoBoundary(collection){
  const feature=(collection?.features||[]).find(f=>
    (f?.properties?.dong_name||f?.properties?.emdnm)==='상도1동'&&isBoundary(f?.geometry));
  return feature?.geometry||null;
}
function readBoundaryCache(){
  try{const data=JSON.parse(globalThis.localStorage?.getItem(NIGHT_BOUNDARY_CACHE)||'null');
    return data?.date==='2026-10-01'&&isBoundary(data.geometry)?data.geometry:null;
  }catch{return null;}
}
function saveBoundaryCache(geometry){
  if(!isBoundary(geometry))return;
  try{globalThis.localStorage?.setItem(NIGHT_BOUNDARY_CACHE,
    JSON.stringify({date:'2026-10-01',geometry}));}catch{/* storage optional */}
}
async function readBoundaryFromMap(map){
  const source=map?.getSource?.('dongjak-admin-dongs');
  if(typeof source?.getData!=='function')return null;
  try{return extractSangdoBoundary(await source.getData());}
  catch(error){console.info('[야간 시야] 행정동 데이터 대기 중',error);return null;}
}
async function getSangdoBoundary(map){
  const onMap=await readBoundaryFromMap(map);
  if(onMap){saveBoundaryCache(onMap);return onMap;}
  const cached=readBoundaryCache();
  if(cached)return cached;
  const remote=await getSangdo1Boundary();
  if(isBoundary(remote))saveBoundaryCache(remote);
  return remote;
}
async function jsonOrError(url){
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw new Error(`${url} HTTP ${response.status}`);
  return response.json();
}
async function overpassRequest(url,query){
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),23000);
  try{
    const response=await fetch(`${url}?data=${encodeURIComponent(query)}`,{signal:ctrl.signal});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    if(!Array.isArray(data?.elements))throw new Error('Overpass 데이터 형식 오류');
    return data.elements;
  }finally{clearTimeout(timeout);}
}
export async function fetchSangdoRoads(lights){
  const [s,w,n,e]=lightingBounds(lights,65).map(value=>Number(value.toFixed(6)));
  const query=`[out:json][timeout:30];way["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|footway|path|steps)$"](${s},${w},${n},${e});out geom tags;`;
  let lastError=null;
  for(const url of OVERPASS){
    try{
      const ways=(await overpassRequest(url,query)).filter(x=>x.type==='way'&&x.geometry?.length>=2);
      if(!ways.length||ways.length>MAX_ROADS)throw new Error(`도로 데이터 건수 오류 (${ways.length})`);
      return ways;
    }catch(error){lastError=error;console.warn('[야간 시야] 도로 데이터 조회 실패',url,error);}
  }
  throw new Error(`OpenStreetMap 도로 데이터 조회 실패: ${lastError?.message||'원인 미확인'}`);
}


function signedRing(ring){
  let area=0;
  for(let i=0;i<ring.length-1;i++)area+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];
  return area;
}
function outsideMask(geometry){
  if(!geometry)return EMPTY;
  const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  const holes=polys.map(p=>p?.[0]).filter(r=>r?.length>=4);
  if(!holes.length)return EMPTY;
  const pts=holes.flat();
  const minX=Math.min(...pts.map(p=>p[0]))-0.17,maxX=Math.max(...pts.map(p=>p[0]))+0.17;
  const minY=Math.min(...pts.map(p=>p[1]))-0.10,maxY=Math.max(...pts.map(p=>p[1]))+0.10;
  const outer=[[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY],[minX,minY]];
  const cutouts=holes.map(h=>signedRing(h)>0?h.slice().reverse():h.slice());
  return fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[outer,...cutouts]}}]);
}

/** A route picker/preview has priority over night-vision analysis. */
export function nightActivationBlocked(app,doc=typeof document!=='undefined'?document:null){
  if(!app)return false;
  if(['route-picking','route-preview','route-guiding'].some(x=>app.classList?.contains?.(x)))return true;
  return ['route-pick-hint','route-transit-confirm','route-place-search','route-search-confirm'].some(id=>{
    const el=doc?.getElementById?.(id);
    return Boolean(el&&!el.hidden&&typeof el.getClientRects==='function'&&el.getClientRects().length);
  });
}

export function installNightVisibility({map,maplibregl,app,theme,toast=()=>{},onActivate=()=>{}}){
  const toggle=document.getElementById('night-visibility-toggle');
  const controls=document.getElementById('night-visibility-controls');
  const quickOff=document.getElementById('night-visibility-quick-off');
  const radius=document.getElementById('night-visibility-radius');
  const radiusText=document.getElementById('night-visibility-radius-value');
  const excludeMajor=document.getElementById('night-visibility-exclude-major');
  const showAlley=document.getElementById('night-visibility-show-alley');
  const showPath=document.getElementById('night-visibility-show-path');
  const occDetails=document.getElementById('night-occlusion-details');
  const status=document.getElementById('night-visibility-status');
  const stats=document.getElementById('night-visibility-stats');
  const top=document.getElementById('night-visibility-top');
  const floating=document.getElementById('night-visibility-float');
  const floatingContent=document.getElementById('night-visibility-float-content');
  const floatingSlot=document.getElementById('night-visibility-float-slot');
  const floatingCollapse=document.getElementById('night-visibility-float-collapse');
  const floatingStop=document.getElementById('night-visibility-float-stop');
  const floatingSummary=document.getElementById('night-visibility-float-summary');
  const floatingHead=floating?.querySelector?.('.night-visibility-float-head');
  if(!toggle||!controls||!quickOff||!radius||!status||!stats||!top)return null;

  const poiIsolation=createNightPoiIsolation(map);
  let enabled=false,lights=[],lines=null,scope=null,scopeIsOfficial=false;
  let visibility=null,occlusionPromise=null,roadSource='online',offlineOcclusionReady=false;
  let themeBeforeNight=null;
  const applyTemporaryTheme=next=>{
    const themeToggle=document.getElementById('theme-toggle');
    const previousConfirmed=themeToggle?.dataset?.dj840ThemeConfirmed;
    if(themeToggle)themeToggle.dataset.dj840ThemeConfirmed='1';
    try{theme?.setTemporaryTheme?.(next);}finally{
      if(themeToggle){
        if(previousConfirmed===undefined)delete themeToggle.dataset.dj840ThemeConfirmed;
        else themeToggle.dataset.dj840ThemeConfirmed=previousConfirmed;
      }
      const transition=document.getElementById('dj-full-transition');
      if(transition)transition.hidden=true;
      document.documentElement?.classList?.remove('dj-v711-transition-active');
      const consent=document.getElementById('dj840-theme-confirm');
      if(consent)consent.hidden=true;
    }
  };
  let lightsPromise=null,roadsPromise=null,boundaryLookup=null,segments=[];
  let popup=null,clickEventsAttached=false;
  let cachedArea=EMPTY,cachedShield=EMPTY,cachedLights=EMPTY,cachedGlow=EMPTY,cachedDark=EMPTY,cachedLit=EMPTY,cachedReach=EMPTY,cachedOcc=EMPTY;
  // A single real range input and result node are moved between the hidden
  // safety workbench and the on-map report. Never clone event-bearing controls.
  const originalControlsParent=controls.parentElement;
  const renderNightQuickAction=()=>{
    const symbol=document.createElement('span');symbol.className='dj-night-action-symbol';
    symbol.setAttribute('aria-hidden','true');symbol.textContent='☾';
    const label=document.createElement('span');label.className='dj-night-action-text';
    label.textContent=enabled?'야간 시야 해제':'야간 시야';
    quickOff.replaceChildren(symbol,label);
  };
  const updateFloatingVisibility=()=>{
    if(floating)floating.hidden=!enabled||app.dataset.tab!=='map';
  };
  const setFloatingCollapsed=collapsed=>{
    if(!floatingContent||!floatingCollapse)return;
    floatingContent.hidden=Boolean(collapsed);
    if(floating)floating.dataset.collapsed=collapsed?'true':'false';
    floatingCollapse.textContent=collapsed?'설정·결과 보기':'접기';
    floatingCollapse.setAttribute('aria-expanded',String(!collapsed));
  };
  const showFloating=()=>{
    floatingSlot?.append?.(controls);
    setFloatingCollapsed(true);
    updateFloatingVisibility();
    // The independent safety menu must not obscure the active on-map report.
    app.classList.remove('map-safety-open');
    const button=document.getElementById('map-safety-toggle');
    if(button){button.setAttribute('aria-expanded','false');button.textContent='보행안전';}
  };
  const parkFloating=()=>{
    originalControlsParent?.append?.(controls);
    updateFloatingVisibility();
  };
  const setStatus=text=>{status.textContent=text;};
  const visibleLayers=()=>enabled&&app.dataset.tab==='map';
  // The user-facing analysis is fixed to building occlusion. Never silently
  // downgrade to distance-only output if the precomputed occlusion data is absent.
  const requestedOcclusion=()=>true;
  const isOcclusion=()=>true;
  const analysisType=()=>'occlusion';
  const nativeRoads=createNightMapRoadLayer(map,NIGHT_VISUAL_PALETTE);
  // The legacy custom 3D triangle renderer can interfere with depth precision
  // in steep pitched scenes (repeated black sawtooth strips). Native MapLibre
  // terrain-following GeoJSON lines are more stable across devices.
  const USE_CUSTOM_NIGHT_ROADS=false;
  let lastNativeActive=false;
  let nativeLinePaintMuted=false;
  /** Keep lamp pins in the physical world: behind 3D building massing, not on
   * the topmost annotation layer. This is applied again when 3D tiles load. */
  const placeLampsBelowBuildings=()=>{
    const pointId='dj-night-light-point';
    if(!map.getLayer?.(pointId))return false;
    const style=map.getStyle?.();const stack=style?.layers||[];
    const firstBuilding=stack.find(layer=>layer.type==='fill-extrusion'&&
      (layer.id.startsWith('dongjak-buildings-3d-')||layer.layout?.visibility!=='none'));
    if(!firstBuilding)return false;
    const pointIndex=stack.findIndex(layer=>layer.id===pointId);
    const buildingIndex=stack.findIndex(layer=>layer.id===firstBuilding.id);
    if(pointIndex>=0 && pointIndex<buildingIndex)return false;
    try{map.moveLayer(pointId,firstBuilding.id);return true;}catch{return false;}
  };
  const setFilterOnce=(id,filter)=>{if(JSON.stringify(map.getFilter?.(id))!==JSON.stringify(filter))map.setFilter(id,filter);};
  const changeVisibility=()=>{
    const isOpen=visibleLayers(),occ=isOcclusion(),zoom=map.getZoom?.()??0,pitch=map.getPitch?.()??0;
    const useNativeGl=USE_CUSTOM_NIGHT_ROADS&&isOpen&&nativeRoads.isActive();
    for(const id of LAYERS){
      if(!map.getLayer(id))continue;
      let permitted=true;
      const category=occCategory(id);
      if(id==='dj-night-dark-alley'||id==='dj-night-dark-alley-casing')permitted=!occ&&showAlley.checked;
      else if(id==='dj-night-dark-path'||id==='dj-night-dark-path-casing')permitted=!occ&&showPath.checked;
      else if(id==='dj-night-lit-line'||id==='dj-night-lit-casing')permitted=!occ&&(showAlley.checked||showPath.checked);
      else if(id==='dj-night-light-glow'||id==='dj-night-glow-outline')permitted=!occ;
      else if(id==='dj-night-reach-fill'||id==='dj-night-reach-halo'||id==='dj-night-reach-outline')permitted=occ;
      else if(category)permitted=occ&&(showAlley.checked||showPath.checked);
      // Keep underlying native GeoJSON line layers active for hit testing.
      // When the pitched MapLibre GL road renderer is active their paint is
      // transparent, so a road is never visibly drawn twice.
      if((id==='dj-night-lit-line'||id==='dj-night-lit-casing')&&typeof map.setFilter==='function'){
        setFilterOnce(id,['any',showAlley.checked?['==',['get','kind'],'alley']:false,
          showPath.checked?['==',['get','kind'],'path']:false]);
      }
      if(category&&typeof map.setFilter==='function'){
        setFilterOnce(id,['all',['==',['get','category'],category],['any',
          showAlley.checked?['==',['get','kind'],'alley']:false,
          showPath.checked?['==',['get','kind'],'path']:false]]);
      }
      const state=isOpen&&nightFeatureVisible(id,zoom,permitted,pitch)?'visible':'none';
      if(map.getLayoutProperty?.(id,'visibility')!==state)map.setLayoutProperty(id,'visibility',state);
    }
    // Preserve MapLibre line-layer click events even in 3D. Style visibility
    // remains 'visible', but custom WebGL draws the color once per map frame.
    if(nativeLinePaintMuted!==useNativeGl&&typeof map.setPaintProperty==='function'){
      const alphaFor=id=>id==='dj-night-lit-casing'?0.84:id==='dj-night-lit-line'?0.94:
        id==='dj-night-dark-alley-casing'||id==='dj-night-dark-path-casing'?0.93:
        id.startsWith('dj-night-occ-casing-')?0.92:0.98;
      for(const id of [...NIGHT_ROAD_CASINGS,...NIGHT_ROAD_STROKES]){
        if(map.getLayer(id))map.setPaintProperty(id,'line-opacity',useNativeGl?0:alphaFor(id));
      }
      nativeLinePaintMuted=useNativeGl;
    }
    if(isOpen){poiIsolation.reconcile();promoteNightAnalysisLayers(map);placeLampsBelowBuildings();}
    nativeRoads.update({enabled:USE_CUSTOM_NIGHT_ROADS&&isOpen,occlusion:occ,alley:showAlley.checked,path:showPath.checked,
      occ:cachedOcc.features,dark:cachedDark.features,
      lit:cachedLit.features.map(f=>({...f,properties:{...f.properties,category:'lit'}}))});
    lastNativeActive=nativeRoads.isActive();
  };
  const ensureLayers=()=>{
    if(!map.getStyle?.()?.layers)return;
    const data={
      'dj-night-area':cachedArea,'dj-night-shield':cachedShield,'dj-night-lights':cachedLights,
      'dj-night-glow':cachedGlow,'dj-night-dark':cachedDark,'dj-night-lit':cachedLit,
      'dj-night-reach':cachedReach,'dj-night-occ':cachedOcc
    };
    for(const id of SOURCES){
      const existing=map.getSource(id);
      if(existing?.setData)existing.setData(data[id]);
      else if(!existing)map.addSource(id,{type:'geojson',data:data[id]});
    }
    const add=(id,style)=>{if(!map.getLayer(id))map.addLayer({id,...style});};
    const nv=NIGHT_VISUAL_PALETTE;
    // Darken the *analysis area* only while night mode is visible, making unlit
    // space legible. Native road/base-map paint is not mutated and restores on exit.
    add('dj-night-area-fill',{type:'fill',source:'dj-night-area',paint:{'fill-color':nv.dimColor,'fill-opacity':nv.dimOpacity}});
    add('dj-night-area-outline',{type:'line',source:'dj-night-area',paint:{'line-color':'#eebd78','line-opacity':0.72,'line-width':1.6}});
    // Distance-only mode: light discs remain visible, but are different from
    // colored light-source points and dark-segment linework.
    add('dj-night-light-glow',{type:'fill',source:'dj-night-glow',minzoom:13,
      paint:{'fill-color':['match',['get','kind'],'security',nv.glowSecurity,nv.glowStreet],'fill-opacity':0.40}});
    add('dj-night-glow-outline',{type:'line',source:'dj-night-glow',minzoom:15,
      paint:{'line-color':['match',['get','kind'],'security',nv.glowSecurity,nv.glowStreet],
        'line-opacity':0.40,'line-width':['interpolate',['linear'],['zoom'],15,0.6,17,1.3]}});
    // Add dark casing under every analytic line so it can be read even above
    // the bright base-map roads. Casing first, colored strokes second.
    for(const kind of ['alley','path']){
      add('dj-night-dark-'+kind+'-casing',{type:'line',source:'dj-night-dark',minzoom:12.7,
        filter:['==',['get','kind'],kind],layout:{'line-cap':'round','line-join':'round'},
        paint:{'line-color':nv.casing,'line-opacity':0.55,
          'line-width':['interpolate',['linear'],['zoom'],12.7,5,16,8.4]}});
    }
    add('dj-night-dark-alley',{type:'line',source:'dj-night-dark',minzoom:12.7,
      filter:['==',['get','kind'],'alley'],layout:{'line-cap':'round','line-join':'round'},
      paint:{'line-color':nv.alleyUnlit,'line-opacity':0.98,
        'line-width':['interpolate',['linear'],['zoom'],12.7,2.9,16,5.6]}});
    add('dj-night-dark-path',{type:'line',source:'dj-night-dark',minzoom:12.7,
      filter:['==',['get','kind'],'path'],layout:{'line-cap':'round','line-join':'round'},
      paint:{'line-color':nv.pathUnlit,'line-opacity':0.98,
        'line-width':['interpolate',['linear'],['zoom'],12.7,2.9,16,5.6]}});
    // Distance-only analysis also renders estimated light-reached road axes.
    add('dj-night-lit-casing',{type:'line',source:'dj-night-lit',minzoom:12.7,
      layout:{'line-cap':'round','line-join':'round'},
      paint:{'line-color':nv.casing,'line-opacity':0.55,
        'line-width':['interpolate',['linear'],['zoom'],12.7,4.6,16,7.3]}});
    add('dj-night-lit-line',{type:'line',source:'dj-night-lit',minzoom:12.7,
      layout:{'line-cap':'round','line-join':'round'},
      paint:{'line-color':nv.clear,'line-opacity':0.94,
        'line-width':['interpolate',['linear'],['zoom'],12.7,2.3,16,4.7]}});
    // Occlusion mode: illuminate possible direct-ray footprints, leaving
    // the darkened areas visibly unlit. Uncertain light positions stay faint.
    const reachColor=['match',['get','kind'],'security',nv.reachSecurity,nv.reachStreet];
    add('dj-night-reach-fill',{type:'fill',source:'dj-night-reach',minzoom:13,
      paint:{'fill-color':reachColor,'fill-opacity':['case',['get','insideBuilding'],nv.uncertainReachOpacity,nv.reachOpacity]}});
    add('dj-night-reach-halo',{type:'line',source:'dj-night-reach',minzoom:15.25,
      paint:{'line-color':reachColor,'line-opacity':['case',['get','insideBuilding'],0.06,0.18],
        'line-width':['interpolate',['linear'],['zoom'],15.25,2,17,4], 'line-blur':1.9}});
    add('dj-night-reach-outline',{type:'line',source:'dj-night-reach',minzoom:15.2,
      paint:{'line-color':reachColor,'line-opacity':['case',['get','insideBuilding'],0.12,0.52],
        'line-width':['interpolate',['linear'],['zoom'],15.2,0.6,17,1.3]}});
    // Mask polygons that extend past Sangdo 1-dong without hiding underlying
    // base-map roads or official street labels. Road category lines come after it.
    add('dj-night-outside-shield',{type:'fill',source:'dj-night-shield',
      paint:{'fill-color':'#10232d','fill-opacity':0.76}});
    for(const cat of OCC_TYPES){
      add('dj-night-occ-casing-'+cat,{type:'line',source:'dj-night-occ',minzoom:12.7,
        filter:['==',['get','category'],cat],layout:{'line-cap':'round','line-join':'round'},
        paint:{'line-color':nv.casing,'line-opacity':0.55,
          'line-width':['interpolate',['linear'],['zoom'],12.7,4.9,16,8.3]}});
    }
    for(const cat of OCC_TYPES){
      // Unlit colours follow road type; the cause is available in segment details.
      const roadColor=['match',['get','kind'],'path',nv.pathUnlit,nv.alleyUnlit];
      const color=cat==='clear'?nv.clear:cat==='uncertain'?nv.uncertain:roadColor;
      const paint={'line-color':color,'line-opacity':0.98,
        'line-width':['interpolate',['linear'],['zoom'],12.7,2.6,16,5.5]};
      add('dj-night-occ-'+cat,{type:'line',source:'dj-night-occ',minzoom:12.7,
        filter:['==',['get','category'],cat],layout:{'line-cap':'round','line-join':'round'},paint});
    }
    add('dj-night-light-point',{type:'circle',source:'dj-night-lights',minzoom:13.1,
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],13.1,3,17,5.2],
        'circle-color':['match',['get','kind'],'security',nv.securityPoint,nv.streetPoint],
        'circle-stroke-color':'#081821','circle-stroke-width':1.5,'circle-opacity':0.98}});
    if(USE_CUSTOM_NIGHT_ROADS&&!map.getLayer(NIGHT_GL_LAYER_ID))map.addLayer(nativeRoads.layer);
    changeVisibility();
    if(visibleLayers()){promoteNightAnalysisLayers(map);placeLampsBelowBuildings();}
    if(!clickEventsAttached){
      clickEventsAttached=true;
      for(const id of ['dj-night-dark-alley','dj-night-dark-path','dj-night-occ-clear','dj-night-occ-blocked','dj-night-occ-outside','dj-night-occ-uncertain']){
        map.on('click',id,event=>{
          if(!visibleLayers())return;
          const index=Number(event.features?.[0]?.properties?.idx);
          if(Number.isInteger(index)&&segments[index])openSegment(segments[index],[event.lngLat.lng,event.lngLat.lat]);
        });
        map.on('mouseenter',id,()=>{if(visibleLayers())map.getCanvas().style.cursor='pointer';});
        map.on('mouseleave',id,()=>{map.getCanvas().style.cursor='';});
      }
      map.on('click','dj-night-light-point',event=>{
        if(!visibleLayers())return;
        const index=Number(event.features?.[0]?.properties?.idx),l=lights[index];
        if(!l)return;
        const box=document.createElement('div');box.className='night-visibility-popup';
        const heading=document.createElement('strong');heading.textContent=l.security?'보안등':'가로등(지번 중심 위치)';box.append(heading);
        const detail=document.createElement('p');detail.textContent=l.security?(l.addr||l.id||'보안등 위치'):
          `지번 ${l.jibun||'정보 없음'} · 등록 등기구 ${l.lamps||1}개`;box.append(detail);
        showPopup([l.lon,l.lat],box);
      });
      map.on('mouseenter','dj-night-light-point',()=>{if(visibleLayers())map.getCanvas().style.cursor='pointer';});
      map.on('mouseleave','dj-night-light-point',()=>{map.getCanvas().style.cursor='';});
    }
  };
  const showPopup=(lngLat,node)=>{
    popup?.remove();popup=new maplibregl.Popup({closeOnClick:true,maxWidth:'300px'}).setLngLat(lngLat).setDOMContent(node).addTo(map);
  };
  const openSegment=(segment,coords)=>{
    const node=document.createElement('div');node.className='night-visibility-popup';
    const heading=document.createElement('strong');heading.textContent=segment.category==='uncertain'?'조명 도달 여부 판정 불확실':
      segment.category==='clear'?'조명 도달 추정 구간':
      `${segment.kind==='path'?'보행로':'골목·차도'} 조명 미도달 추정 구간`;node.append(heading);
    for(const text of [
      `${segment.name||'이름 없는 구간'} · ${kindLabel(segment.kind,segment.tags)}`,
      `연속 길이 약 ${formatMeters(segment.length)}`,
      `가장 가까운 조명까지 최대 약 ${formatMeters(segment.maxD)}`,
      ...(segment.category?[
        segment.category==='blocked'?'미도달 사유: 건물 차폐 추정':
        segment.category==='outside'?'미도달 사유: 설정된 조명 영향 반경 밖':
        '건물 높이·조명 설치고도를 가정한 직접광 경로 추정']:[]),
      `설정된 영향 반경 ${radius.value}m 기준 · 실제 조도 측정 아님`]){
      const p=document.createElement('p');p.textContent=text;node.append(p);
    }
    showPopup(coords,node);
  };
  const statsLine=(label,value)=>{
    const item=document.createElement('div');item.className='night-visibility-stat';
    const caption=document.createElement('span');caption.textContent=label;
    const strong=document.createElement('strong');strong.textContent=value;
    item.append(caption,strong);stats.append(item);
  };
  const render=()=>{
    radiusText.textContent=`${radius.value} m`;
    if(floatingSummary)floatingSummary.textContent=`상도1동 · ${requestedOcclusion()?'건물 차폐 반영':'거리 기반'} · ${radius.value}m`;
    if(!lights.length)return;
    const currentRadius=Number(radius.value),occ=isOcclusion();
    // Fail closed until the verified district polygon is ready: never show
    // light pins or influence footprints from outside Sangdo 1-dong.
    // Preserve original indices for light-click popups and reach data matching.
    const inDistrict=scopeIsOfficial&&isBoundary(scope);
    const eligibleIds=new Set();
    if(inDistrict)lights.forEach((light,index)=>{
      if(inGeometry(light.lon,light.lat,scope))eligibleIds.add(index);
    });
    cachedLights=fc(lights.flatMap((light,index)=>eligibleIds.has(index)?[pointFeature(light,index)]:[]));
    cachedGlow=fc(glowFeatures(lights,currentRadius).filter((_,index)=>eligibleIds.has(index)));
    cachedReach=occ&&inDistrict&&visibility?fc(trimReach(visibility,lights,currentRadius).features.filter(feature=>
      eligibleIds.has(Number(feature.properties?.idx)))):EMPTY;
    cachedArea=inDistrict?fc([{type:'Feature',properties:{},geometry:scope}]):EMPTY;
    cachedShield=inDistrict?outsideMask(scope):EMPTY;
    const selected=lines?.filter(l=>!isIgnored(l.tags)&&(!excludeMajor.checked||!isExcluded(l.tags)))||[];
    const result=lines?findDark(selected,currentRadius,10):null;
    const occlusionReady=Boolean(visibility)||offlineOcclusionReady;
    const occResult=occ&&lines&&occlusionReady?analyzeOcclusion(selected,currentRadius,5):null;
    segments=occResult?occResult.segments:result?.segments||[];
    cachedDark=fc(darkFeatures(result?.segments||[]));
    cachedLit=lines?distanceLitLineFeatures(selected,currentRadius):EMPTY;
    cachedOcc=occResult?occlusionLineFeatures(occResult.segments):EMPTY;
    ensureLayers();
    stats.replaceChildren();top.replaceChildren();if(occDetails)occDetails.replaceChildren();
    const street=lights.filter(l=>!l.security);
    const shown=scopeIsOfficial?cachedLights.features.map(feature=>lights[feature.properties.idx]):[];
    const shownStreet=shown.filter(l=>!l.security),shownSecurity=shown.filter(l=>l.security);
    const totalPoles=shownStreet.reduce((sum,l)=>sum+(Number(l.poles)||0),0);
    const totalLamps=shownStreet.reduce((sum,l)=>sum+(Number(l.lamps)||0),0);
    statsLine('상도1동 내 가로등 위치',scopeIsOfficial?
      `${shownStreet.length}곳 · 기둥 ${totalPoles.toLocaleString('ko-KR')}개 · 등 ${totalLamps.toLocaleString('ko-KR')}개`:'행정경계 확인 대기');
    statsLine('상도1동 내 보안등 위치',scopeIsOfficial?`${shownSecurity.length}곳`:'행정경계 확인 대기');
    statsLine('수집한 원본 조명',`가로등 ${street.length}곳 · 보안등 ${lights.length-street.length}곳 (경계 밖 포함)`);
    if(occDetails){
      const text=document.createElement('p');
      if(requestedOcclusion()&&!visibility&&!offlineOcclusionReady){
        text.textContent='건물 차폐 분석 자료를 불러오지 못했습니다. 거리 기반 결과로 대체하지 않고 분석 결과 표시를 보류합니다.';
      }else if(occ){
        const uncertain=Number(visibility?.metadata?.sourceInsideBuildingCount)||0;
        text.textContent=`건물 차폐 추정 · 반경 최대 40m/5° 광선 · 조명 고도 가로등 6m, 보안등 4m 가정 · 조사 건물 ${Number(visibility?.metadata?.buildingCount||0).toLocaleString('ko-KR')}동 · 건물 내부 좌표 조명 ${uncertain}곳은 판정 불확실 · 지형/수목/반사광 미반영`;
      }else text.textContent='기존 거리 기반 분석 · 건물 차폐 미반영. 분석 방식에서 건물 차폐 반영을 선택하면 비교할 수 있습니다.';
      occDetails.append(text);
    }
    if(!result){statsLine('도로 결과','저장된 도로 샘플을 불러오는 중');return;}
    if(!occResult){
      cachedDark=EMPTY;cachedLit=EMPTY;cachedOcc=EMPTY;
      statsLine('도로 결과','건물 차폐 분석 자료를 불러오지 못해 결과를 표시하지 않습니다.');
      setStatus('건물 차폐 분석 자료를 확인할 수 없습니다. 거리 기반 분석으로 대체하지 않습니다.');
      return;
    }
    statsLine('지도 도로선 데이터',`${occ?cachedOcc.features.length:cachedDark.features.length+cachedLit.features.length}개 구간 · ${roadSource==='offline'?'저장된 자료':'OSM 자료'}`);
    if(!scopeIsOfficial)statsLine('분석 범위 주의','행정경계 검증 전 수집 범위 전체 임시 결과 · 상도1동 통계 아님');
    const percent=(d,t)=>t?(d/t*100).toFixed(1):'0.0';
    statsLine('분석 도로 길이',formatMeters(result.totalLen));
    if(occResult){
      const {totals,totalLen,byKind}=occResult;
      for(const [key,label] of [['clear','조명 도달 추정'],
          ['blocked','건물 차폐로 인한 조명 미도달 추정'],
          ['outside','조명 영향 반경 밖 추정'],['uncertain','경계·데이터 불확실']]){
        statsLine(label,`${formatMeters(totals[key])} (${percent(totals[key],totalLen)}%)`);
      }
      statsLine('골목·차도 조명 미도달 추정',formatMeters(byKind.alley.blocked+byKind.alley.outside));
      statsLine('보행로 조명 미도달 추정',formatMeters(byKind.path.blocked+byKind.path.outside));
      let distanceWithin=0;
      for(const line of selected)for(let i=1;i<line.samples.length;i++){
        const a=line.samples[i-1],b=line.samples[i],len=Math.hypot(b.x-a.x,b.y-a.y);
        if(a.inScope&&b.inScope&&len>0&&len<=15&&a.d<=currentRadius&&b.d<=currentRadius)distanceWithin+=len;
      }
      statsLine('기존 반경 안 도로',`${formatMeters(distanceWithin)} (${percent(distanceWithin,totalLen)}%)`);
      statsLine('차폐 적용 후 조명 도달 추정',`${formatMeters(totals.clear)} (${percent(totals.clear,totalLen)}%)`);
      statsLine('분석 방식',`${roadSource==='offline'?'저장된 도로 샘플':'실시간 OSM 도로'} · 건물 차폐 반영`);
    }else{
      const categoryStats=kind=>findDark(selected.filter(l=>kindOf(l.tags)===kind),currentRadius,10);
      const alley=categoryStats('alley'),path=categoryStats('path');
      statsLine('조명 도달 추정(지도 표시)',formatMeters(cachedLit.features.reduce((sum,f)=>sum+(f.properties.length||0),0)));
      statsLine('골목·차도 조명 미도달 추정',`${formatMeters(alley.totalLen)} 중 ${formatMeters(alley.darkLen)} (${percent(alley.darkLen,alley.totalLen)}%)`);
      statsLine('보행로 조명 미도달 추정',`${formatMeters(path.totalLen)} 중 ${formatMeters(path.darkLen)} (${percent(path.darkLen,path.totalLen)}%)`);
      statsLine('조명 미도달 추정 전체',`${formatMeters(result.darkLen)} (${percent(result.darkLen,result.totalLen)}%) · ${result.segments.length}곳`);
    }
    if(excludeMajor.checked){
      const excluded=lines.filter(l=>!isIgnored(l.tags)&&isExcluded(l.tags));
      statsLine('간선도로 제외',formatMeters(findDark(excluded,currentRadius,10).totalLen));
    }
    const visible=segments.filter(s=>((s.kind==='alley'&&showAlley.checked)||(s.kind==='path'&&showPath.checked))&&
      (!occ||s.category==='blocked'||s.category==='outside'));
    const ordered=visible.slice().sort((a,b)=>b.length-a.length).slice(0,10);
    if(ordered.length){
      const label=document.createElement('strong');label.textContent='조명 미도달 추정 구간 TOP 10';top.append(label);
      const list=document.createElement('ol');
      for(const sg of ordered){
        const li=document.createElement('li'),button=document.createElement('button');button.type='button';
        const suffix=sg.category==='blocked'?'건물 차폐 추정':sg.category==='outside'?'조명 영향 반경 밖':'';
        button.textContent=`${sg.name||'이름 없는 구간'} · ${kindLabel(sg.kind,sg.tags)} · ${formatMeters(sg.length)}${suffix?' · '+suffix:''}`;
        button.addEventListener('click',()=>{
          const mid=sg.points[Math.floor(sg.points.length/2)];
          map.easeTo({center:[mid.lon,mid.lat],zoom:Math.max(map.getZoom(),16),pitch:0,duration:750});
          openSegment(sg,[mid.lon,mid.lat]);
          app.classList.remove('map-controls-open');app.classList.remove('map-safety-open');
          const opener=document.getElementById('map-safety-toggle');
          if(opener){opener.setAttribute('aria-expanded','false');opener.textContent='보행안전';}
          setFloatingCollapsed(true);
        });li.append(button);list.append(li);
      }
      top.append(list);
    }else{
      const p=document.createElement('p');p.textContent='현재 조건에서 10m 이상의 조명 미도달 추정 연속 구간이 없습니다.';top.append(p);
    }
    changeVisibility();
  };
  const loadLights=()=>{
    if(lightsPromise)return lightsPromise;
    lightsPromise=(async()=>{
      const [street,security]=await Promise.all([jsonOrError(`${DATA_ROOT}lights.json`),jsonOrError(`${DATA_ROOT}security.json`)]);
      if(!Array.isArray(street)||!Array.isArray(security))throw new Error('조명 JSON 형식 오류');
      lights=[...street.map(l=>({...l,security:false})),...security.map(l=>({...l,security:true}))].filter(isValidLight);
      if(lights.length<100)throw new Error('조명 위치 데이터가 충분하지 않습니다');
      const lat0=lights.reduce((sum,l)=>sum+l.lat,0)/lights.length;
      const lon0=lights.reduce((sum,l)=>sum+l.lon,0)/lights.length;
      const proj=makeProj(lat0,lon0),positions=lights.map(l=>proj.toXY(l.lat,l.lon));
      // A verified district polygon can arrive while the light JSON files
      // load. Preserve it instead of resetting the confirmed boundary.
      if(!scopeIsOfficial){cachedArea=EMPTY;cachedShield=EMPTY;}
      return {proj,positions};
    })().catch(error=>{lightsPromise=null;throw error;});
    return lightsPromise;
  };
  const loadOcclusion=()=>{
    if(occlusionPromise)return occlusionPromise;
    occlusionPromise=jsonOrError(`${DATA_ROOT}occlusion-light-reach.geojson`)
      .then(data=>{
        if(!isReachDataset(data,lights.length))throw new Error('건물 차폐 데이터와 조명 배열 불일치');
        visibility=data;
        if(lines)annotateVisibility(lines,lights,visibility);
        if(enabled){render();if(lines&&scopeIsOfficial)
          setStatus('상도1동 행정경계 적용 · 저장된 도로 분석 · 건물 차폐 반영');}
        return data;
      }).catch(error=>{
        occlusionPromise=null;visibility=null;
        console.warn('[야간 시야] 사전 차폐 데이터 없음',error);
        return null;
      });
    return occlusionPromise;
  };
  // The verified 2026-10 boundary is preferable, but must never block
  // already-downloaded road observations. Both requests run independently.
  // While the boundary is unavailable, display an explicitly provisional
  // whole-OSM-extract result, WITHOUT drawing a fake district outline.
  const ensureOfficialBoundary=()=>{
    if(scopeIsOfficial)return Promise.resolve(scope);
    if(boundaryLookup)return boundaryLookup;
    boundaryLookup=getSangdoBoundary(map).then(boundary=>{
      if(!['Polygon','MultiPolygon'].includes(boundary?.type))throw new Error('상도1동 경계 형식 오류');
      scope=boundary;scopeIsOfficial=true;
      if(lines)for(const line of lines)for(const p of line.samples||[])
        p.inScope=inGeometry(p.lon,p.lat,boundary);
      if(enabled&&lines){
        render();
        setStatus(`상도1동 2026-10 행정경계 적용 · ${analysisType()==='occlusion'?'건물 차폐 추정':'조명 거리 기반 추정'} · ${roadSource==='offline'?'저장된 도로 샘플':'OSM 실시간 조회'}`);
      }
      return boundary;
    }).catch(error=>{
      console.warn('[야간 시야] 공식 행정동 경계 조회 실패; 도로 결과는 임시 범위 표시',error);
      if(enabled&&lines)setStatus(PROVISIONAL_ROADS_NOTE);
      return null;
    }).finally(()=>{boundaryLookup=null;});
    return boundaryLookup;
  };
  const loadRoadAnalysis=()=>{
    if(roadsPromise)return roadsPromise;
    roadsPromise=(async()=>{
      const {proj,positions}=await loadLights();
      // Fetching admin polygons from admdongkor can wait on an external host.
      // Start that lookup, but DO NOT await it before reading local data.
      void ensureOfficialBoundary();
      // Start optional 1.2MB light-reach polygons independently: an unavailable
      // file must never delay the 3.7MB saved road-line sample results.
      void loadOcclusion().catch(error=>{
        console.warn('[야간 시야] 차폐 영향권 로딩 실패, 도로 분석은 계속합니다',error);
      });
      let dataset=null;
      let offlineError=null;
      try{
        const url=`${DATA_ROOT}occlusion-road-samples.json`;
        const response=await fetch(url,{cache:'no-cache'});
        if(!response.ok)throw new Error(`저장 도로 파일 HTTP ${response.status} (${url})`);
        dataset=await response.json();
        if(!Array.isArray(dataset?.lines)||dataset.lines.length<20)
          throw new Error('저장 도로 샘플 데이터 형식 또는 건수 오류');
      }catch(error){offlineError=error;dataset=null;
        console.warn('[야간 시야] 저장 도로 샘플 로딩 실패',error);}
      if(dataset){
        roadSource='offline';lines=dataset.lines;
        offlineOcclusionReady=lines.some(line=>(line.samples||[]).some(sample=>
          Object.hasOwn(sample,'dClear')));
        for(const line of lines)for(const p of line.samples||[]){
          // No official boundary: render all loaded way samples temporarily,
          // and say so plainly; never treat the old lighting hull as official.
          p.inScope=scopeIsOfficial?inGeometry(p.lon,p.lat,scope):true;
          if(!Number.isFinite(p.dClear))p.dClear=null;
          if(!Number.isFinite(p.dUncertain))p.dUncertain=null;
        }
      }else{
        roadSource='online';offlineOcclusionReady=false;
        // If offline samples are missing, report why instead of leaving the
        // user staring at an endless "loading" status.
        setStatus(`저장 도로 파일을 읽지 못했습니다 (${offlineError?.message||'알 수 없는 오류'}). OSM 연결을 확인합니다…`);
        const ways=await fetchSangdoRoads(lights);
        lines=sampleWays(ways,proj,5);
        annotate(lines,positions,p=>scopeIsOfficial?inGeometry(p.lon,p.lat,scope):true);
        annotateVisibility(lines,lights,visibility);
      }
      // The read source contains the full road result. Do not mark the data
      // as loaded until the line features actually exist in the GeoJSON source.
      render();
      if(!cachedOcc.features.length&&!cachedDark.features.length&&!cachedLit.features.length)
        throw new Error('도로 샘플은 읽었지만 표시 가능한 분석선이 생성되지 않았습니다');
      return lines;
    })().catch(error=>{roadsPromise=null;throw error;});
    return roadsPromise;
  };
  const setMode=async on=>{
    const next=Boolean(on);
    if(enabled===next)return;
    if(next&&nightActivationBlocked(app)){
      const hint=document.getElementById('route-pick-text');
      if(hint&&!document.getElementById('route-pick-hint')?.hidden)
        hint.textContent='출발지 또는 목적지 선택을 마치거나 취소한 뒤 야간 시야를 켜 주세요.';
      else toast('길찾기 위치 선택·안내를 종료한 뒤 야간 시야를 켜 주세요.');
      return;
    }
    // Request exclusive mode before enabling night overlays/theme.
    if(next){
      // Night view owns one single docked report. Close competing drawers and
      // road-width legend BEFORE switching map paint/theme. Without this the
      // previous options drawer appeared underneath the night report.
      const overview=document.getElementById('overview-sheet');
      if(overview) overview.hidden=true;
      app.classList.remove('map-controls-open','map-safety-open');
      document.getElementById('map-options-backdrop')?.setAttribute('hidden','');
      document.getElementById('map-safety-backdrop')?.setAttribute('hidden','');
      document.getElementById('map-tools-toggle')?.setAttribute('aria-expanded','false');
      document.getElementById('map-safety-toggle')?.setAttribute('aria-expanded','false');
      const widthButton=document.getElementById('toggle-road-width');
      if(widthButton?.getAttribute('aria-pressed')==='true')widthButton.click();
    }
    if(next)await onActivate();
    enabled=next;
    // v7.0.25: set the analysis flag FIRST. The theme renderer uses this flag
    // to paint 3D buildings, so restoring the map before clearing it left some
    // buildings artificially dark even after night mode was switched off.
    if(enabled)themeBeforeNight=theme?.currentTheme?.()??null;
    app.dataset.sangdoNight=enabled?'on':'off';
    if(enabled){poiIsolation.set(true);applyTemporaryTheme('dark');}
    else{
      if(themeBeforeNight)applyTemporaryTheme(themeBeforeNight);
      themeBeforeNight=null;
    }
    theme?.refresh?.();
    if(!enabled)poiIsolation.set(false);else poiIsolation.reconcile();
    // A tile/style update can finish after the mode changes: re-paint on idle.
    if(!enabled){
      const restore=()=>{if(!enabled){theme?.refresh?.();map.triggerRepaint?.();}};
      map.once?.('idle',restore);
      // Style-derived layers may finish repainting after the first idle.
      setTimeout(restore,160);setTimeout(restore,480);
    }
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.textContent=enabled?'야간 시야 끄기':'야간 시야 켜기';
    controls.hidden=!enabled;
    // v7.0.9: Preserve the dedicated action while analysis is running.
    // The same button becomes "야간 시야 해제" so users can always leave night mode.
    quickOff.hidden=false;
    quickOff.setAttribute('aria-pressed',String(enabled));
    quickOff.setAttribute('aria-label',enabled?'야간 시야 끄기':'야간 시야 켜기');
    renderNightQuickAction();
    if(enabled)showFloating();
    else parkFloating();
    if(!enabled){popup?.remove();popup=null;changeVisibility();return;}
    // If a previous boundary request failed, retry next time night mode opens.
    if(lines&&!scopeIsOfficial)void ensureOfficialBoundary();
    setStatus('상도1동 조명 자료를 불러오는 중입니다…');
    if(map.getZoom()<13.5||Math.abs(map.getCenter().lng-126.9513)>.035||Math.abs(map.getCenter().lat-37.5015)>.030){
      map.flyTo({center:[126.9513,37.5015],zoom:14.7,pitch:15,duration:900});
    }
    try{
      await loadLights();
      if(!enabled)return;
      setStatus('가로등·보안등 및 건물 차폐 범위를 표시했습니다. 저장된 도로망 또는 OSM 자료를 확인합니다…');
      await loadRoadAnalysis();
      if(!enabled)return;
      setStatus(scopeIsOfficial?`상도1동 2026-10 행정경계 기준 · ${analysisType()==='occlusion'?'건물 차폐 추정':'조명 거리 기반 추정'} · ${roadSource==='offline'?'저장된 도로 샘플':'OSM 실시간 조회'}(확보된 도로에 한함)`:PROVISIONAL_ROADS_NOTE);
      changeVisibility();
    }catch(error){
      console.error('[야간 시야]',error);
      if(!enabled)return;
      setStatus(String(error?.message||'').includes('경계')?'2026-10 상도1동 행정경계를 확인하지 못했습니다. 잘못된 임시 범위를 표시하지 않습니다.':lights.length?'도로 중심선 조회 실패 · 저장된 데이터를 확인해 주세요.':'조명 데이터를 읽지 못했습니다. 파일 설치를 확인하세요.');
      toast('야간 시야 분석 데이터 조회에 실패했습니다. 보행안전 메뉴의 안내를 확인하세요.');
      changeVisibility();
    }
  };
  const rerender=()=>{
    if(!enabled||!lights.length)return;
    popup?.remove();popup=null;render();
    changeVisibility();
  };
  // Routes started during active night analysis win over the night dock.
  // This releases the old mode before showing route panels and avoids white overlays.
  const routeObserver=new MutationObserver(()=>{
    if(enabled&&nightActivationBlocked(app))void setMode(false);
  });
  routeObserver.observe(app,{attributes:true,attributeFilter:['class']});
  toggle.addEventListener('click',()=>{void setMode(!enabled);});
  quickOff.hidden=false;
  quickOff.setAttribute('aria-pressed','false');
  renderNightQuickAction();
  quickOff.addEventListener('click',()=>{void setMode(!enabled);});
  // The rail can be mounted before MapLibre load. Expose readiness only after listeners exist.
  app.dataset.sangdoNight='off';
  app.dataset.djNightReady='true';
  toggle.disabled=false;quickOff.disabled=false;
  floatingCollapse?.addEventListener('click',()=>setFloatingCollapsed(!floatingContent.hidden));
  floatingStop?.addEventListener('click',()=>{const finish=()=>{void setMode(false);};if(window.DongjakWindowMotion)window.DongjakWindowMotion.close(floating,finish);else finish();});
  // Swipe the mobile bottom-sheet header up to expand, down to collapse.
  // Gestures never hijack button clicks or map drags outside the sheet.
  if(floatingHead){
    let touchStartY=null;
    floatingHead.addEventListener('touchstart',event=>{
      touchStartY=event.target?.closest?.('button')?null:event.touches?.[0]?.clientY??null;
    },{passive:true});
    floatingHead.addEventListener('touchend',event=>{
      if(touchStartY===null)return;
      const end=event.changedTouches?.[0]?.clientY;
      const delta=Number.isFinite(end)?end-touchStartY:0;
      touchStartY=null;
      if(Math.abs(delta)<45 || !(globalThis.window?.matchMedia?.('(max-width: 700px)').matches))return;
      setFloatingCollapsed(delta>0);
    },{passive:true});
  }
  for(const control of [radius,excludeMajor,showAlley,showPath])control?.addEventListener('input',rerender);
  map.on('style.load',()=>{nativeLinePaintMuted=false;if(enabled)queueMicrotask(()=>{try{ensureLayers();rerender();}catch(error){console.warn('[야간 시야] 스타일 복구 실패',error);}});});
  // The district layer can finish loading *after* the first boundary query.
  // Re-check the very same MapLibre source then; don't wait for an unrelated
  // GitHub parquet request to finish before cropping lights and road results.
  let boundaryFromSourcePending=false;
  let terrainDataChanged=false;
  map.on('terrain',()=>{terrainDataChanged=true;});
  map.on('sourcedata',event=>{
    if(enabled&&event?.sourceId==='dongjak-terrain-dem')terrainDataChanged=true;
    if(!enabled||scopeIsOfficial||event?.sourceId!=='dongjak-admin-dongs'||boundaryFromSourcePending)return;
    boundaryFromSourcePending=true;
    void readBoundaryFromMap(map).then(geometry=>{
      if(!isBoundary(geometry)||scopeIsOfficial)return;
      saveBoundaryCache(geometry);
      scope=geometry;scopeIsOfficial=true;
      if(lines)for(const line of lines)for(const p of line.samples||[])
        p.inScope=inGeometry(p.lon,p.lat,geometry);
      if(enabled){render();setStatus('상도1동 2026-10 행정경계 적용 · 저장된 도로 분석');}
    }).finally(()=>{boundaryFromSourcePending=false;});
  });
  // Other map modules can insert layers after the night layer is created.
  // Repair order only on idle, and only if it has actually changed.
  map.on('idle',()=>{
    if(terrainDataChanged&&nativeRoads.isActive()){nativeRoads.invalidateTerrain();terrainDataChanged=false;}
    if(visibleLayers()){promoteNightAnalysisLayers(map);placeLampsBelowBuildings();}
  });
  map.on('zoomend',()=>{if(visibleLayers())changeVisibility();});
  map.on('pitch',()=>{
    if(!visibleLayers())return;
    // No style mutations on every pitched frame; only switch the native road
    // renderer when crossing its genuine 24 degree transition.
    if(nativeRoads.isActive()!==lastNativeActive)changeVisibility();
  });
  const observer=new MutationObserver(()=>{changeVisibility();updateFloatingVisibility();});
  observer.observe(app,{attributes:true,attributeFilter:['data-tab']});
  return {isEnabled:()=>enabled,enable:()=>setMode(true),disable:()=>setMode(false),refresh:rerender};
}
