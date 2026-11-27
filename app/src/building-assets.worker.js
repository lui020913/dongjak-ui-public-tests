import {loadBuildingTileFeatures} from './building-assets-core.js';
self.onmessage=async ({data:{id,sheet}})=>{
  try{
    const result=await loadBuildingTileFeatures(sheet);
    self.postMessage({id,result});
  }catch(error){
    self.postMessage({id,error:String(error?.message||error)});
  }
};
