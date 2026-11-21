// PRI normalized safety scores: 100 = safer, 0 = more vulnerable. Original source risk scores remain unchanged in source files.
// Null denotes genuinely unobserved data; a documented modeled baseline is an explicit score rather than null.
export const PALETTE=Object.freeze([[0,'#d74648'],[25,'#ed9045'],[50,'#efd05a'],[75,'#9bc777'],[100,'#279b80']]);
export const TEAM_FACTORS=Object.freeze([["accidents","교통사고 이력 및 위험 지수"],["crossing","신호등·횡단보도 단절 구간"],["sharedRoad","보차혼용 및 보행 공간 위험"],["speed","통행제한속도 및 감속 구간"],["protectionGap","제도적 사각지대"],["lighting","가로등·CCTV 야간 안전 취약점"]].map(([id,label])=>Object.freeze({id,label})));
const fail=m=>{throw Error(m)};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const number=x=>typeof x==='number'&&Number.isFinite(x);
const score=x=>x===null||number(x)&&x>=0&&x<=100;
export const riskToSafety=x=>number(x)&&x>=0&&x<=100?100-x:null;
const key=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,120}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
const coord=p=>Array.isArray(p)&&p.length===2&&number(p[0])&&number(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=33&&p[1]<=39;
const meters=(a,b)=>Math.hypot((a[0]-b[0])*111195*Math.cos((a[1]+b[1])*Math.PI/360),(a[1]-b[1])*111195);
const text=(x,max=2000)=>typeof x==='string'?x.slice(0,max):'';
const cleanFactor=f=>{
 if(!obj(f)||!key(f.id)||!text(f.label,100)||!text(f.source)||!text(f.method))fail('지표 ID·이름·출처·산정 방법이 필요합니다.');
 return {id:f.id,label:text(f.label,100),source:text(f.source),method:text(f.method),date:text(f.date,40),estimated:f.estimated!==false};
};
export function validateBundle(raw){
 if(!obj(raw)||raw.schemaVersion!==1||!key(raw.networkVersion)||!Array.isArray(raw.factors)||!raw.factors.length||raw.factors.length>50||!Array.isArray(raw.segments)||!raw.segments.length||raw.segments.length>100000)fail('PRI 데이터 형식 또는 도로망 버전이 올바르지 않습니다.');
 const factors=raw.factors.map(cleanFactor),ids=new Set(factors.map(f=>f.id));if(ids.size!==factors.length)fail('중복 지표 ID');
 const seen=new Set();
 const segments=raw.segments.map(s=>{
  if(!obj(s)||!key(s.id)||seen.has(s.id)||!obj(s.geometry)||!number(s.lengthM)||s.lengthM<0||!obj(s.scores))fail('구간 ID·길이·점수 형식 오류');
  seen.add(s.id);
  const g=s.geometry,coords=g.type==='Point'?[g.coordinates]:g.coordinates;
  if(!['Point','LineString'].includes(g.type)||!Array.isArray(coords)||!coords.length||coords.length>10000||!coords.every(coord)||g.type==='LineString'&&(s.lengthM<=0||coords.length<2||!coords.some(p=>meters(p,coords[0])>.01)))fail('구간 좌표 오류: '+s.id);
  const scores=Object.create(null);for(const id of ids)scores[id]=null;for(const [k,v] of Object.entries(s.scores)){if(!ids.has(k)||!score(v))fail('등록되지 않은 지표 또는 0~100 범위 오류: '+s.id);scores[k]=v;}
  const evidence=Object.create(null);if(obj(s.evidence))for(const [k,v] of Object.entries(s.evidence)){if(ids.has(k)&&obj(v))evidence[k]={darkM:number(v.darkM)&&v.darkM>=0?v.darkM:null,sourceGrade:Number.isInteger(v.sourceGrade)&&v.sourceGrade>=1&&v.sourceGrade<=5?v.sourceGrade:null,note:text(v.note)};}
  return {id:s.id,wayId:key(s.wayId)?s.wayId:null,sequence:Number.isInteger(s.sequence)&&s.sequence>=0?s.sequence:null,name:text(s.name,200),roadType:text(s.roadType,100),lengthM:s.lengthM,geometry:{type:g.type,coordinates:g.type==='Point'?coords[0].slice():coords.map(p=>p.slice())},scores,evidence};
 });
 const c=raw.config;
 let config={status:'draft',weights:null,version:null};
 if(c?.status==='approved'){
  if(!key(c.version)||!obj(c.weights))fail('확정 가중치 버전을 입력하세요.');
  const entries=Object.entries(c.weights);
  if(entries.length<2||entries.some(([k,v])=>!ids.has(k)||!number(v)||v<=0)||Math.abs(entries.reduce((a,[,v])=>a+v,0)-1)>1e-8)fail('확정 가중치는 두 개 이상 등록된 지표를 포함하고 합이 1이어야 합니다.');
  config={status:'approved',version:c.version,weights:Object.fromEntries(entries)};
 }
 return {schemaVersion:1,networkVersion:raw.networkVersion,area:text(raw.area,100),factors,segments,config};
}
export function adaptLighting(raw){
 if(!obj(raw?.meta)||!Array.isArray(raw.segments)||raw.meta.factor!=='가로등·보안등 암부 거리'||raw.meta.segment_m!==25||raw.meta.full_score_dark_m!==50)fail('지원하지 않는 조명 자료 형식입니다.');
 // Include geometry in the version, so a differently segmented survey cannot silently join.
 let h=2166136261;for(const c of JSON.stringify(raw.segments.map(s=>[s.id,s.pts])))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 const date=text(raw.meta['기준일'],30).replace(/[^0-9-]/g,'')||'unknown';
 return validateBundle({schemaVersion:1,networkVersion:'sangdo1-lighting-'+date+'-'+h.toString(16),area:'상도1동 (조명 조사 범위)',factors:TEAM_FACTORS.map(f=>f.id==='lighting'?{...f,source:raw.meta['자료'],date,estimated:true,method:'조명 자료만 반영(CCTV 미제출). 원본 위험점수=평균 암부 거리 / 50m × 100 (최대 100), PRI 안전점수=100-원본 위험점수. 실제 측정 조도 아님. '+text(raw.meta['가정'])}:{...f,source:'미제출',method:'미확정',estimated:true}),config:{status:'draft'},segments:raw.segments.map(s=>{
  if(!Array.isArray(s.pts)||!s.pts.length||!s.pts.every(p=>Array.isArray(p)&&p.length===2))fail('조명 구간 좌표 오류');
  if(!number(s.dark)||s.dark<0||!number(s.score)||Math.abs(s.score-Math.min(100,s.dark*2))>1)fail('조명 원본 점수 불일치: '+s.id);
  const coords=s.pts.map(([lat,lon])=>[lon,lat]),linear=s.len>0&&coords.length>1&&coords.some(p=>meters(p,coords[0])>.01);
  const match=/^(\d+)_(\d+)$/.exec(s.id);
  return {id:s.id,wayId:match?.[1],sequence:match?Number(match[2]):null,name:s.name,roadType:s.hw,lengthM:s.len,geometry:linear?{type:'LineString',coordinates:coords}:{type:'Point',coordinates:coords[0]},scores:{lighting:riskToSafety(s.score)},evidence:{lighting:{darkM:s.dark,sourceGrade:s.grade,note:'원본 조명 위험점수 '+s.score+'점 → PRI 안전점수 '+riskToSafety(s.score)+'점. '+(linear?'원본 등급 보존':'선형 좌표 부족 또는 길이 0m: 점으로만 표시')}}};
 })});
}
export function mergeFactor(bundle,patch){
 if(!bundle||patch?.schemaVersion!==1||patch.type!=='pri-factor-scores'||patch.networkVersion!==bundle.networkVersion||!Array.isArray(patch.scores))fail('동일한 도로망 버전의 지표 파일만 추가할 수 있습니다.');
 const factor=cleanFactor(patch.factor),known=new Set(bundle.segments.map(s=>s.id)),rows=new Map();
 const sourceDirection=patch.factor?.scoreDirection||'safety';
 if(!['safety','risk'].includes(sourceDirection))fail('지표 점수 방향이 올바르지 않습니다.');
 // Documented spatial non-selection defaults are explicit modeled scores, not evidence of zero incidents.
 const hasBaseline=Object.prototype.hasOwnProperty.call(patch,'unmatchedScore');
 if(hasBaseline&&(!number(patch.unmatchedScore)||patch.unmatchedScore<0||patch.unmatchedScore>100||!text(patch.unmatchedReason,200).trim()))fail('미선정 기본점수에는 0~100점과 산정 근거가 필요합니다.');
 for(const row of patch.scores){if(!obj(row)||!known.has(row.id)||rows.has(row.id)||!score(row.score))fail('미등록·중복 구간 또는 점수 오류');rows.set(row.id,row);}
 // Raw observations remain in the original patch; the shared PRI bundle uses safety-direction scores.
 const segments=bundle.segments.map(s=>{
  const row=rows.get(s.id),observed=row?sourceDirection==='risk'?riskToSafety(row.score):row.score:hasBaseline?patch.unmatchedScore:null;
  const scores={...s.scores,[factor.id]:observed},evidence={...s.evidence};delete evidence[factor.id];
  if(row&&row.score!==null){const note=text(row.evidence?.note);evidence[factor.id]={...row.evidence,note:(sourceDirection==='risk'?'원본 위험점수 '+row.score+'점 → PRI 안전점수 '+observed+'점. ':'')+note};}
  else if(row&&row.score===null)evidence[factor.id]={note:'이 도로구간은 명시적으로 미평가 처리되었습니다.'};
  else if(hasBaseline)evidence[factor.id]={note:'임시 기본점수 '+observed+'점 · '+text(patch.unmatchedReason)};
  return {...s,scores,evidence};
 });
 return validateBundle({...bundle,factors:[...bundle.factors.filter(f=>f.id!==factor.id),factor],segments,config:{status:'draft'}});
}
export function parseImport(raw,current=null){
 if(raw?.type==='pri-factor-scores')return mergeFactor(current,raw);
 if(raw?.meta?.factor==='가로등·보안등 암부 거리')return adaptLighting(raw);
 return validateBundle(raw);
}
export function segmentScore(bundle,s,mode){
 // Two of six survey factors: display an explicit preliminary safety mean when both scores are defined (including documented modeled defaults).
 if(mode==='pri12'){const lighting=s.scores.lighting,accidents=s.scores.accidents;return number(lighting)&&number(accidents)?(lighting+accidents)/2:null;}
 if(mode!=='pri')return number(s.scores[mode])?s.scores[mode]:null;
 if(bundle.config.status!=='approved')return null;
 let total=0;for(const [k,w] of Object.entries(bundle.config.weights)){const v=s.scores[k];if(!number(v))return null;total+=v*w;}return total;
}
// Render interpolation only within observed linework, never create connectors
// across a missing interval or conflate crossing/parallel road ways.
export function displayFeatures(bundle,mode){
 const lookup=new Map(bundle.segments.filter(s=>s.wayId!==null&&s.sequence!==null).map(s=>[s.wayId+'_'+s.sequence,s]));
 const features=[];
 const make=(s,g,v,display)=>({type:'Feature',properties:{segmentId:s.id,name:s.name||'이름 없는 도로',score:v,displayScore:display??0,evaluated:v!==null,lengthM:s.lengthM},geometry:g});
 for(const s of bundle.segments){
  const v=segmentScore(bundle,s,mode);
  if(s.geometry.type==='Point'){features.push(make(s,s.geometry,v,v));continue;}
  const cs=s.geometry.coordinates;
  const adjacent=(dir)=>{
   if(v===null||!s.wayId||s.sequence===null)return v;
   const n=lookup.get(s.wayId+'_'+(s.sequence+dir));
   if(!n||n.geometry.type!=='LineString')return v;
   const p=dir<0?cs[0]:cs.at(-1),q=dir<0?n.geometry.coordinates.at(-1):n.geometry.coordinates[0],nv=segmentScore(bundle,n,mode);
   return nv!==null&&meters(p,q)<=4?(v+nv)/2:v;
  };
  const start=adjacent(-1),end=adjacent(1);
  if(v===null||start===v&&end===v){features.push(make(s,s.geometry,v,v));continue;}
  const ds=[0];for(let j=1;j<cs.length;j++)ds.push(ds.at(-1)+meters(cs[j-1],cs[j]));
  const length=ds.at(-1);if(length<=.01){features.push(make(s,s.geometry,v,v));continue;}
  const at=d=>{let j=1;while(j<ds.length-1&&ds[j]<d)j++;const t=ds[j]===ds[j-1]?0:(d-ds[j-1])/(ds[j]-ds[j-1]);return cs[j-1].map((x,k)=>x+(cs[j][k]-x)*t);};
  const cuts=[...new Set([0,.08,.16,.25,.75,.84,.92,1])];
  for(let j=1;j<cuts.length;j++){
   const a=cuts[j-1]*length,b=cuts[j]*length,t=(cuts[j-1]+cuts[j])/2;
   const col=t<.25?start+(v-start)*t/.25:t>.75?v+(end-v)*(t-.75)/.25:v;
   features.push(make(s,{type:'LineString',coordinates:[at(a),...cs.filter((_,k)=>ds[k]>a&&ds[k]<b),at(b)]},v,col));
  }
 }
 return {type:'FeatureCollection',features};
}
export function summarize(bundle,mode){
 let totalM=0,observedM=0,lineM=0,pointCount=0,geometryM=0;
 for(const s of bundle.segments){totalM+=s.lengthM;if(s.geometry.type==='Point')pointCount++;else{lineM+=s.lengthM;const cs=s.geometry.coordinates;for(let i=1;i<cs.length;i++)geometryM+=meters(cs[i-1],cs[i]);}if(segmentScore(bundle,s,mode)!==null)observedM+=s.lengthM;}
 return {totalM,observedM,lineM,pointCount,geometryM};
}
export function routeExposure(bundle,matchedSegments){
 // Future router supplies its own verified edge-to-segment coverage. No spatial guessing.
 if(bundle?.config?.status!=='approved'||!Array.isArray(matchedSegments)||!matchedSegments.length)return null;
 const byId=new Map(bundle.segments.map(s=>[s.id,s]));let total=0,length=0;
 for(const m of matchedSegments){const s=byId.get(m.id),v=s?segmentScore(bundle,s,'pri'):null;if(v===null||!number(m.lengthM)||m.lengthM<=0||m.lengthM>s.lengthM+.01)return null;total+=v*m.lengthM;length+=m.lengthM;}
 return {score:total/length,lengthM:length,version:bundle.config.version};
}
