import {koreanOSMName} from './korean-labels.js';
import {registerFacilityIcons,iconName} from './v912-poi-presentation.js';
import {openPlaceDetails} from './place-details.js';
import {coalesceViewportWork} from './adaptive-phone-map-budget.mjs';

// v17.11: 안전시설 및 횡단보도는 OSM 기여 데이터로 조회합니다.
// 확인되지 않은 시설을 임의로 생성하지 않습니다. 사용자가 레이어를 켰을 때만 요청합니다.
export const SAFETY_BBOX = '37.473,126.891,37.526,127.004';
const ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

export async function queryOverpass(query, timeoutMs = 14500) {
  let lastError;
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {signal: controller.signal});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.elements)) throw new Error('조회 형식 오류');
      return payload.elements;
    } catch (error) {
      lastError = error;
      console.warn('[안전 시설] OSM 조회 실패:', error);
    } finally { clearTimeout(timer); }
  }
  throw lastError || new Error('공간정보 조회 실패');
}

const empty = () => ({type:'FeatureCollection',features:[]});
const categoryLabels = {
  police:'경찰시설', fire_station:'소방시설', hospital:'병원', clinic:'의원', pharmacy:'약국',
  defibrillator:'자동심장충격기(AED)', crossing:'횡단보도(공개지도 등록 위치)', convenience:'편의점',
  government:'정부·공공기관',district_office:'구청',administrative_center:'행정복지센터·주민센터',senior_center:'경로당·노인정',daycare:'어린이집',school:'학교',park:'공원'
};
const FEATURED_DUPLICATE_NAMES = ['동작구청','국립서울현충원','중앙대학교','숭실대학교','총신대학교'];
export function duplicatesFeaturedPlace(name){
  const normalized=String(name||'').replace(/\s+/g,'');
  return FEATURED_DUPLICATE_NAMES.some(n=>normalized===n || normalized.startsWith(n+'(') || normalized.startsWith(n+'신청사') || normalized.startsWith(n+'서울캠퍼스'));
}
const categoryColors = {
  police:'#2861a9', fire_station:'#c33d37', hospital:'#b33b5b', clinic:'#9d4b6c',
  pharmacy:'#208769', defibrillator:'#8a56b2', crossing:'#7862c7', convenience:'#4689b8',
  government:'#6b6a9a',district_office:'#366a99',administrative_center:'#1b817b',senior_center:'#ad744a',daycare:'#cf6b9b',school:'#517bb1',park:'#52966c'
};
export function classifySafetyTags(tags = {}) {
  if (tags.shop === 'convenience') return 'convenience';
  if (tags.emergency === 'defibrillator') return 'defibrillator';
  if (['police','fire_station','hospital','clinic','pharmacy'].includes(tags.amenity)) return tags.amenity;
  return null;
}
export function classifyPublicTags(tags = {}) {
  const name=String(tags['name:ko']||tags.name||'');
  const amenity=String(tags.amenity||'');
  if(tags.leisure==='park')return 'park';
  if(amenity==='school')return 'school';
  if(amenity==='kindergarten'||amenity==='childcare'||tags.social_facility==='day_care'&&/어린이집|보육|유아/.test(name))return 'daycare';
  if(/경로당|노인정|노인회관/.test(name)||tags['social_facility:for']==='senior')return 'senior_center';
  if(/행정복지센터|주민센터|동사무소/.test(name))return 'administrative_center';
  if(/구청/.test(name) && (amenity==='townhall'||tags.office==='government'||tags.building==='government'))return 'district_office';
  if(amenity==='townhall'||tags.office==='government'||tags.building==='government'||amenity==='public_building')return 'government';
  return null;
}
export function safetyFeatures(elements, isInside, mode) {
  const used = new Set();
  const features = [];
  for (const e of elements || []) {
    const tags = e.tags || {};
    const name = koreanOSMName(tags,'');
    const kind = mode === 'crossing' ? (tags.highway === 'crossing' ? 'crossing' : '') : mode === 'public' ? classifyPublicTags(tags) : classifySafetyTags(tags);
    if (!kind) continue;
    if (mode === 'essentials' && !['pharmacy','convenience'].includes(kind))continue;
    if (mode === 'safety' && kind === 'convenience')continue;
    if(mode==='public' && duplicatesFeaturedPlace(name)) continue;
    const pos = e.center || e;
    const lng = Number(pos.lon), lat = Number(pos.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || isInside(lng,lat) !== true) continue;
    const key = `${e.type}/${e.id}`;
    if (used.has(key)) continue;
    used.add(key);
    features.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{
      id:key,kind,name:koreanOSMName(tags,categoryLabels[kind]),
      description:categoryLabels[kind], crossing_signal:tags.crossing === 'traffic_signals' ? 'OSM 신호 시설 태그 있음' : '신호 여부 미확인',
      address:String(tags['addr:full']||[tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' ')||''),
      phone:String(tags['contact:phone']||tags.phone||''),
      website:String(tags['contact:website']||tags.website||''),
      source:'© OpenStreetMap 기여자'
    }});
  }
  return {type:'FeatureCollection',features};
}

