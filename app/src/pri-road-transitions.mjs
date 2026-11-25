// Visual-only transition at truly coincident evaluated road endpoints.
// Source scores, segment identity, unknown roads and the assessed geometry
// are not changed. No nearest-neighbour snapping or invented connections.
const RISK=['#4C948B','#E0A04A','#CF4248'];
const POLICY=['#4C948B','#82AB94','#DBC576','#DDA263','#CB6563'];
const rgb=hex=>hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16));
const hex=values=>'#'+values.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const color=(p,policy)=>{
 const s=Number(p.displayScore);
 if(!p.evaluated||!Number.isFinite(s)||s<0||s>100)return null;
 if(!policy)return rgb(RISK[s<40?0:s<70?1:2]);
 const n=Math.min(3,Math.floor(s/25));
 return mix(rgb(POLICY[n]),rgb(POLICY[n+1]),s/25-n);
};
const key=p=>JSON.stringify(p.slice(0,2)); // exact endpoint match only
const meters=(a,b)=>Math.hypot((b[0]-a[0])*111195*Math.cos((a[1]+b[1])*Math.PI/360),(b[1]-a[1])*111195);
const interpolate=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function roadEndpointTransitions(collection,{policy=false,speed=false}={}){
 const ends=new Map(),entries=[];
 for(const feature of collection.features||[]){
  const p=feature.properties||{},c=color(p,policy);
  // The reference road and official speed-link network must not mix.
  if(!c||p.sharedCandidate||(speed&&p.speedSource!=='observed-link'))continue;
  const g=feature.geometry,parts=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
  for(const coordinates of parts){
   if(coordinates.length<2||coordinates.some(pt=>!Array.isArray(pt)||!pt.slice(0,2).every(Number.isFinite)))continue;
   const a=key(coordinates[0]),b=key(coordinates.at(-1));
   if(a===b)continue;
   const entry={feature,coordinates,c,a,b};
   entries.push(entry);
   for(const k of [a,b]){if(!ends.has(k))ends.set(k,[]);ends.get(k).push(entry);}
  }
 }
 const output=new Map();
 for(const e of entries){
  const junction=k=>{
   const list=ends.get(k);
   if(list?.length!==2||list[0].feature===list[1].feature)return null;
   const other=list.find(x=>x!==e);
   return other&&hex(other.c)!==hex(e.c)?mix(e.c,other.c,.5):null;
  };
  const left=junction(e.a),right=junction(e.b);
  if(!left&&!right)continue;
  const points=e.coordinates,dist=[0];
  for(let i=1;i<points.length;i++)dist.push(dist.at(-1)+meters(points[i-1],points[i]));
  const length=dist.at(-1);
  if(length<=0)continue;
  const span=Math.min(3,length/3),steps=12;
  const at=d=>{
   if(d<=0)return points[0];if(d>=length)return points.at(-1);
   let i=1;while(i<dist.length-1&&dist[i]<d)i++;
   return interpolate(points[i-1],points[i],(d-dist[i-1])/(dist[i]-dist[i-1]||1));
  };
  const cuts=[0,length,...dist];
  for(let i=1;i<=steps;i++){if(left)cuts.push(span*i/steps);if(right)cuts.push(length-span*i/steps);}
  const sorted=[...new Set(cuts)].sort((a,b)=>a-b);
  const pieces=[];
  for(let i=1;i<sorted.length;i++){
   const a=sorted[i-1],b=sorted[i];if(b-a<1e-7)continue;
   const mid=(a+b)/2;
   const c=left&&mid<span?mix(left,e.c,mid/span):right&&mid>length-span?mix(e.c,right,(mid-length+span)/span):e.c;
   pieces.push({type:'Feature',geometry:{type:'LineString',coordinates:[at(a),at(b)]},properties:{...e.feature.properties,renderColor:hex(c)}});
  }
  if(!output.has(e.feature))output.set(e.feature,new Map());
  output.get(e.feature).set(points,pieces);
 }
 return {...collection,features:(collection.features||[]).flatMap(f=>{
  const pieces=output.get(f);if(!pieces)return [f];
  if(f.geometry.type==='LineString')return pieces.get(f.geometry.coordinates)||[f];
  return f.geometry.coordinates.flatMap(coords=>pieces.get(coords)||[{...f,geometry:{type:'LineString',coordinates:coords}}]);
 })};
}
