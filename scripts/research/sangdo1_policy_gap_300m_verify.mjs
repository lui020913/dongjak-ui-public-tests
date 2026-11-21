#!/usr/bin/env node
/**
 * Recompute (not just trust stored summary) all road sample means for the
 * 300m-only, lower-score-means-larger-potential-gap type-separated study.
 * Strictly excludes all light, width, accident, slope, and 150m/500m weights.
 *
 * node scripts/research/sangdo1_policy_gap_300m_verify.mjs
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const get=async name=>JSON.parse(await readFile(path.join(root,name),'utf8'));
const base='app/public/data/protection-zone/';
const names=['어린이','노인'];
const LON=111320*Math.cos(37.5*Math.PI/180),LAT=111195,R=300;
const near=(p,pointFeatures)=>{
 let minimum=Infinity,name=null;
 for(const f of pointFeatures){
  const [x,y]=f.geometry.coordinates;
  const distance=Math.hypot((x-p[0])*LON,(y-p[1])*LAT);
  if(distance<minimum){minimum=distance;name=f.properties.facility_name}
 }
 return{distance:minimum,name};
};
function inRing(p,ring){
 let yes=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }return yes;
}
const inPoly=(p,r)=>r.length>0&&inRing(p,r[0])&&!r.slice(1).some(x=>inRing(p,x));
const contains=(p,g)=>g.type==='Polygon'?inPoly(p,g.coordinates):g.type==='MultiPolygon'?g.coordinates.some(x=>inPoly(p,x)):false;
const roughly=(actual,expected,tolerance,label)=>assert.ok(Math.abs(actual-expected)<=tolerance,
  label+': '+actual+' vs '+expected);
const [roads,facilities,zones,output,geo]=await Promise.all([
 get('app/public/data/pri/lighting_segments.json'),
 get(base+'facility_reference_points_19.geojson'),
 get(base+'zone_polygons_18_reference.geojson'),
 get(base+'sangdo1_protection_gap_300m_20261122.json'),
 get(base+'sangdo1_protection_gap_300m_20261122.geojson')
]);
assert.equal(output.metadata.radius_m,300);
assert.equal(output.metadata.only_radius_m,300);
assert.equal(output.metadata.lower_score_stronger_spatial_gap,true);
assert.equal(output.metadata.no_weights_from_other_team_sources,true);
assert.equal(output.metadata.legal_missing_zone_verified,false);
assert.equal(output.metadata.not_for_production_pri,true);
assert.equal(output.segments.length,1686);
assert.equal(geo.features.length,1676);
const index=new Map(output.segments.map(x=>[x.segment_id,x]));
const geoIndex=new Map(geo.features.map(x=>[x.properties.id,x]));
assert.equal(index.size,1686);assert.equal(geoIndex.size,1676);
const inputs=Object.fromEntries(names.map(type=>[type,{
 points:facilities.features.filter(f=>f.properties.facility_type===type),
 polygons:zones.features.filter(f=>f.properties.facility_type===type)
}]));
assert.deepEqual(names.map(x=>inputs[x].points.length),[15,4]);
assert.deepEqual(names.map(x=>inputs[x].polygons.length),[14,4]);
const vehicle=new Set(['primary','secondary','tertiary','primary_link','service','residential']);
let valid=0;
const counts=Object.fromEntries(names.map(t=>[t,{scored:0,vehicleCandidates:0,gradeCounts:{'매우 큰 공백':0,'큰 공백':0,'중간 공백':0,'작은 공백':0}}]));
for(const r of roads.segments){
 const out=index.get(r.id);assert.ok(out,r.id);
 const line=geoIndex.get(r.id);
 if(!r.pts?.length||r.pts.length<2){
  assert.equal(line,undefined);
  for(const type of names){
   assert.equal(out.types[type].score,null);
   assert.equal(out.types[type].status,'missing_geometry');
  }continue;
 }
 valid++;
 assert.ok(line,'geo missing '+r.id);
 assert.equal(line.geometry.type,'LineString');
 assert.equal(line.geometry.coordinates.length,r.pts.length);
 let len=0;
 const sums=Object.fromEntries(names.map(type=>[type,{
  weighted:0,eligible:0,protected:0,unprotected:0,minDistance:Infinity,nearest:null
 }]));
 for(let i=1;i<r.pts.length;i++){
  const a=[r.pts[i-1][1],r.pts[i-1][0]],b=[r.pts[i][1],r.pts[i][0]];
  const segmentLength=Math.hypot((b[0]-a[0])*LON,(b[1]-a[1])*LAT);
  if(segmentLength<1e-8)continue;len+=segmentLength;
  const count=Math.max(1,Math.ceil(segmentLength/5));
  for(let k=0;k<count;k++){
   const portion=(k+.5)/count,point=[a[0]+(b[0]-a[0])*portion,a[1]+(b[1]-a[1])*portion],w=segmentLength/count;
   for(const type of names){
    const s=sums[type],source=inputs[type],d=near(point,source.points);
    if(d.distance>R)continue;
    s.eligible+=w;
    if(d.distance<s.minDistance){s.minDistance=d.distance;s.nearest=d.name}
    const inside=source.polygons.some(f=>contains(point,f.geometry));
    if(inside){s.protected+=w;s.weighted+=100*w}
    else{s.unprotected+=w;s.weighted+=100*(d.distance/R)*w}
   }
  }
 }
 roughly(out.geometry_length_m,len,.011,r.id+' road m');
 for(const type of names){
  const s=sums[type],v=out.types[type],props=line.properties;
  const pre=type==='어린이'?'child':'elderly';
  if(s.eligible===0){
   assert.equal(v.score,null,r.id+'/'+type);
   assert.equal(v.status,'outside_300m');
   assert.equal(v.color,'#A3AAB4');
   assert.equal(props[pre+'_score_300m'],null);
   assert.equal(v.candidate,false);
   continue;
  }
  counts[type].scored++;
  const mean=Math.round(s.weighted/s.eligible*10)/10;
  roughly(v.score,mean,.001,r.id+'/'+type+' score');
  roughly(v.evaluated_length_m,s.eligible,.011,r.id+'/'+type+' evaluated m');
  roughly(v.unprotected_length_m,s.unprotected,.011,r.id+'/'+type+' uncovered m');
  roughly(v.existing_zone_length_m,s.protected,.011,r.id+'/'+type+' covered m');
  roughly(v.evaluated_pct_of_segment,100*s.eligible/len,.052,r.id+'/'+type+' fraction');
  roughly(v.registered_zone_pct_of_evaluated,100*s.protected/s.eligible,.052,r.id+'/'+type+' registered');
  roughly(v.nearest_facility_distance_m,s.minDistance,.052,r.id+'/'+type+' nearest');
  assert.equal(v.nearest_facility_name,s.nearest);
  assert.equal(props[pre+'_score_300m'],v.score);
  assert.equal(props[pre+'_color_300m'],v.color);
  assert.equal(v.candidate,vehicle.has(r.hw)&&s.unprotected>1e-5);
  if(v.candidate){
   counts[type].vehicleCandidates++;
   assert.ok(['매우 큰 공백','큰 공백','중간 공백','작은 공백'].includes(v.grade));
   counts[type].gradeCounts[v.grade]++;
  }
 }
}
assert.equal(valid,1676);
assert.equal(counts['어린이'].scored,1080);
assert.equal(counts['노인'].scored,674);
assert.equal(counts['어린이'].vehicleCandidates,858);
assert.equal(counts['노인'].vehicleCandidates,562);
assert.deepEqual(counts['어린이'].gradeCounts,{'매우 큰 공백':68,'큰 공백':267,'중간 공백':279,'작은 공백':244});
assert.deepEqual(counts['노인'].gradeCounts,{'매우 큰 공백':56,'큰 공백':141,'중간 공백':166,'작은 공백':199});
for(const type of names){
 const ranked=output.segments.filter(r=>r.types[type].candidate).map(r=>r.types[type].rank).sort((a,b)=>a-b);
 assert.deepEqual(ranked,Array.from({length:ranked.length},(_,i)=>i+1),'non-contiguous ranking '+type);
}
console.log(JSON.stringify({result:'PASS',radius_m:R,valid_roads:valid,counts},null,2));
