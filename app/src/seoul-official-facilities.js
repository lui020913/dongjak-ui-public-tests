import {hasTransportPoiHit} from './poi-click-identity.js';
import {normalizeFacilityRecord,facilityNameMatches,facilityOsmCategory,sameFacility,isFormerPoliceFacility,isUnverifiedPoliceFacility} from './facility-display-names.js';
/** Official Seoul-license POIs complement the existing OSM/safety overlays. */
import {openPlaceDetails} from './place-details.js';
import {insideBoundary} from './dongjak-verified-data-layers.js';
import {facilityPresentation,registerFacilityIcons,visibleFacilityFilter,installFacilityCategories,DEFAULT_POI_GROUPS} from './v912-poi-presentation.js';

const SOURCE='dj-seoul-official-places';
const POINTS='dj-seoul-official-points',NAMES='dj-seoul-official-names';
const EMPTY={type:'FeatureCollection',features:[]};
let searchableGeneralPlaces=[];
export function officialFeatures(places,boundary){
 const seen=new Set(),features=[],accepted=[];
 for(const rawPlace of places||[]){
   const place=normalizeFacilityRecord(rawPlace);
   const lon=Number(place.lng),lat=Number(place.lat);
   if(!Number.isFinite(lon)||!Number.isFinite(lat)||!boundary||!insideBoundary([lon,lat],boundary))continue;
   const name=String(place.name||'').trim();if(!name||isFormerPoliceFacility(name)||isUnverifiedPoliceFacility(name))continue;
   const key=`${name.replace(/\s+/g,'').toLowerCase()}|${place.category||''}|${lon.toFixed(4)}|${lat.toFixed(4)}`;
   if(seen.has(key)||accepted.some(p=>sameFacility(p,place)))continue;seen.add(key);accepted.push(place);
   features.push({type:'Feature',id:features.length+1,geometry:{type:'Point',coordinates:[lon,lat]},properties:{
     name,registeredName:place.registeredName||'',category:String(place.category||'시설'),kind:String(place.category||''),...facilityPresentation(place.category),
     address:String(place.roadAddress||place.road_address||place.address||''),phone:String(place.phone||''),website:String(place.website||''),
     source:String(place.source||'서울 열린데이터광장 / 동작구'),updated:String(place.updated||'')
   }});
 }
 return {type:'FeatureCollection',features};
}
export const GENERAL_OSM_CATEGORIES=Object.freeze({
 restaurant:'음식점',cafe:'카페',fast_food:'휴게음식점',pharmacy:'약국',
 clinic:'의원',hospital:'병원',library:'도서관',school:'학교',kindergarten:'유치원',childcare:'어린이집',
 convenience:'편의점',supermarket:'마트',bakery:'제과점',park:'공원',attraction:'관광명소'
});
/** Fallback only: OSM registrations are not Seoul licensing records. */
export function osmGeneralPlaces(elements=[],limit=1100){
 const result=[],seen=new Set();
 for(const item of elements){
   const tags=item?.tags||{};
   const type=tags.amenity||tags.shop||tags.leisure||tags.tourism;
   const category=GENERAL_OSM_CATEGORIES[type];
   const name=String(tags['name:ko']||tags.name||'').trim();
   const lng=Number(item.center?.lon??item.lon),lat=Number(item.center?.lat??item.lat);
   if(!category||!name||!Number.isFinite(lng)||!Number.isFinite(lat))continue;
   const id=`osm-${item.type}-${item.id}`;if(seen.has(id))continue;seen.add(id);
   result.push({id,name,category,lng,lat,
     address:String(tags['addr:full']||[tags['addr:city'],tags['addr:district'],tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' ')),
     phone:String(tags['contact:phone']||tags.phone||''),
     website:String(tags['contact:website']||tags.website||''),
     source:'© OpenStreetMap 기여자 · 공개지도 등록정보'});
   if(result.length>=limit)break;
 }
 return result.map(normalizeFacilityRecord);
}
export function bboxToOverpass(bbox){
 const n=String(bbox).split(',').map(Number);
 if(n.length!==4||n.some(v=>!Number.isFinite(v)))throw new Error('invalid bbox');
 const [west,south,east,north]=n;
 if(!(west<east&&south<north))throw new Error('invalid bbox');
 const box=[south,west,north,east].map(x=>x.toFixed(5)).join(',');
 return `[out:json][timeout:20];(nwr["amenity"~"^(restaurant|cafe|fast_food|pharmacy|clinic|hospital|library|school|kindergarten|childcare)$"](${box});nwr["shop"~"^(convenience|supermarket|bakery)$"](${box});nwr["leisure"="park"](${box});nwr["tourism"="attraction"](${box}););out center tags;`;
}
export async function loadOsmGeneralFacilities(bbox,{signal,fetcher=fetch}={}){
 const q=bboxToOverpass(bbox);
 // Pages Function proxy avoids cross-origin Overpass restrictions in PWA / APK.
 // The direct public endpoints remain a local Vite-development fallback.
 try{
   const response=await fetcher('/api/osm-general-facilities?bbox='+encodeURIComponent(bbox),{signal});
   if(response.ok){const data=await response.json();if(Array.isArray(data.elements))return osmGeneralPlaces(data.elements);}
 }catch(error){if(error?.name==='AbortError')throw error;}
 for(const endpoint of ['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter']){
   try{
     const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q),signal});
     if(!response.ok)continue;
     const data=await response.json();
     if(Array.isArray(data.elements))return osmGeneralPlaces(data.elements);
   }catch(error){if(error?.name==='AbortError')throw error;}
 }
 throw new Error('OSM 시설 자료 조회 실패');
}

