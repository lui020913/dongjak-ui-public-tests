import {openPlaceDetails} from './place-details.js';
import {isMarkerOccluded} from './map-marker-occlusion.js';
import {koreanOSMName} from './korean-labels.js';

// 대학 대표 마커. 중앙대학교는 후문이나 도로명주소 포인트가 아닌
// 서울캠퍼스 OSM 대학 폴리곤의 중심 근처에 고정합니다 (way 284355223).
// 다른 학교의 대표점은 기존 v5.2 값을 유지합니다.
export const DONGJAK_UNIVERSITIES = [
  {id:'university-cau',name:'중앙대학교',lng:126.95676,lat:37.50439,
    address:'서울특별시 동작구 흑석로 84',note:'서울캠퍼스 중심부 대표 위치 · OpenStreetMap 대학 부지',kind:'university'},
  {id:'university-ssu',name:'숭실대학교',lng:126.9551579174,lat:37.4964289689,
    address:'서울특별시 동작구 상도로 369',note:'서울캠퍼스 대표 위치',kind:'university'},
  {id:'university-chongshin',name:'총신대학교',lng:126.9667631083,lat:37.4879290071,
    address:'서울특별시 동작구 사당로 143',note:'사당캠퍼스 대표 위치',kind:'university'}
];

// Frequently referenced schools are seeded so users can tap them even when the OSM query is slow.


export function schoolIdentity(name=''){
  const n=String(name||'').replace(/\s/g,'');
  // 캠퍼스와 건물로 분산 등록된 같은 교육기관은 대표 아이콘 하나만 표시합니다.
  const unis=['중앙대학교','숭실대학교','총신대학교'];
  for(const u of unis)if(n.startsWith(u))return u;
  return n.replace(/(서울캠퍼스|본교|후문|정문|본관)$/,'');
}
export function classifySchool(name='',amenity=''){
  const label=String(name).trim();
  if(amenity==='university'||amenity==='college'||/대학교/.test(label))return 'university';
  if(amenity==='school'||/(초등학교|중학교|고등학교)/.test(label)){
    if(/초등학교/.test(label))return 'elementary';
    if(/중학교/.test(label))return 'middle';
    if(/고등학교/.test(label))return 'high';
  }
  return null;
}

/** The vector POI layer can be installed yet contain no school features.
 * Its existence is never a substitute for an actual coverage check. */
export function shouldFetchSupplementalSchools({vectorLayerExists=false,visibleSchoolCount=0}={}){
  return !vectorLayerExists || visibleSchoolCount===0;
}
export function hasMatchingSchoolInTiles(map,place,layerId='dj-civic-poi-school'){
  if(!map?.getLayer?.(layerId) || typeof map.queryRenderedFeatures!=='function')return false;
  try{
    const p=map.project([place.lng,place.lat]);
    const hits=map.queryRenderedFeatures([[p.x-22,p.y-22],[p.x+22,p.y+22]],{layers:[layerId]})||[];
    return hits.some(row=>schoolIdentity(row.properties?.['name:ko']||row.properties?.name||'')===schoolIdentity(place.name));
  }catch{return false;}
}

export function normalizeEducationFeatures(elements=[],isDongjak=()=>true){
  const result=[];
  const used=new Set();
  for(const item of elements){
    const tags=item.tags||{};
    const name=koreanOSMName(tags,'');
    if(!name||!/^[가-힣]/.test(name))continue;
    const kind=classifySchool(name,tags.amenity);
    if(!kind)continue;
    const lng=Number(item.center?.lon??item.lon);
    const lat=Number(item.center?.lat??item.lat);
    if(!Number.isFinite(lng)||!Number.isFinite(lat)||!isDongjak(lng,lat))continue;
    const key=schoolIdentity(name);
    if(used.has(key))continue;
    used.add(key);
    result.push({id:`osm-edu-${item.type}-${item.id}`,name,lng,lat,kind,
      address:'동작구 소재 교육시설 · 공개지도 위치',note:'© OpenStreetMap 기여자'});
  }
  return result;
}

