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
