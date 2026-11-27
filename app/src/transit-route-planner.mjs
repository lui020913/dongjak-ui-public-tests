import {nearbyOfficialStaticStops,officialStaticBusPlaces} from './static-bus-stops.js';
import {railTransferOptions,shortestRailConnection} from './v815-route-planner.js';
import {VERIFIED_STATIONS} from './fixed-rail-data.js';
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
const geometryMeters=coords=>coords.slice(1).reduce((sum,p,i)=>sum+meters({lng:coords[i][0],lat:coords[i][1]},{lng:p[0],lat:p[1]}),0);
export function busSegment(coordinates,stops){
 if(!Array.isArray(coordinates)||!Array.isArray(stops)||stops.length<2||coordinates.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))return null;
 // Match the complete ordered stop sequence to the ordered route, not the
 // first nearby point of an opposite-direction segment or a loop.
 const cumulative=[0];for(let i=1;i<coordinates.length;i++)cumulative.push(cumulative.at(-1)+meters({lng:coordinates[i-1][0],lat:coordinates[i-1][1]},{lng:coordinates[i][0],lat:coordinates[i][1]}));
 let states=[];
 for(const [j,stop] of stops.entries()){
  const candidates=[];
  for(let i=0;i<coordinates.length;i++){
   const p=coordinates[i],d=meters(stop,{lng:p[0],lat:p[1]});if(d>75)continue;
   if(j===0){candidates.push({i,start:i,score:d});continue;}
   let best=null;
   for(const prev of states){if(prev.i>=i)continue;const score=prev.score+d+.12*(cumulative[i]-cumulative[prev.i]);if(!best||score<best.score)best={i,start:prev.start,score};}
   if(best)candidates.push(best);
  }
  if(!candidates.length)return null;states=candidates;
 }
 const best=states.sort((a,b)=>a.score-b.score)[0];
 return coordinates.slice(best.start,best.i+1);
}
// Cost is a screening heuristic: walking meters plus ridden distance
// scaled by approximate relative speed, plus a per-stop dwell penalty.
const rideCost=(distance,stops)=>.25*distance+37.5*stops;
const approximateRide=(rec,i,j)=>rideCost(rec.distanceAt[j]-rec.distanceAt[i],j-i);
const actualRide=leg=>leg.kind==='bus'?rideCost(geometryMeters(leg.coords),leg.stops.length-1):45*(leg.stops.length-1);

