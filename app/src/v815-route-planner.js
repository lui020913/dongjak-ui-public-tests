/** Explicit route composition: segment geometries from real graph requests only. */
import {VERIFIED_STATIONS,FIXED_RAIL_STATION_ORDER} from './fixed-rail-data.js';
export const MAX_WAYPOINTS=5;
export function uniqueValidWaypoints(points){
  if(!Array.isArray(points)||points.length>MAX_WAYPOINTS)throw new Error(`경유지는 최대 ${MAX_WAYPOINTS}개입니다.`);
  return points.map(p=>{
    const lng=Number(p?.lng),lat=Number(p?.lat);
    if(!Number.isFinite(lng)||!Number.isFinite(lat)||lng<125||lng>128||lat<36||lat>39)throw new Error('경유지의 위치 좌표가 올바르지 않습니다.');
    return {lng,lat,label:String(p.label||p.name||'경유지').slice(0,80)};
  });
}
export function combineRouteSegments(segments,kind){
  if(!segments.length||segments.some(s=>!Array.isArray(s?.coords)||s.coords.length<2))throw new Error('일부 경유 구간의 실제 보행경로를 계산하지 못했습니다.');
  const coords=[],maneuvers=[];
  let seconds=0,kilometers=0,slopeAscentM=0,slopeDescentM=0,slopeUncertainM=0;
  const sourceNames=new Set();
  let priRiskSum=0,priAssessedM=0,priFactorSum=0,priTotalM=0;
  for(let i=0;i<segments.length;i++){
    const segment=segments[i];
    const overlap=coords.length&&segment.coords.length&&coords.at(-1)[0]===segment.coords[0][0]&&coords.at(-1)[1]===segment.coords[0][1];
    const offset=coords.length-(overlap?1:0);
    coords.push(...(overlap?segment.coords.slice(1):segment.coords));
    for(const maneuver of segment.maneuvers||[]){
      if(Number.isInteger(maneuver.index))maneuvers.push({...maneuver,index:Math.max(0,offset+maneuver.index)});
    }
    seconds+=Number(segment.seconds)||0;kilometers+=Number(segment.kilometers)||0;
    slopeAscentM+=Number(segment.slopeAscentM)||0;slopeDescentM+=Number(segment.slopeDescentM)||0;
    slopeUncertainM+=Number(segment.slopeUncertainM)||0;
    sourceNames.add(String(segment.source||'unknown'));
    // Combine only actually observed PRI exposure. Missing legs stay unknown.
    const evidence=segment.priEvidence;
    const legM=Number(segment.kilometers)*1000;
    if(Number.isFinite(legM)&&legM>0)priTotalM+=legM;
    if(evidence?.meanRisk!==null&&Number.isFinite(evidence?.meanRisk)&&Number.isFinite(evidence?.assessedMeters)){
      const m=Math.max(0,Math.min(legM,evidence.assessedMeters));
      priAssessedM+=m;priRiskSum+=m*evidence.meanRisk;
      priFactorSum+=m*(Number(evidence.meanObservedFactors)||0);
    }
  }
  const priEvidence=priTotalM>0?{
    meanRisk:priAssessedM>0?Math.round(priRiskSum/priAssessedM*10)/10:null,
    coverage:Math.round(priAssessedM/priTotalM*1000)/1000,
    assessedMeters:Math.round(priAssessedM*10)/10,totalMeters:Math.round(priTotalM*10)/10,
    meanObservedFactors:priAssessedM>0?Math.round(priFactorSum/priAssessedM*10)/10:null,
    ofFactors:6,preliminary:true,source:'sangdo1-observed-PRI'
  }:null;
  return {coords,maneuvers,seconds,kilometers,slopeAscentM,slopeDescentM,slopeUncertainM,priEvidence,
    source:sourceNames.size===1?[...sourceNames][0]:'mixed-walking-network',routeMode:kind,
    waypoints:segments.length-1,segmentCount:segments.length,sourceLabel:'경유지 구간별 보행경로 결과 합산 · 실제 현장 통행상태 미검증'};
}
export async function computeMultiStopRoutes(points,fetchPair,{signal,onProgress}={}){
  if(points.length<3||points.length>7)throw new Error('출발지·목적지 사이 경유지 1~5개를 지정하세요.');
  const std=[],gentleSegments=[];
  for(let i=0;i<points.length-1;i++){
    if(signal?.aborted)throw new DOMException('길찾기 취소','AbortError');
    onProgress?.(i+1,points.length-1);
    const pair=await fetchPair(points[i],points[i+1],signal);
    if(pair?.standard)std.push(pair.standard);
    if(pair?.gentle)gentleSegments.push(pair.gentle);
    if(!pair?.standard&&!pair?.gentle)throw new Error(`${i+1}번째 경유 구간 계산 실패`);
    // A missing mode is not silently replaced by a different mode.
  }
  const standard=std.length===points.length-1?combineRouteSegments(std,'standard'):null;
  const gentle=gentleSegments.length===points.length-1?combineRouteSegments(gentleSegments,'gentle'):null;
  if(!standard&&!gentle)throw new Error('모든 경유 구간을 연결하는 경로를 찾지 못했습니다.');
  return {standard,gentle,usingLocal:[...std,...gentleSegments].every(s=>s.source==='seoul-pedestrian-graph')};
}
export function crowDistanceMeters(a,b){
  const r=Math.PI/180,dy=(a.lat-b.lat)*111320,dx=(a.lng-b.lng)*111320*Math.cos(((a.lat+b.lat)/2)*r);
  return Math.hypot(dx,dy);
}
/** Station-to-station adjacency by published station order, not a live subway schedule. */
export function buildRailGraph(order=FIXED_RAIL_STATION_ORDER){
  const graph=new Map();
  for(const [line,rawNames] of Object.entries(order)){
    const names=rawNames.map(name=>name==='총신대입구'?'이수':name);
    for(let i=0;i<names.length;i++){
      const n=names[i];if(!graph.has(n))graph.set(n,[]);
      for(const j of [i-1,i+1])if(j>=0&&j<names.length)graph.get(n).push({to:names[j],line,cost:3});
    }
  }
  return graph;
}
export function shortestRailConnection(startName,endName,graph=buildRailGraph()){
  if(!graph.has(startName)||!graph.has(endName))return null;
  const queue=[{name:startName,line:'',cost:0,stops:[startName],lines:[],changes:0}];
  const best=new Map();
  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost);const now=queue.shift();
    const key=`${now.name}|${now.line}`;
    if((best.get(key)??Infinity)<now.cost)continue;
    if(now.name===endName)return now;
    for(const edge of graph.get(now.name)||[]){
      const changed=!!now.line&&now.line!==edge.line;
      const cost=now.cost+edge.cost+(changed?5:0);
      const nextKey=`${edge.to}|${edge.line}`;
      if(cost>=(best.get(nextKey)??Infinity))continue;
      best.set(nextKey,cost);
      queue.push({name:edge.to,line:edge.line,cost,stops:[...now.stops,edge.to],lines:[...now.lines,edge.line],changes:now.changes+(changed?1:0)});
    }
  }
  return null;
}
export function railTransferOptions(from,to,{maxWalkM=1400,limit=3}={}){
  const stations=Object.entries(VERIFIED_STATIONS).map(([name,[lng,lat]])=>({name,lng,lat}));
  const nearest=(p)=>stations.map(s=>({...s,walkM:crowDistanceMeters(p,s)})).filter(s=>s.walkM<=maxWalkM).sort((a,b)=>a.walkM-b.walkM).slice(0,7);
  const found=[];
  for(const origin of nearest(from))for(const destination of nearest(to)){
    if(origin.name===destination.name)continue;
    const line=shortestRailConnection(origin.name,destination.name);
    if(!line||line.stops.length<2)continue;
    // Rail leg: 3 min per stop + 5 min per transfer is a heuristic, not an ETA.
    const walkingMinutes=(origin.walkM+destination.walkM)/75;
    const indicativeMinutes=walkingMinutes+line.cost;
    found.push({origin,destination,stops:line.stops,lines:line.lines,changes:line.changes,
      indicativeMinutes,walkingStraightM:origin.walkM+destination.walkM,
      railStops:line.stops.length-1,railHeuristicMinutes:line.cost});
  }
  found.sort((a,b)=>a.indicativeMinutes-b.indicativeMinutes||a.changes-b.changes);
  const seen=new Set();return found.filter(c=>{const k=`${c.origin.name}/${c.destination.name}`;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,limit);
}
