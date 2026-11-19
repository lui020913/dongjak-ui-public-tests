import {promoteReadable3DLabelLayers} from './readable-3d-labels.js';
/**
 * Georeferenced metro entrances and verified accessibility equipment.
 * 1) local transport proxy -> 2) public ArcGIS exit points if proxy is absent.
 * Never assign a staircase / escalator / elevator type without authoritative evidence.
 */
const EMPTY={type:'FeatureCollection',features:[]};
const EXIT_API='https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0/query';
const BBOX=[126.885,37.462,127.023,37.538];
const CACHE_KEY='dj_accessibility_verified_locations_v3';
const SPEC={
  exit:{name:'출입구',color:'#2777b7',label:''},
  elevator:{name:'엘리베이터',color:'#168765',label:'EV'},
  escalator:{name:'에스컬레이터',color:'#9060b0',label:'ES'},
  stairs:{name:'계단',color:'#b86f38',label:'계'}
};
export const FACILITY_TYPES=Object.keys(SPEC);
export function isKnownAccessibility(f){
  return FACILITY_TYPES.includes(f?.properties?.type) && f?.geometry?.type==='Point'
    && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length===2
    && f.geometry.coordinates.every(Number.isFinite);
}
function inRange(x,y){return x>=BBOX[0]&&x<=BBOX[2]&&y>=BBOX[1]&&y<=BBOX[3];}
export function entranceNumber(raw){
  const text=String(raw||'').trim();
  const hit=text.match(/(?:^|\s|출입구\s*|출구\s*)(\d{1,2}(?:[-‐‑–]\d{1,2})?)(?=\s*번|\s*출입구|\s*출구|\s*$)/i);
  return hit?hit[1].replace(/[‐‑–]/g,'-'):'';
}
/** Only Dongjak-gu metro entrances AND mobility equipment are drawn. */
export function filterDistrictAccessibility(features,isInDistrict=()=>false){
  return (features||[]).filter(f=>isKnownAccessibility(f)&&
    isInDistrict(...f.geometry.coordinates)===true);
}


