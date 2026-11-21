import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/protection-zone');
const get=async name=>JSON.parse(await readFile(path.join(dir,name),'utf8'));
const near=(a,b,margin=0.3)=>assert.ok(Math.abs(a-b)<=margin,`Mismatch: ${a} vs ${b} (±${margin})`);
const total=(items,key)=>items.reduce((sum,item)=>sum+(item[key]??0),0);

test('the 2025-zone by 2026-catchment research comparison never uses simplified display shapes as exact analysis',async()=>{
  const [cross,official,polygon]=await Promise.all([
    get('sangdo1_2025_police_x_2026_catchment_preview.json'),
    get('sangdo1_road_catchment_overlay_20260920.json'),
    get('sangdo1_school_catchment_polygons_20260920.geojson')
  ]);
  assert.match(cross.meta.schema,/exact_length_bounds_v2$/);
  assert.equal(cross.meta.road_count,1686);
  assert.equal(cross.meta.valid_road_count,1676);
  assert.equal(cross.meta.no_geometry_count,10);
  assert.equal(cross.meta.registration_not_current_legal_notice,true);
  assert.equal(cross.meta.not_certified_student_routes,true);
  assert.equal(cross.meta.previous_visual_2026_polygon_sampling_excluded_due_to_1315m_undercoverage,true);
  assert.equal(cross.schools.length,polygon.features.length);
  assert.equal(cross.road_segments.length,official.segments.length);
  near(cross.meta.total_valid_road_m,official.meta.road_geometry_m,0.2);
  near(cross.meta.school_catchment_union_road_m,official.meta.catchment_covered_road_m,0.01);
  near(cross.meta.zone_coverage_on_road_m,1184.58,0.02);
  near(cross.meta.any_catchment_zone_intersection_lower_m,cross.meta.any_catchment_zone_intersection_upper_m,0.05);

  const byID=new Map(official.segments.map(r=>[r.segment_id,r]));
  const rowsWithGeometry=cross.road_segments.filter(r=>r.road_length_m>0);
  assert.equal(rowsWithGeometry.length,1676);
  assert.equal(new Set(cross.road_segments.map(r=>r.segment_id)).size,1686);
  for(const row of cross.road_segments){
    const orig=byID.get(row.segment_id);
    assert.ok(orig,row.segment_id);
    assert.equal(row.road_length_m,orig.road_length_m);
    if(!orig.road_length_m){
      assert.equal(row.registered_polygon_sample_m,null);
      assert.equal(row.catchment_union_exact_m,null);
      assert.deepEqual(row.school_overlap_bounds,[]);
      continue;
    }
    assert.ok(row.registered_polygon_sample_m>=0);
    assert.ok(row.registered_polygon_sample_m<=orig.road_length_m+0.05);
    assert.equal(row.catchment_union_exact_m,orig.catchment_covered_m);
    assert.equal(row.school_overlap_bounds.length,orig.assignments.length);
    for(const overlap of row.school_overlap_bounds){
      const ref=orig.assignments.find(a=>a.school_catchment===overlap.name);
      assert.ok(ref);
      assert.equal(overlap.road_m,ref.road_m);
      assert.ok(overlap.registered_zone_lower_m>=0);
      assert.ok(overlap.registered_zone_lower_m<=overlap.registered_zone_upper_m+0.01);
      assert.ok(overlap.registered_zone_upper_m<=ref.road_m+0.02);
    }
  }
});

test('exact official 2026 school road lengths and the protected overlap interval are not legal risk scores',async()=>{
  const [cross,summary]=await Promise.all([
    get('sangdo1_2025_police_x_2026_catchment_preview.json'),
    get('sangdo1_school_catchment_analysis_20260920_summary.json')
  ]);
  const stats=new Map(summary.school_breakdown.map(x=>[x.catchment_name,x]));
  const names=new Set(summary.catchment_school_names);
  for(const school of cross.schools){
    assert.ok(names.has(school.school));
    near(school.road_intersection_exact_m,stats.get(school.school)?.road_length_m??0,0.2);
    assert.ok(school.registered_protected_lower_bound_m>=0);
    assert.ok(school.registered_protected_upper_bound_m>=school.registered_protected_lower_bound_m);
    assert.ok(school.registered_protected_upper_bound_m<=school.road_intersection_exact_m+0.01);
    assert.equal('danger_score' in school,false);
  }
  const focusById=Object.fromEntries(cross.focus.map(x=>[x.road_id,x]));
  for(const id of ['R0248','R0288']){
    assert.equal(focusById[id].registered_2025_zone_m,0);
    assert.equal(focusById[id].school_catchments.length,1);
    assert.equal(focusById[id].school_catchments[0].name,'서울상현초통학구역');
    assert.match(focusById[id].official_zone_status,/not confirmed/);
  }
});


test('read-only official-SHP and registered-zone 2m GIS crosscheck reproduces study data',()=>{
  const script=path.resolve(dir,'../../../../scripts/research/sangdo1_2025_zones_2026_school_crosscheck.mjs');
  const outcome=JSON.parse(execFileSync(process.execPath,[script],{encoding:'utf8',timeout:30000}));
  assert.equal(outcome.status,'PASS');
  assert.equal(outcome.valid,1676);
});
