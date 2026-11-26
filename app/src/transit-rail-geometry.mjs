/** Trace a connected, source-attributed rail path between adjacent verified stations.
 * Never bridge gaps or substitute an unrelated line. Missing geometry remains schematic.
 */
const distance=(a,b)=>Math.hypot((a[0]-b[0])*88000,(a[1]-b[1])*111000);
const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const key=p=>p.map(n=>n.toFixed(5)).join(',');
const sources=new Set(['MOIS_KR_Subway_2026','OpenStreetMap_ODbL']);
export function traceRailEdge(start,end,line,paths){
 if(!valid(start)||!valid(end)||distance(start,end)<1)return null;
 const direct=distance(start,end),limit=direct*1.8+250;
 const graph=new Map();
 const add=p=>{const id=key(p);if(!graph.has(id))graph.set(id,{p,edges:[]});return id;};
 const eligible=p=>valid(p)&&distance(start,p)+distance(p,end)<=limit+100;
 // Do not mix different sources into a supposedly verified continuous path.
 for(const source of sources){
  graph.clear();
  for(const path of paths||[]){
   if(path.line!==line||path.origin!==source||!Array.isArray(path.coordinates))continue;
   for(let i=1;i<path.coordinates.length;i++){
    const a=path.coordinates[i-1],b=path.coordinates[i];
    if(!eligible(a)||!eligible(b))continue;
    const w=distance(a,b);if(w<.05||w>800)continue;
    const x=add(a),y=add(b);if(x===y)continue;
    graph.get(x).edges.push([y,w]);graph.get(y).edges.push([x,w]);
   }
  }
  if(graph.size<2||graph.size>12000)continue;
  const nearest=p=>[...graph].map(([id,n])=>({id,d:distance(p,n.p)})).filter(n=>n.d<=120).sort((a,b)=>a.d-b.d).slice(0,6);
  const starts=nearest(start),ends=nearest(end);
  if(!starts.length||!ends.length)continue;
  const endCosts=new Map(ends.map(n=>[n.id,n.d]));
  const costs=new Map(),previous=new Map(),queue=[];
  for(const n of starts){costs.set(n.id,n.d);queue.push([n.id,n.d]);}
  let best=null;
  while(queue.length){
   queue.sort((a,b)=>b[1]-a[1]);const [id,cost]=queue.pop();
   if(cost!==costs.get(id)||cost>limit||(best&&cost>=best.cost))continue;
   if(endCosts.has(id)&&cost+endCosts.get(id)<=limit){
    const total=cost+endCosts.get(id);
    if(!best||total<best.cost)best={id,cost:total};
   }
   for(const [next,w] of graph.get(id).edges){
    const candidate=cost+w;if(candidate>= (costs.get(next)??Infinity)||candidate>limit)continue;
    costs.set(next,candidate);previous.set(next,id);queue.push([next,candidate]);
   }
  }
  if(!best)continue;
  const result=[];let id=best.id;
  while(id!==undefined){result.push(graph.get(id).p);id=previous.get(id);}
  result.reverse();
  const length=result.slice(1).reduce((sum,p,i)=>sum+distance(result[i],p),0);
  if(result.length>=2&&length>=direct*.65&&length<=limit)return {coordinates:result,source,schematic:false};
 }
 return null;
}
export function transitRailSegments(stops,lines,stations,paths=[]){
 if(!Array.isArray(stops)||!Array.isArray(lines)||lines.length!==stops.length-1)return [];
 const result=[];
 for(let i=0;i<lines.length;i++){
  const start=stations[stops[i]],end=stations[stops[i+1]];
  if(!valid(start)||!valid(end))return [];
  result.push({line:lines[i],...(traceRailEdge(start,end,lines[i],paths)||{coordinates:[start,end],source:'station-order',schematic:true})});
 }
 return result;
}