export function buildLayers(map,data,groups=DEFAULT_POI_GROUPS,dark=false){
 if(!map.getStyle?.())return;
 registerFacilityIcons(map);
 if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data});else map.getSource(SOURCE).setData(data);
 if(map.getLayer(NAMES))map.removeLayer(NAMES);
 const filter=visibleFacilityFilter(groups);
 if(!map.getLayer(POINTS))map.addLayer({id:POINTS,type:'symbol',source:SOURCE,minzoom:14,filter,
 layout:{'icon-image':['concat','dj912-poi-',['get','icon']],'icon-size':['interpolate',['linear'],['zoom'],14.5,.62,17,.75,19,1],
 'icon-anchor':'center','icon-padding':5,'icon-allow-overlap':false,'icon-ignore-placement':false,'symbol-sort-key':['get','priority'],
 'text-field':['case',['==',['get','category'],'공원'],'',
    ['step',['zoom'],'',15.5,['case',['in',['get','group'],['literal',['safety','public']]],['get','name'],''],17.8,['get','name']]],
 'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],16.5,11,19.5,12.5],
 'text-offset':[0,1.25],'text-anchor':'top','text-max-width':13,'text-padding':4,'text-optional':true,'text-allow-overlap':false,'icon-optional':false},
 paint:{'text-color':dark?'#e0eee8':'#2e5150','text-halo-color':dark?'#192e2b':'#fff','text-halo-width':1.5}});
 else{map.setFilter(POINTS,filter);map.setPaintProperty(POINTS,'text-color',dark?'#e0eee8':'#2e5150');map.setPaintProperty(POINTS,'text-halo-color',dark?'#192e2b':'#fff');}
}
export function officialSearchPlaces(query,places=[],limit=20){
 const q=String(query||'').trim().replace(/\s+/g,'').toLowerCase();
 if(q.length<2)return [];
 return places.filter(p=>facilityNameMatches(p,query))
   .slice(0,limit).map(p=>normalizeFacilityRecord({...p,category:p.category||'시설'}));
}
/** Explicit search only: do not query remote OSM on each keystroke.
 * The public provider does not guarantee completeness or verified contact data. */
