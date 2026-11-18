/**
 * Dongjak pedestrian routing prototype. Zero dependencies, browsers + Node.js.
 * Data: /data/safety/walk/dongjak_walk_graph.json
 * Uses official walkable-link graph only. Shortest distance or a *heuristic*
 * penalty for links that permit motor vehicles; neither mode validates safety/accessibility.
 * NOTE: Original CSV has no one-way metadata, so all graph edges are bidirectional.
 * 'gentle' mode requires slopeData and uses estimated terrain heights, not actual sidewalk survey.
 * Structural/uncertain links are never certified accessible.
 */

const METERS_PER_LAT = 111195;
const METERS_PER_LON = 88180; // Seoul approx, within ~0.3%; only for geometry snapping
function d2(a, b) {
  const dx = (a[0] - b[0]) * METERS_PER_LON;
  const dy = (a[1] - b[1]) * METERS_PER_LAT;
  return dx * dx + dy * dy;
}
function m(a, b) { return Math.sqrt(d2(a, b)); }
function clamp(t, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, t)); }
function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

/** Project lon/lat onto an edge polyline. t is fraction of drawn length. */
function closestPolylinePoint(q, coords) {
  let total = 0, bestSq = Infinity, best = null, bestAt = 0;
  const segments = [];
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1], b = coords[i], len = m(a, b);
    segments.push([a, b, len]); total += len;
  }
  let passed = 0;
  for (const [a, b, len] of segments) {
    if (len < 1e-9) { continue; }
    const vx = (b[0] - a[0]) * METERS_PER_LON;
    const vy = (b[1] - a[1]) * METERS_PER_LAT;
    const wx = (q[0] - a[0]) * METERS_PER_LON;
    const wy = (q[1] - a[1]) * METERS_PER_LAT;
    const t = clamp((vx * wx + vy * wy) / (len * len));
    const pt = lerp(a, b, t), sq = d2(q, pt);
    if (sq < bestSq) { bestSq = sq; best = pt; bestAt = passed + len * t; }
    passed += len;
  }
  if (!best) { best = coords[0]; bestSq = d2(q, best); }
  return { point: best, fraction: total ? bestAt / total : 0, distanceMeters: Math.sqrt(bestSq) };
}

/** Return the actual portion of a polyline, including partial end segments. */
function partialPolyline(coords, from, to) {
  if (from > to) return partialPolyline(coords, to, from).reverse();
  from = clamp(from); to = clamp(to);
  const lengths = []; let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const n = m(coords[i-1], coords[i]); lengths.push(n); total += n;
  }
  if (total === 0) return [coords[0], coords[coords.length-1]];
  function position(at) {
    let passed = 0;
    for (let i = 0; i < lengths.length; i++) {
      const next = passed + lengths[i];
      if (at <= next || i === lengths.length - 1) {
        return {xy: lerp(coords[i], coords[i+1], lengths[i] ? clamp((at-passed)/lengths[i]) : 0), index:i};
      }
      passed = next;
    }
    return {xy: coords[coords.length-1], index:coords.length-2};
  }
  const p=position(total*from), q=position(total*to);
  const result=[p.xy];
  for (let i=p.index+1;i<=q.index;i++) result.push(coords[i]);
  result.push(q.xy);
  return result.filter((pt,i,arr)=>i===0||m(pt,arr[i-1])>0.001);
}

class MinHeap {
  constructor() { this.h=[]; }
  push(x) {
    const h=this.h;let i=h.length;h.push(x);
    while(i>0) {const p=(i-1)>>1;if(h[p][0]<=x[0])break;h[i]=h[p];i=p;}
    h[i]=x;
  }
  pop() {
    const h=this.h;if(!h.length)return null;
    const result=h[0],last=h.pop();if(!h.length)return result;
    let i=0;
    for (;;) {
      const l=i*2+1,r=l+1;
      if(l>=h.length)break;
      const c=(r<h.length&&h[r][0]<h[l][0])?r:l;
      if(h[c][0]>=last[0])break;
      h[i]=h[c];i=c;
    }
    h[i]=last;return result;
  }
  get size() {return this.h.length;}
}

export class DongjakWalkSlopeRouter {
  constructor(graph, slopeData) {
    this.slopeData=slopeData?.links||slopeData||{};
    if (!graph?.nodes?.length || !graph?.edges?.length) throw new Error('Invalid walk graph');
    this.graph=graph;
    this.adj=Array.from({length:graph.nodes.length},()=>[]);
    for (let i=0;i<graph.edges.length;i++) {
      const e=graph.edges[i],u=e[1],v=e[2];
      this.adj[u].push({to:v,edge:i,from:0,toFraction:1,length:e[3]});
      this.adj[v].push({to:u,edge:i,from:1,toFraction:0,length:e[3]});
    }
  }

