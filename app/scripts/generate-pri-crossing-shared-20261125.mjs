import {readFileSync,writeFileSync} from 'node:fs';
import {sharedRoadWidthRisk100} from '../src/pri-new-factor-rules.mjs';
import {matchSharedRoadWidths,enrichSharedCandidate} from '../src/pri-shared-road-width-match.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const write=(p,data)=>writeFileSync(new URL('../'+p,import.meta.url),JSON.stringify(data,null,2)+'\n');
function compute(base,scope,boundary,cross,mixed,widthGeo){
 const widths=matchSharedRoadWidths(base,widthGeo),widthById=new Map(widths.rows.map(r=>[r.id,r]));
 const sx=111195*Math.cos(37.5*Math.PI/180),sy=111195,xy=([x,y])=>[(x-126.95)*sx,(y-37.5)*sy],distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const roadById=new Map(base.segments.map(s=>[s.id,s]));
 let hash=2166136261;for(const c of JSON.stringify(base.segments.map(s=>[s.id,s.pts])))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 const networkVersion="sangdo1-lighting-"+base.meta["기준일"]+"-"+hash.toString(16);
 const radius={primary:100,primary_link:100,secondary:100,tertiary:50,residential:50};
 const vehicle=new Set([...Object.keys(radius),"service"]);
 const eligiblePoints=cross.features.filter(f=>f.properties.candidate_for_nearby_notice===true&&!f.properties.review_required).map(f=>({id:f.properties.id,p:xy(f.geometry.coordinates)}));
 const excludedPoints=cross.features.filter(f=>!f.properties.candidate_for_nearby_notice||f.properties.review_required).map(f=>xy(f.geometry.coordinates));
 function pointSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;if(!l2)return distance(p,a);const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
 const rings=[];for(const f of boundary.features??[boundary]){const g=f.geometry??f;if(g.type==="Polygon")rings.push(...g.coordinates.map(r=>r.map(xy)));if(g.type==="MultiPolygon")for(const p of g.coordinates)rings.push(...p.map(r=>r.map(xy)));}
 if(!rings.length)throw Error("Boundary geometry missing");
 const edges=rings.flatMap(r=>r.slice(1).map((b,i)=>[r[i],b]));
 const grouped=new Map();for(const f of scope.features){const id=f.properties.segment_id;if(!roadById.has(id))throw Error("Unknown ID "+id);const parts=f.geometry.type==="LineString"?[f.geometry.coordinates]:f.geometry.coordinates;if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(...parts.map(p=>p.map(xy)));}
 // Exact circle/line-segment intersections; union intervals so overlapping buffers count once.
 function coveredFraction(a,b,points,r){const dx=b[0]-a[0],dy=b[1]-a[1],aa=dx*dx+dy*dy;if(!aa)return 0;const intervals=[];for(const {p} of points){const fx=a[0]-p[0],fy=a[1]-p[1],bb=2*(fx*dx+fy*dy),cc=fx*fx+fy*fy-r*r,disc=bb*bb-4*aa*cc;if(disc<0)continue;const q=Math.sqrt(disc),lo=Math.max(0,(-bb-q)/(2*aa)),hi=Math.min(1,(-bb+q)/(2*aa));if(hi>lo)intervals.push([lo,hi]);}intervals.sort((a,b)=>a[0]-b[0]);let end=0,total=0;for(const [lo,hi] of intervals){if(hi>end){total+=hi-Math.max(lo,end);end=hi;}}return Math.min(1,Math.max(0,total));}
 const crossScores=[],mixedScores=[],candidateScores=[],counts={crossing:{eligible:0,edgeUnknown:0,uncertainPoint:0,low:0,caution:0,high:0},shared:{matched:0,ambiguous:0,unmatched:0,eligible:0,confirmedMixed:0,confirmedSeparated:0}};
 const mixedLines=[];for(const f of mixed.features){const lines=f.geometry.type==="LineString"?[f.geometry.coordinates]:f.geometry.coordinates;for(const l of lines){const p=l.map(xy);mixedLines.push({id:f.properties.segment_id,classification:f.properties.road_class,verified:f.properties.geometry_verified===true,edges:p.slice(1).map((b,i)=>{const a=p[i],len=distance(a,b);return {a,b,len,ux:(b[0]-a[0])/len,uy:(b[1]-a[1])/len};}).filter(e=>e.len>.05)});}}
 for(const [id,parts] of grouped){const road=roadById.get(id),r=radius[road.hw];let length=0,covered=0,uncertain=false,edgeUnknown=false;
  if(r){counts.crossing.eligible++;for(const part of parts)for(let i=1;i<part.length;i++){const a=part[i-1],b=part[i],len=distance(a,b);if(len<.01)continue;length+=len;const fraction=coveredFraction(a,b,eligiblePoints,r);covered+=len*fraction;if(fraction<1-1e-7){if(excludedPoints.some(p=>pointSegment(p,a,b)<=r))uncertain=true;const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(edges.some(([c,d])=>pointSegment(mid,c,d)<=r+len/2))edgeUnknown=true;}}
   if(uncertain)counts.crossing.uncertainPoint++;else if(edgeUnknown)counts.crossing.edgeUnknown++;else if(length>0){const score=Math.round(Math.max(0,Math.min(100,100*(length-covered)/length))*10)/10;crossScores.push({id,score,evidence:{note:`연구용 접근성 추정 · OSM ${road.hw}, 반경 ${r}m, 39개 팀 조사 후보 기준 · 접근권 외부 ${Math.max(0,length-covered).toFixed(1)}/${length.toFixed(1)}m · 실제 가시거리·횡단 안전 판정 아님`}});counts.crossing[score>=70?"high":score>=40?"caution":"low"]++;}
  }
  if(!vehicle.has(road.hw))continue;
  counts.shared.eligible++;
  const samples=[];for(const part of parts)for(let i=1;i<part.length;i++){const a=part[i-1],b=part[i],len=distance(a,b);if(len<.05)continue;const ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len;for(const t of [0,.5,1])samples.push({p:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],ux,uy});}
  if(samples.length<3){counts.shared.unmatched++;continue;}
  const matches=[];for(const line of mixedLines){let worst=0,total=0,ok=true;for(const sample of samples){let d=Infinity;for(const e of line.edges){if(Math.abs(sample.ux*e.ux+sample.uy*e.uy)<.91)continue;d=Math.min(d,pointSegment(sample.p,e.a,e.b));}if(d>5){ok=false;break;}worst=Math.max(worst,d);total+=d;}if(ok)matches.push({line,worst,mean:total/samples.length});}
  matches.sort((a,b)=>a.mean-b.mean||a.line.id.localeCompare(b.line.id));if(!matches.length){counts.shared.unmatched++;continue;}
  const classifications=new Set(matches.map(m=>m.line.classification));if(classifications.size>1){counts.shared.ambiguous++;continue;}
  const m=matches[0];counts.shared.matched++;
  const note=`PDF 표시선 ${m.line.id} · 동일 선형 전 표본 5m 이내 및 방향 유사도 0.91 이상 · 최대 편차 ${m.worst.toFixed(1)}m`;
  candidateScores.push(enrichSharedCandidate({id,score:null,evidence:{note:note+" · 보차혼용·이면도로 표시구간 기반 잠정 후보, 실제 보차 분리 여부 미확인"}},widthById.get(id)));
  if(m.line.verified&&["verified-mixed","verified-separated"].includes(m.line.classification)){const width=widthById.get(id);const score=sharedRoadWidthRisk100(m.line.classification,width?.conditionalMixedRisk==null?null:width.widthM);if(score!==null){mixedScores.push({id,score,evidence:{note:note+" · 원자료 분류 검증 완료"+(m.line.classification==="verified-mixed"?" · 도로폭 추정 "+width.widthM+"m, RW_SN "+width.roadWidthId:" · 물리적 분리, 폭 무관")}});counts.shared[m.line.classification==="verified-mixed"?"confirmedMixed":"confirmedSeparated"]++;}}
 }
 const factor=(id,label,source,method,scores)=>({schemaVersion:1,type:"pri-factor-scores",networkVersion,scoreMax:100,factor:{id,label,scoreDirection:"risk",estimated:true,source,method},scores});
 return {cross:factor("crossing","횡단보도 접근성 위험도 (추정)","팀 제출 횡단지점 JSON/PDF 정합본, OSM 공통 25m 도로망 및 상도1동 경계","39개 조사 후보의 합집합 버퍼: OSM primary/secondary 계열 100m, tertiary/residential 50m. 접근권 외부 연장 비율 ×100. 7·24번 불일치 및 경계 외부 미조사 영향 구간은 NULL. 4항목 현장평가·실제 가시거리·안전 판정 아님.",crossScores),shared:factor("sharedRoad","보차혼용도로 위험도 (도로폭 반영)","팀 제출 상도1동 보차혼용도로 평가기준표 (도로폭적용) 1쪽, C 지도 PDF, 서울시 실폭도로 2026-10 추정폭","보도·차도 분리 확인 0점(폭 무관), 혼용 확인 및 도로폭 4m 미만 100점, 4m 이상 6m 미만 70점, 6m 이상 30점. 미확인 분류 또는 불확실한 혼용 도로폭은 NULL. 추정폭은 공통 조사도로 전체 선형의 2m 이하 간격 표본이 단일 실폭도로 폴리곤 내에 포함되고 P10·대표폭·P90이 같은 점수 구간이며 추정 신뢰도 양호/보통일 때만 사용. PDF 표시구간은 확인 전 PRI·경로 점수 제외.",mixedScores),candidates:factor("sharedRoad","보차혼용·이면도로 표시구간 후보 (추정)","팀 제출 C 지도 PDF 디지털화 237개 선형","공간 정합된 PDF 보차혼용·이면도로 조사 후보. 점수는 모두 NULL. 도로폭 추정치 및 혼용으로 확인될 경우의 조건부 점수는 참고 정보이며 종합 PRI·경로 점수에서 제외.",candidateScores),counts,scope:grouped.size,points:eligiblePoints.length};
}
const result=compute(read("public/data/pri/lighting_segments.json"),read("public/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson"),read("public/data/protection-zone/boundary_reference.geojson"),read("public/data/sangdo1-crosswalks-team-review.geojson"),read("public/data/sangdo1-analysis-view/bocha-mixed-roads.geojson"),read("public/data/sangdo1-analysis-view/roadwidth.geojson"));
write('public/data/pri/sangdo1_crosswalk_rubric_factor.json',result.cross);
write('public/data/pri/sangdo1_shared_road_rubric_factor.json',result.shared);
write('public/data/pri/sangdo1_shared_road_candidates_20261125.json',result.candidates);
console.log(JSON.stringify(result.counts,null,2));
