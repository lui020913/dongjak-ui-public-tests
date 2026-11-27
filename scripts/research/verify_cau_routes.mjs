import {readFileSync} from 'node:fs';
import {findTransitOptions,busSegment,directBusPairs} from '../../app/src/transit-route-planner.mjs';
import {DongjakWalkSlopeRouter} from '../../app/src/lib/dongjakWalkSlopeRouter.mjs';
import {chooseShortestPedestrianNetwork,pedestrianEffectiveMeters} from '../../app/src/pedestrian-network-comparison.mjs';
import {VERIFIED_STATIONS} from '../../app/src/fixed-rail-data.js';
const base='https://dongjak-walk-safety-preview.pages.dev';
const staticData=JSON.parse(readFileSync(new URL('../../app/public/data/transport/seoul-bus-stops.json',import.meta.url)));
const graph=JSON.parse(readFileSync(new URL('../../app/public/data/safety/walk/dongjak_walk_graph.json',import.meta.url)));
const slopes=JSON.parse(readFileSync(new URL('../../app/public/data/safety/slope/dongjak_walk_slope_by_link.json',import.meta.url)));
const router=new DongjakWalkSlopeRouter(graph,slopes);
const get=async (url,options={})=>{const r=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status+' '+url);return r.json();};
const emit=(tag,obj)=>console.log(tag+' '+JSON.stringify(obj));
const failures=[];
const stop=id=>{const s=staticData.stops.find(x=>String(x.arsId)===id);if(!s)throw Error('Missing source stop '+id);return {...s,arsId:id,lng:Number(s.lng),lat:Number(s.lat)};};
const middle=stop('20205'),back=stop('20203'),backOpposite=stop('20202'),ssu=stop('20165');
const point=s=>[s.lng,s.lat];
const length=coords=>coords.slice(1).reduce((sum,p,i)=>sum+Math.hypot((p[0]-coords[i][0])*88000,(p[1]-coords[i][1])*111000),0);
try{
 const data=await get(base+'/api/transport/bus/route-path?routeId=100100250');
 if(String(data.routeId)!=='100100250'||!Array.isArray(data.stops)||!Array.isArray(data.coordinates))throw Error('Invalid route response');
 const pairs=directBusPairs(data.stops,new Set(['20205']),new Set(['20203','20165']));
 const routes=pairs.map(p=>{const coords=busSegment(data.coordinates,p.stops);return {origin:p.origin.arsId,destination:p.destination.arsId,stopCount:p.stopCount,stops:p.stops.map(s=>({name:s.name,arsId:s.arsId,seq:s.seq})),geometryMeters:coords?Math.round(length(coords)):null};});
 emit('REAL_5511_ORDER',{routeId:data.routeId,routes});
 if(!routes.some(r=>r.destination==='20203'&&r.stopCount===1&&r.geometryMeters>0))throw Error('No valid one-stop middle-to-back direction');
 if(!routes.some(r=>r.destination==='20165'&&r.stopCount===6&&r.geometryMeters>0))throw Error('No valid six-stop middle-to-Soongsil direction');
 const fetcher=async(path,options)=>path==='/data/transport/seoul-bus-stops.json'?new Response(JSON.stringify(staticData)):fetch(base+path,{...options,signal:AbortSignal.timeout(20000)});
 const found=await findTransitOptions(middle,ssu,{fetcher,apiBase:'/api/transport'});
 const bus=[...found.bus,...found.mixed].filter(r=>r.route==='5511'||r.legs?.some(l=>l.route==='5511')).map(r=>({kind:r.kind,origin:r.origin.arsId||r.origin.name,destination:r.destination.arsId||r.destination.name,stops:r.stops?.map(s=>s.name),legs:r.legs?.map(l=>({route:l.route,origin:l.origin.arsId||l.origin.name,destination:l.destination.arsId||l.destination.name})),score:r.score}));
 emit('REAL_5511_APP_CANDIDATES',{busStatus:found.busStatus,from:middle,to:ssu,bus});
 if(!bus.some(r=>r.origin==='20205'&&r.destination==='20165'))failures.push('App candidate list omitted direct 5511 from reference middle stop to Soongsil');
}catch(e){failures.push('Bus: '+e.message);emit('BUS_CHECK_ERROR',e.message);}
function decode(shape){let i=0,lat=0,lng=0,out=[];const read=()=>{let b,n=0,shift=0;do{if(i>=shape.length)throw Error('Truncated polyline');b=shape.charCodeAt(i++)-63;n|=(b&31)<<shift;shift+=5;}while(b>=32);return n&1?~(n>>1):n>>1;};while(i<shape.length){lat+=read();lng+=read();out.push([lng/1e6,lat/1e6]);}return out;}
async function external(from,to){
 const payload={locations:[{lat:from.lat,lon:from.lng},{lat:to.lat,lon:to.lng}],costing:'pedestrian',costing_options:{pedestrian:{use_hills:.5}},units:'kilometers'};
 const trip=(await get('https://valhalla1.openstreetmap.de/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})).trip;
 if(!trip?.legs?.length||!Number.isFinite(trip.summary?.length))throw Error('Invalid pedestrian response');
 return {source:'valhalla-external',kilometers:trip.summary.length,seconds:trip.summary.time,coords:trip.legs.flatMap(l=>decode(l.shape))};
}
async function findLibrary(){
 const q='[out:json][timeout:25];nwr["name"~"중앙도서관|Central Library"](37.501,126.952,37.508,126.961);out center tags;';
 let results=[];
 for(const url of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
  try{const d=await get(url+'?'+new URLSearchParams({data:q}));results=d.elements||[];if(results.length)break;}catch(e){emit('LIBRARY_SOURCE_ERROR',e.message);}
 }
 const pts=results.map(e=>({id:e.type+'/'+e.id,name:e.tags?.name,lng:e.lon??e.center?.lon,lat:e.lat??e.center?.lat})).filter(p=>Number.isFinite(p.lng)&&Number.isFinite(p.lat));
 if(pts.length!==1)throw Error('Library OSM match not unique: '+JSON.stringify(pts));
 return pts[0];
}
async function walkPair(name,from,to){
 let local=null,other=null,localError=null,externalError=null;
 try{const r=router.route(point(from),point(to),{mode:'shortest',maxSnapMeters:85});local={source:'seoul-pedestrian-graph',kilometers:r.distanceMeters/1000,seconds:r.estimatedMinutes*60,coords:r.geojson.geometry.coordinates,snapStartM:r.startSnapMeters,snapEndM:r.endSnapMeters,vehiclePermittedM:r.vehiclePermittedMeters,linkIds:r.linkIds};}catch(e){localError=e.message;}
 try{other=await external(from,to);}catch(e){externalError=e.message;}
 const selected=chooseShortestPedestrianNetwork(local,other,from,to);
 const describe=r=>r?{source:r.source,distanceMeters:r.kilometers*1000,effectiveMeters:pedestrianEffectiveMeters(r,from,to),vehiclePermittedM:r.vehiclePermittedM,snapStartM:r.snapStartM,snapEndM:r.snapEndM,linkIds:r.linkIds,coords:r.coords}:null;
 emit('CAMPUS_WALK_PAIR',{name,from,to,local:describe(local),external:describe(other),selected:selected?.source??null,localError,externalError});
 if(!selected||!other)failures.push(name+': independent pedestrian comparison unavailable');
}
try{
 const library=await findLibrary();
 emit('LIBRARY_REFERENCE',{...library,source:'OSM named central library object; not user GPS or verified entrance'});
 await walkPair('middle-stop to central library',middle,library);
 await walkPair('back-stop to central library',back,library);
 const [lng,lat]=VERIFIED_STATIONS['상도'];
 await walkPair('Sangdo station to central library',{name:'상도역',lng,lat},library);
}catch(e){failures.push('Campus: '+e.message);emit('CAMPUS_CHECK_ERROR',e.message);}
emit('FIELD_CHECK_SUMMARY',{failures,scope:'Public stop order and representative endpoints; no physical on-site access certification; no release gate change'});
if(failures.length)process.exitCode=1;