// Bounded, one-transfer search. Straight-line distance is a candidate
// screening metric only; the main router verifies every actual walking leg.
function busLeg(record,i,j){
 const stops=record.stops.slice(i,j+1),coords=busSegment(record.coordinates,stops);
 return coords?.length>=2?{kind:'bus',origin:stops[0],destination:stops.at(-1),stops,coords,routeId:record.id,route:record.name,routeType:record.routeType}:null;
}
const stations=Object.entries(VERIFIED_STATIONS).map(([name,[lng,lat]])=>({name,lng,lat}));
function railLeg(a,b){
 if(a.name===b.name)return null;
 const path=shortestRailConnection(a.name,b.name);
 if(!path||path.changes||path.stops.length<2)return null;
 const coords=path.stops.map(name=>VERIFIED_STATIONS[name]);
 return coords.every(Boolean)?{kind:'rail',origin:a,destination:b,stops:path.stops,lines:path.lines,coords}:null;
}
export function transferCandidates(records,from,to,startIds,endIds,{limit=3,maxTransferM=250}={}){
 const starts=[],ends=[];
 for(const rec of records){
  const ordered={...rec,stops:[...rec.stops].filter(s=>Number.isInteger(s.seq)&&Number.isFinite(s.lng)&&Number.isFinite(s.lat)).sort((a,b)=>a.seq-b.seq)};
  ordered.distanceAt=[0];for(let i=1;i<ordered.stops.length;i++)ordered.distanceAt.push(ordered.distanceAt.at(-1)+meters(ordered.stops[i-1],ordered.stops[i]));
  for(let i=0;i<ordered.stops.length;i++){
   if(startIds.has(ordered.stops[i].arsId))starts.push({rec:ordered,i});
   if(endIds.has(ordered.stops[i].arsId))ends.push({rec:ordered,i});
  }
 }
 const rank=(a,b)=>a.score-b.score;
 const busCandidates=[],mixedCandidates=[],multiCandidates=[];
 const retain=(arr,candidate)=>{if(arr.length>=40&&candidate.score>=arr.at(-1).score)return;arr.push(candidate);arr.sort(rank);if(arr.length>40)arr.pop();};
 const nearestRail=p=>stations.filter(s=>meters(p,s)<=1400).sort((a,b)=>meters(p,a)-meters(p,b)).slice(0,4);
 const nearFrom=nearestRail(from),nearTo=nearestRail(to);
 for(const a of starts)for(let j=a.i+1;j<Math.min(a.rec.stops.length,a.i+35);j++){
  const at=a.rec.stops[j];
  for(const b of ends){
   if(a.rec.id===b.rec.id)continue;
   for(let k=Math.max(0,b.i-35);k<b.i;k++){
    const bt=b.rec.stops[k],distance=meters(at,bt);
    if(distance>maxTransferM)continue;
    retain(busCandidates,{score:meters(from,a.rec.stops[a.i])+distance+meters(b.rec.stops[b.i],to)+approximateRide(a.rec,a.i,j)+approximateRide(b.rec,k,b.i),a,j,b,k});
   }
  }
  for(const station of stations){
   const distance=meters(at,station);if(distance>maxTransferM)continue;
   for(const end of nearTo){
    const rail=railLeg(station,end);if(!rail)continue;
    retain(mixedCandidates,{score:meters(from,a.rec.stops[a.i])+distance+meters(end,to)+approximateRide(a.rec,a.i,j)+45*(rail.stops.length-1),a,j,rail,railFirst:false});
   }
  }
 }
 for(const b of ends)for(let k=Math.max(0,b.i-35);k<b.i;k++){
  const bt=b.rec.stops[k];
  for(const station of stations){
   const distance=meters(bt,station);if(distance>maxTransferM)continue;
   for(const start of nearFrom){
    const rail=railLeg(start,station);if(!rail)continue;
    retain(mixedCandidates,{score:meters(from,start)+distance+meters(b.rec.stops[b.i],to)+approximateRide(b.rec,k,b.i)+45*(rail.stops.length-1),b,k,rail,railFirst:true});
   }
  }
 }
 // Keep only a small number of nearby rail connections for two transfers.
 const enter=[],exit=[];
 for(const a of starts)for(let j=a.i+1;j<Math.min(a.rec.stops.length,a.i+35);j++){
  for(const station of stations){
   const distance=meters(a.rec.stops[j],station);if(distance>maxTransferM)continue;
   retain(enter,{a,j,station,score:meters(from,a.rec.stops[a.i])+distance+approximateRide(a.rec,a.i,j)});
  }
 }
 for(const b of ends)for(let k=Math.max(0,b.i-35);k<b.i;k++){
  for(const station of stations){
   const distance=meters(b.rec.stops[k],station);if(distance>maxTransferM)continue;
   retain(exit,{b,k,station,score:meters(to,b.rec.stops[b.i])+distance+approximateRide(b.rec,k,b.i)});
  }
 }
 const railCache=new Map();
 for(const a of enter)for(const b of exit){
  if(a.a.rec.id===b.b.rec.id||a.station.name===b.station.name)continue;
  const key=a.station.name+'|'+b.station.name;
  if(!railCache.has(key))railCache.set(key,railLeg(a.station,b.station));
  const rail=railCache.get(key);if(!rail)continue;
  retain(multiCandidates,{score:a.score+b.score+45*(rail.stops.length-1)+250,a,b,rail});
 }
 const collect=(raw,kind,make)=>{
  const out=[],seen=new Set(),valid=[];
  for(const p of raw){
   const legs=make(p);if(legs.some(x=>!x))continue;
   const walk=meters(from,legs[0].origin)+meters(legs.at(-1).destination,to)+legs.slice(1).reduce((sum,leg,i)=>sum+meters(legs[i].destination,leg.origin),0);
   const score=walk+legs.reduce((sum,leg)=>sum+actualRide(leg),0);
   valid.push({kind,legs,origin:legs[0].origin,destination:legs.at(-1).destination,changes:legs.length-1,score});
  }
  valid.sort(rank);
  for(const candidate of valid){const key=candidate.legs.map(x=>x.kind==='bus'?x.routeId:[...new Set(x.lines)].join('/')).join('|');if(seen.has(key))continue;seen.add(key);out.push(candidate);if(out.length>=limit)break;}
  return out;
 };
 return {
  busTransfer:collect(busCandidates,'transfer',p=>[busLeg(p.a.rec,p.a.i,p.j),busLeg(p.b.rec,p.k,p.b.i)]),
  mixed:[...collect(mixedCandidates,'mixed',p=>p.railFirst?[p.rail,busLeg(p.b.rec,p.k,p.b.i)]:[busLeg(p.a.rec,p.a.i,p.j),p.rail]),...collect(multiCandidates,'mixed',p=>[busLeg(p.a.a.rec,p.a.a.i,p.a.j),p.rail,busLeg(p.b.b.rec,p.b.k,p.b.b.i)])]
 };
}

