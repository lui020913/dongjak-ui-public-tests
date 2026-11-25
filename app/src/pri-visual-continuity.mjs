// Display-only boundary clipping and short consecutive road joins; never modify stored score/length.
const fc=features=>({type:'FeatureCollection',features});
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-10;
const dist=(a,b)=>Math.hypot((a[0]-b[0])*88200,(a[1]-b[1])*111195);
function polygons(boundary){return (boundary?.features||[]).flatMap(f=>f.geometry?.type==='Polygon'?[f.geometry.coordinates]:f.geometry?.type==='MultiPolygon'?f.geometry.coordinates:[]);}
function inRing(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j],v=sub(b,a),w=sub(p,a);if(Math.hypot(...v)>1e-12&&Math.abs(cross(v,w))<1e-14&&w[0]*v[0]+w[1]*v[1]>=-1e-14&&w[0]*v[0]+w[1]*v[1]<=v[0]*v[0]+v[1]*v[1]+1e-14)return true;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const within=(p,polys)=>polys.some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
function cut(a,b,polys){const ts=[0,1],v=sub(b,a);for(const poly of polys)for(const r of poly)for(let i=1;i<r.length;i++){const c=r[i-1],w=sub(r[i],c),d=cross(v,w);if(Math.abs(d)<1e-18)continue;const delta=sub(c,a),t=cross(delta,w)/d,u=cross(delta,v)/d;if(t>0&&t<1&&u>=0&&u<=1)ts.push(t);}ts.sort((a,b)=>a-b);const out=[];for(let i=1;i<ts.length;i++){const lo=ts[i-1],hi=ts[i];if(hi-lo>1e-9&&within(mix(a,b,(lo+hi)/2),polys))out.push([mix(a,b,lo),mix(a,b,hi)]);}return out;}
function lineParts(g){return g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];}
export function clipPriDisplay(collection,boundary){
 const polys=polygons(boundary);if(!polys.length)return fc([]);
 const out=[];for(const f of collection.features){if(f.geometry?.type==='Point'){if(within(f.geometry.coordinates,polys))out.push(f);continue;}
  const parts=[];for(const line of lineParts(f.geometry)){let part=[];for(let i=1;i<line.length;i++){for(const [a,b] of cut(line[i-1],line[i],polys)){if(part.length&&same(part.at(-1),a))part.push(b);else{if(part.length>1)parts.push(part);part=[a,b];}}}if(part.length>1)parts.push(part);}
  if(parts.length)out.push({...f,geometry:parts.length===1?{type:'LineString',coordinates:parts[0]}:{type:'MultiLineString',coordinates:parts}});
 }return fc(out);
}
const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const colorMix=(a,b,t)=>'#'+rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');
function riskColor(p,mode){if(p.sharedCandidate)return '#52677E';if(!p.evaluated)return '#9CA3AF';const v=p.displayScore;if(mode!=='protectionGap')return v>=70?'#CF4248':v>=40?'#E0A04A':'#4C948B';const stops=['#4C948B','#82AB94','#DBC576','#DDA263','#CB6563'];const t=Math.min(4,Math.max(0,v/25)),i=Math.min(3,Math.floor(t));return colorMix(stops[i],stops[i+1],t-i);}
// Each bridge only joins adjacent sequence IDs on the same OSM way, <=5m.
// Sixteen short colored subsegments approximate a continuous gradient without changing data scores.
export function priVisualJoins(collection,boundary,mode){
 const polys=polygons(boundary),index=new Map(),out=[];if(!polys.length)return fc(out);
 for(const f of collection.features){const id=f.properties?.segmentId;if(!/^.+_\d+$/.test(id||'')||f.geometry?.type!=='LineString'||f.properties?.speedSource==='observed-link')continue;if(index.has(id))index.set(id,null);else index.set(id,f);}
 for(const [id,a] of index){if(!a)continue;const m=id.match(/^(.*)_(\d+)$/),b=index.get(m[1]+'_'+(+m[2]+1));if(!b)continue;
  const p=a.geometry.coordinates.at(-1),q=b.geometry.coordinates[0],d=dist(p,q);if(d<.03||d>5)continue;
  const parts=cut(p,q,polys);if(parts.length!==1||!same(parts[0][0],p)||!same(parts[0][1],q))continue;
  const c1=riskColor(a.properties,mode),c2=riskColor(b.properties,mode),n=c1===c2?1:16;
  for(let i=0;i<n;i++){out.push({type:'Feature',geometry:{type:'LineString',coordinates:[mix(p,q,i/n),mix(p,q,(i+1)/n)]},properties:{color:colorMix(c1,c2,(i+.5)/n),visualOnly:true}});}
 }return fc(out);
}
