// Preserve the official route's ordered trace; never replace it with a
// fastest driving route between endpoints or a fabricated straight line.
const metres=(a,b)=>Math.hypot((a[0]-b[0])*88180,(a[1]-b[1])*111195);
const length=c=>c.slice(1).reduce((s,p,i)=>s+metres(p,c[i]),0);
function nearest(p,line,start=0){let best=Infinity,at=start;for(let i=start;i<line.length-1;i++){const a=line[i],b=line[i+1],dx=(b[0]-a[0])*88180,dy=(b[1]-a[1])*111195,d=dx*dx+dy*dy;const t=d?Math.max(0,Math.min(1,((p[0]-a[0])*88180*dx+(p[1]-a[1])*111195*dy)/d)):0;const q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],dist=metres(p,q);if(dist<best){best=dist;at=i;}}return {distance:best,index:at};}
export function validateMatchedRoad(original,matched){
 if(!Array.isArray(original)||!Array.isArray(matched)||original.length<2||matched.length<2||!matched.every(p=>p.length===2&&p.every(Number.isFinite)))return false;
 const ratio=length(matched)/length(original);
 if(!Number.isFinite(ratio)||ratio<.85||ratio>1.2||metres(original[0],matched[0])>25||metres(original.at(-1),matched.at(-1))>25)return false;
 // Every original and matched vertex stays near the opposite polyline; original
 // trace must remain in forward order, including loops.
 let at=0;for(const p of original){const n=nearest(p,matched,at);if(n.distance>22)return false;at=n.index;}
 return matched.every(p=>nearest(p,original).distance<=22);
}
export function decodeMatchedPolyline(shape){if(typeof shape!=='string'||!shape.length)return [];let i=0,lat=0,lng=0,out=[];const read=()=>{let n=0,s=0,b;do{if(i>=shape.length||s>30)throw Error('Invalid polyline');b=shape.charCodeAt(i++)-63;n|=(b&31)<<s;s+=5;}while(b>=32);return n&1?~(n>>1):n>>1;};while(i<shape.length){lat+=read();lng+=read();out.push([lng/1e6,lat/1e6]);}return out;}
export async function matchOfficialBusRoad(coords,{fetcher=fetch,signal,apiBase=''}={}){
 if(signal?.aborted||coords?.length<2||coords.length>1200)return null;
 const controller=new AbortController(),cancel=()=>controller.abort(),timer=setTimeout(cancel,5000);
 signal?.addEventListener('abort',cancel,{once:true});
 try{
  const r=await fetcher(apiBase+'/api/basemap/bus-trace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coords}),signal:controller.signal});
  if(!r.ok)return null;const d=await r.json();const matched=d.coordinates;
  return validateMatchedRoad(coords,matched)?matched:null;
 }catch{return null;}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}

const matchedPlans=new WeakMap();
export async function prepareTransitRoadPlan(plan,options={}){
 const legs=plan.legs||[plan];
 await Promise.all(legs.filter(l=>l.kind==='bus').map(async leg=>{
  if(matchedPlans.has(leg)){await matchedPlans.get(leg);return;}
  const task=(async()=>{const coords=await matchOfficialBusRoad(leg.coords,options);if(!options.signal?.aborted&&coords){leg.coords=coords;leg.roadMatch='matched';}else if(!options.signal?.aborted){leg.roadMatch='official';}})();
  matchedPlans.set(leg,task);await task;if(options.signal?.aborted)matchedPlans.delete(leg);
 }));
 return plan;
}
export function isTransitAccessWalkValid(route,from,to,maxGap=25){
 if(!route?.coords?.length)return false;
 for(const [p,q] of [[from,route.coords[0]],[to,route.coords.at(-1)]]){
  if(p?.vehicleAccess&&metres([p.lng,p.lat],q)>maxGap)return false;
 }
 return true;
}
