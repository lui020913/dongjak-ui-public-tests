import {openPlaceDetails} from './place-details.js';

/** Named OSM park POIs and named green polygons; avoid inventing park data. */
const PARK_CLASSES=new Set(['park','garden','nature_reserve','recreation_ground','playground']);
const PARK_SUBCLASSES=new Set(['park','garden','playground','nature_reserve']);
const TITLE_FIELDS=['name:ko','name:nonlatin','name_ko','name'];
function hasParkType(props={}){
  return PARK_CLASSES.has(String(props.class||'').toLowerCase()) ||
    PARK_SUBCLASSES.has(String(props.subclass||'').toLowerCase()) ||
    ['park','garden','playground','nature_reserve'].includes(String(props.leisure||'').toLowerCase());
}
export function parkPlaceFromFeature(feature,clicked){
  const props=feature?.properties||{};
  if(!hasParkType(props))return null;
  const name=TITLE_FIELDS.map(key=>String(props[key]||'').trim()).find(Boolean);
  if(!name || name.length>90)return null;
  const lng=Number(clicked?.lng),lat=Number(clicked?.lat);
  if(!Number.isFinite(lng)||!Number.isFinite(lat))return null;
  const type=props.subclass==='playground'||/어린이공원|놀이터/.test(name)?'어린이공원·놀이공간':
    props.class==='garden'?'정원·녹지':'공원·녹지';
  return {name,type,lng,lat,source:'지도 공개 공간정보(OpenStreetMap 기반)',
    note:'지도에 등록된 공원 명칭과 위치를 바탕으로 안내합니다. 산책로·화장실·조명·출입구 등 개별 시설의 실제 설치 및 운영 여부는 별도 확인이 필요합니다.'};
}
/**
 * Native map clicks on park labels as well as actual park polygons.
 * No extra geocoding/API request, and no fake details for unnamed green land.
 */
export function installParkInfoClick({map,maplibregl,isDongjak=()=>true}={}){
  if(!map?.on||!map?.queryRenderedFeatures)return ()=>{};
  const handler=event=>{
    const pos=event?.lngLat;
    if(!pos||isDongjak(pos.lng,pos.lat)!==true)return;
    const point=event.point;
    if(!point)return;
    let features=[];
    try{
      // The actual rendered vector source can have several layers for parks.
      // Inspect only a modest click footprint, never a broad radius that might
      // open an unrelated park while the user selects a road or a bus stop.
      features=map.queryRenderedFeatures(point)||[];
    }catch{return;}
    const front=features[0]?.layer?.id||'';
    if(/^(?:transport-|dj-transport-|dj-metro-|registered-points|pza-|metro-access-)/.test(front))return;
    const feature=features.find(f=>parkPlaceFromFeature(f,pos));
    const place=feature?parkPlaceFromFeature(feature,pos):null;
    if(!place)return;
    openPlaceDetails({map,maplibregl,place,lngLat:pos});
  };
  map.on('click',handler);
  return ()=>map.off?.('click',handler);
}
