/**
 * Conservative partial-coverage interpretation of the six-factor Sangdo1 PRI.
 * 100 = high risk. The router still owns route geometries; this module NEVER
 * invents links, silently scores unmapped streets as safe, or claims a
 * statistically representative network-wide safety ranking.
 */
import {parseImport,currentSixFactorScore,currentSixFactorCoverage} from './pri-data.mjs';
import {spatialMatchSpeedFactor} from './pri-speed-spatial-match.mjs';
import {SPEED_RISK_SOURCE} from './pri-speed-risk.mjs';

const XY_X=111320*Math.cos(37.5*Math.PI/180),XY_Y=111320;
const XY=p=>[p[0]*XY_X,p[1]*XY_Y];
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const cell=(x,y)=>Math.floor(x/50)+','+Math.floor(y/50);
const isFilePath=p=>typeof p==='string'&&/^\/data\/pri\/[a-zA-Z0-9_.-]+\.json$/.test(p);

export async function loadCompositePriForRoutes(fetchImpl=fetch){
  const get=async path=>{
    const r=await fetchImpl(path,{cache:'no-cache'});
    if(!r.ok)throw Error('PRI 자료 HTTP '+r.status);
    return r.json();
  };
  const manifest=await get('/data/pri/manifest.json');
  if(!isFilePath(manifest.bundle)||!Array.isArray(manifest.patches)||manifest.patches.some(p=>!isFilePath(p)))
    throw Error('잘못된 PRI manifest');
  let bundle=parseImport(await get(manifest.bundle));
  for(const patch of manifest.patches)bundle=parseImport(await get(patch),bundle);
  // Speed is a separate road network. Apply only the same conservative
  // spatial matching rule as the visible PRI layer; do not infer unmatched 0s.
  try {
    const speed=await get(SPEED_RISK_SOURCE);
    bundle=parseImport(spatialMatchSpeedFactor(bundle,speed).patch,bundle);
  } catch(error) {
    // The visible PRI layer also leaves speed scores NULL when this join fails.
    console.warn('[PRI route] Speed factor left unobserved:',error);
  }
  return bundle;
}

function buildObservedLines(bundle){
  const lines=[],grid=new Map();
  for(const segment of bundle?.segments||[]){
    const safety=currentSixFactorScore(segment);
    const coverage=currentSixFactorCoverage(segment);
    if(safety===null||coverage<2||segment.geometry?.type!=='LineString')continue;
    const cs=segment.geometry.coordinates;
    if(!Array.isArray(cs)||cs.length<2)continue;
    const risk=100-safety;
    for(let j=1;j<cs.length;j++){
      const a=XY(cs[j-1]),b=XY(cs[j]),length=dist(a,b);
      if(!Number.isFinite(length)||length<0.2)continue;
      const line={a,b,length,risk,coverage,id:segment.id};
      const x0=Math.floor((Math.min(a[0],b[0])-5)/50),x1=Math.floor((Math.max(a[0],b[0])+5)/50);
      const y0=Math.floor((Math.min(a[1],b[1])-5)/50),y1=Math.floor((Math.max(a[1],b[1])+5)/50);
      for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
        const k=x+','+y;if(!grid.has(k))grid.set(k,[]);
        grid.get(k).push(line);
      }
      lines.push(line);
    }
  }
  return {lines,grid};
}
function matchedRisk(sample,heading,grid){
  const near=[];
  for(const line of grid.get(cell(sample[0],sample[1]))||[]){
    const vx=line.b[0]-line.a[0],vy=line.b[1]-line.a[1];
    if(Math.abs((vx*heading[0]+vy*heading[1])/line.length)<0.90)continue;
    const u=Math.max(0,Math.min(1,((sample[0]-line.a[0])*vx+(sample[1]-line.a[1])*vy)/(line.length*line.length)));
    const gap=Math.hypot(sample[0]-line.a[0]-u*vx,sample[1]-line.a[1]-u*vy);
    if(gap<=5)near.push({...line,gap});
  }
  if(!near.length)return null;
  near.sort((a,b)=>a.gap-b.gap||a.id.localeCompare(b.id));
  const best=near[0];
  // Ambiguous neighboring/parallel survey roads with inconsistent risk
  // must be unassessed rather than assigned to the wrong carriageway.
  if(near.some(n=>n.id!==best.id&&n.gap<=best.gap+1.5&&Math.abs(n.risk-best.risk)>10))return null;
  return best;
}

