/** v1.0: visibility masks are precomputed on a PC from 2.5D building prisms.
 * These are direct-ray *estimates*, not measured lux. Angles and roof heights
 * are simplified, and estimated streetlight parcel locations can be off-site.
 */
import {inGeometry,kindOf} from './night-visibility-analysis.js';

const rad=Math.PI/180;
export function distanceMeters(a,b){
  const ky=111320,kx=ky*Math.cos(((a.lat+b.lat)/2)*rad);
  return Math.hypot((a.lon-b.lon)*kx,(a.lat-b.lat)*ky);
}
export function isReachDataset(data,expected=419){
  return data?.type==='FeatureCollection'&&data?.metadata?.model==='planar-2.5d-direct-ray-v1'&&
    data?.metadata?.radiusMaxM>=40&&Array.isArray(data?.features)&&data.features.length===expected&&
    data.features.every((f,i)=>f.properties?.idx===i&&f.geometry?.type==='Polygon');
}
export function trimReach(reaches,lights,radius){
  if(!reaches?.features?.length)return {type:'FeatureCollection',features:[]};
  const f=reaches.features.map((feature,i)=>{
    const light=lights[i];
    const coordinates=feature.geometry.coordinates.map(ring=>ring.map(([lon,lat])=>{
      const d=distanceMeters(light,{lat,lon});
      if(d<=radius||d<1e-7)return [lon,lat];
      const factor=radius/d;
      return [light.lon+(lon-light.lon)*factor,light.lat+(lat-light.lat)*factor];
    }));
    return {...feature,geometry:{...feature.geometry,coordinates}};
  });
  return {type:'FeatureCollection',features:f};
}

/**
 * When OSM roads are loaded live, enrich the existing 5m samples from the
 * precomputed per-light visibility polygons, without doing browser ray casts.
 * Road samples precomputed on the PC already carry dClear and skip this pass.
 */
export function annotateVisibility(lines,lights,reaches){
  if(!reaches?.features?.length)return lines;
  for(const line of lines||[])for(const sample of line.samples||[]){
    if(Object.hasOwn(sample,'dClear'))continue;
    let nearest=Infinity,uncertain=Infinity;
    for(let i=0;i<lights.length;i++){
      const d=distanceMeters(sample,lights[i]);
      if(d>40.6)continue;
      const footprint=reaches.features[i];
      if(!footprint)continue;
      if(footprint.properties?.insideBuilding)uncertain=Math.min(uncertain,d);
      if(inGeometry(sample.lon,sample.lat,footprint.geometry))nearest=Math.min(nearest,d);
    }
    sample.dClear=Number.isFinite(nearest)?nearest:null;
    sample.dUncertain=Number.isFinite(uncertain)?uncertain:null;
  }
  return lines;
}
export function classifySample(point,radius){
  if(!point?.inScope)return null;
  if(!Number.isFinite(point.d)||point.d>radius)return 'outside';
  if(Number.isFinite(point.dClear)&&point.dClear<=radius)return 'clear';
  if(point.dUncertain!==null&&Number.isFinite(point.dUncertain)&&point.dUncertain<=radius)return 'uncertain';
  return 'blocked';
}

/** Length stats cover every valid road-sample edge, including short shadow runs.
 * Line features/popup TOP10 are only emitted for >= minLength contiguous runs.
 */
export function analyzeOcclusion(lines,radius,minLength=10){
  const totals={clear:0,blocked:0,outside:0,uncertain:0};
  const byKind={alley:{...totals},path:{...totals}};
  const segments=[];let totalLen=0;
  for(const line of lines||[]){
    const points=line.samples||[],kind=kindOf(line.tags),t=byKind[kind];
    let run=null;
    const flush=()=>{
      if(run&&run.length>=minLength&&run.points.length>=2){
        segments.push({wayId:line.id,name:line.tags?.name||'',tags:line.tags||{},kind,
          category:run.category,points:run.points,length:run.length,maxD:run.maxD});
      }
      run=null;
    };
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
      if(!Number.isFinite(length)||length<=0||length>15||!a.inScope||!b.inScope){flush();continue;}
      let catA=classifySample(a,radius),catB=classifySample(b,radius);
      // A 5m edge that changes category is not silently discarded.
      const category=catA===catB?catA:'uncertain';
      totalLen+=length;totals[category]+=length;t[category]+=length;
      if(run?.category!==category){flush();run={category,points:[{lat:a.lat,lon:a.lon}],length:0,maxD:0};}
      run.points.push({lat:b.lat,lon:b.lon});run.length+=length;
      run.maxD=Math.max(run.maxD,a.d,b.d);
    }
    flush();
  }
  return {totalLen,totals,byKind,segments};
}
export function occlusionLineFeatures(segments){
  return {type:'FeatureCollection',features:segments.map((s,i)=>({type:'Feature',id:i,
    properties:{idx:i,kind:s.kind,category:s.category,name:String(s.name||''),length:Math.round(s.length)},
    geometry:{type:'LineString',coordinates:s.points.map(p=>[p.lon,p.lat])}}))};
}
