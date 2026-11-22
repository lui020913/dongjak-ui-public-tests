import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SANGHYEON_MIDDLE_REFERENCE,clipLineToSchoolRadius,distanceToSchoolMeters,
 buildSanghyeonMiddleSchoolReview} from '../src/sangdo1-middle-school-review.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
const get=async n=>JSON.parse(await readFile(resolve(dir,'../public/data/protection-zone/'+n),'utf8'));
test('analytic 300m clip retains only the interior of a crossing line',()=>{
 const r={name:'test',lng:0,lat:0,radius_m:300};
 const a=[-500/111320,0],b=[500/111320,0];
 const p=clipLineToSchoolRadius([a,b],r);
 assert.equal(p.length,1);
 assert.equal(p[0].length,2);
 assert.ok(Math.abs(distanceToSchoolMeters(p[0][0],r)-300)<0.001);
 assert.ok(Math.abs(distanceToSchoolMeters(p[0][1],r)-300)<0.001);
 assert.ok(Math.abs(p[0][0][0]+p[0][1][0])<1e-12);
 assert.deepEqual(clipLineToSchoolRadius([[0.02,0.02],[0.03,0.03]],r),[]);
});
test('Sanghyeon Middle review uses the exact 1606 inside-dong source fragments without invented scores',async()=>{
 const geo=await get('sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson');
 const school=await get('sangdo1_admin_facility_registry_20261122.json');
 assert.equal(geo.features.length,1606);
 const middle=school.school_inventory.find(x=>x.name==='상현중학교');
 assert.deepEqual(middle.coordinate,[SANGHYEON_MIDDLE_REFERENCE.lng,SANGHYEON_MIDDLE_REFERENCE.lat]);
 const before=geo.features.map(x=>[x.properties.segment_id,x.properties.combined_new_score]);
 const review=buildSanghyeonMiddleSchoolReview(geo);
 assert.equal(review.metadata.middle_school_gap_scores_calculated,0);
 assert.ok(review.features.length>0);
 assert.equal(review.metadata.existing_policy_scored+review.metadata.existing_policy_null,review.features.length);
 const originals=new Map(before);
 const ids=new Set();
 for(const f of review.features){
  const p=f.properties;
  assert.ok(!ids.has(p.segment_id));ids.add(p.segment_id);
  assert.ok(originals.has(p.segment_id));
  assert.equal(p.middle_school_gap_score,null);
  assert.equal(p.existing_policy_score_0_100,originals.get(p.segment_id)??null);
  assert.equal(p.not_legal_zone_omission,true);
  const parts=f.geometry.type==='MultiLineString'?f.geometry.coordinates:[f.geometry.coordinates];
  for(const part of parts){
   assert.ok(part.length>=2);
   for(const point of part)assert.ok(distanceToSchoolMeters(point)<=300.02,
    'Outside radius on '+p.segment_id);
  }
 }
 assert.deepEqual(geo.features.map(x=>[x.properties.segment_id,x.properties.combined_new_score]),before);
});
test('all 22 boundary-crossing roads remain explicitly without falsely reused full-road catchment scores',async()=>{
 const geo=await get('sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson');
 const crossing=geo.features.filter(f=>f.properties.boundary_scope==='crossing');
 assert.equal(crossing.length,22);
 for(const f of crossing){
  const p=f.properties;
  assert.equal(p.school_applied_child,false);
  assert.ok(!Number.isFinite(p.child_school_match_pct));
  assert.ok(p.official_school_overlap_scope==='partial_original_catchment_not_used'||
   p.official_school_overlap_scope==='not_applicable');
 }
});
