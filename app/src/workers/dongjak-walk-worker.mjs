// Local pedestrian graph is evaluated off the UI thread. Do not fetch any external routing service here.
import {loadDongjakWalkSlopeRouter} from '../lib/dongjakWalkSlopeRouter.mjs';
import {parseImport} from '../pri-data.mjs';
import {spatialMatchSpeedFactor} from '../pri-speed-spatial-match.mjs';
import {SPEED_RISK_SOURCE} from '../pri-speed-risk.mjs';
import {indexPriSegments,assessPriRoute} from '../pri-route-exposure.mjs';
let priIndexPromise=null;
const priFetch=async url=>{
 const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(4500)});
 if(!response.ok)throw new Error('PRI unavailable: '+response.status);
 return response.json();
};
function getPriIndex(){
 if(priIndexPromise)return priIndexPromise;
 priIndexPromise=(async()=>{
  const manifest=await priFetch('/data/pri/manifest.json');
  const valid=url=>typeof url==='string'&&url.startsWith('/data/pri/')&&/^[a-zA-Z0-9_.-]+[.]json$/.test(url.slice('/data/pri/'.length));
  if(!valid(manifest.bundle)||!Array.isArray(manifest.patches)||!manifest.patches.every(valid))
   throw new Error('Untrusted PRI manifest');
  const [raw,...patches]=await Promise.all([manifest.bundle,...manifest.patches].map(priFetch));
  let dataset=parseImport(raw);
  for(const patch of patches)dataset=parseImport(patch,dataset);
  // The speed source is a different network. Only the same conservative GIS
  // crosswalk used by the PRI map may attach speed evidence.
  try {
   const source=await priFetch(SPEED_RISK_SOURCE);
   const matched=spatialMatchSpeedFactor(dataset,source);
   dataset=parseImport(matched.patch,dataset);
  }catch(error){console.warn('[PRI routing] speed link join unavailable',error);}
  return indexPriSegments(dataset);
 })().catch(error=>{console.warn('[PRI routing] evidence unavailable',error);priIndexPromise=null;return null;});
 return priIndexPromise;
}

let routerPromise;
self.onmessage=async ({data})=>{
  const {id,start,end}=data||{};
  try {
    if(!routerPromise)routerPromise=loadDongjakWalkSlopeRouter().catch(error=>{routerPromise=null;throw error;});
    const router=await routerPromise;
    const a=router.route(start,end,{mode:'shortest',maxSnapMeters:85});
    const b=router.route(start,end,{mode:'gentle',maxSnapMeters:85});
    // Score actual candidate geometries only. No new or fabricated street path.
    // PRI failure never cancels the existing ordinary and gentle routes.
    try {
     const evidence=await getPriIndex();
     if(evidence){
      a.priEvidence=assessPriRoute(a.geojson.geometry.coordinates,evidence);
      b.priEvidence=assessPriRoute(b.geojson.geometry.coordinates,evidence);
     }
    }catch(error){console.warn('[PRI routing] scoring skipped',error);}
    self.postMessage({id,ok:true,routes:{standard:a,gentle:b}});
  } catch(error) {self.postMessage({id,ok:false,error:String(error?.message||error)});}
};
