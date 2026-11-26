// A bus/rail hit is never a residential or general facility hit merely because
// the same landmark name appears in the transport registry.
const transitLayer=/^(?:transport-|dj-transport-|dj-basemap-bus-|dj-metro-|metro-access-|dj-route-bus-)/;
export function isTransitPoiFeature(f){
 const id=String(f?.layer?.id||'');
 if(transitLayer.test(id))return true;
 const p=f?.properties||{};
 return [p.class,p.subclass,p.kind].some(t=>['bus','bus_stop','bus_station','rail','subway','station','halt','tram_stop','subway_entrance'].includes(t));
}
export function hasTransportPoiHit(map,event){
 try{return (map.queryRenderedFeatures(event.point)||[]).some(f=>transitLayer.test(String(f.layer?.id||'')));}catch{return false;}
}
