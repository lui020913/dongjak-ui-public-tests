import {loadBuildingTileFeatures} from '../building-assets.js';
import {prepareBuildingTile} from '../building-tile-prepare.mjs';
self.onmessage=async({data:{id,sheet,boundary,green}})=>{
 try{const result=prepareBuildingTile(await loadBuildingTileFeatures(sheet),boundary,green);self.postMessage({id,result});}
 catch(error){self.postMessage({id,error:String(error?.message||error)});}
};
