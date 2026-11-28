import {partitionBuildingTile} from '../server/district-road-tile.mjs';
self.onmessage=({data})=>{
 const {id,input,count}=data;
 try{const parts=partitionBuildingTile(input,count).map(p=>p.buffer.slice(p.byteOffset,p.byteOffset+p.byteLength));self.postMessage({id,parts},parts);}
 catch(error){self.postMessage({id,error:String(error?.message||error)});}
};
