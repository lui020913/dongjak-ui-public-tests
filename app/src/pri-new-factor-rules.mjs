/** Source-defined risk rubrics. A criterion is NOT a measured road score.
 * Return null for missing observations; never treat unknown as safe (0).
 * Sources: user-supplied Sangdo1 crosswalk PRI PDF, bocha road PDF (2026-11-23).
 */
export const CROSSWALK_PARTS=Object.freeze([
  {id:'discontinuity',label:'보행 단절성·횡단보도 접근성',max:25},
  {id:'terrain',label:'도로·지형 환경과 시거',max:25},
  {id:'vulnerable',label:'보행약자 보호 필요도',max:25},
  {id:'nightAccident',label:'야간 및 최근 5년 사고 이력',max:25}
]);
export const SHARED_ROAD_PARTS=Object.freeze([
  {id:'separation',label:'보도·차도의 물리적 분리',max:4},
  {id:'refuge',label:'보행자 회피·여유공간',max:3},
  {id:'sight',label:'시야 차단 요인',max:2},
  {id:'speedCalming',label:'차량 속도저감 시설',max:1}
]);
const validNumber=n=>typeof n==='number'&&Number.isFinite(n);
export function scaleTenPointRisk(value){
  return validNumber(value)&&value>=0&&value<=10?Math.round(value*1000)/100:null;
}
export function crosswalkRisk100(parts){
  if(!parts||typeof parts!=='object')return null;
  let sum=0;
  for(const {id} of CROSSWALK_PARTS){
    const value=parts[id];
    const score=value==='high'||value==='고위험'?25:value==='caution'||value==='주의'?15:value==='safe'||value==='안전'?5:value;
    if(![5,15,25].includes(score))return null;
    sum+=score;
  }
  return sum;
}
export function sharedRoadRisk100(parts){
  if(!parts||typeof parts!=='object')return null;
  let sum=0;
  for(const {id,max} of SHARED_ROAD_PARTS){
    // The submitted PDF defines only 0 and maximum for each criterion.
    // Intermediate point rules were not supplied; do not invent them.
    if(parts[id]!==0&&parts[id]!==max)return null;
    sum+=parts[id];
  }
  return scaleTenPointRisk(sum);
}
export function sharedRoadBinaryRisk100(type){
  return type==='verified-mixed'?100:type==='verified-separated'?0:null;
}
export function priRiskBand(value){
  if(!validNumber(value)||value<0||value>100)return 'unassessed';
  return value>=70?'high':value>=40?'caution':'low';
}

/** Current team rubric: width affects only confirmed mixed roads. */
export function sharedRoadWidthRisk100(type,width){
 if(type==='verified-separated')return 0;
 if(type!=='verified-mixed'||typeof width!=='number'||!Number.isFinite(width)||width<=0)return null;
 return width<4?100:width<6?70:30;
}