export function installSafetyLayers({map,maplibregl,isDongjak,canOpen=()=>true}) {
  const controls = [
    {mode:'safety',button:document.getElementById('toggle-safety-facilities'),source:'dongjak-safety-places',layers:['safety-points','safety-glyphs','safety-hospital-overview','safety-hospital-names']},
    {mode:'crossing',button:document.getElementById('toggle-crosswalks'),source:'dongjak-crosswalks',layers:['crosswalk-points','crosswalk-glyphs']},
    {mode:'essentials',button:document.getElementById('toggle-essentials'),source:'dongjak-essential-places',layers:['essential-points','essential-glyphs']},
    {mode:'public',button:document.getElementById('toggle-public-facilities'),source:'dongjak-public-places',layers:['public-points','public-glyphs','public-names']}
  ];
  const statusEl = document.getElementById('safety-layer-status');
  const state = {safety:{loaded:false,busy:false,active:false},crossing:{loaded:false,busy:false,active:false},essentials:{loaded:false,busy:false,active:false},public:{loaded:false,busy:false,active:false}};
  const safeText = (text) => String(text||'').slice(0,140);
  const addLayer = layer => {if (!map.getLayer(layer.id)) map.addLayer(layer);};
  // Shared vector pictograms replace one-character placeholders on mobile.
  registerFacilityIcons(map);
  for (const ctl of controls) map.addSource(ctl.source,{type:'geojson',data:empty()});
  // Hospitals remain visible in the entire district view, while other safety POIs appear on zoom-in.
  // This layer is tied to the existing Safety toggle and never represents unverified locations.
  addLayer({id:'safety-hospital-overview',type:'circle',source:'dongjak-safety-places',minzoom:10.5,maxzoom:12.4,
    filter:['==',['get','kind'],'hospital'],layout:{visibility:'none'},
    paint:{'circle-radius':['interpolate',['linear'],['zoom'],10.5,6,12.3,9],
      'circle-color':'#b53855','circle-stroke-color':'#fff','circle-stroke-width':2.2,'circle-opacity':0.98}});
  addLayer({id:'safety-hospital-names',type:'symbol',source:'dongjak-safety-places',minzoom:11.0,maxzoom:12.4,
    filter:['==',['get','kind'],'hospital'],layout:{visibility:'none','text-field':['get','name'],
      'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':12,'text-offset':[0,1.15],
      'text-optional':true,'text-allow-overlap':false,'text-pitch-alignment':'viewport'},
    paint:{'text-color':'#a82e4b','text-halo-color':'#ffffff','text-halo-width':2}});
  addLayer({id:'safety-points',type:'circle',source:'dongjak-safety-places',minzoom:12.4,
    layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],12.4,5.5,16,9],
      'circle-color':['match',['get','kind'],...Object.entries(categoryColors).filter(([key])=>key!=='crossing').flat(), '#456b88'],
      'circle-stroke-color':'#fff','circle-stroke-width':2.2,'circle-opacity':0.97}});
  addLayer({id:'safety-glyphs',type:'symbol',source:'dongjak-safety-places',minzoom:12.4,
    layout:{visibility:'none','text-field':['match',['get','kind'], 'police','P','fire_station','F','hospital','H','clinic','+','pharmacy','+','defibrillator','A','!'],
      'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':12,'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport','text-allow-overlap':true},
    paint:{'text-color':'#fff','text-halo-color':'#33443b','text-halo-width':0.25}});
  addLayer({id:'essential-points',type:'circle',source:'dongjak-essential-places',minzoom:15,
    layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],15,6,17,9],
      'circle-color':['match',['get','kind'],'pharmacy','#208769','convenience','#4387b6','#4d8491'],
      'circle-stroke-color':'#fff','circle-stroke-width':2.1,'circle-opacity':0.98}});
  addLayer({id:'essential-glyphs',type:'symbol',source:'dongjak-essential-places',minzoom:15,
    layout:{visibility:'none','text-field':['match',['get','kind'],'pharmacy','+','convenience','C','?'],
      'text-font':['Open Sans Bold','Open Sans Regular'],'text-size':11,
      'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport','text-allow-overlap':true},
    paint:{'text-color':'#fff','text-halo-color':'#204a45','text-halo-width':0.25}});
  addLayer({id:'public-points',type:'circle',source:'dongjak-public-places',minzoom:13.1,
    layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],13.1,4.8,16.5,8.3],
      'circle-color':['match',['get','kind'],...Object.entries(categoryColors).filter(([key])=>['government','district_office','administrative_center','senior_center','daycare','school','park'].includes(key)).flat(),'#638c77'],
      'circle-stroke-color':'#fff','circle-stroke-width':1.8,'circle-opacity':0,'circle-stroke-opacity':0}});
  addLayer({id:'public-glyphs',type:'symbol',source:'dongjak-public-places',minzoom:13.1,
    layout:{visibility:'none',
      'icon-image':['match',['get','kind'],'daycare',iconName('school'),
        'school',iconName('school'),'park',iconName('park'),iconName('civic')],
      'icon-size':['interpolate',['linear'],['zoom'],13.1,.60,16,.78,18,.90],
      'icon-anchor':'center','icon-allow-overlap':false,'icon-ignore-placement':false,
      'icon-padding':1,'icon-optional':false,'icon-pitch-alignment':'viewport',
      'icon-rotation-alignment':'viewport'}});
  addLayer({id:'public-names',type:'symbol',source:'dongjak-public-places',minzoom:15.2,
    // Park labels already have one canonical vector owner.
    filter:['!=',['get','kind'],'park'],
    layout:{visibility:'none','text-field':['get','name'],'text-font':['Noto Sans Regular','Open Sans Regular'],
      'text-size':['interpolate',['linear'],['zoom'],15.2,10,17,12],
      'text-variable-anchor':['top','bottom','right','left'],'text-radial-offset':1.1,
      'text-optional':true,'text-max-width':12,'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},
    paint:{'text-color':'#2c5e59','text-halo-color':'#ffffff','text-halo-width':1.6}});
  addLayer({id:'crosswalk-points',type:'circle',source:'dongjak-crosswalks',minzoom:14.2,
    layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],14.2,4.8,17,7.7],
      'circle-color':'#6e54bc','circle-stroke-color':'#fff','circle-stroke-width':1.7}});
  addLayer({id:'crosswalk-glyphs',type:'symbol',source:'dongjak-crosswalks',minzoom:14.2,
    layout:{visibility:'none','text-field':'X','text-font':['Open Sans Regular'],'text-size':9,
      'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport','text-allow-overlap':true},
    paint:{'text-color':'#fff'}});

  function updateStatus(message){if(statusEl) statusEl.textContent = message;}
  // Keep both async success and failure from invalidating symbol placement mid-pan.
  const pendingSources=new Map(),pendingVisibility=new Map();
  const publish=coalesceViewportWork(()=>{
    for(const [id,data] of pendingSources){map.getSource(id)?.setData(data);pendingSources.delete(id);}
    for(const [id,desired] of pendingVisibility){if(map.getLayer(id)&&(map.getLayoutProperty(id,'visibility')||'visible')!==desired)map.setLayoutProperty(id,'visibility',desired);pendingVisibility.delete(id);}
  },{delay:350,isMoving:()=>map.isMoving?.()===true});
  function setControlVisibility(ctl,visible){
    const desired=visible?'visible':'none';
    for(const id of ctl.layers){
      if(map.isMoving?.()){pendingVisibility.set(id,desired);publish.request();continue;}
      pendingVisibility.delete(id);
      if(map.getLayer(id)&&(map.getLayoutProperty(id,'visibility')||'visible')!==desired)map.setLayoutProperty(id,'visibility',desired);
    }
  }
  for (const ctl of controls) {
    const s = state[ctl.mode];
    const button = ctl.button;
    if (!button) continue;
    button.addEventListener('click', async () => {
      s.active = !s.active;
      button.setAttribute('aria-pressed',String(s.active));
      setControlVisibility(ctl,s.active);
      if(!s.active || s.loaded || s.busy) return;
      s.busy = true;
      button.disabled = true;
      updateStatus(ctl.mode==='safety' ? '안전시설 위치 조회 중…' : ctl.mode==='essentials' ? '약국·편의점 위치 조회 중…' : ctl.mode==='public' ? '공공·교육시설 위치 조회 중…' : '횡단보도 위치 조회 중…');
      try {
        const query = ctl.mode==='safety'
          ? `[out:json][timeout:25];(nwr["amenity"~"^(police|fire_station|hospital|clinic|pharmacy)$"](${SAFETY_BBOX});nwr["emergency"="defibrillator"](${SAFETY_BBOX}););out center tags;`
          : ctl.mode==='essentials'
            ? `[out:json][timeout:25];(nwr["amenity"="pharmacy"](${SAFETY_BBOX});nwr["shop"="convenience"](${SAFETY_BBOX}););out center tags;`
            : ctl.mode==='public'
              ? `[out:json][timeout:25];(nwr["amenity"~"^(townhall|community_centre|social_facility|kindergarten|childcare|school|public_building)$"](${SAFETY_BBOX});nwr["office"="government"](${SAFETY_BBOX});nwr["building"="government"](${SAFETY_BBOX});nwr["leisure"="park"](${SAFETY_BBOX}););out center tags;`
              : `[out:json][timeout:25];node["highway"="crossing"](${SAFETY_BBOX});out tags;`;
        const data = safetyFeatures(await queryOverpass(query),isDongjak,ctl.mode);
        pendingSources.set(ctl.source,data);publish.request();
        s.loaded=true;
        updateStatus(`${ctl.mode==='safety'?'안전시설':ctl.mode==='essentials'?'약국·편의점':ctl.mode==='public'?'공공·교육시설':'횡단보도'} ${data.features.length.toLocaleString()}곳 · OSM 등록 자료`);
      } catch(error) {
        s.active=false;
        button.setAttribute('aria-pressed','false');
        setControlVisibility(ctl,false);
        updateStatus('공개지도 자료 연결 실패 · 잠시 후 다시 선택');
      } finally { s.busy=false;button.disabled=false; }
    });
  }
  const processedClicks=new WeakSet();
  const onPoint=(event)=>{
    if(!canOpen())return;
    const feature=event.features?.[0];
    const p=feature?.properties;
    if(!p)return;
    // Symbol + point layers can both receive a click: one popup per pointer event.
    const original=event.originalEvent;
    if(original&&processedClicks.has(original))return;
    if(original)processedClicks.add(original);
    const coordinate=feature?.geometry?.type==='Point'?feature.geometry.coordinates:null;
    const lng=Number(coordinate?.[0]??event.lngLat?.lng);
    const lat=Number(coordinate?.[1]??event.lngLat?.lat);
    const note=p.kind==='crossing'
      ? `${p.crossing_signal||'신호 여부 미확인'} · 등록 위치는 실제 횡단 지점을 확정하지 않습니다.`
      : '공개지도에 등록된 시설 정보로, 실제 설치·운영 여부와 안전 수준은 현장 확인이 필요합니다.';
    openPlaceDetails({map,maplibregl,lngLat:{lng,lat},place:{
      name:safeText(p.name),type:safeText(p.description),
      lng,lat,address:p.address||'',phone:p.phone||'',website:p.website||'',
      source:p.source||'© OpenStreetMap 기여자',note
    }});
  };
  for(const id of ['safety-points','safety-glyphs','crosswalk-points','crosswalk-glyphs','essential-points','essential-glyphs','public-points','public-glyphs','public-names','safety-hospital-overview','safety-hospital-names']){
    map.on('click',id,onPoint);
    map.on('mouseenter',id,()=>{if(canOpen())map.getCanvas().style.cursor='pointer';});
    map.on('mouseleave',id,()=>{map.getCanvas().style.cursor='';});
  }
  // Important hospitals are a core map context and should be visible from district zoom.
  const safetyButton=document.getElementById('toggle-safety-facilities');
  if(safetyButton)queueMicrotask(()=>safetyButton.click());
  // Public facilities are a core map context: auto-enable them at useful zoom levels.
  // The user can disable/re-enable via the dedicated button.
  const publicButton=document.getElementById('toggle-public-facilities');
  if(publicButton)queueMicrotask(()=>publicButton.click());
  return state;
}