export function estimateRoutePriExposure(route,observedLines){
  const coords=route?.coords;
  if(!Array.isArray(coords)||coords.length<2)return null;
  let total=0,covered=0,riskDistance=0,indicatorDistance=0;
  for(let i=1;i<coords.length;i++){
    const p=coords[i-1],q=coords[i];
    if(!Array.isArray(p)||!Array.isArray(q)||p.length!==2||q.length!==2||![...p,...q].every(Number.isFinite))return null;
    const a=XY(p),b=XY(q),length=dist(a,b);
    if(length<0.01)continue;
    total+=length;
    const heading=[(b[0]-a[0])/length,(b[1]-a[1])/length];
    const count=Math.min(100,Math.max(1,Math.ceil(length/10)));
    for(let n=0;n<count;n++){
      const t=(n+0.5)/count,point=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      const match=matchedRisk(point,heading,observedLines.grid);
      if(!match)continue;
      const weight=length/count;
      covered+=weight;riskDistance+=weight*match.risk;indicatorDistance+=weight*match.coverage;
    }
  }
  if(total<1)return null;
  const coverage=covered/total;
  return {
    coverage:Math.max(0,Math.min(1,coverage)),
    coveredMeters:Math.round(covered),
    totalMeters:Math.round(total),
    risk:covered>=20?Math.round(riskDistance/covered*10)/10:null,
    observedFactorsMean:covered>=20?Math.round(indicatorDistance/covered*10)/10:null
  };
}
export function compareCompositePriRoutes(routes,bundle){
  const lines=buildObservedLines(bundle);
  const standard=estimateRoutePriExposure(routes?.standard,lines);
  const gentle=estimateRoutePriExposure(routes?.gentle,lines);
  const result={standard,gentle,recommendation:null,reason:'insufficient',researchOnly:true};
  if(!standard||!gentle||standard.risk===null||gentle.risk===null)return result;
  // Coverage restrictions apply to the entire route, not only its mapped
  // subspan. Low coverage must not be misrepresented as "safer."
  if(standard.coverage<0.65||gentle.coverage<0.65||
     Math.abs(standard.coverage-gentle.coverage)>0.12)return result;
  if(JSON.stringify(routes.standard.coords)===JSON.stringify(routes.gentle.coords)){
    result.reason='same-route';return result;
  }
  if(Math.abs(standard.risk-gentle.risk)<5){result.reason='similar-risk';return result;}
  // A lower preliminary risk estimate must not silently recommend an
  // extreme detour. Users can still select the alternative manually.
  const lower=standard.risk<gentle.risk?standard:gentle;
  const other=standard.risk<gentle.risk?gentle:standard;
  if(lower.totalMeters>other.totalMeters*1.25){
    result.reason='excessive-detour';return result;
  }
  result.recommendation=standard.risk<gentle.risk?'standard':'gentle';
  result.reason='observed-comparison';
  return result;
}


/** Geometry for the *actual* calculated walking route, not a synthesized safer path.
 * Uses the same <=5m proximity, heading and ambiguous-road rejection as the
 * six-factor route scoring function. Missing coverage is always gray/dashed.
 */
export function routePriColorGeometry(route,observedLines){
  const coords=route?.coords;
  if(!Array.isArray(coords)||coords.length<2)return {type:'FeatureCollection',features:[]};
  const features=[];
  let current=null;
  const toneOf=risk=>{
    if(!Number.isFinite(risk))return ['unknown','#8c969c'];
    if(risk<21)return ['low','#139861'];
    if(risk<41)return ['good','#87c84c'];
    if(risk<61)return ['medium','#f2c63f'];
    if(risk<70)return ['high','#ef903c'];
    return ['severe','#d84b4e'];
  };
  const add=(from,to,risk)=>{
    const [tone,color]=toneOf(risk);
    if(current?.properties.tone===tone&&
       current.geometry.coordinates.at(-1).every((n,i)=>Math.abs(n-from[i])<1e-9)){
      current.geometry.coordinates.push(to);return;
    }
    current={type:'Feature',properties:{tone,color,observed:Number.isFinite(risk)},geometry:{type:'LineString',coordinates:[from,to]}};
    features.push(current);
  };
  for(let i=1;i<coords.length;i++){
    const p=coords[i-1],q=coords[i];
    if(!Array.isArray(p)||!Array.isArray(q)||p.length!==2||q.length!==2||![...p,...q].every(Number.isFinite))
      return {type:'FeatureCollection',features:[]};
    const a=XY(p),b=XY(q),length=dist(a,b);
    if(length<.01)continue;
    const heading=[(b[0]-a[0])/length,(b[1]-a[1])/length];
    const parts=Math.min(200,Math.max(1,Math.ceil(length/10)));
    for(let n=0;n<parts;n++){
      const t0=n/parts,t1=(n+1)/parts,mid=(t0+t1)/2;
      const sample=[a[0]+(b[0]-a[0])*mid,a[1]+(b[1]-a[1])*mid];
      const match=matchedRisk(sample,heading,observedLines.grid);
      const x=t=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
      add(x(t0),x(t1),match?.risk??null);
    }
  }
  return {type:'FeatureCollection',features};
}
export function visualizeCompositePriRoutes(routes,bundle){
  const lines=buildObservedLines(bundle);
  return {
    standard:routePriColorGeometry(routes?.standard,lines),
    gentle:routePriColorGeometry(routes?.gentle,lines)
  };
}
