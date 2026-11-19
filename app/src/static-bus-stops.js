/** Offline-only reference data. Never call these realtime or imply a bus ETA. */
export function nearbyOfficialStaticStops(dataset,lat,lng,radius=180){
  const rows=Array.isArray(dataset?.stops)?dataset.stops:[];
  const r=Math.PI/180;
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!(radius>=0))return [];
  return rows.flatMap(stop=>{
    const x=Number(stop.lng),y=Number(stop.lat),arsId=String(stop.arsId||'').trim();
    if(!/^\d{5}$/.test(arsId)||!String(stop.name||'').trim()||!Number.isFinite(x)||!Number.isFinite(y))return [];
    const a=Math.sin((y-lat)*r/2)**2+Math.cos(lat*r)*Math.cos(y*r)*Math.sin((x-lng)*r/2)**2;
    const distance=2*6371000*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    if(distance>radius)return [];
    return [{id:`seoul-bus/${arsId}`,kind:'bus',arsId,name:stop.name,lng:x,lat:y,
      lines:[],source:'seoul-official-static-file',distanceMeters:Math.round(distance)}];
  }).sort((a,b)=>a.distanceMeters-b.distanceMeters);
}

/** Validate a converted Seoul source file before exposing it to the map.
 * Deliberately no sample coordinates: a missing file is not a successful import.
 */
export function officialStaticBusPlaces(dataset,inside=()=>true){
  if(dataset?.source!=='서울시 버스정류소 위치정보' || !/^20\d\d-\d\d-\d\d$/.test(String(dataset.sourceDate||'')))return [];
  if(!Array.isArray(dataset.stops)||dataset.stops.length<1000)return [];
  const seen=new Set(),result=[];
  for(const stop of dataset.stops){
    const arsId=String(stop?.arsId||'').trim(),name=String(stop?.name||'').trim();
    const lng=Number(stop?.lng),lat=Number(stop?.lat);
    if(!/^\d{5}$/.test(arsId)||!name||!Number.isFinite(lng)||!Number.isFinite(lat)
       ||lng<126||lng>128||lat<37||lat>38||seen.has(arsId)||inside(lng,lat)!==true)continue;
    seen.add(arsId);
    result.push({id:`seoul-bus/${arsId}`,kind:'bus',arsId,name,lng,lat,lines:[],
      source:'seoul-official-static-file',sourceDate:dataset.sourceDate,needsOfficialName:false});
  }
  return result;
}
