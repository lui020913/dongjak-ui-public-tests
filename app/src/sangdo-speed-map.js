/**
 * 상도1동 제한속도(사용자 제공 표준노드링크) + 공개 좌표가 확인된 단속카메라.
 * 원형 도로 속도 숫자는 기하학적 링크 중앙의 시각적 표지이며, 현장 표지판 위치가 아니다.
 * 단속카메라는 좌표가 없는 경우 절대로 임의의 지점을 생성하지 않는다.
 */
import {cameraImportPreview} from './sangdo-camera-import.js';
export const SPEED_COLORS=Object.freeze({10:'#bc3454',30:'#e17a34',40:'#b18a17',50:'#3377b7'});
const SOURCE='sangdo-speed-links';
const LINE_LAYERS=['sangdo-speed-casing','sangdo-speed-lines'];
const SIGN_LAYER='sangdo-speed-labels';
const SIGN_LAYERS=[SIGN_LAYER,'sangdo-speed-labels-close','sangdo-speed-labels-detail'];
const SIGN_SOURCES=['sangdo-speed-signs-overview','sangdo-speed-signs-close','sangdo-speed-signs-detail'];
const SIGN_DENSITIES=[
  {minzoom:13.3,maxzoom:15.9,spacing:190},
  {minzoom:15.9,maxzoom:17.6,spacing:140},
  {minzoom:17.6,spacing:95}
];
const CAMERA_SOURCE='sangdo-verified-cameras';
const CAMERA_LAYER='sangdo-verified-camera-points';
const DATA='/data/road-speed/sangdo1_speed_links.geojson';
const PUBLIC_CAMERA_DATA='/data/road-speed/dongjak_enforcement_points.geojson';
const CAMERA_STORAGE='dongjak-sangdo-verified-camera-coordinates-v1';
const SPEED_IMAGE_PREFIX='dj-speed-regulatory-';
const CAMERA_IMAGE='dj-camera-confirmed-point';
const PAINT_COLOR=['match',['get','speed'],10,SPEED_COLORS[10],30,SPEED_COLORS[30],40,SPEED_COLORS[40],50,SPEED_COLORS[50],'#778791'];
const emptyGeojson=()=>({type:'FeatureCollection',features:[]});
export function speedFeatureFilter(values=[10,30,40,50]){
  return ['in',['get','speed'],['literal',values.map(Number).filter(value=>[10,30,40,50].includes(value))]];
}
export function speedGeojsonStats(features=[]){
  const counts={10:0,30:0,40:0,50:0};
  for(const f of features){const k=Number(f?.properties?.speed);if(Object.hasOwn(counts,k))counts[k]++;}
  return counts;
}
/**
 * Choose representative points for on-road legends. Each symbol stays on the
 * actual source link, but adjacent link centres no longer get a sign each.
 * A slightly shorter separation between different limits preserves the
 * occasional 30→50 transition without filling the map with duplicate 50s.
 * Distances are metres, not pixels, so the result is stable when panning.
 */
