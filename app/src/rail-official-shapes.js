/**
 * Seoul metro track geometry (progressive enhancement).
 * MOIS / Esri Korea: 2026.04.30 nationwide subway lines, FeatureServer layer 2.
 * The service excludes the Sillim Line. Keep local Sillim coordinates.
 * A failing or incomplete remote service must NEVER remove the local rail overlay.
 */
import {railGeojson, VERIFIED_STATIONS, FIXED_RAIL_STATION_ORDER} from './fixed-rail-data.js';
import {FIXED_RAIL_COLORS, FIXED_RAIL_NAMES} from './fixed-rail-lines.js';

export const OFFICIAL_RAIL_SOURCE = 'https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/2/query';
const EXTENT=[126.855,37.438,127.055,37.562];
const VALID_LINES=new Set(['1','2','4','7','9']);
const RAD=Math.PI/180;
const METERS=111320;
const fc=features=>({type:'FeatureCollection',features});
const validPoint=p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)
  &&p[0]>=125&&p[0]<=129&&p[1]>=35&&p[1]<=39;

function geometryAsWgs(point){
  let [x,y]=point.map(Number);
  if(Math.abs(x)>180 || Math.abs(y)>90){ // Web Mercator 3857 fallback
    const r=20037508.342789244;
    x=x/r*180;
    y=(2*Math.atan(Math.exp(y/r*Math.PI))-Math.PI/2)*180/Math.PI;
  }
  return [x,y];
}

export function resolveOfficialLine(attributes={}){
  const fields=['sub_nm','SUB_NM','line_nm','LINE_NM','line_name','LINE_NAME','route_name','ROUTE_NAME','name','NAME'];
  const names=fields.map(k=>attributes?.[k]).filter(Boolean).map(String);
  for(const name of names){
    const normalized=name.replace(/\s/g,'');
    if(/신림선|Sillim/i.test(normalized))return null; // dataset contains no verified Sillim geometry
    for(const code of VALID_LINES){
      if(new RegExp(`(?:^|[^0-9])0?${code}(?:호선|선|호|線|號線|line|$|[^0-9])`,'i').test(normalized))return code;
    }
  }
  return null;
}

export function extractOfficialPaths(payload){
  if(payload?.error)throw new Error(`공식 철도선형 API ${payload.error.code||''}: ${payload.error.message||'조회 오류'}`);
  if(!Array.isArray(payload?.features))throw new Error('공식 철도선형 응답에 features가 없습니다.');
  const paths=[];
  for(const feature of payload.features){
    const props=feature.attributes || feature.properties || {};
    const code=resolveOfficialLine(props);
    if(!code)continue;
    const geom=feature.geometry || {};
    const raw=geom.type==='LineString'?[geom.coordinates]:geom.type==='MultiLineString'?geom.coordinates:geom.paths||[];
    for(const arr of raw){
      if(!Array.isArray(arr)||arr.length<2)continue;
      const coordinates=arr.map(geometryAsWgs).filter(validPoint);
      if(coordinates.length>=2)paths.push({line:code,coordinates});
    }
  }
  return paths;
}

function metricDelta(a,b){
  const latitude=((a[1]+b[1])/2)*RAD;
  return [(a[0]-b[0])*METERS*Math.cos(latitude),(a[1]-b[1])*METERS];
}
const distance=(a,b)=>Math.hypot(...metricDelta(a,b));
function project(p,a,b){
  const [ax,ay]=metricDelta(a,p),[bx,by]=metricDelta(b,p);
  const vx=bx-ax,vy=by-ay;
  const t=Math.max(0,Math.min(1,-(ax*vx+ay*vy)/(vx*vx+vy*vy||1)));
  return {distance:Math.hypot(ax+t*vx,ay+t*vy),t};
}
function makeReference(code){
  const route=railGeojson.features.find(f=>f.properties.line===code)?.geometry.coordinates;
  if(!route?.length)return null;
  const lengths=[0];
  for(let i=1;i<route.length;i++)lengths.push(lengths.at(-1)+distance(route[i-1],route[i]));
  const nearest=(p)=>{
    let best={distance:Infinity,along:0};
    for(let i=1;i<route.length;i++){
      const x=project(p,route[i-1],route[i]);
      if(x.distance<best.distance)best={distance:x.distance,along:lengths[i-1]+x.t*(lengths[i]-lengths[i-1])};
    }
    return best;
  };
  const stations=FIXED_RAIL_STATION_ORDER[code];
  return {nearest,firstAt:nearest(VERIFIED_STATIONS[stations[0]]).along,
    lastAt:nearest(VERIFIED_STATIONS[stations.at(-1)]).along,stations};
}
const smoothstep=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
function opacityAt(along,ref){
  if(along<ref.firstAt)return 0.97*(1-smoothstep((ref.firstAt-along)/1400));
  if(along>ref.lastAt)return 0.97*(1-smoothstep((along-ref.lastAt)/1400));
  return 0.97;
}

