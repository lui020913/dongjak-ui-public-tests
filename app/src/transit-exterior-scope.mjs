/** Transit-only pilot service area: the existing Seoul geocoder rectangle,
 * not a claim of complete metropolitan coverage. Ordinary walking stays strict.
 */
export const TRANSIT_SEARCH_BOUNDS=Object.freeze([[126.78,37.40],[127.20,37.70]].map(Object.freeze));
export function transitPointInScope(p){
 return Number.isFinite(p?.lng)&&Number.isFinite(p?.lat)&&p.lng>=TRANSIT_SEARCH_BOUNDS[0][0]&&p.lng<=TRANSIT_SEARCH_BOUNDS[1][0]&&p.lat>=TRANSIT_SEARCH_BOUNDS[0][1]&&p.lat<=TRANSIT_SEARCH_BOUNDS[1][1];
}
export function transitCoordinatesInScope(coords){
 return Array.isArray(coords)&&coords.length>=2&&coords.every(p=>Array.isArray(p)&&p.length===2&&transitPointInScope({lng:p[0],lat:p[1]}));
}
export function transitEndpointPolicy(from,to,inside){
 if(!transitPointInScope(from)||!transitPointInScope(to))return 'outside-service-area';
 if(typeof inside!=='function')return 'boundary-unavailable';
 const a=inside(from.lng,from.lat),b=inside(to.lng,to.lat);
 if(a===null||b===null)return 'boundary-unavailable';
 return a===true||b===true?'allowed':'both-outside';
}
export function exteriorMapActive({mode,tab,pick,preview}){
 return Boolean(preview&&tab==='map'||mode==='transit'&&(tab==='route'||tab==='map'&&['start','end'].includes(pick)));
}
export function transitWalkStyle(walk){
 return walk?.transitPri&&Number.isFinite(walk.transitPri.risk)&&walk.transitPri.coverage>=.65&&!walk.transitExterior?'#168f82':'#89958f';
}

// Search acceptance and rendering extent are independent. Keep a small road
// context around the district until endpoints are known, then around the trip.
export function transitContextBounds(districtBounds,endpoints=[],routeCoords=[]){
 const valid=p=>Array.isArray(p)&&transitPointInScope({lng:p[0],lat:p[1]});
 const ends=endpoints.filter(transitPointInScope).map(p=>[p.lng,p.lat]);
 const path=routeCoords.filter(valid);
 const points=[...ends,...path];
 if(ends.length<2)points.push(...districtBounds.filter(valid));
 if(!points.length)return TRANSIT_SEARCH_BOUNDS;
 let x=Infinity,X=-Infinity,y=Infinity,Y=-Infinity;
 for(const [lng,lat] of points){x=Math.min(x,lng);X=Math.max(X,lng);y=Math.min(y,lat);Y=Math.max(Y,lat);}
 // Keep roughly 750 m of local context before endpoints are known. Once a
 // trip is selected, add proportional clearance only for the actual trip fit.
 const latPad=ends.length<2&&!path.length ? .00675:Math.max(.00675,(Y-y)*.25,(X-x)*.3);
 const lngPad=ends.length<2&&!path.length ? .0085:Math.max(.0085,(X-x)*.25,(Y-y)*.3);
 return [[Math.max(TRANSIT_SEARCH_BOUNDS[0][0],x-lngPad),Math.max(TRANSIT_SEARCH_BOUNDS[0][1],y-latPad)],
 [Math.min(TRANSIT_SEARCH_BOUNDS[1][0],X+lngPad),Math.min(TRANSIT_SEARCH_BOUNDS[1][1],Y+latPad)]];
}
// A full viewport must be able to extend beyond the route endpoints when the
// usable map is only the small strip above a sheet. Service-area checks still
// govern actual routing; the larger camera envelope is not a routing region.
export function transitFramingBounds(){return [[126.60,37.22],[127.38,37.88]];}
// The original safety map is authoritative. No geometry, filter, source,
// visibility or terrain changes are made when entering transit.
export const DISTRICT_FADE_MS=250;
export function setDistrictOpacity(map,id,property,value){
 if(!map.getLayer(id)||map.getPaintProperty(id,property)===value)return;
 const duration=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?0:DISTRICT_FADE_MS;
 const transition={duration,delay:0},key=property+'-transition';
 if(JSON.stringify(map.getPaintProperty(id,key))!==JSON.stringify(transition))map.setPaintProperty(id,key,transition);
 map.setPaintProperty(id,property,value);
}
export function applyDistrictOutlineVisibility(map,active,phone=false,enabled=true){
 for(const [id,opacity] of [['district-border',.96],['district-border-halo',phone?.42:.92]]){
  setDistrictOpacity(map,id,'line-opacity',active||!enabled?0:opacity);
 }
}
export function applyTransitBoundaryVisibility(map,active,phone=false,exteriorOpacity=.65,outlineEnabled=true){
 const opacity=active?0:exteriorOpacity;
 setDistrictOpacity(map,'district-exterior-fade','fill-opacity',opacity);
 applyDistrictOutlineVisibility(map,active,phone,outlineEnabled);
}