export async function searchOsmGeneralFacilities(term,{signal,fetcher=fetch}={}){
 const query=String(term||'').trim();
 if(query.length<2)return [];
 // Nominatim bounded place search for Dongjak and nearby stations, not reverse geocoding.
 const params=new URLSearchParams({q:query,format:'jsonv2',limit:'25',bounded:'1',
   viewbox:'126.886,37.554,127.040,37.466',addressdetails:'1','accept-language':'ko'});
 const url=`https://nominatim.openstreetmap.org/search?${params}`;
 const response=await fetcher(url,{signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error(`OSM 장소 검색 HTTP ${response.status}`);
 const list=await response.json();
 if(!Array.isArray(list))return [];
 return list.map(item=>({id:`osm-search-${item.place_id}`,
   name:String(item.name||item.display_name||'').split(',')[0].trim(),
   category:facilityOsmCategory({amenity:item.type,class:item.class,name:item.name||item.display_name},GENERAL_OSM_CATEGORIES[item.type]||GENERAL_OSM_CATEGORIES[item.class]||'일반시설'),
   lng:Number(item.lon),lat:Number(item.lat),
   address:String(item.display_name||''),source:'© OpenStreetMap 기여자 · 검색 결과',
   phone:'',website:''})).filter(p=>p.name&&Number.isFinite(p.lng)&&Number.isFinite(p.lat));
}
export function officialSearchSnapshot(){return searchableGeneralPlaces.slice();}
export function cachedOfficialSearchPlaces(query){return officialSearchPlaces(query,searchableGeneralPlaces,40);}
export async function queryOfficialPlaces(query,{signal,fetcher=fetch,remoteFallback=true}={}){
 const term=String(query||'').trim();if(term.length<2)return [];
 const cached=officialSearchPlaces(term,searchableGeneralPlaces,40);
 const u=new URL('/api/seoul-facilities',location.origin);
 u.searchParams.set('q',term);u.searchParams.set('limit','60');
 let official=[];
 try{const response=await fetcher(u,{signal});if(response.ok){const json=await response.json();
   if(Array.isArray(json.places))official=json.places;
 }}catch(error){if(error?.name==='AbortError')throw error;}
 const seen=new Set(),results=[];
 for(const rawPlace of [...official,...cached]){
   const place=normalizeFacilityRecord(rawPlace);
   const id=String(place.id||`${place.name}:${place.lng}:${place.lat}`);
   if(seen.has(id)||results.some(p=>sameFacility(p,place)))continue;seen.add(id);results.push(place);
 }
 // A remote fallback complements current-viewport cache, even when D1 is unavailable.
 if(remoteFallback&&results.length<7){try{
   const remote=await searchOsmGeneralFacilities(term,{signal,fetcher});
   for(const rawPlace of remote){const place=normalizeFacilityRecord(rawPlace);if(!seen.has(place.id)&&!results.some(p=>sameFacility(p,place))){seen.add(place.id);results.push(place);}}
 }catch(error){if(error?.name==='AbortError')throw error;}}
 return results.slice(0,60);
}
/** A failed category must not suppress the remaining official categories. */
export async function collectOfficialFacilityPages(categories,fetchPage,{maxPages=4}={}){
 const places=[],ids=new Set(),failed=[],empty=[],truncated=[];
 for(const category of categories){
   let count=0;
   try{
     for(let page=0;page<maxPages;page++){
       const json=await fetchPage(category,page);
       if(!json?.ok||!Array.isArray(json.places))throw new Error('facility page unavailable');
       count+=json.places.length;
       for(const p of json.places){if(!ids.has(p.id)){ids.add(p.id);places.push(p);}}
       if(!json.hasMore)break;
       if(page===maxPages-1)truncated.push(category);
     }
     if(!count)empty.push(category);
   }catch{failed.push(category);}
 }
 return {places,failed,empty,truncated};
}
export function installSeoulOfficialFacilities({map,maplibregl,getBoundary,canOpen=()=>true,app}={}){
 if(!map||!getBoundary)return {ok:false};
 let cache=EMPTY,active=true,timer=null,inflight=false,lastBox='',latest=0,lastAttempt=0,forceRefresh=false;
 const statusNode=document.getElementById('general-facility-status');
 const status=(message)=>{if(statusNode)statusNode.textContent=message;};
 let groups=new Set(DEFAULT_POI_GROUPS);
 function restore(){try{buildLayers(map,cache,groups,app?.dataset?.theme==='dark');}catch(error){console.warn('[서울 시설 레이어 복원]',error?.message);}}
 function targetBBox(){
   const b=map.getBounds?.();if(!b)return '';
   const west=Math.max(126.87,b.getWest()-.004),east=Math.min(127.05,b.getEast()+.004);
   const south=Math.max(37.43,b.getSouth()-.004),north=Math.min(37.57,b.getNorth()+.004);
   return west<east&&south<north?[west,south,east,north].map(n=>n.toFixed(5)).join(','):'';
 }
 async function refresh(){
   if(!active||!getBoundary())return;
   if(map.getZoom?.()<14){status('지도를 확대하면 주변 시설을 불러옵니다.');return;}
   const bbox=targetBBox();if(!bbox)return;
   if(inflight){forceRefresh=true;return;}
   if(!forceRefresh&&bbox===lastBox&&Date.now()-latest<120000)return;
   if(!forceRefresh&&bbox===lastBox&&Date.now()-lastAttempt<30000)return;
   inflight=true;forceRefresh=false;lastAttempt=Date.now();
   status('일반시설 최신 정보 조회 중…');
   try{
     // Fetch pharmacy independently: commercial rows must never crowd out safety data.
     const wanted=['약국',...(groups.has('convenience')?['동물약국','편의점']:[]),...(groups.has('food')?['음식점','휴게음식점']:[]),...(groups.has('cafe')?['카페']:[])];
     const official=await collectOfficialFacilityPages(wanted,async(category,page)=>{
       const u=new URL('/api/seoul-facilities',location.origin);
       u.searchParams.set('bbox',bbox);u.searchParams.set('category',category);u.searchParams.set('limit','1200');u.searchParams.set('offset',String(page*1200));
       const response=await fetch(u.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
       if(!response.ok)throw new Error('facility page unavailable');
       return response.json();
     });
     const merged=[...official.places],ids=new Set(merged.map(p=>p.id));
     let source='서울시 등록 시설',osmFailed=false;
     // OSM also supplies categories not present in the Seoul licensing database.
     // A failed complementary feed must not discard valid official rows.
     try{
       const osm=await loadOsmGeneralFacilities(bbox,{signal:AbortSignal.timeout(12000)});
       for(const p of osm){if(!ids.has(p.id)&&!merged.some(q=>sameFacility(q,p))){ids.add(p.id);merged.push(p);}}
       if(osm.length)source=official.places.length?'서울시·OSM 시설':'OSM 공개지도 시설';
     }catch{osmFailed=true;}
     if(!merged.length&&osmFailed&&official.failed.length)throw new Error('facility sources unavailable');
     const partial=official.failed.length||official.truncated.length||osmFailed;
     const next=officialFeatures(merged,getBoundary());
     cache=next;searchableGeneralPlaces=merged.filter(p=>insideBoundary([Number(p.lng),Number(p.lat)],getBoundary()));restore();
     app?.dispatchEvent(new CustomEvent('dongjak:official-facilities-ready',{detail:next.features.map(f=>({...f.properties,lng:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]}))}));lastBox=bbox;latest=Date.now();
     status(`${source} ${next.features.length.toLocaleString()}곳 · ${partial?'일부 자료 조회 제한 · ':''}표시 정보는 현장 확인 필요`);
   }catch(error){
     status(cache.features.length?`기존 일반시설 ${cache.features.length}곳 표시 중 · 최신 조회 실패`:'일반시설 조회 실패 · 다시 시도해 주세요');
     console.warn('[일반 시설 조회]',String(error?.message||error).slice(0,120));
   }finally{
     inflight=false;
     if(forceRefresh&&active){forceRefresh=false;schedule();}
   }
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(refresh,900);}
 groups=installFacilityCategories(app,next=>{groups=next;restore();forceRefresh=true;schedule();});
 restore();
 const themeObserver=app?new MutationObserver(restore):null;themeObserver?.observe(app,{attributes:true,attributeFilter:['data-theme']});
 map.on('moveend',schedule);map.on('zoomend',schedule);map.on('style.load',restore);
 const processed=new WeakSet();
 const click=e=>{
   if(!canOpen()||app?.dataset?.tab!=='map'||hasTransportPoiHit(map,e))return;
   if(e.originalEvent&&processed.has(e.originalEvent))return;
   if(e.originalEvent)processed.add(e.originalEvent);
   const f=e.features?.[0];if(!f)return;
   const [lng,lat]=f.geometry?.coordinates||[];if(!Number.isFinite(lng)||!Number.isFinite(lat))return;
   const prop=f.properties||{};
   openPlaceDetails({map,maplibregl,lngLat:{lng,lat},place:{
     name:prop.name,registeredName:prop.registeredName,type:prop.category,address:prop.address,phone:prop.phone,website:prop.website,
     source:prop.source,note:'등록된 공개자료의 정보입니다. 실제 운영 및 이용 가능 여부는 방문 전에 확인해 주세요.',lng,lat
   }});
 };
 for(const id of [POINTS]){
   map.on('click',id,click);
   map.on('mouseenter',id,()=>{if(canOpen())map.getCanvas().style.cursor='pointer';});
   map.on('mouseleave',id,()=>{map.getCanvas().style.cursor='';});
 }
 const retry=document.getElementById('refresh-general-facilities');
 const retryClick=()=>{forceRefresh=true;lastBox='';schedule();};
 retry?.addEventListener('click',retryClick);
 const externalRetry=()=>retryClick();
 document.addEventListener('dongjak:refresh-general-facilities',externalRetry);
 schedule();
 return {ok:true,refresh,stop:()=>{active=false;clearTimeout(timer);themeObserver?.disconnect();
   retry?.removeEventListener('click',retryClick);
   document.removeEventListener('dongjak:refresh-general-facilities',externalRetry);
 }};
}
