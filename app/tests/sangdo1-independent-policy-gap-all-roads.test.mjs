import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=path.join(root,'app/public/data/protection-zone');
const load=async name=>JSON.parse(await readFile(path.join(data,name),'utf8'));

test('all 1,676 roads are evaluated independently of legacy 125-candidate selection and teammate metrics',async()=>{
 const [result,old,candidates,school]=await Promise.all([
  load('sangdo1_policy_gap_independent_all_roads_20261122.json'),
  load('policy_coverage_25m_preview.json'),
  load('candidates.geojson'),
  load('sangdo1_road_catchment_overlay_20260920.json')
 ]);
 const {metadata,summary,segments}=result;
 assert.equal(metadata.no_legal_non_designation_claim,true);
 assert.equal(metadata.official_notice_not_verified,true);
 assert.equal(metadata.no_auto_pri_penalty,true);
 assert.equal(metadata.unknown_2026_legal_designation,true);
 assert.equal(metadata.actual_student_route_unknown,true);
 assert.equal(summary.independent_of_legacy_125_preselection,true);
 assert.equal(old.segments.length,1686);
 assert.equal(candidates.features.length,125);
 assert.equal(segments.length,1686);
 assert.equal(new Set(segments.map(x=>x.id)).size,1686);
 assert.equal(summary.valid_segments,1676);
 assert.equal(summary.excluded_missing_geometry,10);
 assert.equal(summary.vehicle_network.potential_candidates,1157);
 assert.equal(summary.vehicle_network.total,1276);
 assert.equal(summary.pedestrian_network.total,410);
 assert.equal(summary.pedestrian_network.candidate_like_but_not_vehicle_road,381);
 assert.equal(summary.model_categories_all_segments.near_facility_unprotected_300m,1042);
 assert.equal(summary.model_categories_all_segments.near_facility_unprotected_300_500m,496);
 assert.equal(summary.model_categories_all_segments.existing_zone_no_model_gap,41);
 assert.equal(summary.model_categories_all_segments.outside_500m_or_no_model_gap,97);
 assert.equal(summary.model_gap_candidate_total_any_network,1538);
 const oldByID=new Map(old.segments.map(x=>[x.id,x]));
 const schoolByID=new Map(school.segments.map(x=>[x.segment_id,x]));
 const ranked=segments.filter(x=>x.potential_vehicle_zone_gap_candidate);
 assert.equal(ranked.length,1157);
 assert.deepEqual(ranked.map(x=>x.research_priority_rank).sort((a,b)=>a-b),Array.from({length:1157},(_,i)=>i+1));
 for(const x of segments){
   const o=oldByID.get(x.id),s=schoolByID.get(x.id);
   assert.ok(o&&s,x.id);
   assert.deepEqual(x.official_2026_catchment_names,s.assignments.map(a=>a.school_catchment));
   if(!(o.geometry_length_m>0)){
     assert.equal(x.policy_coverage_score_0_100,null);
     assert.equal(x.model_gap_strength_0_100,null);
     assert.equal(x.existing_2025_zone_model_category,'unscored_no_geometry');
     assert.equal(x.potential_vehicle_zone_gap_candidate,false);
     continue;
   }
   assert.equal(x.policy_coverage_score_0_100,o.score);
   assert.ok(Math.abs(x.model_gap_strength_0_100+o.score-100)<.06,'Score invert '+x.id);
   assert.equal(x.near_facility_unprotected_0_300m_pct,o.unprotected_within_300_pct);
   assert.equal(x.near_facility_unprotected_300_500m_pct,o.unprotected_300_to_500_pct);
   if(x.network_kind==='pedestrian_network')assert.equal(x.potential_vehicle_zone_gap_candidate,false);
   if(x.potential_vehicle_zone_gap_candidate)assert.ok(
     o.unprotected_within_300_pct>0||o.unprotected_300_to_500_pct>0,'Not a near-facility model candidate '+x.id
   );
 }
 for(const forbidden of ['lighting proximity','road width','TAAS crashes','PRI composite','slope']){
   assert.ok(metadata.severity_indicators_excluded.includes(forbidden));
 }
});

test('published JSON, CSV and GeoJSON match reproducible research script exactly',()=>{
 const script=path.join(root,'scripts/research/sangdo1_policy_gap_all_roads.mjs');
 const output=JSON.parse(execFileSync(process.execPath,[script,'--verify'],{encoding:'utf8',timeout:60000}));
 assert.equal(output.status,'PASS');
 assert.equal(output.summary.valid_segments,1676);
 assert.equal(output.summary.vehicle_network.potential_candidates,1157);
});

test('every mapped line retains coordinates and excludes invalid road shape from GIS output',async()=>{
 const [r,g]=await Promise.all([
  load('sangdo1_policy_gap_independent_all_roads_20261122.json'),
  load('sangdo1_policy_gap_independent_all_roads_20261122.geojson')
 ]);
 assert.equal(g.type,'FeatureCollection');
 assert.equal(g.features.length,1676);
 const ids=new Set(g.features.map(x=>x.properties.id));
 assert.equal(ids.size,1676);
 for(const feature of g.features){
   assert.equal(feature.geometry.type,'LineString');
   assert.ok(feature.geometry.coordinates.length>1);
   assert.ok(feature.geometry.coordinates.every(x=>x.length===2&&x[0]>120&&x[0]<130&&x[1]>30&&x[1]<40));
   assert.equal(feature.properties.not_verified_legal_zone,true);
 }
 assert.equal(r.segments.filter(x=>x.input_road_length_m===null).every(x=>!ids.has(x.id)),true);
});
