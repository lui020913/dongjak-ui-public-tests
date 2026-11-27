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
// Vector building polygons cannot use the point/line-only within expression.
// Distance to the district polygon is zero for intersecting footprints.
// Preserve boundary-crossing buildings rather than deleting their inside portion.
export function districtScopedNativeLayer(layer){
 const kind=String(layer['source-layer']||''),id=String(layer.id||'');
 if(!kind||!['fill','fill-extrusion','line'].includes(layer.type))return false;
 if(kind==='building')return true;
 return /^(?:landuse|landcover|park|aeroway|housenumber|poi)$/.test(kind)&&!/road|highway|transportation/i.test(id);
}
export function installSharedDistrictScope(map,geometry){
 const boundary={type:geometry.type,coordinates:geometry.coordinates};
 const clause=['<=',['distance',boundary],0.1];
 const applied=new Map();
 const sync=()=>{
  if(map.isMoving?.())return;
  for(const layer of map.getStyle()?.layers||[]){
   if(!districtScopedNativeLayer(layer))continue;
   const current=map.getFilter(layer.id)||null;
   if(JSON.stringify(current)===applied.get(layer.id))continue;
   // Avoid stacking our own predicate if a theme modifies a different clause.
   const same=x=>JSON.stringify(x)===JSON.stringify(clause);
   const base=Array.isArray(current)&&current[0]==='all'?current.slice(1).filter(x=>!same(x)):current&&!same(current)?[current]:[];
   const filter=['all',...base,clause];
   map.setFilter(layer.id,filter);applied.set(layer.id,JSON.stringify(filter));
  }
 };
 sync();map.on?.('style.load',()=>{applied.clear();sync();});
 // The normal native layers exist at initial style load. Newly added building
 // labels are handled by the existing district label owner.
 return {sync};
}
