/** PDF-provided relative speed-environment hazard criterion (not a statutory risk grade).
 * This is a distinct standard-node-link network: matching it to the 25m
 * lighting/PRI network is not established. Never fabricate segment scores. */
export const SPEED_RISK_RULES=Object.freeze([
 Object.freeze({label:'30km/h 미만',risk:0}),
 Object.freeze({label:'30km/h',speed:30,risk:40}),
 Object.freeze({label:'40km/h',speed:40,risk:80}),
 Object.freeze({label:'50km/h',speed:50,risk:100})
]);
export const SPEED_RISK_SOURCE='/data/road-speed/sangdo1_speed_links.geojson';
export const SPEED_RISK_METADATA='/data/road-speed/metadata.json';
export function speedLimitRiskScore(speed){
 if(typeof speed!=='number'||!Number.isFinite(speed)||speed<0)return null;
 if(speed<30)return 0;
 return speed===30?40:speed===40?80:speed===50?100:null;
}
function validLine(coords){
 return Array.isArray(coords)&&coords.length>=2&&coords.length<=20000&&coords.every(p=>
  Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>126&&p[0]<128&&p[1]>37&&p[1]<38
 );
}
export function validateSpeedRiskSource(raw){
 if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features)||!raw.features.length||raw.features.length>5000)
  throw Error('제한속도 표준노드링크 자료 형식 오류');
 const ids=new Set();
 const features=raw.features.map(f=>{
  const p=f?.properties||{},id=p.link_id,rate=p.speed;
  if(typeof id!=='string'||!/^\d{1,30}$/.test(id)||ids.has(id)||f?.geometry?.type!=='LineString'||!validLine(f.geometry.coordinates)
    ||typeof rate!=='number'||!Number.isFinite(rate)||typeof p.length_m!=='number'||p.length_m<=0)
   throw Error('제한속도 링크 ID/형상/속도/연장 오류');
  ids.add(id);
  return f;
 });
 return {type:'FeatureCollection',features};
}
export function speedRiskCounts(features){
 const observed={0:0,40:0,80:0,100:0};let unknown=0;
 for(const feature of features){
  const score=speedLimitRiskScore(feature?.properties?.speed);
  if(score===null)unknown++;else observed[score]++;
 }
 return {observed,unknown,total:features.length};
}
/** Grey reference roadwork is spatially unjoined and DOES NOT receive a speed
 * score. Native speed links are drawn separately above it (not matched to it).
 */
export function speedRiskDisplay(source,referenceFeatures=[]){
 const verified=validateSpeedRiskSource(source);
 if(!Array.isArray(referenceFeatures)||referenceFeatures.some(f=>!f?.geometry||!f?.properties))
  throw Error('미평가 참조 도로 형식 오류');
 const grey=referenceFeatures.map(f=>({
  type:'Feature',geometry:f.geometry,properties:{
   segmentId:f.properties.segmentId??f.properties.segment_id??'',
   name:f.properties.name??f.properties.road_name??'',
   speedSource:'unmatched-reference',speed:null,score:null,displayScore:0,evaluated:false,
   lengthM:f.properties.lengthM??f.properties.clipped_length_m??0
  }
 }));
 const mapped=verified.features.map(f=>{
  const p=f.properties,risk=speedLimitRiskScore(p.speed);
  return {type:'Feature',geometry:f.geometry,properties:{
   segmentId:'speed-link:'+p.link_id,linkId:p.link_id,name:'표준노드링크 '+p.link_id,
   speedSource:'observed-link',speed:p.speed,
   score:risk,displayScore:risk??0,evaluated:risk!==null,
   lengthM:p.length_m,updated:p.updated??'',lanes:p.lanes??null
  }};
 });
 return {type:'FeatureCollection',features:[...grey,...mapped]};
}
