/** Display-only topology repair. Never assign scores or add route edges. */
export const UNKNOWN_COLOR='#9CA3AF';
export const CANDIDATE_COLOR='#8996A3';
const xy=([x,y])=>[x*88200,y*111195];
const dist=(a,b)=>Math.hypot((a[0]-b[0])*88200,(a[1]-b[1])*111195);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const mixPoint=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const mixColor=(a,b,t)=>'#'+hex(a).map((v,i)=>Math.round(v+(hex(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');
const lines=g=>g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
function insideRing(p,r){
 let inside=false;
 for(let i=0,j=r.length-1;i<r.length;j=i++){
  const a=r[i],b=r[j],ab=sub(b,a),ap=sub(p,a);
  if(Math.abs(cross(ab,ap))<1e-13&&dot(ap,ab)>=-1e-13&&dot(ap,ab)<=dot(ab,ab)+1e-13&&dot(ab,ab)>0)return 2;
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside?1:0;
}
export function boundaryGeometry(geo){
 const polygons=[];
 for(const f of geo?.features||[]){const g=f.geometry;if(g?.type==='Polygon')polygons.push(g.coordinates);else if(g?.type==='MultiPolygon')polygons.push(...g.coordinates);}
 const edges=polygons.flatMap(poly=>poly.flatMap(r=>r.slice(1).map((b,i)=>({a:r[i],b,minX:Math.min(r[i][0],b[0]),maxX:Math.max(r[i][0],b[0]),minY:Math.min(r[i][1],b[1]),maxY:Math.max(r[i][1],b[1])}))));
 const contains=p=>polygons.some(poly=>insideRing(p,poly[0])>0&&!poly.slice(1).some(r=>insideRing(p,r)===1));
 const pieces=(a,b)=>{
  if(dist(a,b)<.001)return [];
  const v=sub(b,a),ts=[0,1],minX=Math.min(a[0],b[0]),maxX=Math.max(a[0],b[0]),minY=Math.min(a[1],b[1]),maxY=Math.max(a[1],b[1]);
  for(const e of edges){if(e.maxX<minX||e.minX>maxX||e.maxY<minY||e.minY>maxY)continue;const w=sub(e.b,e.a),d=cross(v,w);if(Math.abs(d)<1e-18)continue;const t=cross(sub(e.a,a),w)/d,u=cross(sub(e.a,a),v)/d;if(t>0&&t<1&&u>=-1e-8&&u<=1+1e-8)ts.push(t);}
  ts.sort((a,b)=>a-b);const result=[];for(let i=1;i<ts.length;i++){const lo=ts[i-1],hi=ts[i];if(hi-lo>1e-9&&contains(mixPoint(a,b,(lo+hi)/2)))result.push([lo,hi]);}return result;
 };
 return {valid:polygons.length>0,contains,pieces,whole:(a,b)=>pieces(a,b).reduce((n,[lo,hi])=>n+hi-lo,0)>1-1e-8};
}
export function clipPriDisplay(collection,geo){
 const boundary=boundaryGeometry(geo);if(!boundary.valid)return {type:'FeatureCollection',features:[]};
 // Clip every rendered road to the authoritative boundary, including native
 // speed links and imported geometry. Never mutate source observations.
 const out=[];
 for(const f of collection.features){if(f.geometry?.type==='Point'){if(boundary.contains(f.geometry.coordinates))out.push(f);continue;}
  const parts=[];
  for(const line of lines(f.geometry)){let part=[];const flush=()=>{if(part.length>=2)parts.push(part);part=[];};
   for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];const ranges=boundary.pieces(a,b);if(!ranges.length){flush();continue;}
    for(const [lo,hi] of ranges){const p=mixPoint(a,b,lo),q=mixPoint(a,b,hi);if(part.length&&dist(part.at(-1),p)>.01)flush();if(!part.length)part.push(p);part.push(q);if(hi<1-1e-8)flush();}
   }flush();}
  if(parts.length)out.push({...f,geometry:parts.length===1?{type:'LineString',coordinates:parts[0]}:{type:'MultiLineString',coordinates:parts}});
 }
 return {type:'FeatureCollection',features:out};
}
const policyStops=[[0,'#4C948B'],[25,'#82AB94'],[50,'#DBC576'],[75,'#DDA263'],[100,'#CB6563']];
export function priDisplayColor(p,mode){
 if(!p.evaluated)return p.sharedCandidate?CANDIDATE_COLOR:UNKNOWN_COLOR;
 const score=p.displayScore;
 if(mode==='protectionGap'){for(let i=1;i<policyStops.length;i++){const [hi,b]=policyStops[i],[lo,a]=policyStops[i-1];if(score<=hi)return mixColor(a,b,Math.max(0,(score-lo)/(hi-lo)));}return policyStops.at(-1)[1];}
 return score>=70?'#CF4248':score>=40?'#E0A04A':'#4C948B';
}
export function priVisualConnectors(collection,geo,mode){
 const boundary=boundaryGeometry(geo);const features=[];if(!boundary.valid)return {type:'FeatureCollection',features};
 const byId=new Map();
 for(const f of collection.features){if(f.properties?.speedSource==='observed-link')continue;const id=f.properties?.segmentId;if(typeof id!=='string'||!/^.+_\d+$/.test(id))continue;const group=byId.get(id)||[];group.push(f);byId.set(id,group);}
 for(const [id,group] of byId){const m=id.match(/^(.*)_(\d+)$/),next=byId.get(m[1]+'_'+(Number(m[2])+1));if(!next)continue;
  // Pick the closest consecutive endpoint pair; reject long or directionally
  // incompatible gaps and never bridge across an exterior/hole.
  let best=null;
  for(const a of group)for(const b of next)for(const la of lines(a.geometry))for(const lb of lines(b.geometry)){if(la.length<2||lb.length<2)continue;const p=la.at(-1),q=lb[0],d=dist(p,q);if(d<.01||d>5)continue;
   const v=sub(xy(q),xy(p)),aDir=sub(xy(p),xy(la.at(-2))),bDir=sub(xy(lb[1]),xy(q));
   if(dot(v,aDir)<0||dot(v,bDir)<0||!boundary.whole(p,q))continue;
   if(!best||d<best.d)best={a:a.properties,b:b.properties,p,q,d};}
  if(!best)continue;const {a,b,p,q}=best,c1=priDisplayColor(a,mode),c2=priDisplayColor(b,mode);
  const unknown=!a.evaluated||!b.evaluated;
  // Unknown is not a risk grade: keep its own color and do not interpolate
  // measured risk into an unassessed section. Assessed grade changes use
  // short color-interpolated slices (MapLibre data-driven line-gradient is unavailable).
  const n=c1===c2?1:unknown?2:12;
  for(let i=0;i<n;i++){const t=(i+.5)/n,color=c1===c2?c1:unknown?(i===0?c1:c2):mixColor(c1,c2,t);
   features.push({type:'Feature',geometry:{type:'LineString',coordinates:[mixPoint(p,q,i/n),mixPoint(p,q,(i+1)/n)]},properties:{color,evaluated:unknown?(i===0?a.evaluated:b.evaluated):true}});
  }
 }
 return {type:'FeatureCollection',features};
}