  nearestEdge(lonLat) {
    let best=null;
    for (let i=0;i<this.graph.edges.length;i++) {
      const hit=closestPolylinePoint(lonLat,this.graph.edges[i][6]);
      if(!best||hit.distanceMeters<best.distanceMeters)best={...hit,edgeIndex:i};
    }
    return best;
  }

  /**
   * route([longitude,latitude], [longitude,latitude], options)
   * options.mode: 'shortest' (default), 'avoid_vehicle_permitted' or 'gentle' (experimental)
   * options.maxSnapMeters: 100 default; options.walkingSpeedKph: 4.5 default
   * Throws if outside the network or route is disconnected.
   */
  route(start, end, options={}) {
    if (![start,end].every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)))
      throw new Error('Use [longitude,latitude] for both endpoints');
    const mode=options.mode??'shortest';
    if(!['shortest','avoid_vehicle_permitted','gentle'].includes(mode))throw new Error('Unknown route mode');
    const maxSnapMeters=options.maxSnapMeters??100, walkSpeed=options.walkingSpeedKph??4.5;
    if (!(walkSpeed>0)) throw new Error('walkingSpeedKph must be > 0');
    const s=this.nearestEdge(start), e=this.nearestEdge(end);
    if (s.distanceMeters>maxSnapMeters||e.distanceMeters>maxSnapMeters) {
      throw new Error(`NETWORK_TOO_FAR: start ${s.distanceMeters.toFixed(1)}m, end ${e.distanceMeters.toFixed(1)}m`);
    }
    const N=this.graph.nodes.length,source=N,target=N+1;
    // Extra virtual-node arcs, leaving original graph immutable
    const extra=new Map();
    const add=(from,to,edge,fromFrac,toFrac)=>{
      const arc={to,edge,from:fromFrac,toFraction:toFrac,length:this.graph.edges[edge][3]*Math.abs(toFrac-fromFrac)};
      if(!extra.has(from))extra.set(from,[]);extra.get(from).push(arc);
    };
    const se=this.graph.edges[s.edgeIndex],ee=this.graph.edges[e.edgeIndex];
    add(source,se[1],s.edgeIndex,s.fraction,0);
    add(source,se[2],s.edgeIndex,s.fraction,1);
    add(ee[1],target,e.edgeIndex,0,e.fraction);
    add(ee[2],target,e.edgeIndex,1,e.fraction);
    if (s.edgeIndex===e.edgeIndex) add(source,target,s.edgeIndex,s.fraction,e.fraction);
    const distances=new Float64Array(N+2);distances.fill(Infinity);distances[source]=0;
    const seen=new Uint8Array(N+2),parent=new Array(N+2);
    const heap=new MinHeap();heap.push([0,source]);
    let visited=0;
    while(heap.size) {
      const entry=heap.pop();if(!entry)break;
      const [cost,u]=entry;
      if(seen[u]||cost>distances[u])continue;
      seen[u]=1;visited++;
      if(u===target)break;
      const arcs=(u<N?this.adj[u]:[]);
      for(const arc of [...arcs,...(extra.get(u)||[])]) {
        const link=this.graph.edges[arc.edge];
        const mixed=link[4][1]==='1';
        let factor=(mode==='avoid_vehicle_permitted' && mixed)?1.7:1;
        // Gentle mode is exploratory, based on approximate terrain elevation.
        // Each arc traversal reverses ascent/descent when walking backward.
        // Partial edge ascent/descent is prorated by length fraction and is approximate.
        if (mode==='gentle') {
          const p=this.slopeData[String(link[0])];
          if(p) {
            const [meanGrade,maxGrade,asc,desc,za,zb,quality]=p;
            if (quality==='model_estimate' && Number.isFinite(asc) && Number.isFinite(desc)) {
              const fraction=Math.abs(arc.toFraction-arc.from);
              const forward=arc.toFraction >= arc.from;
              const uphill=(forward?asc:desc)*fraction;
              const downhill=(forward?desc:asc)*fraction;
              // Equivalent-distance cost: on uphill +12m/m climb, downhill +6m/m descent.
              // This favors gentler terrain; it is not an accessibility guarantee.
              factor=1+(12*uphill+6*downhill)/Math.max(arc.length,0.01);
            } else {
              // Don't mistake missing/structurally unreliable terrain heights for flat paths.
              factor=1.15;
            }
          } else { factor=1.15; }
        }
        const next=cost+arc.length*factor;
        if(next<distances[arc.to]) {
          distances[arc.to]=next;parent[arc.to]={from:u,arc};heap.push([next,arc.to]);
        }
      }
    }
    if (!seen[target])throw new Error('DISCONNECTED_NETWORK: no connected pedestrian route for these snapped points');
    const arcs=[];
    for(let x=target;x!==source;){const p=parent[x];if(!p)throw new Error('Broken path traceback');arcs.push(p.arc);x=p.from;}
    arcs.reverse();
    let geometry=[],distanceMeters=0,vehiclePermittedMeters=0,crosswalkLinks=0,indoorMeters=0;
    let terrainAscent=0,terrainDescent=0,knownTerrainMeters=0,uncertainTerrainMeters=0;
    const ids=[];
    for (const arc of arcs) {
      const link=this.graph.edges[arc.edge];
      const part=partialPolyline(link[6],arc.from,arc.toFraction);
      if(geometry.length && part.length && m(geometry[geometry.length-1],part[0])<0.01)part.shift();
      geometry.push(...part);distanceMeters+=arc.length;
      if(link[4][1]==='1')vehiclePermittedMeters+=arc.length;
      if(link[5]&1)crosswalkLinks++;
      if(link[5]&2)indoorMeters+=arc.length;
      const row=this.slopeData[String(link[0])];
      if (row) {
        const fraction=Math.abs(arc.toFraction-arc.from);
        if (row[6]==='model_estimate' && Number.isFinite(row[2]) && Number.isFinite(row[3])) {
          const forward=arc.toFraction>=arc.from;
          terrainAscent+=(forward?row[2]:row[3])*fraction;
          terrainDescent+=(forward?row[3]:row[2])*fraction;
          knownTerrainMeters+=arc.length;
        } else uncertainTerrainMeters+=arc.length;
      } else uncertainTerrainMeters+=arc.length;
      ids.push(link[0]);
    }
    if(geometry.length<2)geometry=[s.point,e.point];
    const warnings=['Traffic direction, signal phase, sidewalk/roadway separation, slope and accessibility are not verified.'];
    if(s.distanceMeters>25||e.distanceMeters>25)warnings.push('One or both endpoints are >25m from the snapped pedestrian path.');
    if (mode==='avoid_vehicle_permitted')warnings.push('Vehicle-permitted-link penalty is a heuristic, not a verified safety rating.');
    if(mode==='gentle')warnings.push('Gentle routing uses an estimated elevation surface, not surveyed sidewalk grades; stairs/curbs/ramp access are not verified.');
    if(uncertainTerrainMeters>0)warnings.push('Some links have missing, extreme, or non-ground terrain elevation; grade results are incomplete.');
    return {
      mode, distanceMeters:Math.round(distanceMeters*10)/10,
      estimatedMinutes:Math.round(distanceMeters/(walkSpeed*1000/60)*10)/10,
      cost:Math.round(distances[target]*10)/10,
      vehiclePermittedMeters:Math.round(vehiclePermittedMeters*10)/10,
      crosswalkLinks,indoorMeters:Math.round(indoorMeters*10)/10,
      estimatedTerrainAscentM:Math.round(terrainAscent*10)/10,
      estimatedTerrainDescentM:Math.round(terrainDescent*10)/10,
      estimatedTerrainKnownMeters:Math.round(knownTerrainMeters*10)/10,
      estimatedTerrainUncertainMeters:Math.round(uncertainTerrainMeters*10)/10,
      startSnapMeters:Math.round(s.distanceMeters*10)/10,endSnapMeters:Math.round(e.distanceMeters*10)/10,
      snappedStart:s.point,snappedEnd:e.point,linkIds:ids,processedNodes:visited,warnings,
      geojson:{type:'Feature',properties:{mode,distance_m:Math.round(distanceMeters*10)/10},geometry:{type:'LineString',coordinates:geometry}},
    };
  }
}

export async function loadDongjakWalkSlopeRouter(
  walkUrl='/data/safety/walk/dongjak_walk_graph.json',
  slopeUrl='/data/safety/slope/dongjak_walk_slope_by_link.json'
) {
  const [res,slopeRes]=await Promise.all([fetch(walkUrl),fetch(slopeUrl)]);
  if(!res.ok)throw new Error(`Cannot load walk graph: HTTP ${res.status}`);
  if(!slopeRes.ok)throw new Error(`Cannot load slope data: HTTP ${slopeRes.status}`);
  return new DongjakWalkSlopeRouter(await res.json(),await slopeRes.json());
}
