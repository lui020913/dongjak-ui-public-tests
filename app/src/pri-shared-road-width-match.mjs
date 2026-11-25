import {sharedRoadWidthRisk100} from './pri-new-factor-rules.mjs';
// Match full common-network road samples to a single clipped width polygon; do not infer sidewalk separation.
export function matchSharedRoadWidths(base,widthGeo){
 const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 const sx=111195*Math.cos(37.5*Math.PI/180),sy=111195,xy=([lon,lat])=>[(lon-126.95)*sx,(lat-37.5)*sy];
 const band=w=>sharedRoadWidthRisk100('verified-mixed',w);
 function insideRing(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 const polygons=[];
 for(const f of widthGeo.features){const p=f.properties||{},g=f.geometry;for(const poly of g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[]){const rings=poly.map(r=>r.map(xy));if(!rings[0]?.length)continue;const xs=rings[0].map(p=>p[0]),ys=rings[0].map(p=>p[1]);polygons.push({p,rings,bbox:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]});}}
 const contains=(p,q)=>p[0]>=q.bbox[0]&&p[0]<=q.bbox[2]&&p[1]>=q.bbox[1]&&p[1]<=q.bbox[3]&&insideRing(p,q.rings[0])&&!q.rings.slice(1).some(r=>insideRing(p,r));
 const eligible=new Set(['primary','primary_link','secondary','tertiary','residential','service']);
 const rows=[],stats={eligible:0,matched:0,stable:0,uncertain:0,unmatched:0,conditional:{100:0,70:0,30:0}};
 for(const s of base.segments){if(!eligible.has(s.hw))continue;stats.eligible++;const points=s.pts.map(([lat,lon])=>xy([lon,lat])),samples=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2));for(let j=0;j<=n;j++)samples.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}
  if(!samples.length){stats.unmatched++;continue;}
  const hits=polygons.filter(q=>samples.every(p=>contains(p,q)));
  const ids=new Set(hits.map(h=>h.p.RW_SN));
  if(ids.size!==1){stats.unmatched++;continue;}
  const p=hits[0].p;stats.matched++;
  const stable=[p.width_est_m,p.width_p10_m,p.width_p90_m].every(valid)&&p.width_p10_m<=p.width_est_m&&p.width_est_m<=p.width_p90_m&&band(p.width_est_m)===band(p.width_p10_m)&&band(p.width_est_m)===band(p.width_p90_m)&&['상대적 양호(추정치)','보통(추정치)'].includes(p.reliability);
  const conditional=stable?band(p.width_est_m):null;if(stable){stats.stable++;stats.conditional[conditional]++;}else stats.uncertain++;
  rows.push({id:s.id,roadWidthId:p.RW_SN,widthM:p.width_est_m??null,p10M:p.width_p10_m??null,p90M:p.width_p90_m??null,reliability:p.reliability??'미확인',conditionalMixedRisk:conditional});
 }
 return {rows,stats};
}
export function enrichSharedCandidate(candidate,widthRow){
 const {id,evidence}=candidate;
 const original=evidence.note;
 const widthNote=widthRow?` · 실폭도로 RW_SN ${widthRow.roadWidthId} · 대표 추정폭 ${widthRow.widthM??'미확인'}m · P10~P90 ${widthRow.p10M??'미확인'}~${widthRow.p90M??'미확인'}m · ${widthRow.reliability} · ${widthRow.conditionalMixedRisk===null?'폭 기준 불확실: 조건부 점수 미산정':'혼용 확인 시에만 '+widthRow.conditionalMixedRisk+'점(조건부 추정)'}`:' · 도로폭 공간 정합 불확실: 미산정';
 return {id,score:null,width:widthRow??null,evidence:{note:original+widthNote}};
}
