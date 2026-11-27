// Display-only road matching. Never mutate official stop locations or routing inputs.
const X=88300,Y=111320,CELL=80,MAX=40;
const meters=(a,b)=>Math.hypot((a[0]-b[0])*X,(a[1]-b[1])*Y);
const key=(x,y)=>x+','+y;
const valid=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
const ROAD_CLASSES=new Set(['motorway','trunk','primary','secondary','tertiary','minor','residential','unclassified','service','living_street','road','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link']);
const major=new Set(['motorway','trunk','primary','secondary']);
export function createBusRoadIndex(features=[]){
 const cells=new Map(),seen=new Set();
 for(const f of features){
  const p=f.properties||{},cls=String(p.class||p.highway||'');
  if(!ROAD_CLASSES.has(cls)||p.brunnel==='tunnel'||p.tunnel==='yes')continue;
  const paths=f.geometry?.type==='LineString'?[f.geometry.coordinates]:f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[];
  for(const path of paths)for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i];if(!valid(a)||!valid(b))continue;
   const dx=(b[0]-a[0])*X,dy=(b[1]-a[1])*Y,len=Math.hypot(dx,dy);
   if(len<.1||len>3000)continue;
   const id=[a.join(','),b.join(',')].sort().join('|');if(seen.has(id))continue;seen.add(id);
   const edge={a,b,dx,dy,len,cls};
   for(let x=Math.floor(Math.min(a[0],b[0])*X/CELL);x<=Math.floor(Math.max(a[0],b[0])*X/CELL);x++)for(let y=Math.floor(Math.min(a[1],b[1])*Y/CELL);y<=Math.floor(Math.max(a[1],b[1])*Y/CELL);y++){const k=key(x,y);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(edge);}
  }
 }
 return {size:seen.size,place(stop){
  const p=[stop.lng,stop.lat];if(!valid(p))return p;
  const x=Math.floor(p[0]*X/CELL),y=Math.floor(p[1]*Y/CELL);let best=null,score=Infinity;
  for(let i=x-1;i<=x+1;i++)for(let j=y-1;j<=y+1;j++)for(const e of cells.get(key(i,j))||[]){
   const px=(p[0]-e.a[0])*X,py=(p[1]-e.a[1])*Y,t=Math.max(0,Math.min(1,(px*e.dx+py*e.dy)/(e.len*e.len)));
   const q=[e.a[0]+e.dx*t/X,e.a[1]+e.dy*t/Y],d=meters(p,q);if(d>MAX)continue;
   // Prefer a through-road over a driveway when distances are similar.
   const cost=d+(e.cls==='service'?9:0)+(t===0||t===1?3:0);
   if(cost<score){score=cost;best={e,q,d};}
  }
  if(!best)return p;
  const {e,q,d}=best;
  // Retain the official side of the road; median stops stay near the centre.
  const offset=stop.median?Math.min(d,2):Math.min(d,major.has(e.cls)?6:3.5);
  if(d<.05)return p;
  return [+(q[0]+(p[0]-q[0])*offset/d).toFixed(7),+(q[1]+(p[1]-q[1])*offset/d).toFixed(7)];
 }};
}
export function visibleBusRoadIndex(map){
 const sources=new Set((map.getStyle?.()?.layers||[]).filter(l=>l['source-layer']==='transportation'&&l.source).map(l=>l.source));
 const features=[];for(const source of sources){try{features.push(...(map.querySourceFeatures(source,{sourceLayer:'transportation'})||[]));}catch{}}
 return createBusRoadIndex(features);
}
