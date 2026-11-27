// Offline cartographic generalization: retain one mapped alignment per same-line corridor.
// Work in approximate local metres; no cross-line merging and no synthetic station chords.
const X=88300,Y=111320,STEP=10,R=45,CELL=60,ANGLE=Math.cos(25*Math.PI/180);
const metric=p=>[p[0]*X,p[1]*Y],geo=p=>[+(p[0]/X).toFixed(6),+(p[1]/Y).toFixed(6)];
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const length=pts=>pts.slice(1).reduce((n,p,i)=>n+distance(pts[i],p),0);
function nearest(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return mix(a,b,t);}
const key=(x,y)=>x+','+y;
function index(){const cells=new Map();return {add(a,b){const d=distance(a,b);if(d<.001)return;const edge={a,b,ux:(b[0]-a[0])/d,uy:(b[1]-a[1])/d};for(let x=Math.floor(Math.min(a[0],b[0])/CELL);x<=Math.floor(Math.max(a[0],b[0])/CELL);x++)for(let y=Math.floor(Math.min(a[1],b[1])/CELL);y<=Math.floor(Math.max(a[1],b[1])/CELL);y++){const k=key(x,y);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(edge);}},find(p,ux,uy){let best=null,min=R;const x=Math.floor(p[0]/CELL),y=Math.floor(p[1]/CELL);for(let i=x-1;i<=x+1;i++)for(let j=y-1;j<=y+1;j++)for(const e of cells.get(key(i,j))||[]){if(Math.abs(ux*e.ux+uy*e.uy)<ANGLE)continue;const q=nearest(p,e.a,e.b),d=distance(p,q);if(d<min){min=d;best=q;}}return best;}};}
export function singleRailAlignments(collection){
 const groups=new Map(),output=[];
 for(const f of collection.features||[]){const line=f.properties?.line,pts=f.geometry?.coordinates;if(!line||f.geometry?.type!=='LineString'||!Array.isArray(pts)||pts.length<2)continue;const p=pts.map(metric);if(!groups.has(line))groups.set(line,[]);let parts=[p];if(p.length>8&&distance(p[0],p.at(-1))<45){let far=1;for(let i=2;i<p.length-1;i++)if(distance(p[0],p[i])>distance(p[0],p[far]))far=i;if(far>1&&far<p.length-2)parts=[p.slice(0,far+1),p.slice(far)];}for(const part of parts)groups.get(line).push({f,p:part,len:length(part)});}
 for(const paths of groups.values()){
  const grid=index();
  paths.sort((a,b)=>b.len-a.len);
  for(const {f,p} of paths){
   // Subdivide to distinguish shared corridor from real branches locally, not just whole features.
   const samples=[];
   for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],d=distance(a,b);if(!d)continue;const n=Math.ceil(d/STEP);for(let j=0;j<n;j++){const start=mix(a,b,j/n),end=mix(a,b,(j+1)/n),ux=(b[0]-a[0])/d,uy=(b[1]-a[1])/d;const match=grid.find(mix(start,end,.5),ux,uy);samples.push({a:start,b:end,ux,uy,match});}}
   // A brief unmatched tangent near a curve or turnout is not a second route.
   // Real branches must have at least 65m of unmatched coverage; standalone paths are retained.
   const runs=[];let start=-1;
   for(let i=0;i<=samples.length;i++){if(i<samples.length&&!samples[i].match){if(start<0)start=i;continue;}if(start>=0){runs.push([start,i]);start=-1;}}
   for(const [a,b] of runs){const part=samples.slice(a,b),meters=part.reduce((s,e)=>s+distance(e.a,e.b),0);if(meters<65&&(a>0||b<samples.length))continue;
    const pts=[part[0].a,...part.map(e=>e.b)];
    // Attach diverging branches to the representative alignment at the overlap boundary.
    if(a>0){const e=part[0],q=grid.find(e.a,e.ux,e.uy);if(q)pts.unshift(q);}
    if(b<samples.length){const e=part.at(-1),q=grid.find(e.b,e.ux,e.uy);if(q)pts.push(q);}
    // Remove collinear subdivision points to keep output compact, retaining original curves.
    const clean=[pts[0]];for(let i=1;i<pts.length-1;i++){const q=nearest(pts[i],clean.at(-1),pts[i+1]);if(distance(q,pts[i])>.15)clean.push(pts[i]);}clean.push(pts.at(-1));
    const coordinates=clean.map(geo).filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
    if(coordinates.length<2)continue;
    output.push({...f,geometry:{type:'LineString',coordinates}});
    for(let i=1;i<pts.length;i++)grid.add(pts[i-1],pts[i]);
   }
  }
 }
 return {...collection,features:output};
}
