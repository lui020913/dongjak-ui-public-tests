import {DongjakWalkSlopeRouter} from '../lib/dongjakWalkSlopeRouter.mjs';
let graphPromise;
async function load(){
 const response=await fetch('/data/safety/walk/district-osm-walk-graph.json');
 if(!response.ok)throw Error('OSM pedestrian snapshot HTTP '+response.status);
 const graph=await response.json();
 if(graph.schema!==1||graph.license!=='ODbL-1.0'||graph.nodes?.length!==12983||graph.edges?.length!==17107)throw Error('OSM pedestrian snapshot invalid');
 return new DongjakWalkSlopeRouter(graph,{});
}
self.onmessage=async({data})=>{
 try{
  if(!graphPromise)graphPromise=load().catch(e=>{graphPromise=null;throw e;});
  const router=await graphPromise;
  const result=router.route(data.start,data.end,{mode:'shortest',maxSnapMeters:85});
  self.postMessage({id:data.id,ok:true,result});
 }catch(e){self.postMessage({id:data.id,ok:false,error:String(e.message||e)});}
};
