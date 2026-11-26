import {nearbyOfficialStaticStops,officialStaticBusPlaces} from './static-bus-stops.js';
import {railTransferOptions} from './v815-route-planner.js';
const meters=(a,b)=>Math.hypot((a.lat-b.lat)*111000,(a.lng-b.lng)*88000);
export function directBusPairs(stops,originIds,destinationIds){
  const ordered=[...stops].filter(s=>Number.isInteger(s.seq)).sort((a,b)=>a.seq-b.seq);
  const result=[];
  for(let i=0;i<ordered.length;i++){
    const board=ordered[i];if(!originIds.has(board.arsId))continue;
    for(let j=i+1;j<ordered.length;j++){
      const alight=ordered[j];if(!destinationIds.has(alight.arsId)||board.arsId===alight.arsId)continue;
      result.push({origin:board,destination:alight,stopCount:j-i,stops:ordered.slice(i,j+1)});
    }
  }
  return result;
}
export function busSegment(coordinates,stops){
  if(!Array.isArray(coordinates)||!Array.isArray(stops)||stops.length<2)return null;
  // Match every ordered stop against the official ordered route geometry.
  // Refuse ambiguous loops rather than invent a straight line or wrong direction.
  let previous=-1;const indices=[];
  for(const stop of stops){
    let best=-1,min=Infinity;
    for(let i=previous+1;i<coordinates.length;i++){
      const p=coordinates[i];if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))continue;
      const d=meters(stop,{lng:p[0],lat:p[1]});
      if(d<min){min=d;best=i;}
      if(d<12)break;
    }
    if(best<0||min>75)return null;
    indices.push(best);previous=best;
  }
  return coordinates.slice(indices[0],indices.at(-1)+1);
}
export async function findTransitOptions(from,to,{fetcher=globalThis.fetch,signal,apiBase='/api/transport'}={}){
  const get=async(path)=>{const r=await fetcher(path,{signal});if(!r.ok)throw new Error('교통정보 조회 실패');return r.json();};
  const rail=railTransferOptions(from,to,{limit:4}).map(p=>({...p,kind:'rail'}));
  let bus=[],busStatus='complete';
  try{
    const data=await get('/data/transport/seoul-bus-stops.json');
    if(!officialStaticBusPlaces(data).length)throw new Error('정류소 원본 확인 불가');
    const starts=nearbyOfficialStaticStops(data,from.lat,from.lng,650).slice(0,4);
    const ends=nearbyOfficialStaticStops(data,to.lat,to.lng,650).slice(0,8);
    const startIds=new Set(starts.map(x=>x.arsId)),endIds=new Set(ends.map(x=>x.arsId));
    if(starts.length&&ends.length){
      const candidates=new Map();
      const arrivals=await Promise.allSettled(starts.map(s=>get(apiBase+'/bus?'+new URLSearchParams({arsId:s.arsId}))));
      if(arrivals.some(x=>x.status==='rejected'))busStatus='partial';
      for(const res of arrivals)if(res.status==='fulfilled')for(const item of res.value.items||[]){
        if(/^\d{5,15}$/.test(item.routeId||''))candidates.set(item.routeId,{name:item.route,routeType:item.routeType});
      }
      const routeEntries=[...candidates].slice(0,12);
      if(candidates.size>routeEntries.length)busStatus='partial';
      for(let i=0;i<routeEntries.length;i+=3){
        if(signal?.aborted)throw new Error('취소');
        const batch=await Promise.allSettled(routeEntries.slice(i,i+3).map(async ([id,{name,routeType}])=>{
          const data=await get(apiBase+'/bus/route-path?'+new URLSearchParams({routeId:id}));
          if(String(data.routeId)!==id||!Array.isArray(data.stops)||data.stops.length<2)throw new Error('노선 미확인');
          const pairs=directBusPairs(data.stops,startIds,endIds)
            .map(p=>({...p,walkM:meters(from,p.origin)+meters(to,p.destination)}))
            .sort((a,b)=>a.walkM-b.walkM||a.stopCount-b.stopCount);
          for(const p of pairs){
            const coords=busSegment(data.coordinates,p.stops);
            if(coords?.length>=2)return {...p,kind:'bus',routeId:id,route:name,routeType,coords};
          }
          return null;
        }));
        if(signal?.aborted)throw new Error('취소');
        if(batch.some(x=>x.status==='rejected'))busStatus='partial';
        bus.push(...batch.flatMap(x=>x.status==='fulfilled'&&x.value?[x.value]:[]));
      }
    }
    bus.sort((a,b)=>a.walkM-b.walkM||a.stopCount-b.stopCount);
  }catch(error){if(signal?.aborted)throw error;busStatus='unavailable';}
  return {bus:bus.slice(0,5),rail,busStatus};
}
