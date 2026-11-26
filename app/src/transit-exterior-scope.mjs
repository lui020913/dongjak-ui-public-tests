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
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const x=Math.min(...xs),X=Math.max(...xs),y=Math.min(...ys),Y=Math.max(...ys);
 // A limited context margin, with enough breathing room for portrait route fit.
 const latPad=Math.max(.0135,(Y-y)*.25,(X-x)*.3);
 const lngPad=Math.max(.017,(X-x)*.25,(Y-y)*.3);
 return [[Math.max(TRANSIT_SEARCH_BOUNDS[0][0],x-lngPad),Math.max(TRANSIT_SEARCH_BOUNDS[0][1],y-latPad)],
 [Math.min(TRANSIT_SEARCH_BOUNDS[1][0],X+lngPad),Math.min(TRANSIT_SEARCH_BOUNDS[1][1],Y+latPad)]];
}
export function transitContextLayer(layer){
 const id=String(layer.id||''),source=String(layer.source||''),kind=String(layer['source-layer']||'');
 if(layer.type==='background'||layer.type==='raster')return true;
 if(/^(?:dj815-transit-|dj-transit-(?:rail-|multi-))/.test(id))return true;
 if(/^(?:district-exterior-fade|district-border(?:-halo)?)$/.test(id))return true;
 if(/(?:^|[-_])gps(?:[-_]|$)/i.test(id))return true;
 // Shared vector tiles: retain only ordinary street/water context, not POIs,
 // buildings, land-use, transit networks, or district analysis overlays.
 return (layer.type==='line'||layer.type==='fill')&&(
   /^(?:water|waterway|transportation)$/.test(kind)&&
   !/rail|subway|tram|platform|transit|bridge.*label/i.test(id)||
   /^(?:dj-)?reviewed-base-road(?:-|$)/.test(id)&&/road/.test(source)
 );
}
export function createTransitContextLayers(map){
 const saved=new Map();
 const enforce=()=>{
   for(const layer of map.getStyle()?.layers||[]){
     if(transitContextLayer(layer))continue;
     const old=map.getLayoutProperty(layer.id,'visibility')||'visible';
     if(!saved.has(layer.id))saved.set(layer.id,old);
     if(old!=='none')map.setLayoutProperty(layer.id,'visibility','none');
   }
 };
 return {enforce,restore(){
   for(const [id,value] of saved)if(map.getLayer(id)&&(map.getLayoutProperty(id,'visibility')||'visible')!==value)map.setLayoutProperty(id,'visibility',value);
   saved.clear();
 }};
}
