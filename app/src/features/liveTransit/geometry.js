// Pure, dependency-free route geometry helpers. Coordinates are [longitude, latitude].
const RAD = Math.PI / 180;
export function haversineMeters(a, b) {
  const lat1 = a[1] * RAD; const lat2 = b[1] * RAD;
  const dLat = (b[1] - a[1]) * RAD; const dLon = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}
export function validLngLat(point) {
  return Array.isArray(point) && point.length >= 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])) &&
    Number(point[0]) >= -180 && Number(point[0]) <= 180 && Number(point[1]) >= -90 && Number(point[1]) <= 90;
}
export function lineLengthMeters(line) {
  if (!Array.isArray(line)) return 0;
  let sum=0;
  for (let i=1;i<line.length;i++) sum+=haversineMeters(line[i-1],line[i]);
  return sum;
}
// Compile route distances once; per-frame sampling is logarithmic instead of rescanning geometry.
const cumulativeDistances=new WeakMap();
export function linePointAtMeters(coords, meters) {
  if(!Array.isArray(coords)||!coords.length)return null;
  if(coords.length===1)return [...coords[0]];
  let sums=cumulativeDistances.get(coords);
  if(!sums||sums.length!==coords.length){sums=new Float64Array(coords.length);for(let i=1;i<coords.length;i++)sums[i]=sums[i-1]+haversineMeters(coords[i-1],coords[i]);cumulativeDistances.set(coords,sums);}
  const d=Math.min(sums[sums.length-1],Math.max(0,Number.isFinite(meters)?meters:0));
  let lo=1,hi=sums.length-1;
  while(lo<hi){const mid=(lo+hi)>>>1;if(sums[mid]<d)lo=mid+1;else hi=mid;}
  const i=lo,a=coords[i-1],b=coords[i],length=sums[i]-sums[i-1],ratio=length>0?(d-sums[i-1])/length:0;
  return [a[0]+(b[0]-a[0])*ratio,a[1]+(b[1]-a[1])*ratio];
}
// Approximate local tangent-plane projection is adequate over a single route segment.
export function projectOnLine(coords, point) {
  if (!Array.isArray(coords) || coords.length<2 || !validLngLat(point)) return null;
  const latScale=111320;
  const lonScale=Math.cos(point[1]*RAD)*111320;
  let best=null, progress=0;
  for(let i=1;i<coords.length;i++) {
    const a=coords[i-1],b=coords[i];
    const ax=(a[0]-point[0])*lonScale, ay=(a[1]-point[1])*latScale;
    const bx=(b[0]-point[0])*lonScale, by=(b[1]-point[1])*latScale;
    const dx=bx-ax, dy=by-ay, sq=dx*dx+dy*dy;
    const t=sq>0?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/sq)):0;
    const projected=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    const error=haversineMeters(point,projected);
    const length=haversineMeters(a,b);
    if (!best||error<best.errorMeters) best={point:projected,errorMeters:error,meters:progress+length*t};
    progress+=length;
  }
  return best;
}
export function pointBetweenStations(route, from, to, fraction) {
  const coordinates=route?.geometry?.coordinates ?? route?.coordinates;
  if (!Array.isArray(coordinates)||coordinates.length<2) return null;
  const p0=projectOnLine(coordinates, from),p1=projectOnLine(coordinates,to);
  if (!p0||!p1 || p0.errorMeters>180 || p1.errorMeters>180) return null;
  const f=Math.min(1,Math.max(0,Number(fraction)||0));
  return linePointAtMeters(coordinates,p0.meters+(p1.meters-p0.meters)*f);
}
// One shared snapshot of the exact colored geometry handed to MapLibre.
// The base/official rail renderer publishes its own index; no extra API request.
const displayedRailByMap=new WeakMap();
const railGraphCache=new WeakMap();
export function setDisplayedRailPaths(map,paths){if(map&&paths instanceof Map)displayedRailByMap.set(map,paths);}
export function getDisplayedRailPaths(map){return displayedRailByMap.get(map);}
function makeRailGraph(paths){
  if(railGraphCache.has(paths))return railGraphCache.get(paths);
  const nodes=[],edges=[],byKey=new Map(),plans=new Map(),snaps=new Map();
  const node=p=>{
    const key=p.slice(0,2).map(n=>Number(n).toFixed(7)).join(',');
    if(!byKey.has(key)){byKey.set(key,nodes.length);nodes.push({point:p.slice(0,2).map(Number),links:[]});}
    return byKey.get(key);
  };
  for(const path of paths||[]){
    if(!Array.isArray(path))continue;
    for(let i=1;i<path.length;i++){
      if(!validLngLat(path[i-1])||!validLngLat(path[i]))continue;
      const a=node(path[i-1]),b=node(path[i]);if(a===b)continue;
      const meters=haversineMeters(nodes[a].point,nodes[b].point);if(!Number.isFinite(meters)||meters<=0)continue;
      const edge={a,b,meters};edges.push(edge);nodes[a].links.push({id:b,meters});nodes[b].links.push({id:a,meters});
    }
  }
  const graph={nodes,edges,plans,snaps};railGraphCache.set(paths,graph);return graph;
}
function railCandidates(graph,point){
  if(!validLngLat(point))return [];
  const key=point.slice(0,2).join(',');if(graph.snaps.has(key))return graph.snaps.get(key);
  const hits=[];
  for(const edge of graph.edges){
    const hit=projectOnLine([graph.nodes[edge.a].point,graph.nodes[edge.b].point],point);
    if(hit&&hit.errorMeters<=180)hits.push({...hit,edge});
  }
  hits.sort((a,b)=>a.errorMeters-b.errorMeters);
  const candidates=hits.filter(h=>h.errorMeters<=(hits[0]?.errorMeters??0)+35).slice(0,8);
  if(graph.snaps.size<512)graph.snaps.set(key,candidates);return candidates;
}
export function snapToDisplayedRail(paths,point){
  if(!Array.isArray(paths))return null;
  return railCandidates(makeRailGraph(paths),point)[0]?.point??null;
}
// Route through actual segments only. Separate line pieces join at shared
// vertices (centimeter rounding for provider float noise), not by a chord.
function connectedRailPlan(graph,from,to){
  const key=from.slice(0,2).join(',')+'>'+to.slice(0,2).join(',');
  if(graph.plans.has(key))return graph.plans.get(key);
  const starts=railCandidates(graph,from),ends=railCandidates(graph,to);
  let best=null;
  const choose=(points,cost,length)=>{if(!best||cost<best.cost)best={points,cost,length};};
  for(const s of starts)for(const e of ends){
    if(s.edge===e.edge){const length=Math.abs(s.meters-e.meters);choose([s.point,e.point],length+4*(s.errorMeters+e.errorMeters),length);}
  }
  const n=graph.nodes.length,dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),origins=new Map(),queue=[];
  for(const s of starts)for(const [id,meters] of [[s.edge.a,s.meters],[s.edge.b,s.edge.meters-s.meters]]){
    const cost=meters+4*s.errorMeters;if(cost<dist[id]){dist[id]=cost;origins.set(id,s);queue.push({id,cost});}
  }
  // Binary heap is unnecessary here: route plans are cached per station pair;
  // the local corridor graph is small and only its reachable nodes are visited.
  const goal=new Map();for(const e of ends)for(const [id,meters] of [[e.edge.a,e.meters],[e.edge.b,e.edge.meters-e.meters]]){
    if(!goal.has(id))goal.set(id,[]);goal.get(id).push({e,meters});
  }
  while(queue.length){
    let slot=0;for(let i=1;i<queue.length;i++)if(queue[i].cost<queue[slot].cost)slot=i;
    const {id,cost}=queue[slot];queue[slot]=queue.at(-1);queue.pop();
    if(cost!==dist[id])continue;if(best&&cost>=best.cost)break;
    for(const {e,meters} of goal.get(id)||[]){
      const path=[];let k=id;while(k>=0){path.push(graph.nodes[k].point);if(prev[k]<0)break;k=prev[k];}
      const s=origins.get(k);if(!s)continue;
      const points=[s.point,...path.reverse(),e.point];const length=lineLengthMeters(points);
      choose(points,length+4*(s.errorMeters+e.errorMeters),length);
    }
    for(const link of graph.nodes[id].links){const d=cost+link.meters;if(d<dist[link.id]){dist[link.id]=d;prev[link.id]=id;queue.push({id:link.id,cost:d});}}
  }
  // Do not send a train around a loop or across a disconnected track when
  // the two adjacent stations cannot be matched with reasonable confidence.
  const direct=haversineMeters(from,to);
  const result=best&&best.length<=Math.max(350,direct*3+250)?best:null;
  graph.plans.set(key,result);return result;
}
export function pointBetweenDisplayedStations(paths,from,to,fraction){
  if(!Array.isArray(paths)||!validLngLat(from)||!validLngLat(to))return null;
  const plan=connectedRailPlan(makeRailGraph(paths),from,to);
  return plan?linePointAtMeters(plan.points,plan.length*Math.min(1,Math.max(0,Number(fraction)||0))):null;
}
