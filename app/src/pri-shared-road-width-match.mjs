import {sharedRoadWidthRisk100} from './pri-new-factor-rules.mjs';
// Length-weighted midpoint samples <=2m, dominant polygon >=70%, runner-up margin >=20pp. No separation inference.
export function matchSharedRoadWidths(base,widthGeo){
 const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 const sx=111195*Math.cos(37.5*Math.PI/180),sy=111195,xy=([lon,lat])=>[(lon-126.95)*sx,(lat-37.5)*sy];
 const band=w=>sharedRoadWidthRisk100('verified-mixed',w);
 function insideRing(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 const polygons=[];
 for(const f of widthGeo.features){const p=f.properties||{},g=f.geometry;for(const poly of g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[]){const rings=poly.map(r=>r.map(xy));if(!rings[0]?.length)continue;const xs=rings[0].map(p=>p[0]),ys=rings[0].map(p=>p[1]);polygons.push({p,rings,bbox:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]});}}
 const contains=(p,q)=>p[0]>=q.bbox[0]&&p[0]<=q.bbox[2]&&p[1]>=q.bbox[1]&&p[1]<=q.bbox[3]&&insideRing(p,q.rings[0])&&!q.rings.slice(1).some(r=>insideRing(p,r));
 const eligible=new Set(['primary','primary_link','secondary','tertiary','residential','service']);
 const rows=[],stats={eligible:0,matched:0,stable:0,uncertain:0,unmatched:0,conditional:{100:0,70:0,30:0},conditionalCount:0};
 for(const s of base.segments){
  if(!eligible.has(s.hw))continue;stats.eligible++;
  const points=s.pts.map(([lat,lon])=>xy([lon,lat])),samples=[];
  let length=0;
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l<=0)continue;const n=Math.ceil(l/2);length+=l;for(let j=0;j<n;j++){const t=(j+.5)/n;samples.push({p:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],w:l/n});}}
  if(!length){stats.unmatched++;continue;}
  const matches=new Map();
  for(const sample of samples){const seen=new Map();for(const poly of polygons){if(contains(sample.p,poly))seen.set(poly.p.RW_SN,poly.p);}for(const [id,p] of seen){const row=matches.get(id)||{p,length:0};row.length+=sample.w;matches.set(id,row);}}
  const ranked=[...matches.values()].sort((a,b)=>b.length-a.length);const best=ranked[0];
  if(!best||best.length/length<.7||(best.length-(ranked[1]?.length??0))/length<.2){stats.unmatched++;continue;}
  const p=best.p;stats.matched++;
  const stable=[p.width_est_m,p.width_p10_m,p.width_p90_m].every(valid)&&p.width_p10_m<=p.width_est_m&&p.width_est_m<=p.width_p90_m&&band(p.width_est_m)===band(p.width_p10_m)&&band(p.width_est_m)===band(p.width_p90_m)&&['상대적 양호(추정치)','보통(추정치)'].includes(p.reliability);
  const conditional=valid(p.width_est_m)&&!String(p.reliability).match(/낮음|추정 불가/)?band(p.width_est_m):null;
  if(stable)stats.stable++;else stats.uncertain++;
  if(conditional!==null){stats.conditionalCount++;stats.conditional[conditional]++;}
  rows.push({id:s.id,roadWidthId:p.RW_SN,widthM:p.width_est_m??null,p10M:p.width_p10_m??null,p90M:p.width_p90_m??null,reliability:p.reliability??'미확인',overlapPct:+(100*best.length/length).toFixed(1),runnerUpPct:+(100*(ranked[1]?.length??0)/length).toFixed(1),stableWidthBand:stable,conditionalMixedRisk:conditional});
 }
 return {rows,stats};
}
export function enrichSharedCandidate(candidate,widthRow){
 const {id,evidence}=candidate;
 const original=evidence.note.split(' · 실폭도로 RW_SN ')[0].split(' · 도로폭 공간 정합 불확실')[0].split(' · 직각 단면 추정')[0];
 const widthNote=widthRow?.method==='cross-section'?` · 직각 단면 추정 · 실폭도로 RW_SN ${widthRow.roadWidthIds.join(', ')} · 유효 단면 ${widthRow.validSampleCount}/${widthRow.sampleCount} (${widthRow.coveragePct}%) · 중앙값 ${widthRow.widthM}m · P10~P90 ${widthRow.p10M}~${widthRow.p90M}m · 혼용 확인 시에만 ${widthRow.conditionalMixedRisk}점(조건부 추정) · 현장 확인 필요`:widthRow?` · 실폭도로 RW_SN ${widthRow.roadWidthId} · 도로 중첩률 ${widthRow.overlapPct}% · 대표 추정폭 ${widthRow.widthM??'미확인'}m · P10~P90 ${widthRow.p10M??'미확인'}~${widthRow.p90M??'미확인'}m · ${widthRow.reliability} · ${widthRow.conditionalMixedRisk===null?'폭 기준 불확실: 조건부 점수 미산정':'혼용 확인 시에만 '+widthRow.conditionalMixedRisk+'점(대표폭 기준 조건부 추정)'+(widthRow.stableWidthBand?'':' · 폭 변동/신뢰도 현장 확인 필요')}`:' · 도로폭 공간 정합 불확실: 미산정';
 return {id,score:null,width:widthRow??null,evidence:{note:original+widthNote}};
}
