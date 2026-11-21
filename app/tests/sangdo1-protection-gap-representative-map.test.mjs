import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const data=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/protection-zone');
const load=async file=>JSON.parse(await readFile(path.join(data,file),'utf8'));
const sx=111320*Math.cos(37.5*Math.PI/180),sy=111195;
function distanceToLine(point,coords){
 let d=Infinity;
 for(let i=1;i<coords.length;i++){
  const a=coords[i-1],b=coords[i],ax=(a[0]-point[0])*sx,ay=(a[1]-point[1])*sy;
  const dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*sy;
  const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy)));
  d=Math.min(d,Math.hypot(ax+t*dx,ay+t*dy));
 }
 return d;
}
test('mapped policy gap points use exact stored 25m type scores, reference facilities and segment geometry',async()=>{
 const [map,score,geo]=await Promise.all([
  load('sangdo1_policy_gap_21_representative_map_points_20261122.json'),
  load('sangdo1_policy_gap_by_facility_type_20261122.json'),
  load('sangdo1_policy_gap_by_facility_type_20261122.geojson')
 ]);
 assert.equal(map.points.length,21);
 assert.equal(map.points.filter(x=>x.facility_type==='어린이').length,12);
 assert.equal(map.points.filter(x=>x.facility_type==='노인').length,9);
 assert.equal(geo.features.length,1676);
 const scored=new Map(score.segments.map(x=>[x.id,x]));
 const geometry=new Map(geo.features.map(x=>[x.properties.segment_id,x]));
 const seen=new Set();
 for(const p of map.points){
  assert.ok(!seen.has(p.map_id),p.map_id); seen.add(p.map_id);
  const s=scored.get(p.segment_id),f=geometry.get(p.segment_id);
  assert.ok(s&&f,p.segment_id);
  const v=s.types[p.facility_type];
  assert.equal(v.gap_strength,p.model_gap_strength_score_0_100);
  assert.equal(v.nearest_facility,p.nearest_facility_name);
  assert.equal(v.nearest_facility_point_distance_m,p.nearest_facility_point_distance_m);
  assert.equal(v.existing_zone_pct,p.registered_2025_same_type_zone_pct);
  assert.equal(v.unprotected_0_300m_pct,p.unprotected_within_300m_pct);
  assert.ok(distanceToLine([p.long,p.lat],f.geometry.coordinates)<2,p.segment_id+' mapped off road');
  assert.equal(f.properties.legal_gap_confirmed,false);
  assert.equal(f.properties.safety_risk_grade_confirmed,false);
 }
 for(const f of geo.features){
  const s=scored.get(f.properties.segment_id);
  assert.ok(s);
  assert.equal(f.properties.gap_child,s.types['어린이'].gap_strength);
  assert.equal(f.properties.gap_elderly,s.types['노인'].gap_strength);
  assert.equal(f.properties.child_registered_2025_pct,s.types['어린이'].existing_zone_pct);
  assert.equal(f.properties.elderly_registered_2025_pct,s.types['노인'].existing_zone_pct);
 }
 assert.equal(map.metadata.no_legally_confirmed_zone_omission,true);
});
