// Visual repair only: do not add graph edges to live navigation or claim surveyed geometry.
const X=88300,Y=111320,MAX_GAP=60;
const metric=(a,b)=>[(b[0]-a[0])*X,(b[1]-a[1])*Y];
const distance=(a,b)=>Math.hypot(...metric(a,b));
const dot=(a,b)=>{const den=Math.hypot(...a)*Math.hypot(...b);return den?(a[0]*b[0]+a[1]*b[1])/den:0;};
const key=p=>p.map(x=>x.toFixed(6)).join(',');
const local=p=>p[0]>=126.88&&p[0]<=127.02&&p[1]>=37.46&&p[1]<=37.54;
const supported=new Set(['1호선','2호선','4호선','7호선','9호선','신림선']);
export function repairRailDisplayContinuity(collection){
 const features=collection?.features||[],lines=new Map(),bridges=[];
 for(const f of features){
  const line=f.properties?.line,c=f.geometry?.coordinates;if(!supported.has(line)||f.geometry?.type!=='LineString'||c?.length<2)continue;
  if(!lines.has(line))lines.set(line,new Map());
  const nodes=lines.get(line);
  const node=p=>{const k=key(p);if(!nodes.has(k))nodes.set(k,{p,neighbors:new Map(),parent:k});return nodes.get(k);};
  const root=k=>{let a=nodes.get(k);while(a.parent!==key(a.p))a=nodes.get(a.parent);return key(a.p);};
  for(let i=1;i<c.length;i++){
   const a=c[i-1],b=c[i],ka=key(a),kb=key(b);if(ka===kb)continue;
   const na=node(a),nb=node(b);na.neighbors.set(kb,b);nb.neighbors.set(ka,a);
   na.props=f.properties;nb.props=f.properties;
   const ra=root(ka),rb=root(kb);if(ra!==rb)nodes.get(ra).parent=rb;
  }
 }
 for(const [line,nodes] of lines){
  const root=k=>{let a=nodes.get(k);while(a.parent!==key(a.p))a=nodes.get(a.parent);return key(a.p);};
  const ends=[...nodes.values()].filter(n=>n.neighbors.size===1&&local(n.p)&&(n.props.opacity??1)>.18);
  const nearest=new Map();
  for(const a of ends)for(const b of ends){
   if(a===b)continue; // a circular line can have a local gap despite belonging to one component
   const d=distance(a.p,b.p);if(d<.15||d>MAX_GAP)continue;
   const av=metric([...a.neighbors.values()][0],a.p),bv=metric([...b.neighbors.values()][0],b.p),ab=metric(a.p,b.p),ba=metric(b.p,a.p);
   const da=dot(av,ab),db=dot(bv,ba);
   // Permit a short station curve with one perpendicular tangent, but never
   // join back-facing endpoints or side-by-side parallel tracks.
   if(Math.min(da,db)<-.2||Math.max(da,db)<.75||da+db<.7)continue;
   if(!nearest.has(a)||d<nearest.get(a).d)nearest.set(a,{b,d});
  }
  const used=new Set();
  for(const [a,{b}] of nearest){
   if(used.has(a)||used.has(b)||nearest.get(b)?.b!==a)continue;
   used.add(a);used.add(b);
   bridges.push({type:'Feature',properties:{...a.props,line,opacity:Math.min(a.props.opacity??.97,b.props.opacity??.97),source:'display-gap-approximation',schematic:true,displayGap:true},geometry:{type:'LineString',coordinates:[a.p,b.p]}});
  }
 }
 return bridges.length?{...collection,features:[...features,...bridges]}:collection;
}
