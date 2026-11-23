/** Conservative, geometry-based PRI exposure for real pedestrian routes.
 * These are preliminary six-factor observed-only research scores, NOT verified
 * sidewalk safety, accident probability, or accessibility. Unknown is never 0.
 */
import {currentSixFactorCoverage,currentSixFactorScore} from './pri-data.mjs';

const X=88500,Y=111200,CELL=45,MAX_JOIN_M=6,AMBIGUITY_M=1.5;
const project=point=>[point[0]*X,point[1]*Y];
const cellKey=(x,y)=>Math.floor(x/CELL)+':'+Math.floor(y/CELL);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clamp=(v)=>Math.max(0,Math.min(1,v));
const round=(n)=>Math.round(n*10)/10;
function pointLineDistance(p,coords){
 let best=Infinity;
 for(let i=1;i<coords.length;i++){
  const a=coords[i-1],b=coords[i],vx=b[0]-a[0],vy=b[1]-a[1],d=vx*vx+vy*vy;
  const t=d>0?clamp(((p[0]-a[0])*vx+(p[1]-a[1])*vy)/d):0;
  best=Math.min(best,Math.hypot(p[0]-a[0]-t*vx,p[1]-a[1]-t*vy));
 }
 return best;
}
export function indexPriSegments(bundle){
 if(!bundle||!Array.isArray(bundle.segments))throw new Error('PRI 원본 자료가 없습니다.');
 const grid=new Map(),segments=[];
 for(const s of bundle.segments){
  const score=currentSixFactorScore(s),factors=currentSixFactorCoverage(s);
  if(score===null||factors<2||s.geometry?.type!=='LineString'||!Array.isArray(s.geometry.coordinates))continue;
  const raw=s.geometry.coordinates;
  if(raw.length<2||raw.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))))continue;
  const coords=raw.map(project),a=coords[0],b=coords.at(-1),d=distance(a,b);
  if(d<3)continue;
  const entry={coords,ux:(b[0]-a[0])/d,uy:(b[1]-a[1])/d,risk:100-score,factors};
  const k=segments.push(entry)-1;
  const xs=coords.map(p=>p[0]),ys=coords.map(p=>p[1]);
  const x0=Math.floor((Math.min(...xs)-MAX_JOIN_M)/CELL),x1=Math.floor((Math.max(...xs)+MAX_JOIN_M)/CELL);
  const y0=Math.floor((Math.min(...ys)-MAX_JOIN_M)/CELL),y1=Math.floor((Math.max(...ys)+MAX_JOIN_M)/CELL);
  if((x1-x0+1)*(y1-y0+1)>100)continue;
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
   const key=x+':'+y,rows=grid.get(key)||[];rows.push(k);grid.set(key,rows);
  }
 }
 return {grid,segments,segmentCount:segments.length};
}
function matchedRisk(point,dx,dy,index){
 const candidate=index.grid.get(cellKey(point[0],point[1]))||[];
 const choices=[];
 for(const key of candidate){
  const s=index.segments[key];
  if(!s||Math.abs(s.ux*dx+s.uy*dy)<.83)continue;
  const d=pointLineDistance(point,s.coords);
  if(d<=MAX_JOIN_M)choices.push({d,risk:s.risk,factors:s.factors});
 }
 choices.sort((a,b)=>a.d-b.d);
 if(!choices.length||(choices.length>1&&choices[1].d-choices[0].d<AMBIGUITY_M))return null;
 return choices[0];
}
export function assessPriRoute(coords,index){
 if(!Array.isArray(coords)||coords.length<2||!index?.grid)return null;
 let total=0,known=0,riskSum=0,factorSum=0;
 for(let i=1;i<coords.length;i++){
  const p=coords[i-1],q=coords[i];
  if(!Array.isArray(p)||!Array.isArray(q)||p.length!==2||q.length!==2||![...p,...q].every(Number.isFinite))return null;
  const a=project(p),b=project(q),length=distance(a,b);
  if(!(length>0.01))continue;
  const dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length,n=Math.ceil(length/10),slice=length/n;
  if(n>6000)return null; // Guard degenerate or corrupted geometry.
  for(let k=0;k<n;k++){
   const t=(k+.5)/n,point=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
   const hit=matchedRisk(point,dx,dy,index);
   total+=slice;
   if(hit){known+=slice;riskSum+=hit.risk*slice;factorSum+=hit.factors*slice;}
  }
 }
 if(!total)return null;
 return {meanRisk:known?round(riskSum/known):null,coverage:round(known/total*100)/100,
  assessedMeters:round(known),totalMeters:round(total),
  meanObservedFactors:known?round(factorSum/known):null,ofFactors:6,
  preliminary:true,source:'sangdo1-observed-PRI'};
}
export function recommendPriVariant(standard,gentle){
 const a=standard?.priEvidence,b=gentle?.priEvidence;
 if(!a||!b||!standard?.coords?.length||!gentle?.coords?.length)
  return {preferred:null,reason:'두 실제 도보 경로의 PRI 비교자료가 없습니다.'};
 if(JSON.stringify(standard.coords)===JSON.stringify(gentle.coords))
  return {preferred:null,reason:'두 경로가 같아 PRI 기준으로 구분할 수 없습니다.'};
 if([a,b].some(v=>v.meanRisk===null||v.coverage<.6||v.meanObservedFactors<2)||
   Math.abs(a.coverage-b.coverage)>.15)
  return {preferred:null,reason:'PRI 평가 구간이 부족하거나 두 경로의 자료 충족도가 달라 우열을 판단할 수 없습니다.'};
 const low=a.meanRisk<=b.meanRisk?{key:'standard',s:a,r:standard}:{key:'gentle',s:b,r:gentle};
 const high=a.meanRisk>b.meanRisk?{key:'standard',s:a,r:standard}:{key:'gentle',s:b,r:gentle};
 if(high.s.meanRisk-low.s.meanRisk<5)
  return {preferred:null,reason:'두 경로의 PRI 위험점수 차이가 작아 우열을 판단하지 않습니다.'};
 if(low.r.kilometers>high.r.kilometers*1.25)
  return {preferred:null,reason:'PRI가 낮은 후보가 25% 넘게 우회하므로 자동 추천하지 않습니다.'};
 return {preferred:low.key,reason:'PRI 부분평가에서 비교 가능 구간의 위험점수가 더 낮은 후보입니다. 미평가 구간의 안전성은 알 수 없습니다.'};
}
