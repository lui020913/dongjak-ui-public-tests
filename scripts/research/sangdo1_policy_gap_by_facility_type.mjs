#!/usr/bin/env node
/**
 * Recompute source-type-specific protection-gap signals for all 1,686 roads.
 * Inputs are police 2025 facilities and polygons, shared OSM road geometry,
 * and 2026 official school catchments for context only. No team safety factors.
 * node scripts/research/sangdo1_policy_gap_by_facility_type.mjs --verify
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const input=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const base='app/public/data/';
const outputBase=base+'protection-zone/';
const groups=['어린이','노인'];
const kx=111320*Math.cos(37.5*Math.PI/180),ky=111195;
const vehicleKinds=new Set(['tertiary','primary','secondary','primary_link','residential','service']);
const pedestrianKinds=new Set(['footway','steps','pedestrian','footway:sidewalk','footway:crossing']);
const net=x=>vehicleKinds.has(x)?'vehicle_network':'pedestrian_network';
function inRing(point,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if(((a[1]>point[1])!==(b[1]>point[1]))&&
    (point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
 }
 return inside;
}
function inPoly(point,rings){return !!rings.length&&inRing(point,rings[0])&&!rings.slice(1).some(r=>inRing(point,r))}
function inGeom(point,shape){
 if(shape.type==='Polygon')return inPoly(point,shape.coordinates);
 if(shape.type==='MultiPolygon')return shape.coordinates.some(r=>inPoly(point,r));
 return false;
}
function nearest(point,features){
 let min=Infinity,name=null;
 for(const f of features){
  const xy=f.geometry.coordinates;
  const d=Math.hypot((xy[0]-point[0])*kx,(xy[1]-point[1])*ky);
  if(d<min){min=d;name=f.properties.facility_name}
 }
 return{distance:min,name};
}
async function recalculate(){
 const [roads,facilities,zones,catchments]=await Promise.all([
  input(base+'pri/lighting_segments.json'),
  input(outputBase+'facility_reference_points_19.geojson'),
  input(outputBase+'zone_polygons_18_reference.geojson'),
  input(outputBase+'sangdo1_road_catchment_overlay_20260920.json')
 ]);
 assert.equal(roads.segments.length,1686);
 const inputs=Object.fromEntries(groups.map(type=>[type,{
  points:facilities.features.filter(f=>f.properties.facility_type===type),
  zones:zones.features.filter(f=>f.properties.facility_type===type)
 }]));
 const counts=Object.fromEntries(groups.map(type=>[type,{points:inputs[type].points.length,zones:inputs[type].zones.length}]));
 assert.deepEqual(counts,{'어린이':{points:15,zones:14},'노인':{points:4,zones:4}});
 const official=new Map(catchments.segments.map(x=>[x.segment_id,x]));
 const aggregates=Object.fromEntries(groups.map(type=>[type,{
  valid:0,vehicle_candidates_0_300:0,vehicle_candidates_300_500:0,pedestrian_candidates:0,
  in_poly_road_m:0,within_300_gap_m:0,within_300_500_gap_m:0,outside_500_no_inferred_gap_m:0
 }]));
 const output=[];
 for(const road of roads.segments){
  assert.ok(vehicleKinds.has(road.hw)||pedestrianKinds.has(road.hw),'Missing type for '+road.id);
  const catchment=official.get(road.id);
  assert.ok(catchment,'Missing school spatial segment '+road.id);
  const obj={
   id:road.id,road_name:road.name,osm_highway:road.hw,network_kind:net(road.hw),
   school_catchment_names:catchment.assignments.map(x=>x.school_catchment),
   geom_length_m:null,types:{}
  };
  if(!road.pts?.length||road.pts.length<2){
   for(const type of groups)obj.types[type]=null;
   output.push(obj);continue;
  }
  const sampled=Object.fromEntries(groups.map(type=>[type,{
   length:0,scoreSum:0,zoneM:0,near300M:0,near500M:0,beyond500M:0,nearest:Infinity,nearestName:null
  }]));
  for(let i=1;i<road.pts.length;i++){
   const a=[road.pts[i-1][1],road.pts[i-1][0]],b=[road.pts[i][1],road.pts[i][0]];
   const distance=Math.hypot((b[0]-a[0])*kx,(b[1]-a[1])*ky);
   if(distance<1e-8)continue;
   const n=Math.max(1,Math.ceil(distance/5));
   for(let j=0;j<n;j++){
    const t=(j+.5)/n,point=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],step=distance/n;
    for(const type of groups){
     const a=sampled[type],src=inputs[type];
     const protectedPoint=src.zones.some(z=>inGeom(point,z.geometry));
     const nearestPoint=nearest(point,src.points);
     a.length+=step;
     if(nearestPoint.distance<a.nearest){a.nearest=nearestPoint.distance;a.nearestName=nearestPoint.name}
     if(protectedPoint){a.zoneM+=step;a.scoreSum+=100*step}
     else{
      a.scoreSum+=Math.min(100,nearestPoint.distance/5)*step;
      if(nearestPoint.distance<=300)a.near300M+=step;
      else if(nearestPoint.distance<=500)a.near500M+=step;
      else a.beyond500M+=step;
     }
    }
   }
  }
  for(const type of groups){
   const a=sampled[type],b=aggregates[type],L=a.length;
   if(L<1e-8){obj.types[type]=null;continue}
   obj.geom_length_m=+L.toFixed(2);
   const pct=x=>+(100*x/L).toFixed(1),score=+(a.scoreSum/L).toFixed(1);
   const category=a.near300M>1e-5?'unprotected_0_300m':a.near500M>1e-5?'unprotected_300_500m':a.zoneM>1e-5?'registered_polygon_only':'outside_500m_reference';
   obj.types[type]={
    policy_coverage_score:score,gap_strength:+(100-score).toFixed(1),
    existing_zone_pct:pct(a.zoneM),
    unprotected_0_300m_pct:pct(a.near300M),
    unprotected_300_500m_pct:pct(a.near500M),
    nearest_facility:a.nearestName,
    nearest_facility_point_distance_m:+a.nearest.toFixed(1),
    category,rank_vehicle:null
   };
   b.valid++;
   b.in_poly_road_m+=a.zoneM;b.within_300_gap_m+=a.near300M;
   b.within_300_500_gap_m+=a.near500M;b.outside_500_no_inferred_gap_m+=a.beyond500M;
   if(net(road.hw)==='vehicle_network'){
    if(category==='unprotected_0_300m')b.vehicle_candidates_0_300++;
    else if(category==='unprotected_300_500m')b.vehicle_candidates_300_500++;
   }else if(['unprotected_0_300m','unprotected_300_500m'].includes(category))b.pedestrian_candidates++;
  }
  output.push(obj);
 }
 assert.equal(new Set(output.map(r=>r.id)).size,1686);
 const top={};
 for(const type of groups){
  const group=output.filter(x=>x.network_kind==='vehicle_network'&&x.types[type]&&
    ['unprotected_0_300m','unprotected_300_500m'].includes(x.types[type].category))
  .sort((a,b)=>b.types[type].gap_strength-a.types[type].gap_strength||
    b.types[type].unprotected_0_300m_pct-a.types[type].unprotected_0_300m_pct||
    b.geom_length_m-a.geom_length_m||a.id.localeCompare(b.id,'en'));
  group.forEach((x,i)=>x.types[type].rank_vehicle=i+1);
  top[type]=group.slice(0,10).map(x=>({
   rank:x.types[type].rank_vehicle,id:x.id,road:x.road_name,gap:x.types[type].gap_strength,
   near:x.types[type].nearest_facility,school:x.school_catchment_names
  }));
  for(const key of ['in_poly_road_m','within_300_gap_m','within_300_500_gap_m','outside_500_no_inferred_gap_m'])
   aggregates[type][key]=+aggregates[type][key].toFixed(2);
 }
 return{
  summary:{input_vehicle_and_pedestrian_roads:output.length,valid_geometry:output.filter(x=>x.geom_length_m>0).length,
   missing_geometry:output.filter(x=>!(x.geom_length_m>0)).length,
   facility_type_counts:counts,group_results:aggregates,ranked_vehicle_top10:top,
   disability_no_input_status:'not_evaluated_missing_official_facilities'},
  segments:output
 };
}
const saved=await input(outputBase+'sangdo1_policy_gap_by_facility_type_20261122.json');
const calculated=await recalculate();
assert.deepEqual(calculated.summary,saved.summary,'Type-specific GIS summary mismatch');
assert.deepEqual(calculated.segments,saved.segments,'Type-specific GIS road scores or ranks mismatch');
assert.equal(saved.metadata.legal_latest_2026_verified,false);
assert.equal(saved.metadata.disability_not_evaluated,true);
assert.equal(saved.metadata.do_not_mix_child_and_elderly_scores,true);
console.log(JSON.stringify({status:'PASS',type_counts:saved.summary.facility_type_counts,
 child_vehicle_candidates:saved.summary.group_results['어린이'].vehicle_candidates_0_300+saved.summary.group_results['어린이'].vehicle_candidates_300_500,
 elderly_vehicle_candidates:saved.summary.group_results['노인'].vehicle_candidates_0_300+saved.summary.group_results['노인'].vehicle_candidates_300_500},null,2));
