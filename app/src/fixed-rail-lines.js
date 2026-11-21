/**
 * MapLibre fixed rail overlay: no Overpass / runtime rail-network download.
 * Schematic alignment traced from reference screenshot, NOT surveyed tunnel geometry.
 * The original district boundary, when supplied, is used for the fading distance.
 */
import {railGeojson,stationsGeojson,fallbackBoundary,VERIFIED_STATIONS,FIXED_RAIL_STATION_ORDER} from './fixed-rail-data.js';
export const FIXED_RAIL_NAMES={'1':'1호선','2':'2호선','4':'4호선','7':'7호선','9':'9호선','신림':'신림선'};
export const FIXED_RAIL_COLORS={'1':'#0052A4','2':'#00A84D','4':'#00A5DE','7':'#747F00','9':'#B89B2F','신림':'#6789CA'};
const radians=x=>x*Math.PI/180;
function isInRing([x,y],ring){let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if(((a[1]>y)!==(b[1]>y))&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;
}
function polygonRings(geometry){
  if(geometry?.type==='Polygon')return [geometry.coordinates];
  if(geometry?.type==='MultiPolygon')return geometry.coordinates;
  return [];
}
export function insideBoundary(point,geometry){
  return polygonRings(geometry).some(rings=>isInRing(point,rings[0])&&!rings.slice(1).some(r=>isInRing(point,r)));
}
function distanceToEdgeMeters(point,a,b){
  const factor=111320*Math.cos(radians(point[1]));
  const ax=(a[0]-point[0])*factor,ay=(a[1]-point[1])*111320;
  const bx=(b[0]-point[0])*factor,by=(b[1]-point[1])*111320;
  const dx=bx-ax,dy=by-ay;
  const t=Math.max(0,Math.min(1,(-ax*dx-ay*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(ax+t*dx,ay+t*dy);
}
export function distanceFromDongjakMeters(point,geometry){
  if(!geometry)return 0;
  if(insideBoundary(point,geometry))return 0;
  let best=Infinity;
  for(const rings of polygonRings(geometry))for(const ring of rings){
    for(let i=1;i<ring.length;i++)best=Math.min(best,distanceToEdgeMeters(point,ring[i-1],ring[i]));
  }
  return best;
}
export function railOpacityAtDistance(distanceMeters){
  // 구 경계 안쪽과 바로 바깥은 선명하게 유지하고, 바깥으로 갈수록 천천히 사라지게 합니다.
  // 갑자기 끊기는 느낌을 줄이기 위해 4.8km까지 부드럽게 감쇠합니다.
  const d=Math.max(0,distanceMeters);
  if(d<=180)return 0.97;
  const start=180;
  const end=4800;
  const t=Math.max(0,Math.min(1,(d-start)/(end-start)));
  const eased=1-(t*t*(3-2*t)); // 1 - smoothstep
  return Math.max(0,0.97*eased);
}
function distanceMeters(a,b){
  return Math.hypot((a[0]-b[0])*111320*Math.cos(radians((a[1]+b[1])/2)),(a[1]-b[1])*111320);
}
function densify(path,step=75){
  const out=[path[0]];
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];const n=Math.max(1,Math.ceil(distanceMeters(a,b)/step));
    for(let j=1;j<=n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);
  }return out;
}
// 실제 표시 마지막 역에서 바깥쪽으로 1,400m 동안만 투명해집니다.
// 페이드는 추가 역 좌표로 만든 같은 노선 곡선을 따라 진행하며 직선 연장하지 않습니다.
export function railEndpointFadeMeters(distanceFromEnd,fadeLength=1400){
  const t=Math.max(0,Math.min(1,distanceFromEnd/fadeLength));
  return t*t*(3-2*t);
}
export function fixedRailCollection(boundary){
  // 첫/마지막 표시 역은 선명하게 유지하고, 그 너머의 정해진 철도 방향 곡선 위에서만 페이드.
  // 다음 역은 선형 가이드이며 클릭용 마커로 추가하지 않습니다.
  const features=[];
  for(const f of railGeojson.features){
    const code=f.properties.line;
    const coordinates=densify(f.geometry.coordinates,40);
    const lengths=[0];
    for(let i=1;i<coordinates.length;i++){
      lengths.push(lengths[i-1]+distanceMeters(coordinates[i-1],coordinates[i]));
    }
    const stationOrder=FIXED_RAIL_STATION_ORDER[code];
    const first=VERIFIED_STATIONS[stationOrder[0]],last=VERIFIED_STATIONS[stationOrder.at(-1)];
    const nearestAlong=point=>{
      let index=0,best=Infinity;
      for(let i=0;i<coordinates.length;i++){
        const d=distanceMeters(point,coordinates[i]);
        if(d<best){best=d;index=i;}
      }
      return lengths[index];
    };
    const firstAt=nearestAlong(first),lastAt=nearestAlong(last);
    for(let i=1;i<coordinates.length;i++){
      const a=coordinates[i-1],b=coordinates[i];
      const along=(lengths[i-1]+lengths[i])/2;
      let fade=1;
      if(code!=='신림'){
        if(along<firstAt)fade=1-railEndpointFadeMeters(firstAt-along,1400);
        else if(along>lastAt)fade=1-railEndpointFadeMeters(along-lastAt,1400);
      }
      const opacity=Number((.97*fade).toFixed(4));
      if(opacity<0.006)continue;
      features.push({type:'Feature',properties:{
        line:FIXED_RAIL_NAMES[code],color:FIXED_RAIL_COLORS[code],opacity,
        source:'official-station-anchored-schematic',schematic:true},
        geometry:{type:'LineString',coordinates:[a,b]}});
    }
  }
  return {type:'FeatureCollection',features};
}

export function fixedMetroStations(){
  // 같은 역은 노선별 중복 마커 대신 단일 객체로 표시합니다.
  // 이수역(7호선)과 총신대입구역(4호선)은 별개의 공식 승강장 중심점이므로
  // 노선도에는 각 실제 좌표를 사용하고 클릭용 역 마커만 두 좌표의 중간에 둡니다.
  const groups=new Map();
  for(const f of stationsGeojson.features){
    const raw=String(f.properties.name||'').replace(/역$/,'');
    const key=raw==='총신대입구'?'이수':raw;
    if(!groups.has(key))groups.set(key,{id:`static/metro/${key}`,kind:'subway',
      name:key==='이수'?'이수(총신대입구)':key,
      lng:0,lat:0,arsId:'',lines:[],source:'seoul-station-geom-master',_points:[]});
    const p=groups.get(key);
    const line=FIXED_RAIL_NAMES[f.properties.line];
    if(line&&!p.lines.includes(line))p.lines.push(line);
    const xy=f.geometry.coordinates;
    if(!p._points.some(v=>v[0]===xy[0]&&v[1]===xy[1]))p._points.push(xy);
  }
  return [...groups.values()].map(p=>{
    p.lng=Number((p._points.reduce((a,b)=>a+b[0],0)/p._points.length).toFixed(7));
    p.lat=Number((p._points.reduce((a,b)=>a+b[1],0)/p._points.length).toFixed(7));
    delete p._points;
    return p;
  });
}