export function sparseSpeedSignGeojson(features=[],spacingMeters=220){
  const candidates=[];
  for(const feature of features){
    const coordinates=feature?.geometry?.type==='LineString' ? feature.geometry.coordinates : null;
    if(!Array.isArray(coordinates)||coordinates.length<2)continue;
    const segments=[];
    let totalLength=0;
    for(let i=1;i<coordinates.length;i++){
      const a=coordinates[i-1],b=coordinates[i];
      if(!Array.isArray(a)||!Array.isArray(b)||!a.every(Number.isFinite)||!b.every(Number.isFinite))continue;
      const lat=(a[1]+b[1])/2*Math.PI/180;
      const len=111320*Math.hypot((b[0]-a[0])*Math.cos(lat),b[1]-a[1]);
      if(len<=0)continue;
      segments.push({a,b,len});
      totalLength+=len;
    }
    if(!segments.length)continue;
    let remaining=totalLength/2;
    let position=segments[segments.length-1].b;
    for(const {a,b,len} of segments){
      if(remaining<=len){
        const t=remaining/len;
        position=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        break;
      }
      remaining-=len;
    }
    const speed=Number(feature.properties?.speed);
    if(![10,30,40,50].includes(speed))continue;
    candidates.push({position,length:totalLength,speed,properties:{...feature.properties}});
  }
  // Prefer links with longer coverage. Tie-break by link ID for reproducibility.
  candidates.sort((a,b)=>b.length-a.length ||
    String(a.properties.link_id??'').localeCompare(String(b.properties.link_id??'')));
  const accepted=[];
  for(const candidate of candidates){
    const [x,y]=candidate.position;
    const tooClose=accepted.some(other=>{
      const [ox,oy]=other.position;
      const latitude=(y+oy)/2*Math.PI/180;
      const distance=111320*Math.hypot((x-ox)*Math.cos(latitude),y-oy);
      return distance<spacingMeters*(candidate.speed===other.speed?1:0.7);
    });
    if(!tooClose)accepted.push(candidate);
  }
  // Final order does not change data accuracy, but makes feature IDs stable.
  accepted.sort((a,b)=>String(a.properties.link_id??'').localeCompare(String(b.properties.link_id??'')));
  return {type:'FeatureCollection',features:accepted.map(item=>({
    type:'Feature',geometry:{type:'Point',coordinates:item.position},properties:item.properties
  }))};
}
/** Draw a road sign directly on a canvas. No external image/CDN is required. */
export function drawSpeedSign(canvas,limit){
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('캔버스 초기화 실패');
  canvas.width=144;canvas.height=144;
  ctx.clearRect(0,0,144,144);
  // Thin dark shadow/white border, circular red ring, white face and black numeral.
  ctx.beginPath();ctx.arc(72,72,66,0,2*Math.PI);ctx.fillStyle='#ffffff';ctx.fill();
  ctx.strokeStyle='#afb1b2';ctx.lineWidth=1.5;ctx.stroke();
  ctx.beginPath();ctx.arc(72,72,60,0,2*Math.PI);ctx.fillStyle='#ec121b';ctx.fill();
  ctx.beginPath();ctx.arc(72,72,44,0,2*Math.PI);ctx.fillStyle='#ffffff';ctx.fill();
  ctx.font='bold 69px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#101010';ctx.fillText(String(limit),72,75);
  return ctx.getImageData(0,0,144,144);
}
/** Yellow map camera marker is distinct from red/white roadway limits. */
export function drawCameraBadge(canvas){
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('캔버스 초기화 실패');
  canvas.width=112;canvas.height=112;
  ctx.clearRect(0,0,112,112);
  ctx.beginPath();ctx.arc(56,56,49,0,2*Math.PI);ctx.fillStyle='#ffe0a2';ctx.fill();
  ctx.lineWidth=7;ctx.strokeStyle='#72441c';ctx.stroke();
  ctx.fillStyle='#422d22';
  // Conventional CCTV silhouette: horizontal camera body with a tilted support.
  ctx.save();ctx.translate(56,48);ctx.rotate(-0.15);
  ctx.fillRect(-28,-13,47,25);
  ctx.beginPath();ctx.moveTo(19,-14);ctx.lineTo(31,-8);ctx.lineTo(31,7);ctx.lineTo(19,12);ctx.closePath();ctx.fill();
  ctx.restore();
  ctx.lineWidth=7;ctx.strokeStyle='#422d22';ctx.beginPath();ctx.moveTo(53,63);ctx.lineTo(59,75);ctx.lineTo(73,75);ctx.stroke();
  ctx.beginPath();ctx.arc(56,48,5,0,2*Math.PI);ctx.fillStyle='#ffffff';ctx.fill();
  return ctx.getImageData(0,0,112,112);
}
function escapePopup(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function readSavedCameraData(){
  try{
    const raw=localStorage.getItem(CAMERA_STORAGE);
    if(!raw)return emptyGeojson();
    // Import validation is performed again on restoring locally saved data.
    return cameraImportPreview(raw,'saved.geojson');
  }catch{return emptyGeojson();}
}
export function installSangdoSpeedMap({map,maplibregl,app}){
  const controls=document.getElementById('sangdo-speed-controls');
  const toggle=document.getElementById('sangdo-speed-toggle');
  const zoomButton=document.getElementById('sangdo-speed-zoom');
  const status=document.getElementById('sangdo-speed-status');
  const cameraToggle=document.getElementById('sangdo-camera-toggle');
  const cameraImportButton=document.getElementById('sangdo-camera-import');
  const cameraFile=document.getElementById('sangdo-camera-file');
  const cameraStatus=document.getElementById('sangdo-camera-status');
  if(!controls||!map||!maplibregl)return null;
  const switches=[...controls.querySelectorAll('.sangdo-speed-filters input[type="checkbox"]')];
  let enabled=false,ready=false,data=null;
  let cameraEnabled=false,cameraData=readSavedCameraData(),cameraLoaded=false;
  let clickHandlersInstalled=false;
  const enabledSpeeds=()=>switches.filter(el=>el.checked).map(el=>Number(el.value));
  const updateStatus=message=>{if(status)status.textContent=message;};
  const cameraMessage=(message)=>{if(cameraStatus)cameraStatus.textContent=message;};
  const updateCameraVisibility=()=>{
    const count=cameraData.features.length;
    const visible=cameraEnabled&&count>0;
    if(map.getLayer(CAMERA_LAYER))map.setLayoutProperty(CAMERA_LAYER,'visibility',visible?'visible':'none');
    if(cameraToggle){
      cameraToggle.textContent=cameraEnabled?'단속 지점 표시: 켜짐':'단속 지점 표시: 꺼짐';
      cameraToggle.setAttribute('aria-pressed',String(cameraEnabled));
    }
    if(!cameraLoaded)cameraMessage('단속 지점 지도 레이어 준비 중');
    else if(!count)cameraMessage('단속 지점 좌표 미확보 · 표시된 지점 없음');
    else cameraMessage(visible?`단속카메라 ${count}개 표시 · 가져온 좌표 기준 · 운영 여부 미확인`:`가져온 좌표 ${count}개 · 표시 꺼짐`);
  };
  const updateVisibility=()=>{
    const selected=enabledSpeeds();
    const visible=enabled&&selected.length>0;
    for(const id of [...LINE_LAYERS,...SIGN_LAYERS]){
      if(map.getLayer(id)){
        map.setLayoutProperty(id,'visibility',visible?'visible':'none');
        map.setFilter(id,speedFeatureFilter(selected));
      }
    }
    toggle?.setAttribute('aria-pressed',String(visible));
    if(toggle)toggle.textContent=visible?'제한속도 지도 숨기기':'제한속도 지도 표시하기';
    if(!ready){updateStatus(data?.features?.length?'레이어 준비 중…':'지도 준비 중');return;}
    const counts=speedGeojsonStats(data?.features||[]);
    const shown=selected.reduce((sum,speed)=>sum+(counts[speed]||0),0);
    updateStatus(visible?`${shown}개 링크 · 표지 간격 자동 조절(확대 시 추가 표시)`:
      selected.length?'제한속도 표시 꺼짐':'속도 미선택 · 선택 시 지도에 표시됩니다.');
  };
  toggle?.addEventListener('click',()=>{
    if(!enabled && !enabledSpeeds().length)for(const input of switches)input.checked=true;
    enabled=!enabled;updateVisibility();
  });
  for(const input of switches)input.addEventListener('change',()=>{
    enabled=enabledSpeeds().length>0;updateVisibility();
  });
  cameraToggle?.addEventListener('click',()=>{cameraEnabled=!cameraEnabled;updateCameraVisibility();});
  cameraImportButton?.addEventListener('click',()=>cameraFile?.click());
  cameraFile?.addEventListener('change',async()=>{
    const file=cameraFile.files?.[0];if(!file)return;
    try{
      if(file.size>25*1024*1024)throw new Error('25MB 이하의 좌표 파일만 불러올 수 있습니다.');
      cameraMessage('단속카메라 파일 검사 중…');
      const buffer=await file.arrayBuffer();
      let decoded;
      try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
      catch{decoded=new TextDecoder('euc-kr').decode(buffer);}
      const imported=cameraImportPreview(decoded,file.name);
      if(!imported.features.length)throw new Error('동작구 범위의 위도·경도 좌표가 없습니다. 파일의 좌표계를 확인해 주세요.');
      cameraData=imported;
      try{localStorage.setItem(CAMERA_STORAGE,JSON.stringify(cameraData));}catch{/* private mode: session only */}
      cameraEnabled=true;
      if(map.getSource(CAMERA_SOURCE))map.getSource(CAMERA_SOURCE).setData(cameraData);
      updateCameraVisibility();
    }catch(error){cameraMessage(`가져오기 실패 · ${error.message}`);}
    finally{cameraFile.value='';}
  });
  const beforeFirstSymbol=()=>map.getStyle()?.layers?.find(layer=>layer.type==='symbol')?.id;
  const addLayer=(definition,before)=>{
    if(!map.getLayer(definition.id))map.addLayer(definition,before);
  };
  const installImages=()=>{
    for(const speed of [10,30,40,50]){
      const name=SPEED_IMAGE_PREFIX+speed;
      if(!map.hasImage(name))map.addImage(name,drawSpeedSign(document.createElement('canvas'),speed),{pixelRatio:2});
    }
    if(!map.hasImage(CAMERA_IMAGE))map.addImage(CAMERA_IMAGE,drawCameraBadge(document.createElement('canvas')),{pixelRatio:2});
  };
  const onOpenRoad=event=>{
    const f=event?.features?.[0];if(!f)return;
    const {link_id,speed,updated,length_m}=f.properties||{};
    const html=`<div class="sangdo-speed-popup"><b>최고제한속도 ${Number(speed)}km/h</b><span>표준노드링크 ID ${escapePopup(link_id||'미확인')}</span><span>표시 구간 ${Number.isFinite(Number(length_m))?Number(length_m).toFixed(0):'미확인'}m · 자료 기준 ${escapePopup(updated||'20250512')}</span><small>원형 표지는 데이터 시각화이며 실제 교통표지 설치 위치가 아닙니다. 현장 표지·최신 지정고시를 확인해 주세요.</small></div>`;
    new maplibregl.Popup({closeButton:true,maxWidth:'270px'}).setLngLat(event.lngLat).setHTML(html).addTo(map);
  };
  const onOpenCamera=event=>{
    const properties=event?.features?.[0]?.properties;
    if(!properties)return;
    const f=properties;
    const html=`<div class="sangdo-speed-popup"><b>무인교통단속카메라 (좌표자료)</b><strong>${escapePopup(f.name)}</strong>${f.address?`<span>${escapePopup(f.address)}</span>`:''}${f.speed?`<span>등록 제한속도 ${escapePopup(f.speed)}km/h</span>`:''}${f.kind?`<span>원본 단속구분: ${escapePopup(f.kind)}</span>`:''}${f.checked?`<span>데이터 기준일: ${escapePopup(f.checked)}</span>`:''}<small>가져온 자료의 위치입니다. 실제 설치·단속 운영 여부는 확인이 필요합니다.</small></div>`;
    new maplibregl.Popup({closeButton:true,maxWidth:'270px'}).setLngLat(event.lngLat).setHTML(html).addTo(map);
  };
  const installLayers=()=>{
    if(!data)return;
    try{
      if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data});
      SIGN_DENSITIES.forEach((density,index)=>{
        if(!map.getSource(SIGN_SOURCES[index]))map.addSource(SIGN_SOURCES[index],{
          type:'geojson',data:sparseSpeedSignGeojson(data.features,density.spacing)
        });
      });
      if(!map.getSource(CAMERA_SOURCE))map.addSource(CAMERA_SOURCE,{type:'geojson',data:cameraData});
      installImages();
      const firstSymbol=beforeFirstSymbol();
      addLayer({id:LINE_LAYERS[0],type:'line',source:SOURCE,minzoom:12.8,
        layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':['case',['==',['get','speed'],10],'#fff6f8','#f7fcff'],
          'line-width':['interpolate',['linear'],['zoom'],12.8,2,14.5,4.2,16.5,6.8,18,9],
          'line-opacity':0.92}},firstSymbol);
      addLayer({id:LINE_LAYERS[1],type:'line',source:SOURCE,minzoom:12.8,
        layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':PAINT_COLOR,'line-width':['interpolate',['linear'],['zoom'],12.8,1.2,14.5,2.2,16.5,3.8,18,5.2],
          'line-opacity':0.97}},firstSymbol);
      // Only representative, link-centred speed signs are shown at each zoom.
      // The entire road line layer is left untouched and remains clickable.
      SIGN_DENSITIES.forEach((density,index)=>addLayer({
        id:SIGN_LAYERS[index],type:'symbol',source:SIGN_SOURCES[index],
        minzoom:density.minzoom,...(density.maxzoom?{maxzoom:density.maxzoom}:{}),
        layout:{'symbol-placement':'point',
          'icon-image':['concat',SPEED_IMAGE_PREFIX,['to-string',['get','speed']]],
          'icon-size':['interpolate',['linear'],['zoom'],13.3,0.22,15,0.27,17,0.33,19,0.39],
          'icon-allow-overlap':false,'icon-ignore-placement':false,
          'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport','icon-padding':3}
      },undefined));
      addLayer({id:CAMERA_LAYER,type:'symbol',source:CAMERA_SOURCE,minzoom:12.5,
        layout:{'icon-image':CAMERA_IMAGE,
          'icon-size':['interpolate',['linear'],['zoom'],12.5,0.45,15,0.72,18,0.95],
          'icon-allow-overlap':false,'icon-ignore-placement':false,
          'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport','icon-padding':6}},undefined);
      if(!clickHandlersInstalled){
        map.on('click',LINE_LAYERS[1],onOpenRoad);
        map.on('click',CAMERA_LAYER,onOpenCamera);
        for(const layer of SIGN_LAYERS)map.on('click',layer,onOpenRoad);
        for(const id of [LINE_LAYERS[1],...SIGN_LAYERS,CAMERA_LAYER]){
          map.on('mouseenter',id,()=>{map.getCanvas().style.cursor='pointer';});
          map.on('mouseleave',id,()=>{map.getCanvas().style.cursor='';});
        }
        clickHandlersInstalled=true;
      }
      ready=true;cameraLoaded=true;
      updateVisibility();updateCameraVisibility();
    }catch(error){
      updateStatus(`제한속도 레이어 연결 실패 · ${error.message}`);
      console.warn('[상도1동 제한속도 레이어]',error);
    }
  };
  const maybeInstall=()=>{
    if(!data)return;
    if(map.loaded()||map.isStyleLoaded())installLayers();
    else map.once('styledata',installLayers);
  };
  map.on('style.load',()=>{if(data)installLayers();});
  const load=async()=>{
    try{
      updateStatus('제한속도 자료 불러오는 중…');
      const response=await fetch(DATA,{cache:'no-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const body=await response.json();
      if(body?.type!=='FeatureCollection'||!Array.isArray(body.features)||!body.features.length)
        throw new Error('제한속도 링크 데이터가 비어 있습니다.');
      data=body;maybeInstall();
    }catch(error){
      updateStatus(`제한속도 자료 로딩 실패 · ${error.message}`);
      console.warn('[상도1동 제한속도]',error);
    }
  };
  zoomButton?.addEventListener('click',()=>{
    if(!data){updateStatus('도로 데이터 준비 중입니다.');return;}
    const bounds=new maplibregl.LngLatBounds();
    for(const f of data.features){
      const visit=c=>{
        if(Array.isArray(c)&&c.length>=2&&typeof c[0]==='number')bounds.extend(c);
        else if(Array.isArray(c))for(const part of c)visit(part);
      };
      visit(f.geometry.coordinates);
    }
    if(!enabled){
      if(!enabledSpeeds().length)for(const input of switches)input.checked=true;
      enabled=true;updateVisibility();
    }
    if(bounds.isEmpty())return;
    map.fitBounds(bounds,{padding:{top:85,bottom:85,left:55,right:55},maxZoom:16.3,duration:850});
    app?.classList?.remove('map-safety-open');
    document.getElementById('map-safety-toggle')?.setAttribute('aria-expanded','false');
    const backdrop=document.getElementById('map-safety-backdrop');if(backdrop)backdrop.hidden=true;
  });
  const loadPublicCameras=async()=>{
    if(cameraData.features.length)return;
    try{
      const response=await fetch(PUBLIC_CAMERA_DATA,{cache:'no-cache'});
      if(!response.ok)return;
      const json=await response.json();
      const parsed=cameraImportPreview(JSON.stringify(json),'official.geojson');
      if(cameraData.features.length||!parsed.features.length)return;
      cameraData=parsed;
      map.getSource(CAMERA_SOURCE)?.setData(cameraData);
      updateCameraVisibility();
    }catch(error){console.warn('[단속카메라 공개 좌표 데이터]',error);}
  };
  void load();
  void loadPublicCameras();
  return {refresh:()=>{updateVisibility();updateCameraVisibility();}};
}
