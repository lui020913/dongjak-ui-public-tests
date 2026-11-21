import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=path.join(root,'app/public/data/protection-zone');
const load=async name=>JSON.parse(await readFile(path.join(data,name),'utf8'));

test('children and elderly zone policy scores use separate registered facility types, not teammate metrics',async()=>{
 const [result,facilities,polygons]=await Promise.all([
  load('sangdo1_policy_gap_by_facility_type_20261122.json'),
  load('facility_reference_points_19.geojson'),
  load('zone_polygons_18_reference.geojson')
 ]);
 assert.equal(result.segments.length,1686);
 assert.equal(new Set(result.segments.map(x=>x.id)).size,1686);
 assert.equal(result.summary.valid_geometry,1676);
 assert.equal(result.summary.missing_geometry,10);
 assert.deepEqual(result.summary.facility_type_counts,{
  '어린이':{points:15,zones:14},
  '노인':{points:4,zones:4}
 });
 assert.equal(facilities.features.length,19);
 assert.equal(polygons.features.length,18);
 assert.equal(result.summary.group_results['어린이'].vehicle_candidates_0_300,858);
 assert.equal(result.summary.group_results['어린이'].vehicle_candidates_300_500,302);
 assert.equal(result.summary.group_results['노인'].vehicle_candidates_0_300,562);
 assert.equal(result.summary.group_results['노인'].vehicle_candidates_300_500,408);
 assert.equal(result.summary.disability_no_input_status,'not_evaluated_missing_official_facilities');
 assert.equal(result.metadata.disability_not_evaluated,true);
 assert.equal(result.metadata.legal_latest_2026_verified,false);
 assert.equal(result.metadata.not_to_be_used_as_final_pri_or_zone_designation,true);
 for(const type of ['어린이','노인']){
  const taggedFacilityNames=new Set(facilities.features.filter(x=>x.properties.facility_type===type).map(x=>x.properties.facility_name));
  const ranks=result.segments.map(s=>s.types[type]?.rank_vehicle).filter(Number.isInteger).sort((a,b)=>a-b);
  assert.deepEqual(ranks,Array.from({length:ranks.length},(_,i)=>i+1));
  for(const seg of result.segments){
   const v=seg.types[type];
   if(!v)continue;
   assert.ok(taggedFacilityNames.has(v.nearest_facility));
   assert.ok(v.policy_coverage_score>=0&&v.policy_coverage_score<=100);
   assert.ok(Math.abs(v.gap_strength+v.policy_coverage_score-100)<.06);
   if(v.rank_vehicle!==null)assert.equal(seg.network_kind,'vehicle_network');
  }
 }
});

test('reproducible type-separated GIS 5m sample matches every published road score and rank',()=>{
 const script=path.join(root,'scripts/research/sangdo1_policy_gap_by_facility_type.mjs');
 const result=JSON.parse(execFileSync(process.execPath,[script,'--verify'],{encoding:'utf8',timeout:90000}));
 assert.equal(result.status,'PASS');
 assert.equal(result.child_vehicle_candidates,1160);
 assert.equal(result.elderly_vehicle_candidates,970);
});