/** Return official line features, retaining the schematic fallback for uncovered routes. */
export function mergeOfficialRail(schematicCollection,rawPaths){
  const grouped=new Map();
  for(const path of rawPaths||[]){
    if(!VALID_LINES.has(path.line))continue;
    if(!grouped.has(path.line))grouped.set(path.line,[]);
    grouped.get(path.line).push(path.coordinates);
  }
  const replacements=new Map();
  for(const [line,paths] of grouped){
    const ref=makeReference(line);
    if(!ref)continue;
    const features=[];
    const stationNear=new Set();
    let length=0;
    for(const path of paths){
      // Keep the original vertices of the official line; never replace with station chords.
      let run=null;
      const flush=()=>{if(run?.geometry.coordinates.length>=2)features.push(run);run=null;};
      for(let i=1;i<path.length;i++){
        const a=path[i-1],b=path[i];
        if(!validPoint(a)||!validPoint(b)) {flush();continue;}
        const meters=distance(a,b);
        if(meters>3000){flush();continue;} // reject clearly malformed or connected-distant geometry
        const slices=Math.max(1,Math.ceil(meters/65));
        for(let k=0;k<slices;k++){
          const interp=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
          const start=interp(k/slices),end=interp((k+1)/slices);
          const mid=interp((k+0.5)/slices);
          if(mid[0]<EXTENT[0]||mid[0]>EXTENT[2]||mid[1]<EXTENT[1]||mid[1]>EXTENT[3]){flush();continue;}
          const along=ref.nearest(mid);
          if(along.distance>850){flush();continue;} // exclude unrelated branches and parallel distant routes
          const alpha=opacityAt(along.along,ref);
          if(alpha<0.008){flush();continue;}
          const opacity=Number(alpha.toFixed(3));
          length+=distance(start,end);
          for(const station of ref.stations){
            if(distance(mid,VERIFIED_STATIONS[station])<350)stationNear.add(station);
          }
          if(run && Math.abs(run.properties.opacity-opacity)<=0.018){
            run.geometry.coordinates.push(end);
          }else{
            flush();
            run={type:'Feature',properties:{line:FIXED_RAIL_NAMES[line],color:FIXED_RAIL_COLORS[line],opacity,
              source:'MOIS_KR_Subway_2026',schematic:false},geometry:{type:'LineString',coordinates:[start,end]}};
          }
        }
      }
      flush();
    }
    // A truncated/malformed API response must not erase an entire locally displayed line.
    if(length>=1300 && stationNear.size>=Math.max(2,Math.ceil(ref.stations.length*0.65)) && features.length>=2){
      replacements.set(line,features);
    }
  }
  const existing=Array.isArray(schematicCollection?.features)?schematicCollection.features:[];
  const kept=existing.filter(f=>{
    const code=Object.keys(FIXED_RAIL_NAMES).find(k=>FIXED_RAIL_NAMES[k]===f.properties?.line);
    return !replacements.has(code);
  });
  return {collection:fc([...kept,...[...replacements.values()].flat()]),lines:[...replacements.keys()]};
}

export function makeOfficialRailQueryUrl(){
  const params=new URLSearchParams({
    where:'1=1',geometry:EXTENT.join(','),geometryType:'esriGeometryEnvelope',
    inSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'*',outSR:'4326',
    returnGeometry:'true',resultRecordCount:'2000',f:'json'
  });
  return `${OFFICIAL_RAIL_SOURCE}?${params.toString()}`;
}
export async function fetchOfficialRailPaths(fetchFn=fetch,timeoutMs=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchFn(makeOfficialRailQueryUrl(),{method:'GET',signal:controller.signal,cache:'default'});
    if(!response.ok)throw new Error(`공식 철도선형 HTTP ${response.status}`);
    return extractOfficialPaths(await response.json());
  }finally{clearTimeout(timer);}
}