export async function findTransitOptions(from,to,{fetcher=globalThis.fetch,signal,apiBase='/api/transport'}={}){
  const get=async(path)=>{const r=await fetcher(path,{signal});if(!r.ok)throw new Error('교통정보 조회 실패');return r.json();};
  const rail=railTransferOptions(from,to,{limit:4}).map(p=>({...p,kind:'rail'}));
  let bus=[],busStatus='complete',busTransfer=[],mixed=[];
  try{
    const data=await get('/data/transport/seoul-bus-stops.json');
    if(!officialStaticBusPlaces(data).length)throw new Error('정류소 원본 확인 불가');
    const starts=nearbyOfficialStaticStops(data,from.lat,from.lng,650).slice(0,8);
    const ends=nearbyOfficialStaticStops(data,to.lat,to.lng,650).slice(0,8);
    const startIds=new Set(starts.map(x=>x.arsId)),endIds=new Set(ends.map(x=>x.arsId));
    if(starts.length||ends.length){
      const candidates=new Map();
      const queryStops=[...new Map([...starts,...ends.slice(0,4)].map(s=>[s.arsId,s])).values()];
      const arrivals=await Promise.allSettled(queryStops.map(s=>get(apiBase+'/bus?'+new URLSearchParams({arsId:s.arsId}))));
      if(arrivals.some(x=>x.status==='rejected'))busStatus='partial';
      for(const [i,res] of arrivals.entries())if(res.status==='fulfilled')for(const item of res.value.items||[]){
        if(!/^\d{5,15}$/.test(item.routeId||''))continue;
        const prev=candidates.get(item.routeId)||{name:item.route,routeType:item.routeType,start:false,end:false};
        prev.start ||= startIds.has(queryStops[i].arsId);prev.end ||= endIds.has(queryStops[i].arsId);candidates.set(item.routeId,prev);
      }
      const all=[...candidates],chosen=new Map([...all.filter(([,v])=>v.start&&v.end).slice(0,8),...all.filter(([,v])=>v.start&&!v.end).slice(0,4),...all.filter(([,v])=>v.end&&!v.start).slice(0,4)]);
      for(const [id,entry] of all){if(chosen.size>=16)break;if(!chosen.has(id))chosen.set(id,entry);}
      const routeEntries=[...chosen],records=[];
      if(candidates.size>routeEntries.length)busStatus='partial';
      for(let i=0;i<routeEntries.length;i+=3){
        if(signal?.aborted)throw new Error('취소');
        const batch=await Promise.allSettled(routeEntries.slice(i,i+3).map(async ([id,{name,routeType}])=>{
          const data=await get(apiBase+'/bus/route-path?'+new URLSearchParams({routeId:id}));
          if(String(data.routeId)!==id||!Array.isArray(data.stops)||data.stops.length<2)throw new Error('노선 미확인');
          records.push({id,name,routeType,stops:data.stops,coordinates:data.coordinates});
          const pairs=directBusPairs(data.stops,startIds,endIds)
            .map(p=>({...p,walkM:meters(from,p.origin)+meters(to,p.destination)}))
            .map(p=>{const coords=busSegment(data.coordinates,p.stops);return coords?.length>=2?{...p,kind:'bus',routeId:id,route:name,routeType,coords,score:p.walkM+rideCost(geometryMeters(coords),p.stopCount)}:null;}).filter(Boolean)
            .sort((a,b)=>a.score-b.score||a.stopCount-b.stopCount);
          if(pairs.length)return pairs[0];
          return null;
        }));
        if(signal?.aborted)throw new Error('취소');
        if(batch.some(x=>x.status==='rejected'))busStatus='partial';
        bus.push(...batch.flatMap(x=>x.status==='fulfilled'&&x.value?[x.value]:[]));
      }
      ({busTransfer,mixed}=transferCandidates(records,from,to,startIds,endIds));
    }
    bus.sort((a,b)=>a.score-b.score||a.stopCount-b.stopCount);
  }catch(error){if(signal?.aborted)throw error;busStatus='unavailable';}
  return {bus:bus.slice(0,5),busTransfer,mixed,rail,busStatus};
}
