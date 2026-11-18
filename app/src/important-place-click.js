import {openPlaceDetails} from './place-details.js';
export const IMPORTANT_PLACES=Object.freeze([
  {name:'중앙대학교',type:'대학교',address:'서울특별시 동작구 흑석로 84',lng:126.95676,lat:37.50439},
  {name:'숭실대학교',type:'대학교',address:'서울특별시 동작구 상도로 369',lng:126.9551579174,lat:37.4964289689},
  {name:'총신대학교',type:'대학교',address:'서울특별시 동작구 사당로 143',lng:126.9667631083,lat:37.4879290071},
  {name:'동작구청',type:'공공기관',address:'서울특별시 동작구 장승배기로 70',lng:126.9402905,lat:37.5042528},
  {name:'국립서울현충원',type:'기념시설',address:'서울특별시 동작구 현충로 210',lng:126.97652,lat:37.50036}
]);
const norm=s=>String(s||'').replace(/\s+/g,'').trim();
const aliases=new Map([
  ['중앙대학교서울캠퍼스','중앙대학교'],['서울현충원','국립서울현충원'],
  ['국립현충원','국립서울현충원'],['국립서울현충원','국립서울현충원']
]);
function knownName(value){
  const n=norm(value);return aliases.get(n)||n;
}
export function importantPlaceFromFeatures(features=[]){
  for(const feature of features){
    const props=feature?.properties||{};
    const keys=['name:ko','name:nonlatin','name','name_ko','title'];
    for(const key of keys){
      const n=knownName(props[key]);
      const found=IMPORTANT_PLACES.find(p=>norm(p.name)===n);
      if(found)return {...found};
    }
  }
  return null;
}
/** Select a nearby trusted representative pin even when OpenMapTiles rendered no POI label. */
export function importantPlaceNearPoint(map,point,{maxPixels=24,minZoom=13}={}){
  if(!map?.project||!point||typeof map.getZoom!=='function'||map.getZoom()<minZoom)return null;
  let nearest=null,best=maxPixels*maxPixels;
  for(const place of IMPORTANT_PLACES){
    const p=map.project([place.lng,place.lat]);
    const d=(p.x-point.x)**2+(p.y-point.y)**2;
    if(d<=best){best=d;nearest=place;}
  }
  return nearest?{...nearest}:null;
}
export function installImportantPlaceClick({map,maplibregl}={}){
  if(!map?.on)return ()=>{};
  const handler=evt=>{
    // The dedicated native featured-place layer has its own click handler.
    // Do not open a duplicate popup for the same map click.
    let features=[];
    try{features=map.queryRenderedFeatures?.(evt.point)||[];}catch{}
    if(features.some(f=>['dongjak-featured-place-names','dongjak-featured-place-dots',
      'dongjak-featured-place-logos'].includes(f.layer?.id)))return;
    const place=importantPlaceFromFeatures(features)||importantPlaceNearPoint(map,evt.point);
    if(!place)return;
    openPlaceDetails({map,maplibregl,place:{...place,source:'기관 공식 주소 / 지도 대표 지점 (출입구 위치 아님)'},lngLat:evt.lngLat});
  };
  map.on('click',handler);
  return ()=>map.off?.('click',handler);
}