function buttonLabel(kind){
  if(kind==='university')return '대학교';
  if(kind==='elementary')return '초등학교';
  if(kind==='middle')return '중학교';
  return '고등학교';
}
function schoolBadge(place){
  if(place.kind!=='university')return '학교';
  if(place.name.includes('중앙'))return 'CAU';
  if(place.name.includes('숭실'))return 'SSU';
  if(place.name.includes('총신'))return 'CSU';
  return 'UNI';
}
function schoolTone(place){
  if(place.kind!=='university')return 'school';
  if(place.name.includes('중앙'))return 'cau';
  if(place.name.includes('숭실'))return 'ssu';
  if(place.name.includes('총신'))return 'csu';
  return 'uni';
}
function markerContent(place){
  const box=document.createElement('div');box.className='dongjak-education-popup';
  const h=document.createElement('strong');h.textContent=place.name;
  const p=document.createElement('p');p.textContent=place.address;
  const small=document.createElement('small');small.textContent=place.note||'위치는 공개된 자료의 대표 지점입니다.';
  box.append(h,p,small);return box;
}
export function installEducationLayer({map,maplibregl,isDongjak}){
  if(!maplibregl?.Marker)return ()=>{};
  const markers=new Map();
  function add(place){
    if(!isDongjak(place.lng,place.lat))return;
    const key=schoolIdentity(place.name);
    const old=markers.get(key);
    if(old){
      // 중앙대는 OSM node/후문/행정주소 위치가 캠퍼스 대표점을 밀어내지 못하도록 고정.
      // 다른 학교는 기존 OSM 정보 갱신 동작을 유지합니다.
      if(key!=='중앙대학교' && place.id.startsWith('osm-edu-')&&!old.place.id.startsWith('osm-edu-')){
        old.marker.setLngLat([place.lng,place.lat]);old.place=place;
      }
      return;
    }
    const el=document.createElement('button');el.type='button';el.className=`dongjak-education-marker ${place.kind} tone-${schoolTone(place)}`;
    el.setAttribute('aria-label',`${place.name} 위치 보기`);
    const icon=document.createElement('span');icon.className='dongjak-education-icon';
    icon.setAttribute('aria-hidden','true');
    // v5.12.3: do not render university PNG logos as floating map markers.
    // Their white tiles repeatedly appeared under the fixed header/navigation
    // on wrap/tilt. Keep the clickable school name as a restrained text badge.
    const universityLogo=null;
    if(place.kind==='university'){
      el.classList.add('university-name-only');
      icon.textContent='';
    }else if(place.kind!=='university'){
      // A distinct school building pictogram, instead of the generic '학교' text badge.
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 32 32');
      svg.setAttribute('fill','none');svg.setAttribute('aria-hidden','true');
      svg.classList.add('dongjak-school-pictogram');
      // School marker: a book instead of the house-shaped icon that looked residential.
      const paths=[
        ['path',{d:'M16 7c-3-2-7-3-12-2v19c5-1 9 0 12 3V7zm0 0c3-2 7-3 12-2v19c-5-1-9 0-12 3V7z',stroke:'currentColor','stroke-width':'2.3','stroke-linejoin':'round'}],
        ['path',{d:'M7 12c3-.2 5 .3 6 1.4M19 13.4c2-1.1 4-1.6 6-1.4M7 18c2-.2 4 .1 6 1M19 19c2-.9 4-1.2 6-1',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round'}]
      ];
      for(const [tag,attrs] of paths){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,val] of Object.entries(attrs))el.setAttribute(key,val);svg.appendChild(el);}
      icon.append(svg);
    }else icon.textContent=schoolBadge(place);
    const label=document.createElement('span');label.className='dongjak-education-name';label.textContent=place.name;
    const category=document.createElement('span');category.className='dongjak-education-kind';category.textContent=buttonLabel(place.kind);
    el.append(icon,label,category);
    el.style.visibility='hidden';
    const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([place.lng,place.lat]).addTo(map);
    const rec={marker,place};markers.set(key,rec);
    el.addEventListener('click',event=>{
      event.stopPropagation();
      openPlaceDetails({map,maplibregl,place:{...rec.place,type:buttonLabel(rec.place.kind),
        source:rec.place.id.startsWith('osm-')?'© OpenStreetMap 기여자':'기존 등록 장소 정보'}});
    });
  }
  for(const uni of DONGJAK_UNIVERSITIES)add(uni);
  // 커스텀 마커를 표시하는 대학교가 기존 POI 라벨과 중복되지 않도록 제한.
  for(const layer of map.getStyle().layers){
    if(layer.type!=='symbol'||layer['source-layer']!=='poi')continue;
    try{
      const filter=map.getFilter(layer.id);
      const clauses=['중앙대학교','숭실대학교','총신대학교'].map(name=>['in',name,['coalesce',['get','name:ko'],['get','name'],'']]);
      map.setFilter(layer.id,['all',...(filter?[filter]:[]),['!', ['any',...clauses]]]);
    }catch(error){console.debug('[대학 중복] 원본 레이블 숨김 제외:',layer.id,error);}
  }
  const transitContextActive=()=>document.getElementById('app')?.dataset?.djTransitExterior==='true';
  function syncZoom(){
    if(transitContextActive())return;
    const zoom=map.getZoom();
    for(const {marker,place} of markers.values()){
      const el=marker.getElement();
      const overlappedByVectorSchool=place.kind!=='university'&&hasMatchingSchoolInTiles(map,place);
      // Native MapLibre labels take over for universities, avoiding a duplicated HTML badge.
      const usesNativePlaceLabel=place.kind==='university'&&Boolean(map.getLayer?.('dongjak-featured-place-names'));
      const visible=!usesNativePlaceLabel&&map.isMoving?.()!==true && zoom>=(place.kind==='university'?12.7:15.1) &&
        !overlappedByVectorSchool && !isMarkerOccluded(map,place.lng,place.lat,el);
      el.style.display=visible?'flex':'none';
      el.style.visibility=visible?'visible':'hidden';
      el.classList.toggle('compact',zoom<15.5);
      el.classList.toggle('label-hidden',place.kind==='university' ? false : zoom<15.9);
    }
  }
  // Recheck after MapLibre reprojects DOM markers, including style/layout changes.
  // Throttle while panning because hundreds of school records may be present.
  let lastMoveCheck=0;
  const onMove=()=>{
    const now=typeof performance!=='undefined'?performance.now():Date.now();
    if(now-lastMoveCheck<140)return;
    lastMoveCheck=now;
    requestAnimationFrame(syncZoom);
  };
  map.on('zoom',syncZoom);map.on('move',onMove);map.on('moveend',syncZoom);
  map.on('idle',syncZoom);syncZoom();requestAnimationFrame(syncZoom);
  const abort=new AbortController();
  const bbox='37.474,126.900,37.526,127.002';
  const query=`[out:json][timeout:22];(nwr["amenity"~"^(university|college|school)$"](${bbox}););out center tags;`;
  // The school symbol layer can be present even when the tiles have no schools.
  // Fetch supplemental OSM schools once after the map is idle, without blocking
  // rendering. DOM markers are suppressed individually when the vector layer
  // already displays the same named school.
  let started=false;
  const fetchSupplementalSchools=async()=>{
    if(started||abort.signal.aborted)return;
    started=true;
    for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
      if(abort.signal.aborted)return;
      try{
        const res=await fetch(`${endpoint}?data=${encodeURIComponent(query)}`,{signal:abort.signal});
        if(!res.ok)throw new Error(`교육시설 지도 조회 ${res.status}`);
        const data=await res.json();
        const places=normalizeEducationFeatures(data.elements||[],isDongjak);
        // 학교 표식은 원거리에서는 숨기되, 누락 체감이 크지 않도록 동작구 내 학교를 넉넉히 표시합니다.
        for(const p of places.filter(x=>x.kind==='university').concat(places.filter(x=>x.kind!=='university').slice(0,260)))add(p);
        syncZoom();return;
      }catch(error){
        if(abort.signal.aborted)return;
        console.warn('[교육시설] 공개지도 학교 정보 조회:',error.message);
      }
    }
  };
  // Defer the network request until base tile settling. A tile layer existing
  // without data no longer blocks the supplemental search for missing schools.
  const runCoverageCheck=()=>{
    if(transitContextActive()||started||abort.signal.aborted)return;
    // Do not download hundreds of school markers at the initial district-wide zoom.
    if((map.getZoom?.()??0)<14.5)return;
    const vectorLayerExists=Boolean(map.getLayer?.('dj-civic-poi-school'));
    let visibleSchoolCount=0;
    try{
      if(vectorLayerExists&&typeof map.queryRenderedFeatures==='function'){
        visibleSchoolCount=(map.queryRenderedFeatures(undefined,{layers:['dj-civic-poi-school']})||[]).length;
      }
    }catch{}
    if(shouldFetchSupplementalSchools({vectorLayerExists,visibleSchoolCount})||map.getZoom?.()>=14.6){
      fetchSupplementalSchools();
    }
  };
  map.once?.('idle',runCoverageCheck);
  map.on?.('moveend',runCoverageCheck);
  map.on?.('zoomend',runCoverageCheck);
  return ()=>{abort.abort();map.off?.('zoom',syncZoom);map.off?.('move',onMove);map.off?.('moveend',syncZoom);map.off?.('idle',syncZoom);map.off?.('zoomend',runCoverageCheck);map.off?.('moveend',runCoverageCheck);
    map.off?.('idle',runCoverageCheck);for(const {marker} of markers.values())marker.remove();markers.clear();};
}
