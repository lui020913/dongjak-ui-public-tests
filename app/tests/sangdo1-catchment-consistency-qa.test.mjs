import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/protection-zone');
const load=async name=>JSON.parse(await readFile(path.join(root,name),'utf8'));
const near=(actual,expected,tolerance,label)=>
  assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} vs ${expected}`);

test('2025 tong/ban assignments never masquerade as 2026 polygon or legal school zones',async()=>{
  const [mapping,original,polygons]=await Promise.all([
    load('sangdo1_tong_school_mapping_20250317.json'),
    load('sangdo1_elementary_school_catchment_20250317.json'),
    load('sangdo1_school_catchment_polygons_20260920.geojson')
  ]);
  const entries=mapping.tong_assignments;
  assert.equal(entries.length,45);
  assert.deepEqual(entries.map(e=>e.tong),Array.from({length:45},(_,i)=>i+1));
  assert.deepEqual(mapping.metadata.split_tongs,[20,22]);
  assert.equal(mapping.metadata.tong_ban_geometry_available,false);
  assert.equal(mapping.metadata.official_catchment_geometry_available,true);
  assert.equal(mapping.metadata.spatial_join_available,false); // Refers to 2025 tong/ban boundaries ONLY.
  assert.match(mapping.metadata.official_polygon_status,/2026-09-20/);
  assert.equal(polygons.features.length,8);
  assert.equal(polygons.metadata.not_route,true);
  assert.equal(polygons.metadata.not_legal_school_zone,true);
  assert.deepEqual(new Set(original.schools.map(x=>x.school_name_source)),new Set(['강남초','상현초','은로초','봉현초']));
  const t20=entries.find(x=>x.tong===20),t22=entries.find(x=>x.tong===22);
  assert.deepEqual(new Set(t20.school_assignment),new Set(['상현초','봉현초']));
  assert.deepEqual(new Set(t22.school_assignment),new Set(['강남초','은로초']));
  assert.ok([t20,t22].every(x=>x.partial_tong&&x.protection_score===null));
  assert.match(t20.assignment_rule,/2반/);
  assert.match(t22.assignment_rule,/11반/);
  assert.match(t22.assignment_rule,/래미안2차/);
  assert.ok(entries.every(x=>x.protection_score===null)); // No invented tong/ban risk score.
});

test('2026 official polygon-25m road overlay closes coverage length and never imputes absent geometry',async()=>{
  const [polygons,data,summary]=await Promise.all([
    load('sangdo1_school_catchment_polygons_20260920.geojson'),
    load('sangdo1_road_catchment_overlay_20260920.json'),
    load('sangdo1_school_catchment_analysis_20260920_summary.json')
  ]);
  const entries=data.segments;
  assert.equal(entries.length,1686);
  assert.equal(new Set(entries.map(x=>x.segment_id)).size,entries.length);
  assert.equal(summary.roads_total,1686);
  assert.equal(summary.roads_geometry_valid,1676);
  assert.equal(summary.roads_null,10);
  assert.equal(summary.multiple_match_road_segments,42);
  assert.equal(summary.catchment_count,8);
  assert.equal(data.meta.source_zip_sha256,polygons.metadata.original_source_sha256);
  assert.equal(summary.source_zip_sha256,data.meta.source_zip_sha256);
  const noGeometry=entries.filter(x=>x.classification==='no_line_geometry');
  assert.equal(noGeometry.length,10);
  assert.ok(noGeometry.every(x=>x.road_length_m===0&&x.catchment_covered_m===null&&x.reference_policy_score===null));
  const valid=entries.filter(x=>x.road_length_m>0);
  assert.equal(valid.length,1676);
  const road=valid.reduce((a,x)=>a+x.road_length_m,0);
  const covered=valid.reduce((a,x)=>a+x.catchment_covered_m,0);
  near(road,summary.road_geometry_m,0.25,'total road metres (rounding allowance)');
  near(covered,summary.catchment_covered_road_m,0.25,'covered road metres');
  near(summary.catchment_covered_road_m+summary.outside_catchment_road_m,summary.road_geometry_m,0.02,'coverage closure');
  assert.ok(valid.every(x=>x.catchment_covered_m>=0&&x.catchment_covered_m<=x.road_length_m+0.02));
  const multiple=valid.filter(x=>x.classification==='multiple_or_shared');
  assert.equal(multiple.length,42);
  const polygonNames=new Set(polygons.features.map(x=>x.properties.catchment_name));
  assert.ok(valid.every(x=>x.assignments.every(y=>polygonNames.has(y.school_catchment)&&y.road_m>0)));
  assert.equal(summary.school_assignment_not_student_route,true);
  assert.equal(summary.official_protection_zones_source,'separate police polygons, not catchment data');
});

test('school summary score is only a road-overlap-weighted mean of the pre-existing 19-facility index',async()=>{
  const [data,summary]=await Promise.all([
    load('sangdo1_road_catchment_overlay_20260920.json'),
    load('sangdo1_school_catchment_analysis_20260920_summary.json')
  ]);
  assert.match(summary.score_mean_label,/19시설/);
  assert.equal(summary.school_breakdown.length,7); // Eighth official polygon has no overlapping line.
  for(const expected of summary.school_breakdown){
    let metres=0,n=0,weighted=0,weight=0;
    for(const road of data.segments){
      const intersections=road.assignments.filter(a=>a.school_catchment===expected.catchment_name);
      if(intersections.length)n++;
      for(const a of intersections){
        metres+=a.road_m;
        if(typeof road.reference_policy_score==='number'){
          assert.ok(road.reference_policy_score>=0&&road.reference_policy_score<=100);
          weighted+=a.road_m*road.reference_policy_score;weight+=a.road_m;
        }
      }
    }
    assert.equal(n,expected.road_segments,expected.catchment_name);
    near(metres,expected.road_length_m,0.15,expected.catchment_name+' metres');
    if(weight>0)near(weighted/weight,expected.reference_policy_score_mean,0.15,expected.catchment_name+' weighted score');
    else assert.equal(expected.reference_policy_score_mean,null);
  }
});
