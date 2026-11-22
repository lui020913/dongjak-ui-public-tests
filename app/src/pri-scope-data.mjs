// The protection-gap factor uses the SAME 25m segment IDs, but must draw the
// genuinely clipped inside-dong centerlines rather than the uncut lighting network.
export function scopedPolicyFeatures(geo){
 if(geo?.metadata?.schema!=='sangdo1_policy_gap_2factor_adminscope_risk_v3'||geo?.metadata?.administrative_scope_code!=='1159053000'||!Array.isArray(geo.features))throw Error('상도1동 경계 GIS 자료가 유효하지 않습니다.');
 return {type:'FeatureCollection',features:geo.features.map(f=>{
  const score=f.properties?.combined_new_score;
  const evaluated=typeof score==='number'&&Number.isFinite(score);
  return {type:'Feature',geometry:f.geometry,properties:{segmentId:f.properties.segment_id,name:f.properties.road_name,score:evaluated?score:null,displayScore:evaluated?score:0,evaluated,modeled:false,lengthM:Number(f.properties.clipped_length_m)||0}};
 })};
}
