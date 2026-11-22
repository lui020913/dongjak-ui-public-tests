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

/**
 * The three-factor preview must draw on the same inside-Sangdo1 clipped
 * centerlines as the policy map. Risk values retain their existing 25m ID
 * alignment and observed-only rule, but geometry never extends past the dong.
 */
export function scopedCompositeFeatures(geo,riskById){
 if(!(riskById instanceof Map))throw new TypeError('Risk scores must be keyed by road segment ID.');
 const outline=scopedPolicyFeatures(geo);
 return {type:'FeatureCollection',features:outline.features.map(f=>{
  const value=riskById.get(f.properties.segmentId);
  const valid=typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
  return {...f,properties:{...f.properties,score:valid?value:null,displayScore:valid?value:0,evaluated:valid}};
 })};
}
