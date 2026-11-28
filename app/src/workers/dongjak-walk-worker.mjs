// Local pedestrian graph is evaluated off the UI thread. Do not fetch any external routing service here.
import {loadDongjakWalkSlopeRouter} from '../lib/dongjakWalkSlopeRouter.mjs';
let routerPromise;
self.onmessage=async ({data})=>{
  const {id,start,end}=data||{};
  try {
    if(!routerPromise)routerPromise=loadDongjakWalkSlopeRouter().catch(error=>{routerPromise=null;throw error;});
    const router=await routerPromise;
    const a=router.route(start,end,{mode:'shortest',maxSnapMeters:85});
    const b=router.route(start,end,{mode:'gentle',maxSnapMeters:85});
    let balanced=null;
    try{balanced=router.route(start,end,{mode:'balanced',maxSnapMeters:85})}catch{}
    self.postMessage({id,ok:true,routes:{standard:a,gentle:b,balanced}});
  } catch(error) {self.postMessage({id,ok:false,error:String(error?.message||error)});}
};