/** Optional fallback using verified subway_entrance POIs already present in rendered basemap tiles. */
export function parseVisibleOSMEntranceFeatures(features=[]){
  const output=[],seen=new Set();
  for(const f of features){
    if(f?.geometry?.type!=='Point')continue;
    const p=f.properties||{};
    const category=String(p.subclass||p.type||p.osm_value||'').toLowerCase();
    if(category!=='subway_entrance'&&category!=='station_entrance')continue;
    const coords=f.geometry.coordinates;
    const lng=Number(coords?.[0]),lat=Number(coords?.[1]);
    if(!Number.isFinite(lng)||!Number.isFinite(lat)||!inRange(lng,lat))continue;
    const number=entranceNumber(p.ref||p.entrance||p.name||p.exit_no||p.entrance_no||'');
    const key=`${lng.toFixed(6)},${lat.toFixed(6)}`;
    if(seen.has(key))continue;
    seen.add(key);
    output.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},
      properties:{type:'exit',station:String(p.name||'').slice(0,50),number,
        label:number?`${number}번 출구`:'출입구',equipment:'unknown',source:'OpenStreetMap-verified-subway_entrance'}});
  }
  return output;
}
/** ArcGIS REST f=json response -> only actual georeferenced station entrance points. */
export function parsePublicExitArcGIS(data){
  const results=[],seen=new Set();
  for(const f of data?.features||[]){
    const coords=f?.geometry?.coordinates;
    const lng=Number(Array.isArray(coords)?coords[0]:f?.geometry?.x);
    const lat=Number(Array.isArray(coords)?coords[1]:f?.geometry?.y);
    if(!Number.isFinite(lng)||!Number.isFinite(lat)||!inRange(lng,lat))continue;
    const attrs=f?.attributes||f?.properties||{};
    const station=String(attrs.stn_nm||attrs.STN_NM||'').trim().slice(0,50);
    const number=entranceNumber(attrs.entrc_no||attrs.ENTRC_NO||attrs.entrc_nm||attrs.ENTRC_NM||attrs.entrance_no||attrs.ENTRANCE_NO||'');
    const key=String(attrs.sub_ent_sn||attrs.SUB_ENT_SN||'')||`${lng.toFixed(6)},${lat.toFixed(6)},${number}`;
    if(seen.has(key))continue;seen.add(key);
    results.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},
      properties:{type:'exit',station,number,label:number?`${number}번 출구`:'출입구',
        equipment:'unknown',source:'MOIS-2026-04-30'}});
  }
  return {type:'FeatureCollection',features:results};
}
function makeArcGISQuery(){
  const url=new URL(EXIT_API);
  for(const [k,v] of Object.entries({
    where:'1=1',geometry:BBOX.join(','),geometryType:'esriGeometryEnvelope',
    inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',
    outFields:'sub_ent_sn,entrc_no,entrc_nm,stn_cd,stn_nm,sub_nm',
    returnGeometry:'true',resultRecordCount:'2000',f:'json'
  }))url.searchParams.set(k,v);
  return url.toString();
}
async function fetchJson(url,timeout=9000){
  const ac=new AbortController();
  const timer=setTimeout(()=>ac.abort(),timeout);
  try{
    const res=await fetch(url,{signal:ac.signal,headers:{Accept:'application/json'}});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const data=await res.json();
    if(data?.error)throw new Error(`서비스 오류 ${data.error.code||''}`);
    return data;
  }finally{clearTimeout(timer);}
}
async function fetchAccessibility(){
  let proxyData=null,proxyError='';
  try{
    const raw=await fetchJson('/api/transport/accessibility',7000);
    if(raw?.features?.type==='FeatureCollection')proxyData=raw;
    else throw new Error('응답 구조 불일치');
  }catch(error){proxyError=error?.message||'서버 연결 실패';}
  const known=(proxyData?.features?.features||[]).filter(isKnownAccessibility);
  const hasExits=known.some(f=>f.properties.type==='exit');
  if(hasExits && known.filter(f=>f.properties.type==='exit').every(f=>f.properties.number))return {geo:{...EMPTY,features:known},source:'서울시 교통정보 서버',warning:''};
  // Old 5178 server may lack the accessibility endpoint. Query the authoritative
  // ArcGIS layer directly rather than leaving the user with an invisible layer.
  try{
    const response=await fetchJson(makeArcGISQuery(),11000);
    const exits=parsePublicExitArcGIS(response).features;
    if(exits.length){
      const key=f=>`${f.properties.type}:${f.geometry.coordinates.map(v=>v.toFixed(6)).join(':')}:${f.properties.number||''}`;
      // Prefer authoritative numbered exits over unnamed proxy points in the same place.
      // Merge only at matching coordinates; never assign a nearby exit's number by guess.
      const merged=new Map([...known,...exits].map(f=>[key(f),f]));
      for(const [k,f] of merged){
        if(f.properties.type!=='exit'||f.properties.number)continue;
        const match=exits.find(x=>x.properties.number && x.geometry.coordinates.every((v,i)=>Math.abs(v-f.geometry.coordinates[i])<0.000015));
        if(match)merged.set(k,{...f,properties:{...f.properties,number:match.properties.number,label:match.properties.label}});
      }
      return {geo:{...EMPTY,features:[...merged.values()]},source:'공개 역사 출입구 좌표(직접 조회)',
        warning:proxyError?'5178 서버의 출구 API는 연결되지 않았습니다.':''};
    }
    throw new Error('출구 좌표 0건');
  }catch(error){
    if(known.length)return {geo:{...EMPTY,features:known},source:'교통정보 서버',warning:'출구 좌표 별도 조회 실패'};
    throw new Error(`5178: ${proxyError||'데이터 없음'} / 공개 출구 API: ${error?.message||'연결 실패'}`);
  }
}
function readCache(){
  try{
    const cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
    if(cache?.features?.length)return {...EMPTY,features:cache.features.filter(isKnownAccessibility)};
  }catch{}
  return null;
}
function writeCache(geo){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify({features:geo.features}));}catch{}
}
export function createAccessibilityPopupContent(p,doc=document){
  const box=doc.createElement('div');box.className='safety-popup';
  const title=doc.createElement('strong');
  const number=String(p.number||'').slice(0,16);
  title.textContent=p.type==='exit'?
    `${String(p.station||'지하철').slice(0,65)} ${number?`${number}번 출구`:'출입구'}`:
    `${String(p.station||'지하철').slice(0,65)} · ${SPEC[p.type]?.name||'교통약자 시설'}`;
  const desc=doc.createElement('p');
  desc.textContent=p.type==='exit'
    ? '출입구 위치 확인 · 계단/에스컬레이터/엘리베이터 설치 여부는 이 자료에 없습니다.'
    : `${SPEC[p.type]?.name||'시설'} 위치 · 운영 및 고장 상태는 별도 확인이 필요합니다.`;
  const source=doc.createElement('small');
  source.textContent=p.verified?`현장확인 ${String(p.observedAt||'')} · ${String(p.source||'')}`
    :`자료: ${String(p.source||'공공시설 위치정보')} · 출입 전 현장 확인`;
  box.append(title,desc,source);return box;
}
export function initStationAccessibility({map,maplibregl,isInDistrict=()=>false,canOpen=()=>true}){
  const button=document.getElementById('toggle-station-accessibility');
  const status=document.getElementById('metro-access-status');
  const retry=document.getElementById('metro-access-retry');
  const source='metro-accessibility-local';
  map.addSource(source,{type:'geojson',data:EMPTY});
  const firstLabel=map.getStyle().layers.find(x=>x.type==='symbol')?.id;
  const numberedExitFilter=['all',['==',['get','type'],'exit'],
    ['!=',['coalesce',['get','number'],''],'']];
  // Accessible-facility icons are drawn as compact pictograms so they stand out
  // from subway badges. They are only shown at close zoom to avoid clutter.
  function roundedRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }
  function registerAccessibilityPictogram(type){
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
    const ctx=canvas.getContext('2d');
    if(!ctx)return false;
    const bg=SPEC[type]?.color||'#168765';
    roundedRect(ctx,8,8,48,48,14);
    ctx.fillStyle=bg;ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle='#ffffff';ctx.stroke();
    ctx.strokeStyle='#ffffff';ctx.fillStyle='#ffffff';ctx.lineWidth=4.2;
    ctx.lineCap='round';ctx.lineJoin='round';
    if(type==='elevator'){
      ctx.strokeRect(19,16,26,30);
      ctx.beginPath();ctx.moveTo(32,19);ctx.lineTo(32,43);ctx.stroke();
      ctx.beginPath();ctx.moveTo(24,24);ctx.lineTo(28,20);ctx.lineTo(32,24);ctx.moveTo(24,38);ctx.lineTo(28,42);ctx.lineTo(32,38);ctx.stroke();
      ctx.beginPath();ctx.moveTo(40,24);ctx.lineTo(36,20);ctx.lineTo(32,24);ctx.moveTo(40,38);ctx.lineTo(36,42);ctx.lineTo(32,38);ctx.stroke();
    }else if(type==='stairs'){
      ctx.beginPath();ctx.moveTo(16,42);ctx.lineTo(24,42);ctx.lineTo(24,34);ctx.lineTo(32,34);ctx.lineTo(32,26);ctx.lineTo(40,26);ctx.lineTo(40,18);ctx.lineTo(48,18);ctx.stroke();
    }else{
      ctx.beginPath();ctx.moveTo(16,41);ctx.lineTo(23,41);ctx.lineTo(41,22);ctx.lineTo(48,22);ctx.stroke();
      ctx.beginPath();ctx.moveTo(20,48);ctx.lineTo(45,20);ctx.stroke();
    }
    try{map.addImage(`dj-access-${type}`,{width:64,height:64,data:ctx.getImageData(0,0,64,64).data});return true;}catch{return false;}
  }
  for(const type of ['elevator','escalator','stairs']){
    registerAccessibilityPictogram(type);
  }
  map.addLayer({id:'metro-access-exits',type:'circle',source,minzoom:14.7,
    filter:numberedExitFilter,
    paint:{'circle-radius':['interpolate',['linear'],['zoom'],16.1,8.4,18,12.8],
      'circle-color':SPEC.exit.color,'circle-stroke-color':'#ffffff','circle-stroke-width':2.2,
      'circle-opacity':0.98}},firstLabel);
  map.addLayer({id:'metro-access-exit-labels',type:'symbol',source,minzoom:14.9,
    filter:numberedExitFilter,
    layout:{'text-field':['get','number'],'text-size':['interpolate',['linear'],['zoom'],14.9,8.7,18,12.5],
      'text-font':['Noto Sans Bold','Open Sans Semibold','Open Sans Regular'],
      'text-allow-overlap':true,'text-ignore-placement':true,'text-optional':false,
      'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},
    paint:{'text-color':'#ffffff','text-halo-color':SPEC.exit.color,'text-halo-width':0.35}});
  for(const type of ['elevator','escalator','stairs']){
    map.addLayer({id:`metro-access-${type}`,type:'symbol',source,minzoom:type==='elevator'?17.4:17.6,
      filter:['==',['get','type'],type],
      layout:{'icon-image':`dj-access-${type}`,
        'icon-size':['interpolate',['linear'],['zoom'],17.4,0.42,18.8,0.58],
        'icon-allow-overlap':true,'icon-ignore-placement':true,
        'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport'}} ,firstLabel);
  }
  const exitLayers=['metro-access-exits','metro-access-exit-labels'];
  const equipmentLayers=['elevator','escalator','stairs'].map(type=>`metro-access-${type}`);
  const layers=[...exitLayers,...equipmentLayers];
  // Share one ordering policy; independent idle-time promotions caused style churn.
  map.on('idle',()=>promoteReadable3DLabelLayers(map));
  let enabled=true,loaded=false,pending=false;
  let lastCollection=EMPTY,lastVia='',lastWarning='';
  function setStatus(message){if(status)status.textContent=message;}
  function updateVisibility(){
    for(const id of exitLayers)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',enabled?'visible':'none');
    for(const id of equipmentLayers)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',enabled?'visible':'none');
  }
  function visibleBasemapEntrances(){
    if(map.getZoom()<13.5)return [];
    const seen=new Set(),results=[];
    for(const layer of map.getStyle().layers||[]){
      if(layer['source-layer']!=='poi'||!layer.source)continue;
      const key=`${layer.source}/poi`;
      if(seen.has(key))continue;
      seen.add(key);
      try{results.push(...parseVisibleOSMEntranceFeatures(map.querySourceFeatures(layer.source,{sourceLayer:'poi'})));}
      catch(error){console.debug('[지도 출입구 보완]',error?.message);}
    }
    return results;
  }
  function display(geo,via,warning=''){
    let raw=(geo?.features||[]).filter(isKnownAccessibility);
    { // Always supplement the public exit feed with individually numbered OSM entrances.
      const existing=new Set(raw.map(f=>`${f.properties.type}/${f.geometry.coordinates.map(v=>v.toFixed(6)).join('/')}`));
      const additional=visibleBasemapEntrances().filter(f=>!existing.has(`${f.properties.type}/${f.geometry.coordinates.map(v=>v.toFixed(6)).join('/')}`));
      if(additional.length)raw=[...raw,...additional];
    }
    if(!raw.length)throw new Error('표시 가능한 좌표 없음');
    lastCollection={...EMPTY,features:raw};lastVia=via;lastWarning=warning;
    const good=filterDistrictAccessibility(raw,isInDistrict).map(f=>{
      if(f.properties.type!=='exit')return f;
      const number=entranceNumber(f.properties.number||f.properties.label||'');
      return {...f,properties:{...f.properties,number}};
    });
    map.getSource(source)?.setData({...EMPTY,features:good});
    const counts=Object.fromEntries(FACILITY_TYPES.map(type=>[type,good.filter(f=>f.properties.type===type).length]));
    const numbered=good.filter(f=>f.properties.type==='exit'&&f.properties.number).length;
    setStatus(`번호 표시 출구 ${numbered}개 · 번호 미확인 ${Math.max(0,counts.exit-numbered)}개 숨김${warning?' · 일부 조회 실패':''}`);
    if(status)status.title=`${via} · 동작구 내부 출입구 및 편의시설만 표시 · ${warning||'데이터 확인 필요 시 현장 점검'}`;
  }
  let lastAccessibilityFailure=0;
  async function load(force=false){
    if(!enabled||pending||(!force&&loaded)||map.getZoom()<12.8)return;
    if(!force && lastAccessibilityFailure && Date.now()-lastAccessibilityFailure<10*60*1000)return;
    pending=true;setStatus('출구·편의시설 실제 좌표 조회 중…');
    try{
      const result=await fetchAccessibility();
      display(result.geo,result.source,result.warning);
      writeCache(result.geo);
      loaded=true;lastAccessibilityFailure=0;
    }catch(error){
      lastAccessibilityFailure=Date.now();
      const cached=readCache();
      if(cached?.features?.length){
        display(cached,'이전 조회 기록 · 최신 정보 확인 필요','offline');
        loaded=true;
      }else{
        const visible=visibleBasemapEntrances().filter(f=>f.properties.number);
        if(visible.length){
          display({...EMPTY,features:visible},'지도 출입구 태그', '공식 출입구 API 일시 실패');
          // Keep requesting the authoritative collection when a connection returns.
          loaded=false;
        }else setStatus('출구 번호 확인 불가 · 지도 타일 로딩 후 재조회하세요');
      }
      console.warn('[지하철 출입구/편의시설]',error?.message);
    }finally{pending=false;}
  }
  button?.addEventListener('click',()=>{
    enabled=!enabled;button.setAttribute('aria-pressed',String(enabled));
    updateVisibility();if(enabled)load();
  });
  retry?.addEventListener('click',()=>{loaded=false;load(true);});
  map.on('zoomend',()=>load());
  map.on('moveend',()=>{
    load();
    if(map.getZoom()>=14.8){
      const known=new Set(lastCollection.features.filter(f=>f.properties.type==='exit'&&f.properties.number)
        .map(f=>f.geometry.coordinates.map(n=>n.toFixed(6)).join(',')));
      const extra=visibleBasemapEntrances().filter(f=>f.properties.number &&
        !known.has(f.geometry.coordinates.map(n=>n.toFixed(6)).join(',')));
      if(extra.length)display({...EMPTY,features:[...lastCollection.features,...extra]},lastVia||'지도 출구 태그',lastWarning);
    }
  });
  for(const layer of layers){
    map.on('click',layer,event=>{
      if(!enabled||!canOpen())return;
      const f=event.features?.[0];if(!f)return;
      event.originalEvent?.stopPropagation?.();
      new maplibregl.Popup({offset:14,maxWidth:'310px'})
        .setLngLat(f.geometry?.coordinates||event.lngLat)
        .setDOMContent(createAccessibilityPopupContent(f.properties||{})).addTo(map);
    });
    map.on('mouseenter',layer,()=>{if(enabled)map.getCanvas().style.cursor='pointer';});
    map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';});
  }
  function bringToFront(){
    promoteReadable3DLabelLayers(map);
  }
  const cached=readCache();
  if(cached?.features?.length)display(cached,'이전 저장 좌표 · 다시 조회 가능');
  bringToFront();load();
  return {reload:()=>{loaded=false;load(true);},bringToFront,
    refreshBoundary:()=>{if(lastCollection.features.length)display(lastCollection,lastVia,lastWarning);}};
}
