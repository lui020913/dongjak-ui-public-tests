/* Isolated PRI research overlay: never block the main map thread. */
import {loadCompositePriForRoutes,compareCompositePriRoutes,visualizeCompositePriRoutes} from '../pri-route-exposure.mjs';
let bundlePromise;
self.onmessage=async ({data})=>{
  const {id,routes}=data||{};
  try{
    if(!bundlePromise)bundlePromise=loadCompositePriForRoutes().catch(error=>{bundlePromise=null;throw error;});
    const bundle=await bundlePromise;
    const comparison=compareCompositePriRoutes(routes,bundle);
    comparison.visuals=visualizeCompositePriRoutes(routes,bundle);
    self.postMessage({id,ok:true,comparison});
  }catch(error){self.postMessage({id,ok:false,error:String(error?.message||error)});}
};
