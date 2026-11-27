import {distanceFromDongjakMeters,railEndpointFadeMeters} from './fixed-rail-lines.js';
// Reuse the exact currently displayed local geometry, including its mapped
// curves. The city dataset supplies ONLY the uncovered portions of each line.
const X=88300,Y=111320,CELL=200,STEP=35,JOIN=180;
const meters=(a,b)=>Math.hypot((a[0]-b[0])*X,(a[1]-b[1])*Y);
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const key=(x,y)=>x+','+y;
function project(p,a,b){const dx=(b[0]-a[0])*X,dy=(b[1]-a[1])*Y,t=Math.max(0,Math.min(1,(((p[0]-a[0])*X)*dx+((p[1]-a[1])*Y)*dy)/(dx*dx+dy*dy||1)));return mix(a,b,t);}
function localIndex(features){
 const cells=new Map(),vertices=new Map();
 for(const f of features){const line=f.properties?.line,pts=f.geometry?.coordinates;if(!line||f.geometry?.type!=='LineString'||!pts?.length)continue;
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(meters(a,b)<.01)continue;
   const dx=(b[0]-a[0])*X,dy=(b[1]-a[1])*Y,len=Math.hypot(dx,dy);
   const e={a,b,ux:dx/len,uy:dy/len};
   for(let x=Math.floor(Math.min(a[0],b[0])*X/CELL);x<=Math.floor(Math.max(a[0],b[0])*X/CELL);x++)for(let y=Math.floor(Math.min(a[1],b[1])*Y/CELL);y<=Math.floor(Math.max(a[1],b[1])*Y/CELL);y++){const k=line+'|'+key(x,y);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(e);}
   // Vertices are retained; degree-one endpoints are preferred when joining.
   for(const p of [a,b]){const k=line+'|'+p.map(n=>n.toFixed(6)).join(',');const old=vertices.get(k);if(old)old.degree++;else vertices.set(k,{line,p,degree:1});}
  }
 }
 const ends=[...vertices.values()].filter(v=>v.degree===1);
 return {nearest(line,p,ux,uy){let best=null,d=JOIN;const x=Math.floor(p[0]*X/CELL),y=Math.floor(p[1]*Y/CELL);for(let i=x-1;i<=x+1;i++)for(let j=y-1;j<=y+1;j++)for(const e of cells.get(line+'|'+key(i,j))||[]){if(Math.abs(ux*e.ux+uy*e.uy)<.65)continue;const q=project(p,e.a,e.b),dist=meters(p,q);if(dist<d){d=dist;best=q;}}return best;},join(line,p,fallback){let best=null,d=JOIN;for(const e of ends){if(e.line!==line)continue;const dist=meters(p,e.p);if(dist<d){d=dist;best=e.p;}}return best||fallback;}};
}
function extensions(raw,local){
 const index=localIndex(local),out=[];
 for(const f of raw?.features||[]){
  const line=f.properties?.line,pts=f.geometry?.coordinates;if(!line||f.geometry?.type!=='LineString'||!pts?.length)continue;
  const samples=[];
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],len=meters(a,b);if(len<.01)continue;const ux=(b[0]-a[0])*X/len,uy=(b[1]-a[1])*Y/len,n=Math.ceil(len/STEP);for(let j=0;j<n;j++){const start=mix(a,b,j/n),end=mix(a,b,(j+1)/n);samples.push({a:start,b:end,match:index.nearest(line,mix(start,end,.5),ux,uy)});}}
  let start=-1;
  for(let i=0;i<=samples.length;i++){if(i<samples.length&&!samples[i].match){if(start<0)start=i;continue;}if(start<0)continue;
   const part=samples.slice(start,i),length=part.reduce((n,e)=>n+meters(e.a,e.b),0);
   if(length>=70||start===0&&i===samples.length){const coordinates=[part[0].a,...part.map(e=>e.b)];if(start>0){const q=index.join(line,coordinates[0],samples[start-1].match);if(q&&meters(q,coordinates[0])<=JOIN+STEP)coordinates.unshift(q);}if(i<samples.length){const q=index.join(line,coordinates.at(-1),samples[i].match);if(q&&meters(q,coordinates.at(-1))<=JOIN+STEP)coordinates.push(q);}out.push({...f,geometry:{type:'LineString',coordinates}});}
   start=-1;
  }
 }
 return out;
}
export const CITY_RAIL_FADE_METERS=1400;
export function buildExtendedCityRail(raw,localCollection,geometry,isInside,colors){
 const local=localCollection?.features||[],features=[];
 const localColors=new Map(local.map(f=>[f.properties?.line,f.properties?.color]));
 const opacity=p=>isInside(p[0],p[1],geometry)?.97:.97*(1-railEndpointFadeMeters(distanceFromDongjakMeters(p,geometry),CITY_RAIL_FADE_METERS));
 for(const f of [...local,...extensions(raw,local)]){
  const line=f.properties?.line,color=localColors.get(line)||colors[line],pts=f.geometry?.coordinates;if(!color||f.geometry?.type!=='LineString'||!pts?.length)continue;
  let run=null;const flush=()=>{if(run?.geometry.coordinates.length>1)features.push(run);run=null;};
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(meters(a,b)/75));for(let j=0;j<n;j++){const start=j===0?a:mix(a,b,j/n),end=j===n-1?b:mix(a,b,(j+1)/n),alpha=+opacity(mix(start,end,.5)).toFixed(3);if(alpha<.006){flush();continue;}if(run&&Math.abs(run.properties.opacity-alpha)<=.018){run.geometry.coordinates.push(end);}else{flush();run={type:'Feature',properties:{...f.properties,line,color,opacity:alpha},geometry:{type:'LineString',coordinates:[start,end]}};}}}
  flush();
 }
 return {type:'FeatureCollection',features};
}
