import {openPlaceDetails} from './place-details.js';
/** Priority place labels are DOM markers so vector-tile symbol collision cannot hide them. */
export function installPriorityMarkers({map,maplibregl,items=[],className='',minZoom=11.85}={}){
  if(!maplibregl?.Marker||!map)return ()=>{};
  const markers=[];
  for(const place of items){
    const el=document.createElement('button');el.type='button';
    el.className=`dj-priority-label ${className}`;el.textContent=place.name;
    el.setAttribute('aria-label',`${place.name} 정보 보기`);
    const marker=new maplibregl.Marker({element:el,anchor:'center',offset:place.offset||[0,0]})
      .setLngLat([place.lng,place.lat]).addTo(map);
    el.addEventListener('click',evt=>{
      evt.stopPropagation();
      openPlaceDetails({map,maplibregl,place:{...place,type:place.type||'주요 지명',source:place.source||'© OpenStreetMap 기여자'}});
    });
    markers.push({marker,el});
  }
  const update=()=>{
    const zoom=map.getZoom?.()??15;
    for(const {el} of markers)el.style.display=zoom>=minZoom?'block':'none';
  };
  map.on?.('zoom',update);update();
  return ()=>{map.off?.('zoom',update);for(const {marker} of markers)marker.remove();};
}