// OSM에 '한강대교'로 표기된 교량 구간을 정밀 모형 대신 상판의 개략 3D로 표현합니다.
export function makeBridgeDeckFeatures(elements, isInside, halfWidthMeters=10.5){
  const features=[];
  const seen=new Set();
  for(const element of elements||[]){
    if(element.type!=='way'||!Array.isArray(element.geometry))continue;
    const id=String(element.id);
    if(seen.has(id))continue;
    seen.add(id);
    const nodes=element.geometry;
    for(let i=0;i<nodes.length-1;i++){
      const a=nodes[i],b=nodes[i+1];
      const lngA=Number(a.lon),latA=Number(a.lat),lngB=Number(b.lon),latB=Number(b.lat);
      if(![lngA,latA,lngB,latB].every(Number.isFinite))continue;
      if(isInside((lngA+lngB)/2,(latA+latB)/2)!==true)continue;
      const cos=Math.cos((latA+latB)/2*Math.PI/180);
      const dx=(lngB-lngA)*111320*cos,dy=(latB-latA)*111320;
      const length=Math.hypot(dx,dy);
      if(length<1||length>350)continue;
      const offX=-dy/length*halfWidthMeters/(111320*cos),offY=dx/length*halfWidthMeters/111320;
      const ring=[[lngA+offX,latA+offY],[lngB+offX,latB+offY],[lngB-offX,latB-offY],[lngA-offX,latA-offY],[lngA+offX,latA+offY]];
      features.push({type:'Feature',properties:{name:element.tags?.name||'한강대교',kind:'schematic-bridge'},
        geometry:{type:'Polygon',coordinates:[ring]}});
    }
  }
  return {type:'FeatureCollection',features};
}
export function installBridgeDeck({map,isDongjak}){
  const source='dongjak-bridge-deck', layer='dongjak-bridge-deck-3d';
  map.addSource(source,{type:'geojson',data:empty()});
  const firstLabel=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
  map.addLayer({id:layer,type:'fill-extrusion',source,minzoom:13,
    layout:{visibility:map.getPitch()>12?'visible':'none'},
    paint:{'fill-extrusion-color':'#96b3b8','fill-extrusion-height':5,'fill-extrusion-base':1.4,'fill-extrusion-opacity':0.82}},firstLabel);
  const update=()=>{if(map.getLayer(layer))map.setLayoutProperty(layer,'visibility',map.getPitch()>12?'visible':'none');};
  map.on('pitch',update);
  const query=`[out:json][timeout:25];way["bridge"~"^(yes|viaduct)$"]["name"~"한강대교|Hangang Bridge",i](${SAFETY_BBOX});out body geom;`;
  queryOverpass(query).then(elements=>{
    const data=makeBridgeDeckFeatures(elements,isDongjak);
    map.getSource(source)?.setData(data);
    if(!data.features.length)console.info('[교량 3D] OSM 한강대교 상판 구간 없음: 기본 지도 유지');
  }).catch(error=>console.warn('[교량 3D] 공개 OSM 데이터 조회 실패; 기본 지도 유지',error));
}
