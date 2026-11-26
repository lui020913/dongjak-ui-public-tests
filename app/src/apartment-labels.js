import {openPlaceDetails} from './place-details.js';

// OSM/OpenMapTiles does not have a full Korean apartment-name directory.
// Label existing named building features only; never infer a name from geometry.
export const APARTMENT_WORDS=['아파트','래미안','힐스테이트','자이','푸르지오','아이파크','롯데캐슬','센트럴','더샵','포스코','주공'];
const getName=['coalesce',['get','name:ko'],['get','name'],''];
const residentialTypes=['apartments','apartment','residential','housing','housing_estate'];
const residentialTypeFilter=['any',...['class','subclass','building','landuse'].map(k=>['in',['get',k],['literal',residentialTypes]])];
export function isApartmentLabelFeature(feature,kind){
 const p=feature?.properties||{},name=String(p['name:ko']||p.name||'');
 if(!APARTMENT_WORDS.some(w=>name.includes(w)))return false;
 // Building geometry can carry a generic class; a POI must explicitly identify housing.
 return kind==='building'? !['commercial','retail','school','hospital','industrial','office'].some(t=>[p.class,p.subclass,p.building].includes(t)):['class','subclass','building','landuse'].some(k=>residentialTypes.includes(p[k]))&&!['bus','rail','bus_stop','bus_station','bicycle_rental','shop','convenience'].some(t=>[p.class,p.subclass].includes(t));
}
export const apartmentNameFilter=(boundary,kind='poi')=>['all',
  ['within',boundary],
  ['any',...APARTMENT_WORDS.map(word=>['in',word,getName])],
  ['!=',getName,''],
  ...(kind==='building'?[['!', ['any',...['class','subclass','building'].map(k=>['in',['get',k],['literal',['commercial','retail','school','hospital','industrial','office']]])]]]:[residentialTypeFilter,['!', ['any',...['class','subclass'].map(k=>['in',['get',k],['literal',['bus','rail','bus_stop','bus_station','bicycle_rental','shop','convenience']]])]]])
];
export function installApartmentLabels({map,maplibregl,boundaryGeometry}={}){
  if(!map?.getStyle||!boundaryGeometry)return {ok:false,reason:'no-map-or-boundary'};
  const layers=map.getStyle()?.layers||[];
  const b=layers.find(x=>x.source&&x['source-layer']==='building');
  const poi=layers.find(x=>x.source&&x['source-layer']==='poi');
  const installed=[];
  for(const [kind,base] of [['building',b],['poi',poi]]){
    if(!base)continue;
    const id=`dj-apartment-label-${kind}`;
    if(map.getLayer(id))continue;
    try{
      map.addLayer({id,type:'symbol',source:base.source,'source-layer':base['source-layer'],
        minzoom:kind==='building'?15.5:15.7,
        filter:apartmentNameFilter(boundaryGeometry,kind),
        layout:{'text-field':getName,'text-font':['Noto Sans Regular','Open Sans Regular'],
          'text-size':['interpolate',['linear'],['zoom'],15.5,10,18,12],
          'text-anchor':'center','text-max-width':18,'text-padding':8,
          'text-allow-overlap':false,'symbol-sort-key':1},
        paint:{'text-color':'#4a626a','text-halo-color':'#fff','text-halo-width':1.65}});
      installed.push(id);
      map.on('click',id,e=>{
        const feature=e.features?.[0];if(!isApartmentLabelFeature(feature,kind))return;
        const hits=map.queryRenderedFeatures(e.point)||[];
        if(hits.some(f=>/^(transport-|dj-transport-|dj-basemap-bus-|dj-metro-|metro-access-|dj-civic-poi-|dj-seoul-official-)/.test(f.layer?.id||'')))return;
        const name=feature.properties?.['name:ko']||feature.properties?.name;
        if(!name)return;
        openPlaceDetails({map,maplibregl,lngLat:e.lngLat,place:{name,type:'아파트',
          address:feature.properties?.['addr:full']||'',source:'OpenMapTiles / © OpenStreetMap 기여자',
          note:'지도에 등록된 명칭입니다. 동·호수나 실제 건물 출입구 위치를 나타내지는 않습니다.'}});
      });
      map.on('mouseenter',id,()=>{map.getCanvas().style.cursor='pointer';});
      map.on('mouseleave',id,()=>{map.getCanvas().style.cursor='';});
    }catch(error){console.info('[아파트 이름] 출처에 명칭 데이터가 없는 경우 제외:',error.message);}
  }
  return {ok:installed.length>0,layers:installed};
}
