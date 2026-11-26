// Original PDF lines are already clipped to the reference Sangdo1 boundary.
// Draw the complete reference network once, not a second set of matched
// unknown centerlines. Confirmed scores retain their own authoritative geometry.
export function sharedRoadDisplay(scope,ids,reference){
 const original=reference?.features;
 const hasOriginal=Array.isArray(original)&&original.length>0;
 const features=scope.features.flatMap(f=>{
  const matched=!f.properties.evaluated&&ids.has(f.properties.segmentId);
  if(matched&&hasOriginal)return [];
  return [{...f,properties:{...f.properties,sharedCandidate:matched}}];
 });
 if(hasOriginal)for(const f of original){
  const p=f.properties||{};
  features.push({type:'Feature',geometry:f.geometry,properties:{
   segmentId:String(p.segment_id),name:p.display_name||'보차혼용도로·이면도로 표시 구간',
   lengthM:Number(p.approx_length_m)||0,score:null,displayScore:0,evaluated:false,
   sharedCandidate:true,sharedReference:true,modeled:false
  }});
 }
 return {type:'FeatureCollection',features};
}
