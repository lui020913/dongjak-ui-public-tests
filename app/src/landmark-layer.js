import {openPlaceDetails} from './place-details.js';
import {isMarkerOccluded} from './map-marker-occlusion.js';
// 동작구 대표시설: 주소·좌표가 확인된 두 장소는 기본 제공,
// 다른 장소는 공개 OSM 조회에 있을 때만 추가합니다.
export const VERIFIED_LANDMARKS = [
  {id:'dongjak-office',name:'동작구청',lng:126.9402905,lat:37.5042528,
    address:'서울특별시 동작구 장승배기로 70 (신청사)',icon:'🏛',type:'public',source:'주소 좌표 정보'},
  {id:'seoul-cemetery',name:'국립서울현충원',lng:126.97652,lat:37.50036,
    address:'서울특별시 동작구 현충로 210 · 시설 내부 대표 지점',icon:'✦',type:'memorial',source:'기상청 현충원 관측지점'},
];
const CAMPUS_LANDMARKS = [
  {id:'cau-campus',name:'중앙대학교',lng:126.957101,lat:37.505088,
    address:'서울특별시 동작구 흑석로 84',icon:'🎓',type:'education',
    source:'대학 공식 주소 / 캠퍼스 중심 참고 좌표 (건물 출입구 아님)'},
  {id:'ssu-campus',name:'숭실대학교',lng:126.957460,lat:37.496311,
    address:'서울특별시 동작구 상도로 369',icon:'🎓',type:'education',
    source:'대학 공식 주소 / 캠퍼스 중심 참고 좌표 (건물 출입구 아님)'}
];
const EXTRA_LANDMARKS = ['노량진수산시장','보라매공원'];
const GEO_BBOX='37.475,126.908,37.523,126.997';
function makePopup(place){
  const content=document.createElement('div');content.className='dongjak-landmark-popup';
  const strong=document.createElement('strong');strong.textContent=place.name;
  const address=document.createElement('p');address.textContent=place.address||'동작구 주요 시설';
  const source=document.createElement('small');source.textContent=place.source||'© OpenStreetMap 기여자';
  content.append(strong,address,source);return content;
}
function iconFor(name){
  if(/대학교/.test(name))return '🎓';
  if(/수산시장/.test(name))return '♙';
  if(/공원/.test(name))return '🌳';
  return '✦';
}
export function installLandmarks({map,maplibregl,isDongjak}) {
  if(!maplibregl?.Marker)return ()=>{};
  const mounted=new Map();
  const positions=new Map();
  function add(place){
    if(mounted.has(place.id)||!isDongjak(place.lng,place.lat))return;
    const el=document.createElement('button');el.type='button';el.className='dongjak-landmark';
    el.setAttribute('aria-label',`${place.name} 위치와 정보 보기`);
    const icon=document.createElement('span');icon.className='dongjak-landmark-icon';
    icon.setAttribute('aria-hidden','true');
    // v5.12.3: suppress image-backed marker tiles; use unobtrusive map symbols.
    // Official brand assets remain unchanged in /public/logos.
    const logoUrl=null;
    icon.textContent=place.icon;
    el.classList.add('no-image-tile');
    const label=document.createElement('span');label.className='dongjak-landmark-name';label.textContent=place.name;
    el.append(icon,label);
    el.style.visibility='hidden';
    const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([place.lng,place.lat]).addTo(map);
    el.addEventListener('click',event=>{
      event.stopPropagation();
      openPlaceDetails({map,maplibregl,place:{...place,type:place.type==='public'?'공공기관':place.type==='memorial'?'기념시설':place.type==='education'?'대학교':'주요 장소'}});
    });
    mounted.set(place.id,marker);positions.set(place.id,place);
  }
  for(const place of VERIFIED_LANDMARKS)add(place); // universities are provided by education-layer.js
  function syncZoom(){
    if(document.getElementById('app')?.dataset?.djTransitExterior==='true')return;
    const zoom=map.getZoom();
    for(const [id,marker] of mounted){
      const el=marker.getElement(),place=positions.get(id);
      // Keep large official logo tiles out of district/city-wide views and away from clipped map edges.
      const minZoom=12.7; // key civic facilities remain discoverable at district zoom
      // The five fixed place names are native map symbols; suppress duplicate HTML pins.
      const usesNativePlaceLabel=VERIFIED_LANDMARKS.some(p=>p.id===id)&&Boolean(map.getLayer?.('dongjak-featured-place-names'));
      const visible=!usesNativePlaceLabel&&map.isMoving?.()!==true && zoom>=minZoom&&!isMarkerOccluded(map,place.lng,place.lat,el);
      el.style.display=visible?'flex':'none';
      el.style.visibility=visible?'visible':'hidden';
      el.classList.toggle('landmark-compact',zoom<13.4);
    }
  }
  let lastMoveCheck=0;
  const onMove=()=>{
    const now=typeof performance!=='undefined'?performance.now():Date.now();
    if(now-lastMoveCheck<100)return;
    lastMoveCheck=now;
    requestAnimationFrame(syncZoom);
  };
  map.on('zoom',syncZoom);map.on('move',onMove);map.on('moveend',syncZoom);map.on('idle',syncZoom);
  syncZoom();requestAnimationFrame(syncZoom);
  const controller=new AbortController();
  const query=`[out:json][timeout:18];(nwr["name"~"^(중앙대학교|숭실대학교|노량진수산시장|보라매공원)$"](${GEO_BBOX}););out center tags;`;
  (async()=>{
    try{
      const response=await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,{signal:controller.signal});
      if(!response.ok)throw new Error(`OSM ${response.status}`);
      const body=await response.json();
      for(const item of body.elements||[]){
        const name=String(item.tags?.['name:ko']||item.tags?.name||'').trim();
        if(!EXTRA_LANDMARKS.includes(name))continue;
        const lng=Number(item.center?.lon??item.lon),lat=Number(item.center?.lat??item.lat);
        if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
        add({id:`osm-landmark-${name}`,name,lng,lat,icon:iconFor(name),address:'동작구 대표 장소',source:'© OpenStreetMap 기여자'});
      }
      syncZoom();
    }catch(error){if(error?.name!=='AbortError')console.info('[랜드마크] OSM 상세 지점 조회 생략:',error?.message);}
  })();
  return ()=>{controller.abort();map.off?.('zoom',syncZoom);map.off?.('move',onMove);map.off?.('moveend',syncZoom);map.off?.('idle',syncZoom);for(const m of mounted.values())m.remove();mounted.clear();positions.clear();};
}
