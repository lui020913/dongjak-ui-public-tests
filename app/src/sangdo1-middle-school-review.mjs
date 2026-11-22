/**
 * 상도1동 상현중학교 300m "검토범위" 오버레이.
 * NOT a school protection-zone designation, a student route or a risk score.
 * Uses only the already clipped Sangdo1 source geometry; preserves PRI nulls.
 */
export const SANGHYEON_MIDDLE_REFERENCE = Object.freeze({
 name:'상현중학교', lng:126.9611626, lat:37.4943029,
 radius_m:300, address:'서울특별시 동작구 사당로2길 2-19',
 legal_school_zone_verified:false, school_catchment_verified:false
});
const METERS_PER_DEG_LAT=111195;
const metresPerLon=lat=>111320*Math.cos(lat*Math.PI/180);
const round=(n,d=2)=>Math.round(n*10**d)/10**d;
const sq=x=>x*x;
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const pointNear=(a,b)=>Math.abs(a[0]-b[0])<1e-10&&Math.abs(a[1]-b[1])<1e-10;

/** Clip every consecutive pair to the analytic 300m circle, without enlarging
 * the score coverage or borrowing a neighbouring school's protected-zone data. */
export function clipLineToSchoolRadius(coords,school=SANGHYEON_MIDDLE_REFERENCE){
 if(!Array.isArray(coords)||coords.length<2||!(school.radius_m>0))return [];
 const kx=metresPerLon(school.lat),ky=METERS_PER_DEG_LAT,r2=sq(school.radius_m);
 const pieces=[];let current=[];
 const flush=()=>{if(current.length>1)pieces.push(current);current=[];};
 for(let i=1;i<coords.length;i++){
  const a=coords[i-1],b=coords[i];
  const x0=(a[0]-school.lng)*kx,y0=(a[1]-school.lat)*ky;
  const vx=(b[0]-a[0])*kx,vy=(b[1]-a[1])*ky;
  const aa=vx*vx+vy*vy;
  if(aa<=1e-12){flush();continue;}
  const bb=2*(x0*vx+y0*vy),cc=x0*x0+y0*y0-r2;
  const discriminant=bb*bb-4*aa*cc;
  const cuts=[0,1];
  if(discriminant>=0){
   const root=Math.sqrt(discriminant);
   for(const t of [(-bb-root)/(2*aa),(-bb+root)/(2*aa)])
    if(t>0&&t<1)cuts.push(t);
  }
  cuts.sort((a,b)=>a-b);
  let hadPart=false;
  for(let j=1;j<cuts.length;j++){
   const s=cuts[j-1],e=cuts[j];
   if(e-s<1e-12)continue;
   const mid=(s+e)/2;
   if(sq(x0+vx*mid)+sq(y0+vy*mid)>r2+1e-7)continue;
   const p=lerp(a,b,s),q=lerp(a,b,e);
   if(current.length&&!pointNear(current[current.length-1],p))flush();
   if(!current.length)current.push(p);
   current.push(q);hadPart=true;
  }
  if(!hadPart)flush();
 }
 flush();
 return pieces;
}
export function distanceToSchoolMeters(point,school=SANGHYEON_MIDDLE_REFERENCE){
 return Math.hypot((point[0]-school.lng)*metresPerLon(school.lat),
                   (point[1]-school.lat)*METERS_PER_DEG_LAT);
}
function scored(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;}

/** Existing combined score is retained as context only; the middle-school
 * review score remains NULL until an independent statutory zone/source exists. */
export function buildSanghyeonMiddleSchoolReview(geo,school=SANGHYEON_MIDDLE_REFERENCE){
 if(geo?.metadata?.schema!=='sangdo1_policy_gap_2factor_adminscope_risk_v3'||
    geo?.metadata?.administrative_scope_code!=='1159053000'||
    !Array.isArray(geo.features))throw Error('상도1동 1,606개 경계 클리핑 원본을 사용해야 합니다.');
 const features=[],sourceIds=new Set();
 let estimatedLengthM=0,existingScored=0,existingNull=0;
 for(const f of geo.features){
  if(f?.geometry?.type!=='LineString')continue;
  const pieces=clipLineToSchoolRadius(f.geometry.coordinates,school);
  if(!pieces.length)continue;
  const p=f.properties||{};
  if(sourceIds.has(p.segment_id))throw Error('중복 도로 ID: '+p.segment_id);
  sourceIds.add(p.segment_id);
  const referenceScore=scored(p.combined_new_score)?p.combined_new_score:null;
  if(referenceScore===null)existingNull++;else existingScored++;
  for(const line of pieces)for(let i=1;i<line.length;i++){
   const a=line[i-1],b=line[i];
   estimatedLengthM+=Math.hypot((b[0]-a[0])*metresPerLon(school.lat),(b[1]-a[1])*METERS_PER_DEG_LAT);
  }
  features.push({type:'Feature',
   geometry:pieces.length===1?{type:'LineString',coordinates:pieces[0]}:{type:'MultiLineString',coordinates:pieces},
   properties:{
    segment_id:p.segment_id,road_name:p.road_name||'이름 없는 도로',
    network_kind:p.network_kind||'unknown',
    boundary_scope:p.boundary_scope||'unknown',
    existing_policy_score_0_100:referenceScore,
    existing_policy_scored:referenceScore!==null,
    middle_school_gap_score:null,
    middle_school_gap_status:'미산정: 중학교 지정 보호구역·학생 통학동선 검증자료 없음',
    review_type:'상현중학교 대표점 300m 이내 도로 공간검토',
    not_legal_zone_omission:true,not_student_route:true
   }});
 }
 return {
  type:'FeatureCollection',
  metadata:{
   schema:'sangdo1_middle_school_300m_spatial_review_v1',
   source_schema:geo.metadata.schema,as_of:'2026-11-22',
   school_name:school.name,school_reference:[school.lng,school.lat],
   reference_radius_m:school.radius_m,
   line_clip_method:'local planar analytic circle intersections; ~metre-scale reference only',
   within_sangdo1_reference_boundary:true,
   road_segments:sourceIds.size,
   existing_policy_scored:existingScored,existing_policy_null:existingNull,
   approximate_covered_road_m:round(estimatedLengthM),
   middle_school_gap_scores_calculated:0,
   legal_school_zone_status:'unverified',student_route_status:'unverified',
   no_change_to_team_score_or_pri:true
  },features
 };
}
