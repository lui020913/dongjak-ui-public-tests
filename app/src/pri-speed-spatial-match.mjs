/** Conservative geometry-only crosswalk between the separate 25m lighting
 * research network and public standard-node-link speed centerlines.
 *
 * A speed estimate is provided ONLY if all three sampled positions of one
 * surveyed segment lie at most 5m from the SAME source link, the source
 * tangent follows the survey line within ~24 degrees, and no differing
 * speed class matches within an additional 3m. Otherwise NULL.
 * This is a reproducible candidate crosswalk, NOT field verification.
 */
import {validateSpeedRiskSource,speedLimitRiskScore} from './pri-speed-risk.mjs';

const RAD=Math.PI/180;
const X=111320*Math.cos(37.5*RAD),Y=111320;
const project=point=>[point[0]*X,point[1]*Y];
const safeNumber=n=>typeof n==='number'&&Number.isFinite(n);
const MAX_DIST_M=5,CONFLICT_DIST_M=8,MIN_COSINE=0.91;
export const SPEED_JOIN_CRITERIA=Object.freeze({
 distanceMeters:MAX_DIST_M,ambiguityMeters:CONFLICT_DIST_M,
 minAbsoluteDirectionCosine:MIN_COSINE,samples:3
});
const geoLength=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const halfPoint=points=>{
 const cum=[0];for(let i=1;i<points.length;i++)cum.push(cum.at(-1)+geoLength(points[i-1],points[i]));
 const mid=cum.at(-1)/2;
 for(let i=1;i<points.length;i++){
  if(cum[i]<mid)continue;
  const d=cum[i]-cum[i-1],t=d?(mid-cum[i-1])/d:0;
  return [points[i-1][0]+(points[i][0]-points[i-1][0])*t,
    points[i-1][1]+(points[i][1]-points[i-1][1])*t];
 }
 return points.at(-1);
};
function sourceEdges(source){
 const edges=[];
 for(const link of validateSpeedRiskSource(source).features){
  const path=link.geometry.coordinates.map(project);
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
   if(len<0.01)continue;
   edges.push({
    id:link.properties.link_id,speed:link.properties.speed,
    x:a[0],y:a[1],dx,dy,len,ux:dx/len,uy:dy/len,
    minX:Math.min(a[0],b[0])-CONFLICT_DIST_M,
    maxX:Math.max(a[0],b[0])+CONFLICT_DIST_M,
    minY:Math.min(a[1],b[1])-CONFLICT_DIST_M,
    maxY:Math.max(a[1],b[1])+CONFLICT_DIST_M
   });
  }
 }
 return edges;
}
function candidateForRoad(road,edges){
 const geometry=road?.geometry;
 if(geometry?.type!=='LineString'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2)
  return {kind:'unmatched'};
 const points=geometry.coordinates.map(project),first=points[0],last=points.at(-1),
  ax=last[0]-first[0],ay=last[1]-first[1],roadLength=Math.hypot(ax,ay);
 // A point-like survey cannot establish a direction or unique road alignment.
 if(roadLength<3)return {kind:'unmatched'};
 const samples=[first,halfPoint(points),last],candidate=new Map();
 for(let k=0;k<samples.length;k++){
  const p=samples[k];
  for(const edge of edges){
   if(p[0]<edge.minX||p[0]>edge.maxX||p[1]<edge.minY||p[1]>edge.maxY)continue;
   const angle=Math.abs((ax*edge.ux+ay*edge.uy)/roadLength);
   if(angle<MIN_COSINE)continue;
   const t=Math.max(0,Math.min(1,((p[0]-edge.x)*edge.dx+(p[1]-edge.y)*edge.dy)/(edge.len*edge.len)));
   const dist=Math.hypot(p[0]-edge.x-t*edge.dx,p[1]-edge.y-t*edge.dy);
   if(dist>CONFLICT_DIST_M)continue;
   let found=candidate.get(edge.id);
   if(!found){found={id:edge.id,speed:edge.speed,d:[Infinity,Infinity,Infinity]};candidate.set(edge.id,found);}
   found.d[k]=Math.min(found.d[k],dist);
  }
 }
 const possible=[...candidate.values()].filter(v=>v.d.every(x=>x<=MAX_DIST_M));
 if(!possible.length)return {kind:'unmatched'};
 const nearby=[...candidate.values()].filter(v=>v.d.every(x=>x<=CONFLICT_DIST_M));
 const speeds=new Set(nearby.map(v=>v.speed));
 // Parallel opposing directions with conflicting speed limits cannot be
 // reliably assigned to an unverified OSM way by nearest-centerline alone.
 if(speeds.size!==1)return {kind:'ambiguous'};
 possible.sort((a,b)=>a.d.reduce((p,c)=>p+c,0)-b.d.reduce((p,c)=>p+c,0)||a.id.localeCompare(b.id));
 const chosen=possible[0],score=speedLimitRiskScore(chosen.speed);
 if(score===null)return {kind:'unknownSpeed'};
 return {kind:'matched',id:chosen.id,speed:chosen.speed,risk:score,maxOffsetM:Math.max(...chosen.d)};
}
export function spatialMatchSpeedFactor(bundle,rawSpeedLinks){
 if(!bundle||typeof bundle.networkVersion!=='string'||!Array.isArray(bundle.segments))
  throw Error('제한속도 매칭에는 확정된 공통 조사도로 버전이 필요합니다.');
 const edges=sourceEdges(rawSpeedLinks),stats={observed:0,unmatched:0,ambiguous:0,unknownSpeed:0},scores=[];
 for(const road of bundle.segments){
  const result=candidateForRoad(road,edges);
  if(result.kind!=='matched'&&!(result.kind in stats))throw Error('알 수 없는 공간 정합 상태');
  if(result.kind==='matched'){
   stats.observed++;
   scores.push({id:road.id,score:result.risk,evidence:{
    note:'보수적 도로 중심선 기하 정합 · 원본 링크 '+result.id+' ('+result.speed+'km/h), 최대 측방 오차 '+result.maxOffsetM.toFixed(1)+'m. 현장 제한속도·법적 지정 검증은 별도 필요.'
   }});
  }else stats[result.kind]++;
 }
 return {
  patch:{
   type:'pri-factor-scores',schemaVersion:1,networkVersion:bundle.networkVersion,
   factor:{
    id:'speed',label:'제한속도 위험도',scoreDirection:'risk',estimated:true,
    source:'상도1동 표준노드링크 최고제한속도(2025-05-12) 및 사용자 제공 제한속도 위험도 PDF',
    date:'2025-05-12',
    method:'공통 조사 도로선 3점과 동일 표준링크 5m 이내·방향 유사도 0.91 이상, 서로 다른 속도는 8m 범위에서도 배제. 기하 매칭은 현장 검증이 아닌 잠정 자료이며 미매칭은 NULL.'
   },
   scores
  },
  stats:{...stats,total:bundle.segments.length,sourceLinks:rawSpeedLinks.features.length},
  criteria:SPEED_JOIN_CRITERIA
 };
}
