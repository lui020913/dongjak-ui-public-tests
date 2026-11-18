/**
 * GPS walk-safety snapshot: offline dataset estimates ONLY.
 * No numeric visibility, light level, CCTV operational status or live population is inferred.
 * Distances below are WGS84 straight-line estimates, NOT pedestrian-route lengths.
 */
const RAD=Math.PI/180;
export const DATASET_PATHS=Object.freeze({
  crossings:'/data/sangdo1-crosswalks-team-review.geojson',
  boundary:'/data/safety/accidents/sangdo1_team_osm_reference_boundary.geojson',
  accidents:'/data/safety/accidents/dongjak_accident_areas_all.geojson',
  schoolZones:'/data/protection-zone/zones.geojson',
  cctv:'/data/safety/cctv/dongjak_cctv_security.geojson',
  streetLights:'/data/sangdo1-night/lights.json',
  securityLights:'/data/sangdo1-night/security.json',
  slope:'/data/sangdo1-analysis-view/slope.geojson',
});
export const withinNightHours=(date)=>{const h=date.getHours();return h>=18||h<6;};
export function validCoord(point){return Array.isArray(point)&&point.length>=2&&Number.isFinite(point[0])&&Number.isFinite(point[1])&&Math.abs(point[0])<=180&&Math.abs(point[1])<=90;}
export function straightDistance(a,b){
  if(!validCoord(a)||!validCoord(b))return Infinity;
  const dlat=(b[1]-a[1])*RAD,dlon=(b[0]-a[0])*RAD;
  const h=Math.sin(dlat/2)**2+Math.cos(a[1]*RAD)*Math.cos(b[1]*RAD)*Math.sin(dlon/2)**2;
  return 12742000*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function bearingDegrees(a,b){
  if(!validCoord(a)||!validCoord(b))return NaN;
  const p1=a[1]*RAD,p2=b[1]*RAD,l=(b[0]-a[0])*RAD;
  const y=Math.sin(l)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(l);
  return (Math.atan2(y,x)/RAD+360)%360;
}
export function direction8(b){return Number.isFinite(b)?['북','북동','동','남동','남','남서','서','북서'][Math.round(b/45)%8]+'쪽':'방향 미확인';}
export function nearestFeatures(origin,features=[],radius=Infinity,getPoint=(feature)=>feature?.geometry?.coordinates){
  return (Array.isArray(features)?features:[]).map(feature=>{
    const point=getPoint(feature),distance=straightDistance(origin,point);
    return {feature,point,distance,bearing:bearingDegrees(origin,point)};
  }).filter(x=>Number.isFinite(x.distance)&&x.distance<=radius).sort((a,b)=>a.distance-b.distance);
}
export function directionCandidates(nearby=[],limit=500){
  return [0,90,180,270].map((degree,i)=>{
    const first=nearby.find(x=>x.distance<=limit && Math.abs(((x.bearing-degree+540)%360)-180)<=45);
    return {direction:['북','동','남','서'][i],hit:first||null};
  });
}
function ringContains(point,ring){
  if(!Array.isArray(ring))return false;
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if(!validCoord(a)||!validCoord(b))continue;
    const intersects=((a[1]>point[1])!==(b[1]>point[1]))&&
      point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];
    if(intersects)inside=!inside;
  }
  return inside;
}
export function containsPoint(geometry,point){
  if(!validCoord(point)||!geometry)return false;
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  return polygons.some(rings=>rings?.length&&ringContains(point,rings[0])&&!rings.slice(1).some(hole=>ringContains(point,hole)));
}
// Distance to a LINE, not just its endpoints, with local metric projection.
export function distanceToLine(point,geometry){
  const lines=geometry?.type==='LineString'?[geometry.coordinates]:geometry?.type==='MultiLineString'?geometry.coordinates:[];
  if(!validCoord(point)||!lines.length)return Infinity;
  const lonScale=111320*Math.cos(point[1]*RAD),latScale=111195;
  const proj=c=>[(c[0]-point[0])*lonScale,(c[1]-point[1])*latScale];
  let best=Infinity;
  for(const line of lines){
    for(let i=1;i<line.length;i++){
      if(!validCoord(line[i-1])||!validCoord(line[i]))continue;
      const a=proj(line[i-1]),b=proj(line[i]);const x=b[0]-a[0],y=b[1]-a[1];
      const t=Math.max(0,Math.min(1,-(a[0]*x+a[1]*y)/(x*x+y*y||1)));
      best=Math.min(best,Math.hypot(a[0]+t*x,a[1]+t*y));
    }
  }
  return best;
}
const featuresOf=value=>Array.isArray(value?.features)?value.features:[];
export function analyzeGpsSafety(origin,accuracy,datasets={},date=new Date()){
  if(!validCoord(origin))throw new Error('위치 좌표가 유효하지 않습니다.');
  const accuracyValid=Number.isFinite(accuracy)&&accuracy>=0;
  const accuracyMeters=accuracyValid?accuracy:null;
  const boundaryDataAvailable=featuresOf(datasets.boundary).length>0;
  const pilotBoundary=featuresOf(datasets.boundary)[0]?.geometry;
  const pilot=!!pilotBoundary&&containsPoint(pilotBoundary,origin);
  const gpsReliable=accuracyValid&&accuracy<=100;
  const crosswalks=pilot?nearestFeatures(origin,featuresOf(datasets.crossings)):[];
  const closest=crosswalks[0]||null;
  const hasCrossingData=pilot&&Array.isArray(datasets.crossings?.features)&&datasets.crossings.features.length>0;
  const accidentDataAvailable=Array.isArray(datasets.accidents?.features);
  const zoneDataAvailable=Array.isArray(datasets.schoolZones?.features);
  const accidents=featuresOf(datasets.accidents).filter(x=>
    x?.properties?.category==='pedestrian'&&containsPoint(x.geometry,origin));
  const zones=featuresOf(datasets.schoolZones).filter(x=>containsPoint(x.geometry,origin));
  let level='unknown';
  if(gpsReliable){
    if(accidents.length)level='risk';
    else if(accidentDataAvailable&&zoneDataAvailable&&hasCrossingData&&closest&&closest.distance>100)level='caution';
    else if(accidentDataAvailable&&zoneDataAvailable&&hasCrossingData&&closest&&closest.distance<=100)level='near-crossing';
  }
  const cctv=nearestFeatures(origin,featuresOf(datasets.cctv),150)[0]||null;
  const street=nearestFeatures(origin,datasets.streetLights||[],150,x=>[Number(x.lon),Number(x.lat)])[0]||null;
  const security=nearestFeatures(origin,datasets.securityLights||[],150,x=>[Number(x.lon),Number(x.lat)])[0]||null;
  const light=[street,security].filter(Boolean).sort((a,b)=>a.distance-b.distance)[0]||null;
  const slopes=pilot?featuresOf(datasets.slope).map(feature=>({feature,distance:distanceToLine(origin,feature.geometry)})).filter(x=>x.distance<=55).sort((a,b)=>a.distance-b.distance):[];
  return {origin,accuracy:accuracyMeters,pilot,gpsReliable,level,crosswalks,closest,cardinals:directionCandidates(crosswalks),
    accidents,zones,cctv,light,slopes,boundaryDataAvailable,slopeDataAvailable:Array.isArray(datasets.slope?.features),accidentDataAvailable,zoneDataAvailable,cctvDataAvailable:Array.isArray(datasets.cctv?.features),lightDataAvailable:Array.isArray(datasets.streetLights)&&Array.isArray(datasets.securityLights),night:withinNightHours(date),collectedAt:date};
}
export function metersLabel(distance){return Number.isFinite(distance)?`약 ${Math.max(0,Math.round(distance/5)*5)}m`:'거리 미확인';}
