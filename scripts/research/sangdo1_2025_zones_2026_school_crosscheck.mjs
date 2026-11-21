#!/usr/bin/env node
/**
 * Reproducible read-only GIS QA: 2025 registered police polygons x 2026 exact
 * official school catchment road intersections. Does NOT fetch current legal notices.
 * Run from anywhere: node scripts/research/sangdo1_2025_zones_2026_school_crosscheck.mjs
 * Expected: 1,676 usable roads; zone lengths only sampled (2m), official 2026
 * catchment road lengths are from unsimplified SHP, not display GeoJSON.
 */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=path.join(root,'app/public/data');
const read=async p=>JSON.parse(await readFile(path.join(data,p),'utf8'));
const kx=111320*Math.cos(37.5*Math.PI/180),ky=111195;
const close=(a,b,tol,label)=>{
  if(Math.abs(a-b)>tol)throw new Error(`${label}: recomputed ${a} != saved ${b} (tolerance ${tol})`);
};
function withinRing([x,y],ring){
  let yes=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))yes=!yes;
  }
  return yes;
}
function withinPolygon(point,rings){
  if(!rings.length||!withinRing(point,rings[0]))return false;
  return !rings.slice(1).some(r=>withinRing(point,r));
}
function within(point,geo){
  if(geo.type==='Polygon')return withinPolygon(point,geo.coordinates);
  if(geo.type==='MultiPolygon')return geo.coordinates.some(r=>withinPolygon(point,r));
  if(geo.type==='GeometryCollection')return geo.geometries.some(g=>within(point,g));
  return false;
}
function sampledProtected(pts,zones){
  let length=0,inside=0;
  for(let j=1;j<pts.length;j++){
    const a=[pts[j-1][1],pts[j-1][0]],b=[pts[j][1],pts[j][0]];
    const l=Math.hypot((b[0]-a[0])*kx,(b[1]-a[1])*ky);
    if(l<0.00001)continue;
    length+=l;
    const n=Math.max(1,Math.ceil(l/2));
    for(let k=0;k<n;k++){
      const t=(k+.5)/n,pt=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      if(zones.some(g=>within(pt,g)))inside+=l/n;
    }
  }
  return {length,inside};
}
async function main(){
  const [zones,roads,overlay,saved]=await Promise.all([
    read('protection-zone/zone_polygons_18_reference.geojson'),
    read('pri/lighting_segments.json'),
    read('protection-zone/sangdo1_road_catchment_overlay_20260920.json'),
    read('protection-zone/sangdo1_2025_police_x_2026_catchment_preview.json')
  ]);
  if(zones.features.length!==18)throw new Error('Unexpected zone polygon count');
  if(roads.segments.length!==1686||overlay.segments.length!==1686)throw new Error('Unexpected road count');
  const g=zones.features.map(f=>f.geometry);
  const official=new Map(overlay.segments.map(r=>[r.segment_id,r]));
  const computed=new Map(overlay.meta.catchment_school_names.map(name=>[name,{len:0,low:0,high:0}]));
  let totalRoad=0,totalProtected=0,missing=0;
  for(const segment of roads.segments){
    const item=official.get(segment.id);
    if(!item)throw new Error('Missing segment in 2026 official overlay '+segment.id);
    if(!item.road_length_m){missing++;continue}
    const sampled=sampledProtected(segment.pts,g),L=item.road_length_m;
    // Normalize sampled proportion onto the official projected road length.
    const Z=Math.max(0,Math.min(L,sampled.inside/sampled.length*L));
    totalRoad+=L;totalProtected+=Z;
    for(const school of item.assignments){
      const ent=computed.get(school.school_catchment),A=Math.min(L,school.road_m);
      ent.len+=school.road_m;
      ent.low+=Math.max(0,A+Z-L);
      ent.high+=Math.min(A,Z);
    }
  }
  close(totalRoad,saved.meta.total_valid_road_m,.2,'total projected road metres');
  close(totalProtected,saved.meta.zone_coverage_on_road_m,2,'registered zone sampled metres');
  if(missing!==10)throw new Error(`Expected 10 NULL roads, got ${missing}`);
  for(const row of saved.schools){
    const c=computed.get(row.school);
    close(c.len,row.road_intersection_exact_m,.2,row.school+' official school metres');
    close(c.low,row.registered_protected_lower_bound_m,2,row.school+' zone lower');
    close(c.high,row.registered_protected_upper_bound_m,2,row.school+' zone upper');
  }
  console.log(JSON.stringify({status:'PASS',roads:roads.segments.length,valid:roads.segments.length-missing,
    official_road_m:Number(totalRoad.toFixed(2)),sampled_2025_zone_m:Number(totalProtected.toFixed(2)),
    official_2026_school_road_m:overlay.meta.catchment_covered_road_m,
    warning:'Not a verified current legal school zone or observed student route'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
