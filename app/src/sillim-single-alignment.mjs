import {VERIFIED_STATIONS,FIXED_RAIL_STATION_ORDER} from './fixed-rail-data.js';
const X=88300,Y=111320;
const distance=(a,b)=>Math.hypot((a[0]-b[0])*X,(a[1]-b[1])*Y);
function segmentDistance(p,a,b){
 const dx=(b[0]-a[0])*X,dy=(b[1]-a[1])*Y,px=(p[0]-a[0])*X,py=(p[1]-a[1])*Y;
 const t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(px-t*dx,py-t*dy);
}
// Sillim's full mapped route is a single continuous path, not a branch.
// Validate every station before replacing any existing display geometry.
export function completeSillimPath(paths=[]){
 const candidates=paths.filter(p=>p.line==='신림'||p.line==='신림선');
 if(candidates.length!==1)return null;
 const c=candidates[0].coordinates;
 if(!Array.isArray(c)||c.length<20||!c.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return null;
 if(c.slice(1).some((p,i)=>distance(c[i],p)>1000))return null;
 const stations=FIXED_RAIL_STATION_ORDER['신림'].map(n=>VERIFIED_STATIONS[n]);
 if(!stations.every(p=>Math.min(...c.slice(1).map((q,i)=>segmentDistance(p,c[i],q)))<=100))return null;
 const a=stations[0],b=stations.at(-1);
 if(!((distance(a,c[0])<250&&distance(b,c.at(-1))<250)||(distance(b,c[0])<250&&distance(a,c.at(-1))<250)))return null;
 return c;
}
export function replaceSillimDisplay(collection,coordinates){
 if(!coordinates)return collection;
 return {...collection,features:[...collection.features.filter(f=>f.properties?.line!=='신림선'),{type:'Feature',properties:{line:'신림선',color:'#6789CA',opacity:.97,source:'OpenStreetMap_ODbL',schematic:false},geometry:{type:'LineString',coordinates}}]};
}
